"""MAWD Solana Trading Agent - Full Featured Agent"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Optional
from time import perf_counter

from .llm import LLMClient, Message, ToolCall, LLMResponse
from .config import SolanaAgentConfig, load_config
from .tools.base import Tool, ToolResult
from .tools.solana_tools import create_all_trading_tools, set_solana_clients
from .tools.note_tool import TradingNoteTool, RecallTradingNoteTool, ClearTradingNotesTool

# Import blockchain clients
sys.path.insert(0, str(Path(__file__).parent.parent))
from clients.bags_client import BagsClient
from clients.helius_client import HeliusClient
from clients.birdeye_client import BirdeyeClient
try:
    from clients.cdp_client import create_cdp_client
    CDP_AVAILABLE = True
except ImportError:
    CDP_AVAILABLE = False
try:
    from clients.hyperliquid_client import HyperliquidClient
    HYPERLIQUID_AVAILABLE = True
except ImportError:
    HYPERLIQUID_AVAILABLE = False


class Colors:
    """Terminal colors"""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    BRIGHT_CYAN = "\033[96m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_RED = "\033[91m"
    BRIGHT_BLUE = "\033[94m"


SYSTEM_PROMPT = """You are MAWD, an AI-powered Solana trading agent. You help users trade tokens,
check balances, analyze market data, launch new tokens, manage their Solana wallet portfolio,
and trade perpetuals on Hyperliquid DEX.

## Your Capabilities

### Trading Tools (9 tools):
1. **get_wallet_balance** - Check SOL and token balances
2. **get_token_price** - Get current token price
3. **get_token_info** - Comprehensive token info (price, volume, liquidity, holders)
4. **get_swap_quote** - Get quote before trading
5. **buy_token** - ⚠️ Buy tokens with SOL (REAL TRADE)
6. **sell_token** - ⚠️ Sell tokens for SOL (REAL TRADE)
7. **get_portfolio** - Complete portfolio with USD values
8. **get_trending_tokens** - Discover trending tokens
9. **search_token** - Search tokens by name/symbol

### Token Launch Tools (3 tools):
10. **launch_token** - ⚠️ Launch a new token on Solana via Bags/Meteora
11. **get_claimable_fees** - Check claimable fee positions
12. **claim_fees** - ⚠️ Claim accumulated trading fees

### Memory Tools (3 tools):
13. **record_trading_note** - Save trading research, decisions, and observations
14. **recall_trading_notes** - Recall saved trading information
15. **clear_trading_notes** - Clear saved notes

### CDP Tools (Coinbase Developer Platform) - MAINNET (5 tools):
16. **cdp_create_account** - Create a new CDP-managed Solana account (mainnet)
17. **cdp_request_faucet** - Request SOL from faucet (DEVNET ONLY - errors on mainnet)
18. **cdp_get_balance** - Get SOL balance for an address
19. **cdp_send_sol** - ⚠️ Send real SOL from CDP account (REAL TRANSACTION)
20. **cdp_list_accounts** - List all CDP-managed accounts

### Hyperliquid DEX Trading Tools (9 tools):
21. **hyperliquid_get_account** - Get account info, balance, and positions
22. **hyperliquid_get_price** - Get current prices on Hyperliquid
23. **hyperliquid_open_long** - ⚠️ Open a LONG perpetual position
24. **hyperliquid_open_short** - ⚠️ Open a SHORT perpetual position
25. **hyperliquid_close_position** - ⚠️ Close an open position
26. **hyperliquid_get_positions** - View all open positions with PnL
27. **hyperliquid_set_leverage** - Set leverage (cross or isolated margin)
28. **hyperliquid_get_available_coins** - List all tradeable perpetual markets
29. **hyperliquid_transfer** - ⚠️ Transfer USDC between perp and spot

## Trading Guidelines

### Before Trading:
- Always check wallet balance first
- Get a swap quote to show expected output
- Warn about high price impact (>1%)
- Ask for confirmation before executing trades

### Token Addresses:
- SOL (wrapped): So11111111111111111111111111111111111111112
- When users mention symbols, search first to get mint address

