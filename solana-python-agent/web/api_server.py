"""MAWD Solana Agent - Web API Server with WebSocket streaming"""

import asyncio
import json
import uuid
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from mini_agent.config import load_config
from mini_agent.agent import SolanaAgent
from mini_agent.tools.base import ToolResult


# ============================================================
# Event Types for WebSocket streaming
# ============================================================

@dataclass
class AgentEvent:
    """Event sent to frontend via WebSocket"""
    type: str
    timestamp: str
    data: dict
    
    def to_json(self):
        return json.dumps(asdict(self))


class ChatMessage(BaseModel):
    """Incoming chat message from frontend"""
    message: str


class AgentStatus(BaseModel):
    """Agent status response"""
    status: str
    wallet: Optional[str] = None
    balance: Optional[float] = None
    tools_count: int = 0
    active_sessions: int = 0


# ============================================================
# Connection Manager for WebSocket clients
# ============================================================

class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
    
    async def send_event(self, client_id: str, event: AgentEvent):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(event.to_json())
    
    async def broadcast(self, event: AgentEvent):
        for websocket in self.active_connections.values():
            await websocket.send_text(event.to_json())


manager = ConnectionManager()


# ============================================================
# Streaming Agent Wrapper
# ============================================================

class StreamingAgent:
    """Agent wrapper that streams events to WebSocket clients"""
    
    def __init__(self, agent: SolanaAgent, client_id: str):
        self.agent = agent
        self.client_id = client_id
    
    async def emit(self, event_type: str, data: dict):
        event = AgentEvent(
            type=event_type,
            timestamp=datetime.utcnow().isoformat(),
            data=data
        )
        await manager.send_event(self.client_id, event)
    
    async def process_message(self, message: str) -> str:
        """Process a message and stream all events"""
        
        # Emit user message
        await self.emit("user_message", {"content": message})
        
        # Add to agent
        self.agent.add_user_message(message)
        
        step = 0
        while step < self.agent.max_steps:
            step += 1
            
            # Emit step start
            await self.emit("step_start", {"step": step, "max_steps": self.agent.max_steps})
            
            # Get LLM response
            try:
                response = await self.agent.llm_client.generate(
                    self.agent.messages, 
                    self.agent.tools
                )
            except Exception as e:
                await self.emit("error", {"message": str(e)})
                return f"Error: {e}"
            
            # Emit thinking
            if response.thinking:
                await self.emit("thinking", {"content": response.thinking[:500]})
            
            # Emit assistant response
            if response.content:
                await self.emit("assistant_message", {"content": response.content})
            
            # Add to message history
            from mini_agent.llm import Message
            self.agent.messages.append(Message(
                role="assistant",
                content=response.content,
                thinking=response.thinking,
                tool_calls=response.tool_calls,
            ))
            
            # If no tool calls, we're done
            if not response.tool_calls:
                await self.emit("step_complete", {"step": step, "final": True})
                return response.content or ""
            
            # Execute tool calls
            for tool_call in response.tool_calls:
                # Emit tool call start
                await self.emit("tool_call", {
                    "name": tool_call.name,
                    "arguments": tool_call.arguments,
                })
                
                # Find and execute tool
                tool = None
                for t in self.agent.tools:
                    if t.name == tool_call.name:
                        tool = t
                        break
                
                if tool is None:
                    result = ToolResult(success=False, error=f"Unknown tool: {tool_call.name}")
                else:
                    try:
                        result = await tool.execute(**tool_call.arguments)
                    except Exception as e:
                        result = ToolResult(success=False, error=str(e))
                
                # Emit tool result
                await self.emit("tool_result", {
                    "name": tool_call.name,
                    "success": result.success,
                    "content": result.content if result.success else None,
                    "error": result.error if not result.success else None,
                })
                
                # Add tool result to messages
                self.agent.messages.append(Message(
                    role="tool",
                    content=result.content if result.success else f"Error: {result.error}",
                    tool_call_id=tool_call.id,
                    name=tool_call.name,
                ))
            
            await self.emit("step_complete", {"step": step, "final": False})
        
        return f"Max steps ({self.agent.max_steps}) reached."


# ============================================================
# Global Agent and Birdeye WebSocket Instances
# ============================================================

