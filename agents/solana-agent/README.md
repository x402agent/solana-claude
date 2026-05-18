# MAWDBot - AI-Powered Multi-Chain Trading Agent

**Exfoliate, trade, launch, vibe!**

MAWDBot is an enterprise-grade AI-powered trading agent for Solana and multi-chain DeFi. Built on advanced LLM technology, MAWDBot combines natural language processing with real-time market data, autonomous trading across multiple DEXs, and creative content generation.

## Key Features

- **AI-Powered Intelligence**: Advanced NLP using OpenRouter (Claude, MiniMax) for natural conversation
- **Solana DEX Trading**: Autonomous token swaps via Jupiter API (Meteora, Raydium aggregation)
- **Perpetuals Trading**: LONG/SHORT positions with up to 125x leverage on Aster DEX & Hyperliquid
- **CDP Wallet Management**: Secure custodial Solana accounts via Coinbase Developer Platform
- **Real-Time Market Data**: Live prices from CoinGecko Pro API for 10,000+ cryptocurrencies
- **Real-Time Analytics**: Live market data from Birdeye with trending tokens, charts, and security analysis
- **Unified Address Analysis**: Analyze any Solana address (tokens, wallets, transactions) instantly
- **Web Search Integration**: Real-time market research via SearchAPI, SerpAPI, and XAI
- **Multimodal Content**: Generate images, music, videos, and speech with AI
- **Social Integration**: Automated Twitter/X posting for trade updates
- **Multiple Interfaces**: CLI, Web UI, Telegram Bot, and programmatic API
- **Persistent Memory**: Trading notes and session history that carry across conversations
- **Security First**: Token rug checks, balance verification, and trade confirmations

## Tools Arsenal (46 Tools)

### Solana Trading Tools (9)

| Tool | Description | Example |
|------|-------------|---------|
| `get_wallet_balance` | Check SOL and all token balances | "Check my wallet balance" |
| `get_token_price` | Get current token price from Birdeye | "What's the price of BONK?" |
| `get_token_info` | Comprehensive token data (price, volume, liquidity, holders) | "Get full info on JUP token" |
| `get_swap_quote` | Get swap quote without executing | "Quote for 1 SOL to USDC" |
| `buy_token` | Execute buy order with SOL | "Buy 0.5 SOL worth of BONK" |
| `sell_token` | Execute sell order for SOL | "Sell all my WIF tokens" |
| `get_portfolio` | Full portfolio with USD values | "Show my complete portfolio" |
| `get_trending_tokens` | Discover trending tokens via Birdeye | "What's trending today?" |
| `search_token` | Search tokens by name or symbol | "Find tokens named PEPE" |

### Aster DEX Perpetuals & Spot (10)

| Tool | Description | Example |
|------|-------------|---------|
| `aster_open_long` | Open LONG perpetual (bet price UP) | "Open 10x LONG on BTCUSDT with 50 USDT" |
| `aster_open_short` | Open SHORT perpetual (bet price DOWN) | "Short ETHUSDT at 20x with 25 USDT" |
| `aster_close_position` | Close open perpetual position | "Close my LONG on SOLUSDT" |
| `aster_get_positions` | View all positions with unrealized P&L | "Show my open positions" |
| `aster_set_leverage` | Set leverage 1x-125x for pair | "Set 15x leverage on BTCUSDT" |
| `aster_spot_buy` | Buy tokens on Aster spot market | "Buy 0.1 BTC on Aster spot" |
| `aster_spot_sell` | Sell tokens on Aster spot market | "Sell 1 ETH on Aster" |
| `aster_get_balance` | Check futures and spot balances | "What's my Aster balance?" |
| `aster_transfer` | Transfer between futures and spot | "Transfer 100 USDT to futures" |
| `aster_get_price` | Get current price and 24h stats | "Price of SOLUSDT on Aster?" |

### Hyperliquid DEX Perpetuals & Spot (15)

