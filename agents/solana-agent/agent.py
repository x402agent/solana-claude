"""Solana Trading Agent - Main Entry Point"""


import asyncio
import json
import sys
from pathlib import Path
from typing import Optional
from time import perf_counter

import httpx

from config import load_config, SolanaAgentConfig
from clients.bags_client import BagsClient
from clients.jupiter_client import JupiterClient
from clients.helius_client import HeliusClient
from clients.birdeye_client import BirdeyeClient
from clients.twitter_client import TwitterClient
from clients.minimax_client import MinimaxClient
from clients.search_client import SearchAPIClient
from clients.solana_analyzer import SolanaAnalyzer
from clients.aster_client import AsterClient
from clients.hyperliquid_client import HyperliquidClient
from clients.cdp_client import create_cdp_client
from clients.coingecko_client import create_coingecko_client
from tools.solana_tools import set_clients, create_all_tools, ToolResult


# ANSI color codes
class Colors:
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


SYSTEM_PROMPT = """You are MAWD, an AI-powered Solana trading agent. You help users trade tokens, check balances,
analyze market data, manage their Solana wallet portfolio, trade perpetuals on Aster DEX and Hyperliquid, and share updates on Twitter/X.

## Your Capabilities
You have access to the following tools for interacting with the Solana blockchain and social media:

### Solana Trading & Portfolio Tools:
1. **get_wallet_balance** - Check SOL and token balances for any wallet
2. **get_token_price** - Get current price for any Solana token
3. **get_token_info** - Get comprehensive info (price, volume, liquidity, holders, etc.)
4. **get_swap_quote** - Get a quote for a token swap without executing
5. **buy_token** - Buy tokens with SOL (CAUTION: Real trades!)
6. **sell_token** - Sell tokens for SOL (CAUTION: Real trades!)
7. **get_portfolio** - Get complete portfolio with USD values
8. **get_trending_tokens** - Discover trending tokens
9. **search_token** - Search for tokens by name or symbol

### Aster DEX Trading Tools (Perpetuals & Spot):
10. **aster_open_long** - Open a LONG perpetual position (bet price goes UP)
11. **aster_open_short** - Open a SHORT perpetual position (bet price goes DOWN)
12. **aster_close_position** - Close an open perpetual position (LONG or SHORT)
13. **aster_get_positions** - View all open perpetual positions with PnL
14. **aster_set_leverage** - Set leverage (1x-125x) for a trading pair
15. **aster_spot_buy** - Buy tokens on Aster spot market
16. **aster_spot_sell** - Sell tokens on Aster spot market
17. **aster_get_balance** - Get futures and spot account balances
18. **aster_transfer** - Transfer funds between futures and spot accounts
19. **aster_get_price** - Get current price and 24h stats for trading pairs

### Hyperliquid DEX Trading Tools (Perpetuals):
20. **hyperliquid_get_account** - Get Hyperliquid account info, balance, margin summary, and positions
21. **hyperliquid_get_price** - Get current prices for assets on Hyperliquid
22. **hyperliquid_open_long** - Open a LONG perpetual position on Hyperliquid
23. **hyperliquid_open_short** - Open a SHORT perpetual position on Hyperliquid
24. **hyperliquid_close_position** - Close an open position (full or partial)
25. **hyperliquid_get_positions** - View all open positions with PnL
26. **hyperliquid_set_leverage** - Set leverage (cross or isolated margin)
27. **hyperliquid_place_limit_order** - Place limit orders at specific prices
28. **hyperliquid_cancel_order** - Cancel open orders
29. **hyperliquid_get_open_orders** - View all pending orders
30. **hyperliquid_get_trade_history** - View recent trades (fills)
31. **hyperliquid_get_available_coins** - List all tradeable perpetual markets
32. **hyperliquid_transfer** - Transfer USDC between perp and spot accounts
33. **hyperliquid_get_asset_ids** - Get asset IDs for perpetuals and spot (important for API calls)
34. **hyperliquid_spot_order** - Place spot orders on Hyperliquid (HYPE, PURR, etc.)

### CDP (Coinbase Developer Platform) Account Management:
33. **cdp_create_account** - Create a new custodial Solana account managed by CDP (mainnet)
34. **cdp_request_faucet** - Request SOL from faucet (DEVNET ONLY - will error on mainnet)
35. **cdp_get_balance** - Check SOL balance for any address
36. **cdp_send_sol** - Send real SOL from CDP-managed accounts (secure, no private keys exposed)
37. **cdp_list_accounts** - List all CDP-managed Solana accounts in your project

### Advanced Wallet Analytics:
20. **get_wallet_net_worth** - Get detailed net worth breakdown with all assets and USD values
21. **get_wallet_net_worth_chart** - View historical net worth changes over time (daily charts)
22. **get_wallet_pnl** - Get comprehensive Profit & Loss data (realized/unrealized profits, win rate, trade stats)

### Token Charts & Analysis:
23. **get_token_chart** - Get OHLCV candlestick chart data (Open, High, Low, Close, Volume) with price action and trading volume for technical analysis
24. **analyze_token_security** - Analyze any Solana token for security risks, ownership, creation info. Get full analysis with rug pull risk assessment

### Social Media Tools:
25. **post_to_twitter** - Post tweets to share trading updates, portfolio performance, token discoveries, or alerts

### Creative & Multimodal Tools:
26. **generate_image** - Generate AI images from text (memes, logos, charts, NFT art, visual content)
27. **generate_music** - Generate AI music from text (background music, theme songs, audio content with or without lyrics)
28. **generate_video** - Generate AI videos from text (promotional videos, animations, explainers)
29. **text_to_speech** - Convert text to natural-sounding speech (voiceovers, announcements, narration)

### Real-Time Search & Analysis:
30. **web_search** - Search the web in real-time for current information, news, market data, trending topics
31. **analyze_solana_address** - Analyze ANY Solana address (automatically detects if it's a token contract, wallet, or transaction and provides comprehensive real-time data)

### CDP (Coinbase Developer Platform) Tools - Managed Solana Accounts (Devnet):
32. **cdp_create_account** - Create a new CDP-managed Solana account (secure custodial account)
33. **cdp_list_accounts** - List all CDP-managed Solana accounts in your project
34. **cdp_request_faucet** - Request devnet SOL from faucet for testing
35. **cdp_get_balance** - Get SOL balance for any Solana address
36. **cdp_send_sol** - Send SOL from a CDP-managed account to another address

### CoinGecko Market Data Tools - Real-Time Cryptocurrency Analytics:
37. **get_crypto_price** - Get current prices, market cap, volume, and 24hr change for cryptocurrencies (Bitcoin, Ethereum, Solana, etc.)
38. **get_coin_market_data** - Get comprehensive market data with detailed metrics, rankings, and price change percentages
39. **get_trending_cryptos** - Get trending cryptocurrencies based on search activity in the last 24 hours
40. **search_crypto** - Search for cryptocurrencies by name or symbol to find coin IDs for other tools
41. **get_global_crypto_stats** - Get global cryptocurrency market statistics (total market cap, volume, BTC dominance, etc.)

## Important Guidelines

### For Trading Operations:
- Always check balances before trading
- Get a quote first to show expected output before executing trades
- Warn users about price impact if it's high (>1%)
- Confirm with users before executing actual trades (buy_token, sell_token)
- Use appropriate slippage (default 3% = 300 bps, higher for volatile tokens)

### For Aster DEX Trading:
- **Perpetuals Trading**: High risk! Always warn about leverage and liquidation risks
  - LONG = Bet price goes UP (buy to open, sell to close)
  - SHORT = Bet price goes DOWN (sell to open, buy to close)
  - Set leverage BEFORE opening positions (default is often 20x)
  - Monitor positions with aster_get_positions to see unrealized PnL
  - Common pairs: BTCUSDT, ETHUSDT, SOLUSDT
- **Spot Trading**: Traditional buy/sell on Aster's spot exchange
  - MARKET orders execute immediately at current price
  - LIMIT orders execute at your specified price (or better)
  - Use aster_get_balance to see both futures and spot balances
  - Transfer funds between futures/spot with aster_transfer
- **Risk Management**:
  - Higher leverage = higher risk and faster liquidation
  - Always check aster_get_price before placing orders
  - Close losing positions before liquidation
  - Never risk more than you can afford to lose

### For Hyperliquid DEX Trading:
- **Hyperliquid Overview**: Leading decentralized perpetuals exchange with deep liquidity
  - Trade BTC, ETH, SOL, and many other perpetual contracts
  - Cross margin (default) or isolated margin modes
  - Uses USDC as collateral
- **Trading Flow**:
  1. Check account with **hyperliquid_get_account** to see balance and positions
  2. Check prices with **hyperliquid_get_price** before trading
  3. Set leverage with **hyperliquid_set_leverage** (cross margin recommended for beginners)
  4. Open positions with **hyperliquid_open_long** or **hyperliquid_open_short**
  5. Monitor positions with **hyperliquid_get_positions**
  6. Close with **hyperliquid_close_position** to take profit or cut losses
- **Order Types**:
  - Market orders for immediate execution (hyperliquid_open_long/short)
  - Limit orders for specific entry prices (hyperliquid_place_limit_order)
  - Cancel pending orders with hyperliquid_cancel_order
- **Risk Management**:
  - Use **cross margin** (is_cross=True) for better liquidation protection
  - Use **isolated margin** (is_cross=False) to limit risk to specific position
  - Check hyperliquid_get_positions regularly for unrealized PnL
  - Close losing positions before liquidation
  - Common coins: BTC, ETH, SOL, DOGE, WIF, PEPE, ARB, OP, SUI, SEI, TIA

### For CDP Managed Accounts (Mainnet):
- **CDP Overview**: Coinbase Developer Platform provides secure, custodial Solana accounts
  - Accounts are managed by CDP - private keys never exposed
  - Operates on Solana **mainnet** - real SOL and real transactions
  - Create accounts and send transactions securely
- **Typical Workflow**:
  1. Create an account with **cdp_create_account**
  2. Fund the account by sending SOL to it from an external wallet
  3. Check balance with **cdp_get_balance**
  4. Send SOL with **cdp_send_sol**
  5. List all accounts with **cdp_list_accounts**
- **Important Notes**:
  - CDP accounts are on **mainnet** - uses real SOL with real value
  - Faucet (cdp_request_faucet) does NOT work on mainnet - fund manually
  - Always verify addresses before sending transactions
  - Transactions are irreversible on mainnet

### For CoinGecko Market Data:
- **CoinGecko Overview**: Real-time cryptocurrency market data from CoinGecko Pro API
  - Get live prices, market caps, volumes, and price changes for 10,000+ cryptocurrencies
  - Track trending coins and global market statistics
  - Use coin IDs (e.g., 'bitcoin', 'ethereum', 'solana') not ticker symbols
- **Typical Usage**:
  1. Search coins with **search_crypto** to find exact coin IDs
  2. Get prices with **get_crypto_price** for quick price checks
  3. Get detailed data with **get_coin_market_data** for comprehensive analysis
  4. Check trends with **get_trending_cryptos** to discover hot coins
  5. Monitor markets with **get_global_crypto_stats** for big picture view
- **Coin ID Examples**:
  - Bitcoin: 'bitcoin' (not 'BTC')
  - Ethereum: 'ethereum' (not 'ETH')
  - Solana: 'solana' (not 'SOL')
  - Dogecoin: 'dogecoin' (not 'DOGE')
  - Use search_crypto when unsure about the exact coin ID

### Unified Search & Analysis:
- **Web Search**: Use **web_search** for real-time information not in your knowledge (news, current prices, market trends, events)
- **Solana Address Analysis**: When users paste ANY Solana address:
  - Use **analyze_solana_address** - it automatically detects the type and returns comprehensive data:
    - Token contracts (32-44 chars): Full token info, price, market cap, security analysis, OHLCV charts
    - Wallet addresses (32-44 chars): SOL balance, token holdings, NFTs, total assets
    - Transaction signatures (88 chars): Transaction details, status, fees, involved accounts
  - Example addresses: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" (token), "FZZFTXvg..." (wallet)
  - The tool intelligently routes to the right API (Birdeye/Helius/DAS) based on detection
- SOL wrapped token: So11111111111111111111111111111111111111112

### Best Practices:
- Be concise but informative
- Format numbers clearly (use commas for large numbers, limit decimals)
- Always show transaction signatures after trades
- Explain any failures clearly

### Safety:
- Never expose private keys
- Verify token addresses before trading
- Warn about rug pull risks for new/low liquidity tokens
- Check token security info when available

### Twitter Posting:
- Post updates about successful trades, portfolio gains, or interesting token discoveries
- Keep tweets under 280 characters
- Use emojis and relevant hashtags to increase engagement
- Share trading insights, market observations, or notable price movements
- Be enthusiastic but not overly promotional
- Examples:
  * "Just bought 100 SOL of $BONK at $0.000015! 🚀 #Solana #MemeCoin"
  * "Portfolio up 25% today! $WIF and $BONK carrying the team 📈💎"
  * "Found a potential gem: $XYZ at $10M mcap, strong community and growing liquidity 🔍"

### Creative Content Generation:
- Generate images for memes, promotional content, charts, or visual explanations
- Create music for trading videos, celebration sounds, or background audio
- Generate videos for announcements, promotional content, or explainer videos
- Convert text to speech for voiceovers, audio alerts, or announcements
- These tools enable rich multimedia content creation for marketing and community engagement

### Chart Analysis & OHLCV Data:
- Use **get_token_chart** to provide technical analysis data
- OHLCV = Open, High, Low, Close, Volume candlestick data
- Available timeframes: 1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M
- Charts help identify: trends, support/resistance, volume spikes, price patterns
- When analyzing a token, ALWAYS provide chart data alongside security analysis
- Explain what the price action shows (trending up/down, consolidating, volatile, etc.)

## Current Wallet
The agent is configured with your trading wallet. Use get_wallet_balance without arguments to check your balances.

Let's start trading! What would you like to do?
"""


