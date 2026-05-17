# 🦞 Clawd Code CLI

<div align="center">

**A lobster-themed AI terminal operator for coding, system ops & Solana**

[![Solana](https://img.shields.io/badge/Solana-Blockchain-14F195)](https://solana.com)
[![npm](https://img.shields.io/badge/npm-@openclawdsolana%2Fclawd-CB3837)](https://www.npmjs.com/package/@openclawdsolana/clawd)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

🦞 *"Claws that code, brains that deploy"* 🦞

</div>

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄      ║
║  ╱▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔╲     ║
║ ║  █████╗   ║                                              ║    ║
║ ║ ██╔══██╗  ║   🦞  CLAWD CODE CLI  🦞                   ║    ║
║ ║ ╚══█╔═╝  ║                                              ║    ║
║ ║   ██║     ║   "Claws that code, brains that deploy"     ║    ║
║ ║   ██║     ║                                              ║    ║
║ ║   ╚═╝     ║   Multi-Provider AI Terminal Operator        ║    ║
║ ║  ▄█████╗  ║   Grok · Ollama · OpenRouter · OpenAI       ║    ║
║ ║ ██╔══██╗║   Solana · MCP · File Tools                  ║    ║
║ ║ ╚══█╔═╝  ║                                              ║    ║
║ ║   ██║     ║   CLAWD Token: 8cHzQHUS2s2h8TzCmfqPKYiM4   ║    ║
║ ║   ╚═╝     ║   dSt4roa3n7MyRLApump                        ║    ║
║  ╲▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔╱     ║
║   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀      ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🦞 About

**Clawd Code CLI** is a lobster-themed AI terminal agent built for Solana operators, developers, and degen builders. It speaks to you through a retro ASCII terminal, runs entirely in your terminal, and lets you switch between Grok, Ollama (local), OpenRouter, and OpenAI backends on the fly — no restart needed.

**CLAWD Token**: `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

## Features

- 🦞 **Lobster-branded UI** — ASCII art logo, per-provider spinner animations, themed loading messages
- ⚡ **Multi-Provider Routing** — Grok · Ollama · OpenRouter · OpenAI · custom, switched live via `/models`
- 🔧 **AI File Operations** — view_file, create_file, str_replace_editor (no overwrite accidents)
- 💻 **Bash + Shell Tools** — execute commands, grep, find, navigate
- 📋 **Todo Lists** — plan and track tasks with visual priority flags
- 🔌 **MCP Support** — extend with any Model Context Protocol server
- 🪙 **Solana Tools** — query assets, prices, wallet balances via Helius DAS API + Birdeye
- 📊 **Full Birdeye Suite** — token overview, metadata (single/multi), market data, trade data, search, trending, OHLCV, wallet portfolio
- 🦋 **DFlow Trading** — swap quotes + build across DFlow-aggregated venues, prediction-market init, priority fees (REST + WebSocket)
- 🔮 **Prediction Markets** — DFlow (Kalshi-on-Solana), Polymarket (Gamma + CLOB), Kalshi direct with RSA-PSS signing
- 🚀 **Token Launches** — pump.fun via PumpPortal local signing + Bags.fm fee-sharing launches
- 🔑 **Local Signing Wallet** — base58 / JSON-array keypair, signs versioned + legacy txs, confirmation-gated broadcasts
- 🌐 **Web Search** — real-time search for Grok models (auto-detected)
- 🔐 **Persistent Settings** — `~/.clawd/user-settings.json` remembers your API keys and model preferences

---

## Installation

```bash
# Recommended
npm install -g @openclawdsolana/clawd

# Or with bun
bun add -g @openclawdsolana/clawd

# One-shot
npx -y @openclawdsolana/clawd "scan this repo"
```

The `clawd`, `clawd-code`, and `clawd-leviathan` aliases are registered automatically.

### Pay.sh / Solana Pay

OpenClawd can be launched through Pay so paid API calls route through the local
wallet approval flow:

```bash
brew install pay
pay --version
pay setup --update
pay --sandbox clawd "buy some water with pay"
npx -y @solana/pay clawd "buy some water with pay"
```

Use `pay setup --update` to refresh MCP config without creating a new account.
For local tests, keep `--sandbox` on the top-level `pay` command. Do not create
or replace a mainnet account unless you are intentionally setting up a funded
wallet.

---

## Quick Start

```bash
clawd
```

On first run it will prompt for your Grok API key (from [xAI](https://x.ai)). Or set it once:

```bash
# From inside clawd:
/config grok key xai-your-key-here

# Or as environment variable
export GROK_API_KEY=xai-your-key-here
clawd
```

---

## Multi-Provider Setup

### OpenRouter (Claude, Gemini, Llama, DeepSeek...)

```bash
# Inside clawd:
/config openrouter key sk-or-v1-your-key-here

# Then switch to any OpenRouter model:
/models
# or
/config add model openrouter/anthropic/claude-opus-4.7
/config set defaultModel openrouter/anthropic/claude-opus-4.7
```

### Ollama (Local Models)

```bash
# Inside clawd:
/config ollama baseURL http://localhost:11434/v1

# Default Ollama models are already in the list:
# ollama/kimi-k2.6:cloud, ollama/glm-5.1:cloud, ollama/8bit/DeepSolana:latest, etc.
/models

# Switch to kimi-k2.6:cloud (pull it first with: ollama pull kimi-k2.6:cloud)
/models ollama/kimi-k2.6:cloud
# or persist it as the default
/config set defaultModel ollama/kimi-k2.6:cloud
```

### OpenAI

```bash
/config openai key sk-your-key-here
/config add model openai/gpt-4o
/config set defaultModel openai/gpt-4o
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `/models` | Open interactive model selector |
| `/models <name>` | Switch directly to a model by name |
| `/config` | Show all provider configs (keys masked) |
| `/config <provider> key <key>` | Set API key for a provider |
| `/config <provider> baseURL <url>` | Set base URL for a provider |
| `/config add model <name>` | Add a model to the available list |
| `/config set defaultModel <model>` | Set the default model (also switches active session) |
| `/provider` | Show active model's provider, base URL, and masked key |
| `/clear` | Clear chat history |
| `/help` | Show full help |
| `/commit-and-push` | AI-generated git commit + push |
| `/exit` | Exit |

**Shortcuts**: `↑/↓` navigate history, `Tab` complete suggestions, `Shift+Tab` toggle auto-edit, `Esc` abort.

---

## Command Line Options

```bash
clawd [options]

Options:
  -V, --version           output the version number
  -d, --directory <dir>   working directory
  -k, --api-key <key>    Grok API key
  -u, --base-url <url>    Grok API base URL
  -m, --model <model>     default model
  -p, --prompt <prompt>   headless mode — one prompt, then exit
  --max-tool-rounds <n>   max tool loops (default: 400)
  -h, --help              show help
```

---

## Provider Model Reference

### Grok (xAI) — default
```
grok-4-1-fast-reasoning
grok-4-fast-reasoning
grok-4-fast-non-reasoning
grok-4
grok-3
grok-3-fast
grok-code-fast-1
```

### OpenRouter
```
openrouter/anthropic/claude-opus-4.7
openrouter/anthropic/claude-sonnet-4
openrouter/anthropic/claude-3.5-sonnet
openrouter/google/gemini-2.5-pro
openrouter/google/gemini-2.0-flash
openrouter/meta-llama/llama-4-maverick
openrouter/deepseek/deepseek-chat-v3
openrouter/deepseek/deepseek-coder
openrouter/x-ai/grok-3
openrouter/qwen/qwen-3
```

### OpenAI
```
openai/gpt-4.5
openai/gpt-4o
openai/gpt-4o-mini
openai/o3
openai/o3-mini
openai/o4-mini
```

### Ollama (localhost:11434)
```
ollama/kimi-k2.6:cloud
ollama/kimi-k2.5:cloud
ollama/glm-5.1:cloud
ollama/minimax-m2.7:cloud
ollama/minimax-m2.1:cloud
ollama/8bit/DeepSolana:latest
ollama/mxbai-embed-large:latest
```

Switch at runtime with `/models ollama/kimi-k2.6:cloud`, or persist with `/config set defaultModel ollama/kimi-k2.6:cloud`. Any Ollama model you `ollama pull` locally can be added on the fly via `/config add model ollama/<name>`.

---

## Solana Integration

```bash
# Set environment variables
export HELIUS_API_KEY=your_helius_key
export BIRDEYE_API_KEY=your_birdeye_key

# Then inside clawd you can ask:
"show me my Solana wallet balance"
"get the price of $BONK"
"look up this NFT asset ..."
```

### Birdeye Tool Suite

Every `BIRDEYE_API_KEY`-gated endpoint is wired as a tool the agent can call:

| Tool | Endpoint |
|------|----------|
| `birdeye_token_overview` | `/defi/token_overview` — price, market cap, FDV, liquidity, wallets, volume, holders |
| `birdeye_token_metadata` / `_multi` | `/defi/v3/token/meta-data/single` + `/multiple` (up to 50) |
| `birdeye_token_market_data` / `_multi` | `/defi/v3/token/market-data` + `/multiple` (up to 20) |
| `birdeye_token_trade_data` / `_multi` | `/defi/v3/token/trade-data/single` + `/multiple` |
| `birdeye_search_token` | `/defi/v3/search` — keyword search, sorted by 24h USD volume |
| `birdeye_token_list` | `/defi/tokenlist` — paginated, configurable sort |
| `birdeye_trending` | `/defi/token_trending` |
| `birdeye_ohlcv` | `/defi/ohlcv` — 1m through 1M candles |
| `birdeye_wallet_portfolio` | `/v1/wallet/token_list` |

Prompt examples:
```
"search birdeye for pepe tokens sorted by volume"
"get the 1h trade data for $BONK"
"show me the top 20 trending solana tokens right now"
"what's my wallet portfolio worth" (set SOLANA_PRIVATE_KEY)
```

---

## Blockchain Trading + Prediction Markets

Turn on the signing wallet + DFlow and the CLI becomes a full trading terminal.

### Environment

```bash
# Local signing wallet (DO NOT commit)
SOLANA_PRIVATE_KEY=   # base58 (Phantom export) or JSON array
SOLANA_RPC_URL=

# DFlow — Solana swap aggregation + Kalshi-on-Solana prediction markets
DFLOW_API_KEY=        # contact hello@dflow.net
DFLOW_TRADING_URL=https://quote-api.dflow.net
DFLOW_METADATA_URL=https://dev-prediction-markets-api.dflow.net

# Bags.fm — launch tokens with fee sharing
BAGS_API_KEY=
BAGS_PARTNER_CONFIG_KEY=

# Kalshi direct (RSA-PSS signed requests)
KALSHI_KEY_ID=
KALSHI_PRIVATE_KEY=        # PEM with \n or use _FILE
KALSHI_PRIVATE_KEY_FILE=
KALSHI_ENV=prod            # or `demo`
```

### DFlow — trading + prediction markets

Tools surface the Trading API (tokens, venues, priority fees, swap quote/build, order status, prediction-market init) and the Metadata API (events, markets, orderbook, trades, on-chain fills, live Kalshi data, series, tags, sports filters, candlesticks, search) plus a WebSocket priority-fee stream.

Three-step swap flow the agent will chain automatically:

```
"quote me a swap for 0.1 SOL -> USDC via DFlow"
  -> dflow_swap_quote
  -> dflow_build_swap
  -> wallet_sign_and_send  (gated by confirmation prompt)
```

Other DFlow examples:
```
"init a prediction market for outcome mint <mint>"
"show me the orderbook for market KXNBAGAME-..."
"get live Kalshi data for milestone ids a,b,c"
"stream 5 priority-fee updates from DFlow"
```

### Polymarket

Read-only via the public Gamma + CLOB endpoints — no key required.

```
"find trending Polymarket events"
"get the polymarket orderbook for token <id>"
"what's the midpoint on this market"
```

Placing Polymarket orders requires L2 (EIP-712) signing with a Polygon key — not wired by default; the `polymarket_place_order` stub returns a clear "not enabled" error.

### Kalshi direct

Full RSA-PSS request signing with `KALSHI_KEY_ID` + `KALSHI_PRIVATE_KEY`. Reads (markets, orderbook, balance, positions, fills, orders) and writes (place/cancel orders) are exposed; `kalshi_place_order` is confirmation-gated.

### Token launches

- **PumpPortal** (`pump_launch_token`, `pump_trade`) — creates pump.fun SPL tokens, uploads metadata to pump.fun IPFS, generates mint, signs with your local keypair.
- **Bags.fm** (`bags_launch_token`, `bags_swap`, `bags_claim_fees`, `bags_positions`) — launch with fee-recipient splits and claim accumulated creator fees.

Example prompts:
```
"launch a pump.fun token called CLAWD2 with ticker CLW2, buy 0.2 SOL at launch"
"sell 50% of my position in <mint>"
"launch a bags.fm token with 50% fees to <wallet>"
"claim all my bags.fm fees"
```

### Safety

Every action that moves SOL or places a trade routes through the existing `ConfirmationTool` — nothing fires until you approve the prompt in the terminal. The wallet loader refuses to start if `SOLANA_PRIVATE_KEY` is malformed, and DFlow / Kalshi / Bags endpoints return structured errors (not crashes) when keys are missing.

---

## Local Development

```bash
git clone https://github.com/8bit/clawd-code-cli.git
cd clawd-code-cli
npm install
npm run build
npm link   # symlink locally for testing
clawd
```

---

## 🦞 CLAWD Token

**CLAWD** is the token of the Clawd ecosystem.持有 CLAWD to access premium features, agent minting, and governance.

- **Mint**: `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
- **Blockchain**: Solana
- **CLI Integration**: Use the Solana tools in clawd to query CLAWD token data, balances, and more.

---

## License

MIT