| Tool | Description | Example |
|------|-------------|---------|
| `hyperliquid_get_account` | Get account info, balance, margin summary | "Check my Hyperliquid account" |
| `hyperliquid_get_price` | Get current prices for assets | "BTC price on Hyperliquid?" |
| `hyperliquid_open_long` | Open LONG perpetual position | "Long BTC 5x with 100 USDC" |
| `hyperliquid_open_short` | Open SHORT perpetual position | "Short ETH 10x with 50 USDC" |
| `hyperliquid_close_position` | Close position (full or partial) | "Close my BTC position" |
| `hyperliquid_get_positions` | View all open positions with PnL | "Show my Hyperliquid positions" |
| `hyperliquid_set_leverage` | Set leverage (cross/isolated margin) | "Set 20x leverage on SOL" |
| `hyperliquid_place_limit_order` | Place limit orders at specific prices | "Buy BTC at $60,000" |
| `hyperliquid_cancel_order` | Cancel open orders | "Cancel my pending BTC order" |
| `hyperliquid_get_open_orders` | View all pending orders | "Show my open orders" |
| `hyperliquid_get_trade_history` | View recent trades (fills) | "Show my trade history" |
| `hyperliquid_get_available_coins` | List all tradeable markets | "What can I trade on Hyperliquid?" |
| `hyperliquid_transfer` | Transfer USDC between perp/spot | "Transfer 500 USDC to spot" |
| `hyperliquid_get_asset_ids` | Get asset IDs for API calls | "Get Hyperliquid asset IDs" |
| `hyperliquid_spot_order` | Place spot orders (HYPE, PURR, etc.) | "Buy 100 HYPE tokens" |

### CDP Account Management (5)

| Tool | Description | Example |
|------|-------------|---------|
| `cdp_create_account` | Create CDP-managed Solana account | "Create a new CDP wallet" |
| `cdp_list_accounts` | List all CDP-managed accounts | "Show my CDP accounts" |
| `cdp_get_balance` | Get SOL balance for any address | "Check CDP wallet balance" |
| `cdp_send_sol` | Send SOL securely (no keys exposed) | "Send 1 SOL to wallet X" |
| `cdp_request_faucet` | Request devnet SOL (devnet only) | "Get testnet SOL" |

### CoinGecko Market Data (5)

| Tool | Description | Example |
|------|-------------|---------|
| `get_crypto_price` | Get prices with market cap, volume, 24hr change | "Price of BTC, ETH, SOL?" |
| `get_coin_market_data` | Comprehensive market data with rankings | "Top 10 cryptos by market cap" |
| `get_trending_cryptos` | Trending coins by search activity | "What cryptos are trending?" |
| `search_crypto` | Search coins by name/symbol | "Find Dogecoin" |
| `get_global_crypto_stats` | Global market statistics | "Global crypto market stats" |

### Advanced Wallet Analytics (5)

| Tool | Description | Example |
|------|-------------|---------|
| `get_wallet_net_worth` | Detailed net worth breakdown with USD values | "What's my net worth?" |
| `get_wallet_net_worth_chart` | Historical net worth changes over time | "Show net worth for last 30 days" |
| `get_wallet_pnl` | Comprehensive P&L analysis | "What's my P&L this month?" |
| `get_token_chart` | OHLCV candlestick chart data | "Get 1h chart for BONK" |
| `analyze_token_security` | Security analysis, rug check, risk assessment | "Is this token safe?" |

### Real-Time Search & Analysis (2)

| Tool | Description | Example |
|------|-------------|---------|
| `web_search` | Real-time web search | "Latest news on Solana DeFi" |
| `analyze_solana_address` | Unified analysis for any address type | "Analyze this wallet: 7xKX..." |

### Creative & Social (5)

| Tool | Description | Example |
|------|-------------|---------|
| `post_to_twitter` | Post tweets automatically | "Tweet about my 10x gain" |
| `generate_image` | AI image generation | "Generate a BONK meme" |
| `generate_music` | AI music with/without lyrics | "Make a trap beat" |
| `generate_video` | AI video and animation | "Create a trading recap video" |
| `text_to_speech` | Convert text to speech | "Read my portfolio aloud" |

## Quick Start

### 1. Installation

```bash
cd solana-agent
pip install -r requirements.txt
```

### 2. Configuration

Copy `.env.example` to `.env.local` and configure:

```env
# ============ REQUIRED ============

# Helius RPC (Solana blockchain access)
HELIUS_API_KEY=your_helius_api_key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_key
HELIUS_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=your_key

# Jupiter Trading API (Solana DEX swaps)
JUPITER_API_KEY=your_jupiter_api_key
JUPITER_REFERRAL_ACCOUNT=your_referral_account

# Birdeye API (Market data and analytics)
BIRDEYE_API_KEY=your_birdeye_api_key

# Your Solana Wallet
MAWD_WALLET=your_wallet_public_key
MAWD_PRIVATE_KEY=your_private_key_base58

# LLM Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=minimax/minimax-m2-her

# ============ OPTIONAL ============

# Aster DEX (Perpetuals & Spot Trading)
ASTER_API_KEY=your_aster_api_key
ASTER_USER_ADDRESS=0x_your_ethereum_address
ASTER_SIGNER_ADDRESS=0x_your_signer_address
ASTER_PRIVATE_KEY=0x_your_private_key

# Hyperliquid DEX (Perpetuals on Hyperliquid L1)
HYPERLIQUID_WALLET=your_wallet_address
HYPERLIQUID_PRIVATE_KEY=your_private_key
HYPERLIQUID_USE_TESTNET=false

# CDP (Coinbase Developer Platform) - Managed Solana Accounts
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_base64_ed25519_private_key
CDP_WALLET_SECRET=optional_wallet_secret
CDP_NETWORK=solana-mainnet

# CoinGecko Pro API (Real-time market data)
COINGECKO_API_KEY=your_coingecko_api_key

# Twitter/X (Social posting)
TWITTER_CONSUMER_KEY=your_key
TWITTER_CONSUMER_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_TOKEN_SECRET=your_secret

# MiniMax (AI content generation)
MINIMAX_API_KEY=your_key

# Search APIs (Real-time web search)
SEARCH_API_KEY=your_searchapi_key
SERP_API_KEY=your_serpapi_key
XAI_API_KEY=your_xai_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 3. Run MAWDBot

**CLI Interface:**
```bash
# Interactive mode
python agent.py