### For CDP Managed Accounts (MAINNET):
- CDP accounts operate on Solana **mainnet** - uses real SOL
- Faucet does NOT work on mainnet - fund accounts manually
- Always verify addresses before sending transactions
- Transactions are irreversible

### For Hyperliquid DEX Trading:
- Trade BTC, ETH, SOL, and many other perpetual contracts
- Uses USDC as collateral
- Check account with **hyperliquid_get_account** first
- Set leverage with **hyperliquid_set_leverage** before trading
- Use cross margin (is_cross=True) for better liquidation protection
- Common coins: BTC, ETH, SOL, DOGE, WIF, PEPE, ARB, OP, SUI

### Best Practices:
- Be concise but informative
- Format numbers clearly (commas, 4 decimal places)
- Show transaction signatures after trades
- Record important decisions and research using notes
- Warn about low liquidity or new tokens

### Safety:
- Never expose private keys
- Verify token addresses
- Check security info when available
- Warn about rug pull risks

## Session Memory

Use the note tools to remember:
- Token research (category: research)
- Trade results (category: trade)
- Market observations (category: market)
- User preferences (category: preference)
- Watchlist items (category: watchlist)

This helps maintain context across conversations.

Ready to trade! What would you like to do?
"""


class SolanaAgent:
    """Full-featured Solana Trading Agent with all capabilities."""
    
    def __init__(
        self,
        config: SolanaAgentConfig,
        system_prompt: str = None,
    ):
        """
        Initialize the Solana Trading Agent.
        
        Args:
            config: Agent configuration
            system_prompt: Custom system prompt (uses default if not provided)
        """
        self.config = config
        self.system_prompt = system_prompt or SYSTEM_PROMPT
        
        # Clients
        self.bags_client: Optional[BagsClient] = None
        self.helius_client: Optional[HeliusClient] = None
        self.birdeye_client: Optional[BirdeyeClient] = None
        self.llm_client: Optional[LLMClient] = None
        
        # Tools and messages
        self.tools: list[Tool] = []
        self.messages: list[Message] = []
        
        # Agent settings
        self.max_steps = config.agent.max_steps
        self.workspace_dir = Path(config.agent.workspace_dir)
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        
        # Stats
        self.total_steps = 0
        self.total_tool_calls = 0
        self.api_total_tokens = 0
    
    async def initialize(self):
        """Initialize all clients and tools."""
        print(f"{Colors.CYAN}🚀 Initializing MAWD Solana Trading Agent...{Colors.RESET}")
        
        # Initialize Bags client
        print(f"{Colors.DIM}   → Connecting to Bags API...{Colors.RESET}")
        self.bags_client = BagsClient(
            api_key=self.config.solana.bags_api_key,
            config_key=self.config.solana.bags_config_key,
            rpc_url=self.config.solana.helius_rpc_url,
            private_key=self.config.wallet.private_key,
        )
        
        # Initialize Helius client
        print(f"{Colors.DIM}   → Connecting to Helius RPC...{Colors.RESET}")
        self.helius_client = HeliusClient(
            api_key=self.config.solana.helius_api_key,
            rpc_url=self.config.solana.helius_rpc_url,
            wss_url=self.config.solana.helius_wss_url,
        )
        
        # Initialize Birdeye client
        print(f"{Colors.DIM}   → Connecting to Birdeye API...{Colors.RESET}")
        self.birdeye_client = BirdeyeClient(
            api_key=self.config.solana.birdeye_api_key,
        )
        
        # Initialize CDP client if available
        cdp_client = None
        if CDP_AVAILABLE and hasattr(self.config, 'cdp') and self.config.cdp.api_key_id:
            network_name = "mainnet" if self.config.cdp.network == "solana-mainnet" else "devnet"
            try:
                print(f"{Colors.DIM}   → Connecting to Coinbase CDP ({network_name})...{Colors.RESET}")
                cdp_client = create_cdp_client(
                    api_key_id=self.config.cdp.api_key_id,
                    api_key_secret=self.config.cdp.api_key_secret,
                    wallet_secret=self.config.cdp.wallet_secret,
                    rpc_url=self.config.cdp.rpc_url,
                    network=self.config.cdp.network,
                )
                if cdp_client:
                    print(f"{Colors.GREEN}   ✓ CDP connected ({network_name}){Colors.RESET}")
                else:
                    print(f"{Colors.YELLOW}   ⚠️  CDP SDK not available{Colors.RESET}")
            except Exception as e:
                print(f"{Colors.YELLOW}   ⚠️  CDP unavailable: {e}{Colors.RESET}")
                cdp_client = None

        # Initialize Hyperliquid client if available
        hyperliquid_client = None
        if HYPERLIQUID_AVAILABLE and hasattr(self.config, 'hyperliquid') and self.config.hyperliquid.wallet:
            try:
                print(f"{Colors.DIM}   → Connecting to Hyperliquid DEX...{Colors.RESET}")
                hyperliquid_client = HyperliquidClient(
                    wallet_address=self.config.hyperliquid.wallet,
                    private_key=self.config.hyperliquid.private_key,
                    use_testnet=self.config.hyperliquid.use_testnet,
                )
                print(f"{Colors.GREEN}   ✓ Hyperliquid connected (perpetuals trading){Colors.RESET}")
            except Exception as e:
                print(f"{Colors.YELLOW}   ⚠️  Hyperliquid unavailable: {e}{Colors.RESET}")
                hyperliquid_client = None

        # Set clients for trading tools
        set_solana_clients(
            bags_client=self.bags_client,
            helius_client=self.helius_client,
            birdeye_client=self.birdeye_client,
            cdp_client=cdp_client,
            hyperliquid_client=hyperliquid_client,
        )
        
        # Create tools
        self.tools = []
        
        # Add trading tools
        if self.config.tools.enable_trading:
            trading_tools = create_all_trading_tools()
            self.tools.extend(trading_tools)
            print(f"{Colors.DIM}   → Loaded {len(trading_tools)} trading tools{Colors.RESET}")
        
        # Add note tools
        if self.config.tools.enable_note:
            memory_file = str(self.workspace_dir / self.config.tools.memory_file)
            note_tools = [
                TradingNoteTool(memory_file=memory_file),
                RecallTradingNoteTool(memory_file=memory_file),
                ClearTradingNotesTool(memory_file=memory_file),
            ]
            self.tools.extend(note_tools)
            print(f"{Colors.DIM}   → Loaded {len(note_tools)} note tools{Colors.RESET}")
        
        # Initialize LLM client
        print(f"{Colors.DIM}   → Connecting to LLM ({self.config.llm.model})...{Colors.RESET}")
        self.llm_client = LLMClient(
            api_key=self.config.llm.api_key,
            api_base=self.config.llm.api_base,
            model=self.config.llm.model,
            max_tokens=self.config.llm.max_tokens,
        )
        
        # Initialize message history
        workspace_info = f"\n\n## Workspace\nWorking directory: `{self.workspace_dir.absolute()}`"
        wallet_info = f"\n\n## Wallet\nAddress: `{self.config.wallet.address}`"
        full_prompt = self.system_prompt + workspace_info + wallet_info
        
        self.messages = [Message(role="system", content=full_prompt)]
        
        # Check wallet
        if self.bags_client.wallet_pubkey:
            print(f"{Colors.GREEN}   ✓ Wallet: {self.bags_client.wallet_pubkey}{Colors.RESET}")
            try:
                balance = await self.helius_client.get_sol_balance(self.bags_client.wallet_pubkey)
                print(f"{Colors.GREEN}   ✓ Balance: {balance:.4f} SOL{Colors.RESET}")
            except Exception as e:
                print(f"{Colors.YELLOW}   ⚠️  Could not fetch balance: {e}{Colors.RESET}")
        
        print(f"{Colors.BRIGHT_GREEN}✓ Agent initialized with {len(self.tools)} tools!{Colors.RESET}\n")
    
    def add_user_message(self, content: str):
        """Add a user message to history."""
        self.messages.append(Message(role="user", content=content))
    
    async def run(self, cancel_event: Optional[asyncio.Event] = None) -> str:
        """
        Execute agent loop until task is complete or max steps reached.
        
        Args:
            cancel_event: Optional event to cancel execution
            
        Returns:
            Final response content
        """
        step = 0
        run_start_time = perf_counter()
        
        while step < self.max_steps:
            if cancel_event and cancel_event.is_set():
                return "Task cancelled."
            
            step += 1
            self.total_steps += 1
            step_start_time = perf_counter()
            
            # Step header
            print(f"\n{Colors.DIM}╭{'─' * 58}╮{Colors.RESET}")
            print(f"{Colors.DIM}│{Colors.RESET} {Colors.BOLD}{Colors.BRIGHT_CYAN}💭 Step {step}/{self.max_steps}{Colors.RESET}{' ' * 40}{Colors.DIM}│{Colors.RESET}")
            print(f"{Colors.DIM}╰{'─' * 58}╯{Colors.RESET}")
            
            # Get LLM response
            try:
                response = await self.llm_client.generate(self.messages, self.tools)
            except Exception as e:
                print(f"{Colors.BRIGHT_RED}❌ LLM Error: {e}{Colors.RESET}")
                return f"Error: {e}"
            
            # Track tokens
            if response.usage:
                self.api_total_tokens = response.usage.get("total_tokens", 0)
            
            # Add assistant message
            self.messages.append(Message(
                role="assistant",
                content=response.content,
                thinking=response.thinking,
                tool_calls=response.tool_calls,
            ))
            
            # Print thinking
            if response.thinking:
                print(f"\n{Colors.BOLD}{Colors.MAGENTA}🧠 Thinking:{Colors.RESET}")
                print(f"{Colors.DIM}{response.thinking[:500]}...{Colors.RESET}" if len(response.thinking) > 500 else f"{Colors.DIM}{response.thinking}{Colors.RESET}")
            
            # Print response
            if response.content:
                print(f"\n{Colors.BOLD}{Colors.BRIGHT_BLUE}🤖 Assistant:{Colors.RESET}")
                print(response.content)
            
            # If no tool calls, we're done
            if not response.tool_calls:
                elapsed = perf_counter() - step_start_time
                print(f"\n{Colors.DIM}⏱️  Completed in {elapsed:.2f}s{Colors.RESET}")
                return response.content
            
            # Execute tool calls
            for tool_call in response.tool_calls:
                self.total_tool_calls += 1
                
                print(f"\n{Colors.BRIGHT_YELLOW}🔧 Tool Call:{Colors.RESET} {Colors.BOLD}{Colors.CYAN}{tool_call.name}{Colors.RESET}")
                
                # Truncate arguments for display
                args_str = json.dumps(tool_call.arguments, indent=2)
                if len(args_str) > 200:
                    args_str = args_str[:200] + "..."
                print(f"{Colors.DIM}   Args: {args_str}{Colors.RESET}")
                
                # Find and execute tool
                tool = None
                for t in self.tools:
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
                
                # Print result
                if result.success:
                    preview = result.content[:300] + "..." if len(result.content) > 300 else result.content
                    print(f"{Colors.BRIGHT_GREEN}✓ Result:{Colors.RESET} {preview}")
                else:
                    print(f"{Colors.BRIGHT_RED}✗ Error:{Colors.RESET} {result.error}")
                
                # Add tool result message
                self.messages.append(Message(
                    role="tool",
                    content=result.content if result.success else f"Error: {result.error}",
                    tool_call_id=tool_call.id,
                    name=tool_call.name,
                ))
            
            elapsed = perf_counter() - step_start_time
            total_elapsed = perf_counter() - run_start_time
            print(f"\n{Colors.DIM}⏱️  Step {step} in {elapsed:.2f}s (total: {total_elapsed:.2f}s){Colors.RESET}")
        
        return f"Max steps ({self.max_steps}) reached."
    
    async def process_message(self, user_message: str) -> str:
        """Process a user message and return the response."""
        self.add_user_message(user_message)
        return await self.run()
    
    async def run_interactive(self):
        """Run the agent in interactive mode."""
        
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'═' * 60}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}   🌊 MAWD - Solana Trading Agent{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'═' * 60}{Colors.RESET}")
        print(f"{Colors.DIM}Type your message and press Enter. Type 'quit' to exit.{Colors.RESET}")
        print(f"{Colors.DIM}Commands: /balance, /portfolio, /trending, /notes, /help, /stats{Colors.RESET}\n")
        
        while True:
            try:
                user_input = input(f"{Colors.BOLD}{Colors.GREEN}You:{Colors.RESET} ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ["quit", "exit", "q", "/quit", "/exit", "/q"]:
                    self._print_stats()
                    print(f"\n{Colors.CYAN}👋 Goodbye!{Colors.RESET}")
                    break
                
                # Handle special commands
                if user_input.startswith("/"):
                    cmd = user_input.lower()
                    if cmd == "/balance":
                        user_input = "Check my wallet balance"
                    elif cmd == "/portfolio":
                        user_input = "Show my complete portfolio with USD values"
                    elif cmd == "/trending":
                        user_input = "What are the top 10 trending tokens right now?"
                    elif cmd == "/notes":
                        user_input = "Recall all my trading notes"
                    elif cmd == "/stats":
                        self._print_stats()
                        continue
                    elif cmd == "/clear":
                        self.messages = [self.messages[0]]  # Keep system prompt
                        print(f"{Colors.CYAN}✓ Conversation cleared{Colors.RESET}")
                        continue
                    elif cmd == "/help":
                        self._print_help()
                        continue
                
                # Process the message
                await self.process_message(user_input)
                
            except KeyboardInterrupt:
                self._print_stats()
                print(f"\n\n{Colors.CYAN}👋 Goodbye!{Colors.RESET}")
                break
            except Exception as e:
                print(f"{Colors.BRIGHT_RED}Error: {e}{Colors.RESET}")
    
    def _print_help(self):
        """Print help message."""
        print(f"""
{Colors.CYAN}Available Commands:{Colors.RESET}
  /balance   - Check wallet balance
  /portfolio - Show complete portfolio
  /trending  - Show trending tokens
  /notes     - Show saved trading notes
  /stats     - Show session statistics
  /clear     - Clear conversation history
  /help      - Show this help
  /quit      - Exit the agent