agent_instance: Optional[SolanaAgent] = None
agent_lock = asyncio.Lock()
birdeye_ws_client = None


async def get_agent() -> SolanaAgent:
    """Get or create the global agent instance"""
    global agent_instance
    
    async with agent_lock:
        if agent_instance is None:
            env_path = Path(__file__).parent.parent.parent / ".env.local"
            if not env_path.exists():
                env_path = Path(__file__).parent.parent / ".env.local"
            
            config = load_config(str(env_path) if env_path.exists() else None)
            agent_instance = SolanaAgent(config)
            await agent_instance.initialize()
        
        return agent_instance


# ============================================================
# FastAPI Application
# ============================================================

async def initialize_birdeye_websocket():
    """Initialize Birdeye WebSocket for real-time data"""
    global birdeye_ws_client

    try:
        # Import here to avoid circular imports and use correct path
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from clients.birdeye_client import BirdeyeWebSocketClient
        from config import load_config as load_root_config

        # Load config to get API key
        env_path = Path(__file__).parent.parent.parent / ".env.local"
        if not env_path.exists():
            env_path = Path(__file__).parent.parent / ".env.local"

        config = load_root_config(str(env_path) if env_path.exists() else None)

        # Create WebSocket client
        birdeye_ws_client = BirdeyeWebSocketClient(api_key=config.birdeye_api_key)

        # Register event handlers to broadcast to all WebSocket clients
        async def handle_price_update(data):
            await manager.broadcast(AgentEvent(
                type="birdeye_price_update",
                timestamp=datetime.utcnow().isoformat(),
                data=data
            ))

        async def handle_new_listing(data):
            await manager.broadcast(AgentEvent(
                type="birdeye_new_listing",
                timestamp=datetime.utcnow().isoformat(),
                data=data
            ))

        async def handle_large_trade(data):
            await manager.broadcast(AgentEvent(
                type="birdeye_large_trade",
                timestamp=datetime.utcnow().isoformat(),
                data=data
            ))

        async def handle_wallet_tx(data):
            await manager.broadcast(AgentEvent(
                type="birdeye_wallet_tx",
                timestamp=datetime.utcnow().isoformat(),
                data=data
            ))

        # Register handlers
        birdeye_ws_client.on("PRICE_UPDATE", handle_price_update)
        birdeye_ws_client.on("NEW_LISTING", handle_new_listing)
        birdeye_ws_client.on("LARGE_TRADE", handle_large_trade)
        birdeye_ws_client.on("WALLET_TX", handle_wallet_tx)

        # Connect
        await birdeye_ws_client.connect()

        # Subscribe to new listings
        await birdeye_ws_client.subscribe_new_listings()

        print("✓ Birdeye WebSocket connected and subscribed to new listings")

    except Exception as e:
        print(f"⚠️  Failed to initialize Birdeye WebSocket: {e}")
        birdeye_ws_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting MAWD API Server...")
    await initialize_birdeye_websocket()
    yield
    # Shutdown
    if agent_instance:
        await agent_instance.close()
    if birdeye_ws_client:
        await birdeye_ws_client.disconnect()
    print("👋 MAWD API Server stopped")


app = FastAPI(
    title="MAWD Solana Agent API",
    description="AI-powered Solana trading agent with real-time streaming",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REST Endpoints
# ============================================================

@app.get("/api/status", response_model=AgentStatus)
async def get_status():
    """Get agent status"""
    try:
        agent = await get_agent()
        balance = None
        try:
            balance = await agent.helius_client.get_sol_balance(agent.bags_client.wallet_pubkey)
        except Exception:
            pass
        
        return AgentStatus(
            status="ready",
            wallet=agent.bags_client.wallet_pubkey,
            balance=balance,
            tools_count=len(agent.tools),
            active_sessions=len(manager.active_connections),
        )
    except Exception as e:
        return AgentStatus(status=f"error: {str(e)}", tools_count=0, active_sessions=0)


@app.get("/api/tools")
async def get_tools():
    """Get list of available tools"""
    agent = await get_agent()
    return {
        "tools": [
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters,
            }
            for tool in agent.tools
        ]
    }