# Web interface
cd web && python api_server.py
# Open http://localhost:8000
```

**Telegram Bot:**
```bash
python telegram_bot.py
```

## Telegram Bot Commands

MAWDBot includes a full-featured Telegram bot for trading on the go:

### Quick Commands
- `/start` - Welcome message and quick start guide
- `/help` - Show all available commands
- `/balance` - Check wallet SOL and token balances
- `/portfolio` - View complete portfolio with USD values
- `/trending` - Show trending Solana tokens
- `/price <token>` - Get token price (e.g., `/price BONK`)

### Trading Commands
- `/buy <amount> <token>` - Buy tokens (e.g., `/buy 0.5 BONK`)
- `/sell <amount> <token>` - Sell tokens (e.g., `/sell 100 WIF`)
- `/quote <amount> <from> <to>` - Get swap quote

### Perpetuals Trading
- `/long <pair> <leverage> <amount>` - Open LONG position
- `/short <pair> <leverage> <amount>` - Open SHORT position
- `/positions` - View all open positions
- `/close <pair>` - Close a position

### Market Data
- `/crypto <coins>` - CoinGecko prices (e.g., `/crypto bitcoin,ethereum`)
- `/global` - Global crypto market stats
- `/trendingcrypto` - Trending cryptocurrencies

### CDP Wallets
- `/cdp_create` - Create new CDP wallet
- `/cdp_list` - List CDP wallets
- `/cdp_balance <address>` - Check CDP wallet balance

### Utilities
- `/analyze <address>` - Analyze any Solana address
- `/search <query>` - Search for tokens
- `/security <token>` - Token security analysis

## Architecture

```
mawd/
├── solana-agent/              # Core agent
│   ├── agent.py               # Main SolanaAgent class
│   ├── config.py              # Configuration management
│   ├── telegram_bot.py        # Telegram bot interface
│   ├── clients/               # API clients
│   │   ├── jupiter_client.py  # Solana DEX trading (Jupiter)
│   │   ├── helius_client.py   # Solana RPC & DAS
│   │   ├── birdeye_client.py  # Market data & analytics
│   │   ├── aster_client.py    # Aster DEX perpetuals
│   │   ├── hyperliquid_client.py  # Hyperliquid DEX
│   │   ├── cdp_client.py      # Coinbase Developer Platform
│   │   ├── coingecko_client.py    # CoinGecko Pro API
│   │   ├── twitter_client.py  # Twitter/X posting
│   │   ├── minimax_client.py  # AI content generation
│   │   ├── search_client.py   # Web search
│   │   └── solana_analyzer.py # Address analysis
│   └── tools/                 # Tool implementations
│       └── solana_tools.py    # All 46 trading tools
├── web/                       # Web interface
│   ├── api_server.py          # FastAPI backend
│   └── frontend/              # Web UI
│       └── index.html         # Main interface
└── .env.local                 # Your configuration
```

## API Integrations (11 Clients)

| Client | Purpose | Features |
|--------|---------|----------|
| **Jupiter** | Solana DEX trading | Swap quotes, transaction building, best rates |
| **Helius** | Solana RPC & DAS | Account data, balances, history, NFTs |
| **Birdeye** | Market analytics | Prices, trending, charts, security |
| **Aster DEX** | Perpetuals trading | LONG/SHORT 1x-125x, spot trading |
| **Hyperliquid** | Perpetuals trading | Cross/isolated margin, limit orders |
| **CDP** | Managed wallets | Secure custodial accounts via Coinbase |
| **CoinGecko** | Market data | 10,000+ crypto prices, trends, global stats |
| **Twitter** | Social posting | Tweet posting, media uploads |
| **MiniMax** | AI content | Images, music, video, TTS |
| **Search** | Web search | Multi-provider (SearchAPI, SerpAPI, XAI) |
| **Solana Analyzer** | Address analysis | Auto-detect and analyze any address |

## Security Features

- **Trade Confirmations**: All trades require explicit approval
- **Price Impact Warnings**: Alerts on high slippage trades
- **Balance Verification**: Checks before executing swaps
- **Token Security Analysis**: Automatic rug check for new tokens
- **Private Key Protection**: Keys never logged or exposed
- **Liquidation Warnings**: Clear risk warnings for leveraged positions
- **CDP Secure Custody**: Coinbase-managed keys for extra security
- **Rate Limiting**: Respects API rate limits
- **Error Handling**: Graceful failures with detailed messages

## Usage Examples

### Solana Trading
```
You: "What's trending?"
MAWDBot: [Shows top trending Solana tokens with prices and changes]

You: "Buy 0.5 SOL worth of BONK"
MAWDBot: [Confirms trade, executes, shows transaction]
```

### Perpetuals Trading
```
You: "Open 10x LONG on BTCUSDT with 100 USDT"
MAWDBot: [Shows position details, liquidation price, executes]

You: "Show my positions"
MAWDBot: [Lists all positions with unrealized P&L]
```

### Market Research
```
You: "Price of bitcoin, ethereum, and solana"
MAWDBot: [CoinGecko prices with 24hr changes]

You: "Global crypto market stats"
MAWDBot: [Total market cap, volume, BTC dominance]
```

### CDP Wallets
```
You: "Create a new CDP wallet"
MAWDBot: [Creates secure custodial Solana account]

You: "Send 1 SOL from CDP to wallet X"
MAWDBot: [Executes secure transfer without exposing keys]
```

## Roadmap

- [x] Solana DEX trading (Jupiter)
- [x] Aster DEX perpetuals
- [x] Hyperliquid perpetuals
- [x] CDP wallet management
- [x] CoinGecko market data
- [x] Telegram bot
- [x] Web interface
- [ ] Multi-wallet support
- [ ] Automated trading strategies
- [ ] Portfolio rebalancing
- [ ] Mobile app interface
- [ ] Copy trading features
- [ ] NFT trading support
- [ ] Cross-chain bridges

## License

MIT License - Use at your own risk!

## Disclaimer

MAWDBot is provided as-is for educational and research purposes. Cryptocurrency trading involves substantial risk of loss. Never trade with funds you cannot afford to lose. Always verify transactions before confirming. The developers assume no responsibility for financial losses.

**Perpetuals Trading Warning**: Leveraged trading can result in liquidation and total loss of margin. Understand the risks before trading with leverage.

---

**Built with love by the MAWDBot team**

**Exfoliate, trade, launch, vibe!**
