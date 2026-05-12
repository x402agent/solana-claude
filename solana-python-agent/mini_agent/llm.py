"""LLM Client for Solana Trading Agent - Supports OpenRouter and multiple providers"""

import json
import logging
from typing import Optional, Any
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)


@dataclass
class ToolCall:
    """Tool call from LLM response"""
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMResponse:
    """Response from LLM"""
    content: str = ""
    thinking: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    finish_reason: str = ""
    usage: Optional[dict] = None


@dataclass
class Message:
    """Conversation message"""
    role: str
    content: str = ""
    thinking: str = ""
    tool_calls: list[ToolCall] = None
    tool_call_id: str = ""
    name: str = ""
    
    def to_dict(self) -> dict:
        d = {"role": self.role, "content": self.content}
        if self.tool_calls:
            d["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": json.dumps(tc.arguments)
                    }
                }
                for tc in self.tool_calls
            ]
        if self.tool_call_id:
            d["tool_call_id"] = self.tool_call_id
        if self.name:
            d["name"] = self.name
        return d


class LLMClient:
    """LLM Client supporting OpenRouter and OpenAI-compatible APIs"""
    
    def __init__(
        self,
        api_key: str,
        api_base: str = "https://openrouter.ai/api/v1",
        model: str = "anthropic/claude-sonnet-4",
        timeout: float = 120.0,
        max_tokens: int = 4096,
    ):
        """
        Initialize LLM client.
        
        Args:
            api_key: API key for authentication
            api_base: Base URL for the API
            model: Model name to use
            timeout: Request timeout in seconds
            max_tokens: Maximum tokens in response
        """
        self.api_key = api_key
        self.api_base = api_base.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.max_tokens = max_tokens
        
        self._client = httpx.AsyncClient(
            base_url=self.api_base,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/mawd-bot",
                "X-Title": "MAWD Solana Trading Agent",
            },
            timeout=timeout
        )
        
        logger.info(f"Initialized LLM client: {model} @ {api_base}")
    
    async def generate(
        self,
        messages: list[Message],
        tools: list = None,
    ) -> LLMResponse:
        """
        Generate response from LLM.
        
        Args:
            messages: List of conversation messages
            tools: Optional list of Tool objects
            
        Returns:
            LLMResponse with content and optional tool calls
        """
        # Format messages
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, Message):
                formatted_messages.append(msg.to_dict())
            elif isinstance(msg, dict):
                formatted_messages.append(msg)
            else:
                formatted_messages.append({"role": "user", "content": str(msg)})
        
        # Build payload
        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "max_tokens": self.max_tokens,
        }
        
        # Add tools if provided
        if tools:
            formatted_tools = []
            for tool in tools:
                if hasattr(tool, 'to_openai_schema'):
                    formatted_tools.append(tool.to_openai_schema())
                elif hasattr(tool, 'to_schema'):
                    schema = tool.to_schema()
                    formatted_tools.append({
                        "type": "function",
                        "function": {
                            "name": schema["name"],
                            "description": schema["description"],
                            "parameters": schema["input_schema"],
                        }
                    })
                elif isinstance(tool, dict):
                    formatted_tools.append(tool)
            
            if formatted_tools:
                payload["tools"] = formatted_tools
                payload["tool_choice"] = "auto"
        
        # Make request
        try:
            response = await self._client.post("/chat/completions", json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM request failed: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            raise
        
        # Parse response
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        
        # Extract tool calls
        tool_calls = []
        raw_tool_calls = message.get("tool_calls", [])
        for tc in raw_tool_calls:
            func = tc.get("function", {})
            try:
                args = json.loads(func.get("arguments", "{}"))
            except json.JSONDecodeError:
                args = {}
            
            tool_calls.append(ToolCall(
                id=tc.get("id", ""),
                name=func.get("name", ""),
                arguments=args,
            ))
        
        # Build response
        return LLMResponse(
            content=message.get("content", "") or "",
            thinking=message.get("thinking", "") or "",
            tool_calls=tool_calls,
            finish_reason=choice.get("finish_reason", ""),
            usage=data.get("usage"),
        )
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