@app.post("/api/chat")
async def chat(msg: ChatMessage):
    """Send a message (non-streaming)"""
    agent = await get_agent()
    response = await agent.process_message(msg.message)
    return {"response": response}


@app.get("/api/history")
async def get_history():
    """Get conversation history"""
    agent = await get_agent()
    return {
        "messages": [
            {
                "role": m.role,
                "content": m.content,
            }
            for m in agent.messages
            if m.role != "system"
        ]
    }


@app.post("/api/clear")
async def clear_history():
    """Clear conversation history"""
    agent = await get_agent()
    agent.messages = [agent.messages[0]]  # Keep system prompt
    return {"status": "cleared"}


# ============================================================
# Birdeye WebSocket Subscription Endpoints
# ============================================================

@app.post("/api/birdeye/subscribe/price/{token_address}")
async def subscribe_token_price(token_address: str):
    """Subscribe to real-time price updates for a token"""
    if not birdeye_ws_client:
        raise HTTPException(status_code=503, detail="Birdeye WebSocket not available")

    try:
        await birdeye_ws_client.subscribe_price(token_address)
        return {"status": "subscribed", "token": token_address, "type": "price"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/birdeye/subscribe/wallet/{wallet_address}")
async def subscribe_wallet_transactions(wallet_address: str):
    """Subscribe to real-time transactions for a wallet"""
    if not birdeye_ws_client:
        raise HTTPException(status_code=503, detail="Birdeye WebSocket not available")

    try:
        await birdeye_ws_client.subscribe_wallet_transactions(wallet_address)
        return {"status": "subscribed", "wallet": wallet_address, "type": "wallet_tx"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/birdeye/subscribe/large-trades")
async def subscribe_large_trades(threshold_usd: float = 10000):
    """Subscribe to large trade alerts"""
    if not birdeye_ws_client:
        raise HTTPException(status_code=503, detail="Birdeye WebSocket not available")

    try:
        await birdeye_ws_client.subscribe_large_trades(threshold_usd)
        return {"status": "subscribed", "type": "large_trades", "threshold": threshold_usd}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/birdeye/status")
async def birdeye_websocket_status():
    """Get Birdeye WebSocket connection status"""
    if not birdeye_ws_client:
        return {"connected": False, "message": "WebSocket client not initialized"}

    return {
        "connected": birdeye_ws_client.is_connected,
        "subscriptions": len(birdeye_ws_client.handlers),
        "reconnect_attempts": birdeye_ws_client.reconnect_attempts
    }


# ============================================================
# WebSocket Endpoint for Streaming
# ============================================================

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket for real-time agent streaming"""
    await manager.connect(websocket, client_id)
    
    try:
        agent = await get_agent()
        streaming_agent = StreamingAgent(agent, client_id)
        
        # Send connected event
        await manager.send_event(client_id, AgentEvent(
            type="connected",
            timestamp=datetime.utcnow().isoformat(),
            data={
                "client_id": client_id,
                "wallet": agent.bags_client.wallet_pubkey,
                "tools": len(agent.tools),
            }
        ))
        
        while True:
            # Wait for message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "chat":
                user_message = message_data.get("message", "")
                await streaming_agent.process_message(user_message)
            
            elif message_data.get("type") == "ping":
                await manager.send_event(client_id, AgentEvent(
                    type="pong",
                    timestamp=datetime.utcnow().isoformat(),
                    data={}
                ))
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        await manager.send_event(client_id, AgentEvent(
            type="error",
            timestamp=datetime.utcnow().isoformat(),
            data={"message": str(e)}
        ))
        manager.disconnect(client_id)


# ============================================================
# Serve Frontend
# ============================================================

# Mount static files if frontend exists
frontend_path = Path(__file__).parent / "frontend"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")

@app.get("/")
async def serve_frontend():
    """Serve the frontend"""
    index_path = frontend_path / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "MAWD API Server - Frontend not found. Use /api/* endpoints."}

@app.get("/swap")
async def serve_swap():
    """Serve the Jupiter swap interface"""
    swap_path = frontend_path / "swap.html"
    if swap_path.exists():
        return FileResponse(str(swap_path))
    return {"message": "Swap interface not found"}


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