{Colors.CYAN}Example Queries:{Colors.RESET}
  "What's the price of BONK?"
  "Search for tokens named PEPE"
  "Get info on token <mint_address>"
  "Buy 0.1 SOL worth of <token_mint>"
  "Remember that I'm interested in meme coins"
  "What tokens have I researched?"
""")
    
    def _print_stats(self):
        """Print session statistics."""
        print(f"""
{Colors.CYAN}📊 Session Statistics:{Colors.RESET}
  Steps: {self.total_steps}
  Tool calls: {self.total_tool_calls}
  Messages: {len(self.messages)}
  Tokens: ~{self.api_total_tokens}
""")
    
    async def close(self):
        """Clean up resources."""
        if self.bags_client:
            await self.bags_client.close()
        if self.helius_client:
            await self.helius_client.close()
        if self.birdeye_client:
            await self.birdeye_client.close()
        if self.llm_client:
            await self.llm_client.close()


async def main():
    """Main entry point."""
    
    # Load configuration
    try:
        env_path = Path(__file__).parent.parent.parent / ".env.local"
        if not env_path.exists():
            env_path = None
        
        config = load_config(str(env_path) if env_path else None)
    except ValueError as e:
        print(f"{Colors.BRIGHT_RED}Configuration Error: {e}{Colors.RESET}")
        print(f"{Colors.DIM}Please ensure your .env.local file contains all required variables.{Colors.RESET}")
        sys.exit(1)
    
    # Create and run agent
    agent = SolanaAgent(config)
    
    try:
        await agent.initialize()
        await agent.run_interactive()
    finally:
        await agent.close()


if __name__ == "__main__":
    asyncio.run(main())