class Message:
    """Simple message class for conversation history."""
    def __init__(self, role: str, content: str, tool_calls=None, tool_call_id=None, name=None):
        self.role = role
        self.content = content
        self.tool_calls = tool_calls
        self.tool_call_id = tool_call_id
        self.name = name
    
    def to_dict(self) -> dict:
        d = {"role": self.role, "content": self.content}
        if self.tool_calls:
            d["tool_calls"] = self.tool_calls
        if self.tool_call_id:
            d["tool_call_id"] = self.tool_call_id
        if self.name:
            d["name"] = self.name
        return d


class OpenRouterClient:
    """Simple client for OpenRouter API."""
    
    def __init__(self, api_key: str, model: str = "anthropic/claude-sonnet-4"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://openrouter.ai/api/v1"
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=120.0
        )
    
    async def generate(self, messages: list[Message], tools: list) -> dict:
        """Generate a response from the LLM."""
        
        # Convert messages to OpenAI format
        formatted_messages = []
        for msg in messages:
            if msg.role == "system":
                formatted_messages.append({"role": "system", "content": msg.content})
            elif msg.role == "user":
                formatted_messages.append({"role": "user", "content": msg.content})
            elif msg.role == "assistant":
                m = {"role": "assistant", "content": msg.content or ""}
                if msg.tool_calls:
                    m["tool_calls"] = msg.tool_calls
                formatted_messages.append(m)
            elif msg.role == "tool":
                formatted_messages.append({
                    "role": "tool",
                    "content": msg.content,
                    "tool_call_id": msg.tool_call_id,
                    "name": msg.name,
                })
        
        # Convert tools to OpenAI format
        formatted_tools = [tool.to_openai_schema() for tool in tools]
        
        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "tools": formatted_tools,
            "tool_choice": "auto",
        }
        
        response = await self._client.post("/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()
        
        return data["choices"][0]["message"]
    
    async def close(self):
        await self._client.aclose()


class OllamaClient:
    """Simple client for Ollama API (OpenAI-compatible)."""

    def __init__(self, base_url: str = "http://localhost:11434/v1", model: str = "minimax-m2.1:cloud"):
        self.model = model
        self.base_url = base_url
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Content-Type": "application/json",
            },
            timeout=120.0
        )

    async def generate(self, messages: list[Message], tools: list) -> dict:
        """Generate a response from the LLM."""

        # Convert messages to OpenAI format
        formatted_messages = []
        for msg in messages:
            if msg.role == "system":
                formatted_messages.append({"role": "system", "content": msg.content})
            elif msg.role == "user":
                formatted_messages.append({"role": "user", "content": msg.content})
            elif msg.role == "assistant":
                m = {"role": "assistant", "content": msg.content or ""}
                if msg.tool_calls:
                    m["tool_calls"] = msg.tool_calls
                formatted_messages.append(m)
            elif msg.role == "tool":
                formatted_messages.append({
                    "role": "tool",
                    "content": msg.content,
                    "tool_call_id": msg.tool_call_id,
                    "name": msg.name,
                })

        # Convert tools to OpenAI format
        formatted_tools = [tool.to_openai_schema() for tool in tools]

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "tools": formatted_tools,
            "tool_choice": "auto",
        }

        response = await self._client.post("/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()

        return data["choices"][0]["message"]

    async def close(self):
        await self._client.aclose()


class SolanaAgent:
    """Main Solana Trading Agent."""
    
    def __init__(self, config: SolanaAgentConfig):
        self.config = config
        self.bags_client = None
        self.jupiter_client = None
        self.helius_client = None
        self.birdeye_client = None
        self.twitter_client = None
        self.minimax_client = None
        self.aster_client = None
        self.hyperliquid_client = None
        self.cdp_client = None
        self.coingecko_client = None
        self.llm_client = None
        self.messages = []
        self.max_steps = config.max_steps
    
    async def initialize(self):
        """Initialize all clients and tools."""
        print(f"{Colors.CYAN}🚀 Initializing Solana Trading Agent...{Colors.RESET}")

        # Initialize Jupiter client (preferred)
        if self.config.jupiter_api_key:
            print(f"{Colors.DIM}   → Connecting to Jupiter Ultra API...{Colors.RESET}")
            from solders.keypair import Keypair

            # Initialize keypair if private key is available
            keypair = None
            if self.config.private_key:
                try:
                    keypair = Keypair.from_base58_string(self.config.private_key)
                except Exception as e:
                    print(f"{Colors.YELLOW}   ⚠️  Could not load keypair: {e}{Colors.RESET}")

            self.jupiter_client = JupiterClient(
                api_key=self.config.jupiter_api_key,
                wallet_pubkey=self.config.wallet_address,
                keypair=keypair,
                referral_account=self.config.jupiter_referral_account,
            )
            print(f"{Colors.GREEN}   ✓ Jupiter Ultra initialized (preferred trading API){Colors.RESET}")
        else:
            print(f"{Colors.DIM}   → Jupiter API not configured{Colors.RESET}")

        # Initialize Bags client (legacy, optional)
        if self.config.bags_api_key and self.config.bags_config_key:
            print(f"{Colors.DIM}   → Connecting to Bags API (legacy)...{Colors.RESET}")
            self.bags_client = BagsClient(
                api_key=self.config.bags_api_key,
                config_key=self.config.bags_config_key,
                rpc_url=self.config.helius_rpc_url,
                private_key=self.config.private_key,
            )
            print(f"{Colors.GREEN}   ✓ Bags client initialized (legacy trading API){Colors.RESET}")
        else:
            print(f"{Colors.DIM}   → Bags API not configured (legacy){Colors.RESET}")
        
        # Initialize Helius client
        print(f"{Colors.DIM}   → Connecting to Helius RPC...{Colors.RESET}")
        self.helius_client = HeliusClient(
            api_key=self.config.helius_api_key,
            rpc_url=self.config.helius_rpc_url,
            wss_url=self.config.helius_wss_url,
        )
        
        # Initialize Birdeye client
        print(f"{Colors.DIM}   → Connecting to Birdeye API...{Colors.RESET}")
        self.birdeye_client = BirdeyeClient(
            api_key=self.config.birdeye_api_key,
        )

        # Initialize Twitter client (optional)
        if (self.config.twitter_consumer_key and self.config.twitter_consumer_secret and
            self.config.twitter_access_token and self.config.twitter_access_token_secret):
            print(f"{Colors.DIM}   → Connecting to Twitter API...{Colors.RESET}")
            self.twitter_client = TwitterClient(
                consumer_key=self.config.twitter_consumer_key,
                consumer_secret=self.config.twitter_consumer_secret,
                access_token=self.config.twitter_access_token,
                access_token_secret=self.config.twitter_access_token_secret,
                bearer_token=self.config.twitter_bearer_token,
            )
            print(f"{Colors.GREEN}   ✓ Twitter client initialized{Colors.RESET}")
        else:
            print(f"{Colors.DIM}   → Twitter API credentials not configured (optional){Colors.RESET}")

        # Initialize MiniMax client (optional)
        if self.config.minimax_api_key:
            print(f"{Colors.DIM}   → Connecting to MiniMax API...{Colors.RESET}")
            self.minimax_client = MinimaxClient(
                api_key=self.config.minimax_api_key,
            )
            print(f"{Colors.GREEN}   ✓ MiniMax client initialized (image, music, video, TTS){Colors.RESET}")
        else:
            print(f"{Colors.DIM}   → MiniMax API credentials not configured (optional){Colors.RESET}")

        # Initialize Search client (optional)
        if self.config.search_api_key:
            print(f"{Colors.DIM}   → Connecting to SearchAPI...{Colors.RESET}")
            self.search_client = SearchAPIClient(
                api_key=self.config.search_api_key,
            )
            print(f"{Colors.GREEN}   ✓ SearchAPI client initialized (real-time web search){Colors.RESET}")
        else:
            self.search_client = None
            print(f"{Colors.DIM}   → SearchAPI credentials not configured (optional){Colors.RESET}")

        # Initialize Solana Analyzer
        print(f"{Colors.DIM}   → Initializing Solana Analyzer...{Colors.RESET}")
        self.solana_analyzer = SolanaAnalyzer(
            birdeye_api_key=self.config.birdeye_api_key,
            helius_api_key=self.config.helius_api_key,
            helius_rpc_url=self.config.helius_rpc_url,
        )
        print(f"{Colors.GREEN}   ✓ Solana Analyzer initialized (contract/wallet/tx detection){Colors.RESET}")

        # Initialize Aster DEX client (optional)
        if (self.config.aster_api_key and self.config.aster_user_address and
            self.config.aster_signer_address and self.config.aster_private_key):
            print(f"{Colors.DIM}   → Connecting to Aster DEX...{Colors.RESET}")
            self.aster_client = AsterClient(
                user_address=self.config.aster_user_address,
                signer_address=self.config.aster_signer_address,
                private_key=self.config.aster_private_key,
            )
            print(f"{Colors.GREEN}   ✓ Aster DEX client initialized (perpetuals & spot trading){Colors.RESET}")
        else:
            self.aster_client = None
            print(f"{Colors.DIM}   → Aster DEX credentials not configured (optional){Colors.RESET}")

        # Initialize Hyperliquid DEX client (optional)
        if self.config.hyperliquid_wallet and self.config.hyperliquid_private_key:
            print(f"{Colors.DIM}   → Connecting to Hyperliquid DEX...{Colors.RESET}")
            try:
                self.hyperliquid_client = HyperliquidClient(
                    wallet_address=self.config.hyperliquid_wallet,
                    private_key=self.config.hyperliquid_private_key,
                    use_testnet=self.config.hyperliquid_use_testnet,
                )
                print(f"{Colors.GREEN}   ✓ Hyperliquid DEX client initialized (perpetuals trading){Colors.RESET}")
            except Exception as e:
                self.hyperliquid_client = None
                print(f"{Colors.YELLOW}   ⚠️  Could not initialize Hyperliquid: {e}{Colors.RESET}")
        else:
            self.hyperliquid_client = None
            print(f"{Colors.DIM}   → Hyperliquid DEX credentials not configured (optional){Colors.RESET}")

        # Initialize CDP client (optional - for managed Solana accounts)
        if self.config.cdp_api_key_id and self.config.cdp_api_key_secret:
            network_name = "mainnet" if self.config.cdp_network == "solana-mainnet" else "devnet"
            print(f"{Colors.DIM}   → Connecting to CDP (Coinbase Developer Platform) on {network_name}...{Colors.RESET}")
            try:
                self.cdp_client = create_cdp_client(
                    api_key_id=self.config.cdp_api_key_id,
                    api_key_secret=self.config.cdp_api_key_secret,
                    wallet_secret=self.config.cdp_wallet_secret,
                    rpc_url=self.config.cdp_rpc_url,
                    network=self.config.cdp_network,
                )
                if self.cdp_client:
                    print(f"{Colors.GREEN}   ✓ CDP client initialized (managed Solana accounts on {network_name}){Colors.RESET}")
                else:
                    print(f"{Colors.YELLOW}   ⚠️  CDP SDK not available - install with: pip install cdp-sdk{Colors.RESET}")
            except Exception as e:
                self.cdp_client = None
                print(f"{Colors.YELLOW}   ⚠️  Could not initialize CDP: {e}{Colors.RESET}")
        else:
            self.cdp_client = None
            print(f"{Colors.DIM}   → CDP credentials not configured (optional){Colors.RESET}")

        # Initialize CoinGecko client (optional - for real-time crypto market data)
        if self.config.coingecko_api_key:
            print(f"{Colors.DIM}   → Connecting to CoinGecko Pro API...{Colors.RESET}")
            try:
                self.coingecko_client = create_coingecko_client(api_key=self.config.coingecko_api_key)
                if self.coingecko_client:
                    print(f"{Colors.GREEN}   ✓ CoinGecko client initialized (real-time crypto market data){Colors.RESET}")
                else:
                    print(f"{Colors.YELLOW}   ⚠️  CoinGecko client not available{Colors.RESET}")
            except Exception as e:
                self.coingecko_client = None
                print(f"{Colors.YELLOW}   ⚠️  Could not initialize CoinGecko: {e}{Colors.RESET}")
        else:
            self.coingecko_client = None
            print(f"{Colors.DIM}   → CoinGecko API key not configured (optional){Colors.RESET}")

        # Set clients for tools
        set_clients(
            bags_client=self.bags_client,
            jupiter_client=self.jupiter_client,
            helius_client=self.helius_client,
            birdeye_client=self.birdeye_client,
            twitter_client=self.twitter_client,
            minimax_client=self.minimax_client,
            search_client=self.search_client,
            solana_analyzer=self.solana_analyzer,
            aster_client=self.aster_client,
            hyperliquid_client=self.hyperliquid_client,
            cdp_client=self.cdp_client,
            coingecko_client=self.coingecko_client,
        )
        
        # Create tools
        self.tools = create_all_tools()
        print(f"{Colors.DIM}   → Loaded {len(self.tools)} trading tools{Colors.RESET}")
        
        # Initialize LLM client based on provider setting
        if self.config.llm_provider == "ollama":
            print(f"{Colors.DIM}   → Connecting to Ollama ({self.config.ollama_model})...{Colors.RESET}")
            self.llm_client = OllamaClient(
                base_url=self.config.ollama_base_url,
                model=self.config.ollama_model,
            )
            print(f"{Colors.GREEN}   ✓ Ollama client initialized{Colors.RESET}")
        elif self.config.openrouter_api_key:
            print(f"{Colors.DIM}   → Connecting to OpenRouter ({self.config.openrouter_model})...{Colors.RESET}")
            self.llm_client = OpenRouterClient(
                api_key=self.config.openrouter_api_key,
                model=self.config.openrouter_model,
            )
            print(f"{Colors.GREEN}   ✓ OpenRouter client initialized{Colors.RESET}")
        else:
            print(f"{Colors.YELLOW}   ⚠️  No LLM configured - running in tool-only mode{Colors.RESET}")
        
        # Initialize message history
        self.messages = [Message(role="system", content=SYSTEM_PROMPT)]
        
        # Check wallet
        wallet_pubkey = None
        if self.jupiter_client and self.jupiter_client.wallet_pubkey:
            wallet_pubkey = self.jupiter_client.wallet_pubkey
        elif self.bags_client and self.bags_client.wallet_pubkey:
            wallet_pubkey = self.bags_client.wallet_pubkey

        if wallet_pubkey:
            print(f"{Colors.GREEN}   ✓ Wallet: {wallet_pubkey}{Colors.RESET}")
            try:
                balance = await self.helius_client.get_sol_balance(wallet_pubkey)
                print(f"{Colors.GREEN}   ✓ Balance: {balance:.4f} SOL{Colors.RESET}")
            except Exception as e:
                print(f"{Colors.YELLOW}   ⚠️  Could not fetch balance: {e}{Colors.RESET}")
        
        print(f"{Colors.BRIGHT_GREEN}✓ Agent initialized successfully!{Colors.RESET}\n")
    
    async def process_message(self, user_message: str) -> str:
        """Process a user message and return the response."""
        
        if not self.llm_client:
            return "LLM not configured. Please set OPENROUTER_API_KEY."
        
        # Add user message
        self.messages.append(Message(role="user", content=user_message))
        
        step = 0
        while step < self.max_steps:
            step += 1
            
            print(f"\n{Colors.DIM}╭{'─' * 58}╮{Colors.RESET}")
            print(f"{Colors.DIM}│{Colors.RESET} {Colors.BOLD}{Colors.BRIGHT_CYAN}💭 Step {step}/{self.max_steps}{Colors.RESET}{' ' * 40}{Colors.DIM}│{Colors.RESET}")
            print(f"{Colors.DIM}╰{'─' * 58}╯{Colors.RESET}")
            
            # Get LLM response
            start_time = perf_counter()
            try:
                response = await self.llm_client.generate(self.messages, self.tools)
            except Exception as e:
                print(f"{Colors.BRIGHT_RED}❌ LLM Error: {e}{Colors.RESET}")
                return f"Error: {e}"
            
            elapsed = perf_counter() - start_time
            
            # Extract response content
            content = response.get("content", "")
            tool_calls = response.get("tool_calls", None)
            
            # Add assistant message
            self.messages.append(Message(
                role="assistant",
                content=content,
                tool_calls=tool_calls,
            ))
            
            # Print response
            if content:
                print(f"\n{Colors.BOLD}{Colors.BRIGHT_BLUE}🤖 Assistant:{Colors.RESET}")
                print(content)
            
            # If no tool calls, we're done
            if not tool_calls:
                print(f"\n{Colors.DIM}⏱️  Completed in {elapsed:.2f}s{Colors.RESET}")
                return content
            
            # Execute tool calls
            for tool_call in tool_calls:
                tool_call_id = tool_call["id"]
                function_name = tool_call["function"]["name"]
                try:
                    arguments = json.loads(tool_call["function"]["arguments"])
                except json.JSONDecodeError:
                    arguments = {}
                
                print(f"\n{Colors.BRIGHT_YELLOW}🔧 Tool Call:{Colors.RESET} {Colors.BOLD}{Colors.CYAN}{function_name}{Colors.RESET}")
                print(f"{Colors.DIM}   Arguments: {json.dumps(arguments, indent=2)}{Colors.RESET}")
                
                # Find and execute tool
                tool = None
                for t in self.tools:
                    if t.name == function_name:
                        tool = t
                        break
                
                if tool is None:
                    result = ToolResult(success=False, error=f"Unknown tool: {function_name}")
                else:
                    try:
                        result = await tool.execute(**arguments)
                    except Exception as e:
                        result = ToolResult(success=False, error=str(e))
                
                # Print result
                if result.success:
                    result_preview = result.content[:300] + "..." if len(result.content) > 300 else result.content
                    print(f"{Colors.BRIGHT_GREEN}✓ Result:{Colors.RESET} {result_preview}")
                else:
                    print(f"{Colors.BRIGHT_RED}✗ Error:{Colors.RESET} {Colors.RED}{result.error}{Colors.RESET}")
                
                # Add tool result message
                self.messages.append(Message(
                    role="tool",
                    content=result.content if result.success else f"Error: {result.error}",
                    tool_call_id=tool_call_id,
                    name=function_name,
                ))
            
            print(f"\n{Colors.DIM}⏱️  Step {step} completed in {elapsed:.2f}s{Colors.RESET}")
        
        return "Max steps reached."
    
    async def run_interactive(self):
        """Run the agent in interactive mode."""
        
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'═' * 60}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}   🌊 MAWD - Solana Trading Agent{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'═' * 60}{Colors.RESET}")
        print(f"{Colors.DIM}Type your message and press Enter. Type 'quit' to exit.{Colors.RESET}")
        print(f"{Colors.DIM}Commands: /balance, /portfolio, /trending, /help{Colors.RESET}\n")
        
        while True:
            try:
                user_input = input(f"{Colors.BOLD}{Colors.GREEN}You:{Colors.RESET} ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ["quit", "exit", "q"]:
                    print(f"\n{Colors.CYAN}👋 Goodbye!{Colors.RESET}")
                    break
                
                # Handle special commands
                if user_input.startswith("/"):
                    command = user_input.lower()
                    if command == "/balance":
                        user_input = "Check my wallet balance"
                    elif command == "/portfolio":
                        user_input = "Show my complete portfolio with USD values"
                    elif command == "/trending":
                        user_input = "What are the trending tokens right now?"
                    elif command == "/help":
                        print(f"""
{Colors.CYAN}Available Commands:{Colors.RESET}
  /balance   - Check your wallet balance
  /portfolio - Show your complete portfolio
  /trending  - Show trending tokens
  /help      - Show this help message
  
{Colors.CYAN}Example Queries:{Colors.RESET}
  "What's the price of BONK?"
  "Search for tokens named PEPE"
  "Get info on token <mint_address>"
  "Buy 0.1 SOL worth of <token_mint>"
  "Sell 1000 tokens of <token_mint>"
  "Get a swap quote for 0.5 SOL to <token_mint>"
""")
                        continue
                
                # Process the message
                response = await self.process_message(user_input)
                
            except KeyboardInterrupt:
                print(f"\n\n{Colors.CYAN}👋 Goodbye!{Colors.RESET}")
                break
            except Exception as e:
                print(f"{Colors.BRIGHT_RED}Error: {e}{Colors.RESET}")
    
    async def close(self):
        """Clean up resources."""
        if self.bags_client:
            await self.bags_client.close()
        if self.jupiter_client:
            await self.jupiter_client.close()
        if self.helius_client:
            await self.helius_client.close()
        if self.birdeye_client:
            await self.birdeye_client.close()
        if self.aster_client:
            await self.aster_client.close()
        if self.cdp_client:
            await self.cdp_client.close()
        if self.coingecko_client:
            await self.coingecko_client.close()
        if self.llm_client:
            await self.llm_client.close()


async def main():
    """Main entry point."""
    
    # Load configuration
    try:
        # Look for .env.local in parent directory
        env_path = Path(__file__).parent.parent / ".env.local"
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
