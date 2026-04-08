<div align="center">

```
  _____       __                        ________                    __
 / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
 \__ \/ __ \/ / __ `/ __ \/ __ `/   / /   / / __ `/ | /| / / __  /
___/ / /_/ / / /_/ / / / / /_/ /   / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/    \____/_/\__,_/ |__/|__/\__,_/
```

# solana-clawd

**The agentic engine Solana deserves.**

31 MCP tools. Blockchain Buddies. Custom unicode animations. One command.

Powered by **$CLAWD** on Solana & Pump.fun

`8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

[![npm version](https://img.shields.io/npm/v/solana-clawd?color=ff6b35&label=npm)](https://www.npmjs.com/package/solana-clawd)
[![npm downloads](https://img.shields.io/npm/dm/solana-clawd?color=ff6b35)](https://www.npmjs.com/package/solana-clawd)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-native-blueviolet)](https://modelcontextprotocol.io)
[![Helius](https://img.shields.io/badge/Helius-RPC%20%2B%20WebSocket-orange)](https://helius.dev)
[![No Private Key](https://img.shields.io/badge/private%20key-not%20required-brightgreen)](README.md)
[![Clawd Desktop](https://img.shields.io/badge/Clawd%20Desktop-ready-purple)](README.md#clawd-desktop)
[![Fly.io](https://img.shields.io/badge/Fly.io-deployable-blue)](mcp-server/fly.toml)
[![Tools](https://img.shields.io/badge/MCP%20tools-31-ff6b35)](mcp-server/src/server.ts)
[![Buddies](https://img.shields.io/badge/Blockchain%20Buddies-18%20species-ff69b4)](src/buddy/)
[![Animations](https://img.shields.io/badge/unicode%20spinners-9%20custom-00ffcc)](src/animations/)
[![Voice](https://img.shields.io/badge/Voice-ElevenLabs%20%2B%20Grok-ff4444)](web/app/voice/)
[![Telegram](https://img.shields.io/badge/Telegram-60%2B%20commands-26A5E4?logo=telegram)](src/telegram/)
[![Skills](https://img.shields.io/badge/Skills-95%20catalog-yellow)](skills/)
[![Live](https://img.shields.io/badge/live-solanaclawd.com-00ff88)](https://solanaclawd.com)

[**One-Shot Install**](#one-shot-install) · [**Blockchain Buddies**](#blockchain-buddies) · [**Animations**](#clawd-animations) · [**MCP Tools**](#mcp-tools-31) · [**Voice Mode**](#voice-mode) · [**Telegram Bot**](#telegram-trading-bot) · [**Metaplex Agents**](#metaplex-agent-minting-mpl-agent-registry) · [**Worker Swarm**](#solana-worker-swarm-iii-sdk) · [**Skills**](#skills-catalog-95-skills) · [**Deploy**](#deploy-to-flyio)

</div>

---

## One-Shot Install

```bash
npx solana-clawd demo    # animated walkthrough
npx solana-clawd birth   # hatch a blockchain buddy
npm i -g solana-clawd    # global install
```

No private key. No wallet. No paid API. Clone it, run it, ask it anything.

```
You: "What are the top 5 trending tokens right now?"
Clawd: [calls solana_trending] -> live data with security scores and volume

You: "Watch wallet 8vFz... for changes"
Clawd: [calls helius_listener_setup] -> working TypeScript code to deploy

You: "Research BONK for a potential trade"
Clawd: [calls solana_token_info, solana_top_traders, helius_das_asset, memory_recall]
       -> structured report: price, security score, smart money, OODA signal

You: "Start a Pump.fun scanner"
Clawd: [calls get_pump_market_data, scan_pump_token]
       -> autonomously runs PUMP_SCANNER_AGENT, routing signals to Telegram
```

---

## Blockchain Buddies

Every `solana-clawd` user gets a companion -- a procedurally generated Blockchain Buddy with its own wallet, trading personality, stats, and animated ASCII sprite. Think Tamagotchi meets DeFi.

```bash
npx solana-clawd birth   # hatch yours now
```

### Species (18 total)

| Category | Species | Personality | Risk Level |
|---|---|---|---|
| **Solana Natives** | SolDog, BONK Dog, dogwifhat, Jupiter Agg, Raydium LP | Diamond Hands / Degen / Bot | Low -- Degen |
| **DeFi Archetypes** | Whale, Bull, Bear, MEV Shark, Octopus | Whale / Sniper / Ninja | Low -- Medium |
| **NFT Ecosystem** | DeGod, y00t, Okay Bear | Diamond Hands / Ninja | Medium |
| **Memecoin Culture** | Pepe, Pump.fun, Sniper Bot | Degen / Sniper | High -- Degen |
| **Technical** | Validator, RPC Node | Bot | Low |

### Rarity Tiers

```
 common      ★          60% drop rate
 uncommon    ★★         25% drop rate
 rare        ★★★        10% drop rate
 epic        ★★★★        4% drop rate
 legendary   ★★★★★       1% drop rate
```

### Stats

Every buddy rolls 8 stats that affect their trading behavior:

`ALPHA` `GAS_EFF` `RUG_DETECT` `TIMING` `SIZE` `PATIENCE` `CHAOS` `SNARK`

### ASCII Art Sprites

Each species has multi-frame idle animations with eye and hat customization:

```
   [WIF]              ★    ★             💰💰💰
  /\___/\            /\__/\              ~~~~~
 (  ◉ ◉  )         ( ✦  ✦ )           ( ·  · )
  (  ω  )~           (ωωω)            (________)
  /|    |\           /|SOL |\           WHALE
   dogwifhat          SolDog              Whale
```

Hats: `crown` `tophat` `propeller` `halo` `wizard` `beanie` `solana` `bitcoin` `ethereum` `degen` `whale` `sniper`

---

## $CLAWD Animations

Nine custom unicode spinners built with braille grids, themed around the Solana ecosystem. They plug directly into `unicode-animations` or work standalone.

```typescript
import { createClawdSpinner, withSpinner } from 'solana-clawd/animations'

// Wrap any async operation
const data = await withSpinner('Fetching trending...', fetchTrending, 'solanaPulse')

// Or control manually
const s = createClawdSpinner('Deploying to Solana...', 'pumpLoader')
await deploy()
s.stop('Deployed.')
```

### Spinner Gallery

| Spinner | Preview | Description |
|---|---|---|
| `solanaPulse` | `⠀⣴⣿⣿⣿⣦⠀` | Heartbeat pulse -- Solana TPS vibes |
| `clawdSpin` | `⣰⣿⣿⡆` | Braille-encoded "C" morphing |
| `walletHeartbeat` | `⠤⠤⣤⠴⠚⠁⠹⠤⠤` | ECG trace for buddy birth |
| `tokenOrbit` | `· ◆  · ·` | Tokens swirling in a bonding curve |
| `pumpLoader` | `▰▰▰▰▱▱▱▱` | Bonding curve filling up |
| `mevScan` | `⡀⠄⠂⠁⠀⠀⠀⠀` | Braille scan-line for snipers |
| `degenDice` | `⚀ ⚁ ⚂ ⚃ ⚄ ⚅` | Dice roll for stat generation |
| `blockFinality` | `█▓▒░` | Blocks stacking / confirming |
| `rugDetector` | `scanning...` | Rug pull sweep animation |

All spinners conform to the `{ frames: string[], interval: number }` interface and are interchangeable with any `unicode-animations` built-in.

---

## What Is This?

`solana-clawd` is an open-source agentic framework that injects the core DNA of [Anthropic's Clawd Code](https://github.com/x402agent/solana-clawd) directly into the Solana ecosystem.

It runs as a **Model Context Protocol (MCP) server** -- meaning any Clawd-powered client (Clawd Desktop, Cursor, VS Code, Windsurf) can instantly access **31 live Solana tools** without writing a single line of code.

---

## Architecture

Clawd Code's leaked source (March 2026) had this core pipeline:

```
User Input -> Query Engine -> LLM API -> Tool Execution Loop -> Output
                                 |              |
                          Permission Engine  AppState
                                 |              |
                          Coordinator    Memory (3 tiers)
```

We adapted every layer for Solana:

| Clawd Code Layer | solana-clawd Equivalent |
|---|---|
| `src/state/store.ts` | `src/state/store.ts` -- reactive AppState store |
| `src/state/AppStateStore.ts` | `src/state/app-state.ts` -- OODA phases, memory, subscriptions |
| `src/tools/AgentTool/builtInAgents.ts` | `src/agents/built-in-agents.ts` -- Explore, Scanner, OODA, Dream, Analyst, Monitor, Metaplex |
| `src/tools/AgentTool/agentMemory.ts` | `src/memory/extract-memories.ts` -- KNOWN/LEARNED/INFERRED tiers |
| `src/tools/TaskCreateTool/` | `src/tasks/task-manager.ts` -- async task lifecycle |
| `src/coordinator/` | `src/coordinator/coordinator.ts` -- multi-agent routing |
| `src/bridge/` (SSE) | `src/gateway/sse-transport.ts` -- gateway SSE bridge |
| `src/permissions/` | `src/engine/permission-engine.ts` -- deny-first trade gating |

---

## Quick Start

### Option A -- Clawd Desktop (zero config)

```bash
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd && bash scripts/setup.sh
```

Add to `~/Library/Application Support/Clawd/clawd_desktop_config.json`:

```json
{
  "mcpServers": {
    "solana-clawd": {
      "command": "node",
      "args": ["/absolute/path/to/solana-clawd/mcp-server/dist/index.js"],
      "env": {
        "HELIUS_API_KEY": "your-free-key-from-helius.dev"
      }
    }
  }
}
```

Restart Clawd Desktop. Done. 31 live Solana tools at your fingertips.

### Option B -- Cursor / VS Code

Add to your MCP config:

```json
{
  "solana-clawd": {
    "command": "node",
    "args": ["mcp-server/dist/index.js"],
    "cwd": "/path/to/solana-clawd"
  }
}
```

### Option C -- Public URL (no install)

```json
{
  "solana-clawd": {
    "type": "http",
    "url": "https://solana-clawd.fly.dev/mcp"
  }
}
```

### Option D -- Solana OS Skill (Global)

If you are running the `skills` CLI framework across Solana OS, install the complete agent globally:

```bash
npx skills add x402agent/solana-clawd
```

---

## npm Package

Install from npm and import exactly what you need:

```bash
npm i solana-clawd
```

### Exports

```typescript
// Core engine
import { getBuiltInAgents, getBuiltInAgent } from 'solana-clawd'

// Animated spinners
import { birthCeremony } from 'solana-clawd/animations'
import { createClawdSpinner, withSpinner } from 'solana-clawd/animations'
import { CLAWD_SPINNERS } from 'solana-clawd/animations'

// Blockchain Buddy companion system
import { createBlockchainBuddy } from 'solana-clawd/buddy'
import { renderBlockchainSprite, formatBuddyCard } from 'solana-clawd/buddy'
import { BLOCKCHAIN_SPECIES, SPECIES_TRADING_CONFIG } from 'solana-clawd/buddy'

// Metaplex agent minting
import { mintClawdAgent, registerAgentIdentity } from 'solana-clawd/metaplex'
```

### CLI

```bash
solana-clawd demo       # animated feature walkthrough
solana-clawd birth      # hatch a new blockchain buddy
solana-clawd spinners   # preview all 9 unicode spinners
```

---

## MCP Tools (31)

### Solana Market Data
| Tool | What it does | API key needed |
|---|---|:-:|
| `solana_price` | Live price for any token (mint or symbol) | -- |
| `solana_trending` | Top trending tokens right now | -- |
| `solana_token_info` | Token metadata + security score | -- |
| `solana_wallet_pnl` | Any wallet's realized + unrealized P&L | -- |
| `solana_search` | Search tokens by name or symbol | -- |
| `solana_top_traders` | Smart money wallets for a token | -- |
| `solana_wallet_tokens` | Token balances for any wallet | -- |
| `sol_price` | Quick SOL/USD via CoinGecko | -- |

### Helius Onchain (RPC + DAS + Enhanced Txs)
| Tool | What it does | API key needed |
|---|---|:-:|
| `helius_account_info` | Full account data via RPC | -- (public fallback) |
| `helius_balance` | SOL balance in SOL (not lamports) | -- |
| `helius_transactions` | Parsed transaction history (SWAP/NFT/TRANSFER filters) | free |
| `helius_priority_fee` | Real-time fee estimate, all levels | -- |
| `helius_das_asset` | DAS metadata -- NFT/token, creators, royalties | free |
| `helius_webhook_create` | Create live address-watching webhooks | free |
| `helius_webhook_list` | List active webhooks | free |
| `helius_listener_setup` | TypeScript code for WebSocket listeners | -- |

### Agent Fleet
| Tool | What it does |
|---|---|
| `agent_spawn` | Spawn a research/OODA/scanner/dream agent |
| `agent_list` | List active agent tasks |
| `agent_stop` | Stop a task |

### Memory (KNOWN / LEARNED / INFERRED)
| Tool | What it does |
|---|---|
| `memory_recall` | Query agent memory by tier |
| `memory_write` | Write a fact to memory |

### Metaplex Agent Registry
| Tool | What it does |
|---|---|
| `metaplex_mint_agent` | Mint AI agents as MPL Core assets |
| `metaplex_register_identity` | Register agent identity PDA on existing assets |
| `metaplex_read_agent` | Read agent data and registration docs |
| `metaplex_delegate_execution` | Delegate execution to off-chain authorities |
| `metaplex_verify_mint` | Verify minting and registration status |
| `metaplex_agent_wallet` | Manage agent wallets on Solana |

### Skills
| Tool | What it does |
|---|---|
| `skill_list` | List available SKILL.md files |
| `skill_read` | Read a skill's content |

---

## 128-bit Risk Engine

The **128-bit Perpetual DEX Risk Engine (v12.0.2)** is baked directly into the logic layer.

- Native 128-bit Base-10 scaling for precision that does not drift
- Protected principal for flat accounts -- your base stays safe
- Live premium-based funding with oracle-manipulation resistance
- Pure unencumbered-flat deposit sweep
- Conservation bounds, liveness guarantees, and lazy ADL

Full spec: `docs/risk-engine-spec.md`

---

## Formal Verification (Lean 4 & QEDGen)

Mathematical invariants are verified using **Lean 4** and the `qedgen` proof engineering agent.

- Integrated via `npx skills add qedgen/solana-skills`
- Rigorous structural formalizations in `formal_verification/SPEC.md`
- Enforces `prop_protected_principal` and `prop_conservation` across arbitrary K-space liquidity evaluations

---

## Telegram Trading Bot

The full-featured Telegram trading terminal lives in `src/telegram/`. 60+ commands covering market data, trading signals, AI generation, social posting, encrypted vault, and an autonomous agent born with complete Solana data capability.

### Deploy from Scratch

```bash
# 1. Clone the repo
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd

# 2. Install dependencies
npm install

# 3. Create your .env (copy and fill in)
cp .env.example .env

# 4. Get your API keys (minimum: Telegram + Helius)
#    - Telegram: message @BotFather on Telegram, /newbot, copy the token
#    - Helius: sign up at helius.dev (free 1M credits/month)
#    - Solana Tracker: sign up at data.solanatracker.io (free tier available)

# 5. Edit .env with your keys
nano .env

# 6. Start the Telegram bot
npx tsx src/telegram/index.ts

# 7. (Optional) Start the data API server
cd solana-tracker/server && npm install && npm run dev
```

### Environment Variables

```bash
# ── Required ──────────────────────────────────────────
TELEGRAM_BOT_TOKEN=           # From @BotFather
HELIUS_RPC_URL=               # Helius mainnet RPC (free at helius.dev)
HELIUS_API_KEY=               # Helius API key (DAS, wallet API)

# ── Solana Data ───────────────────────────────────────
SOLANA_TRACKER_API_KEY=       # data.solanatracker.io (trending, trades, charts, PnL)
BIRDEYE_API_KEY=              # Birdeye token data (price, search, overview)

# ── Access Control ────────────────────────────────────
TELEGRAM_ALLOWED_CHATS=       # Comma-separated chat IDs (empty = open access)
TELEGRAM_ADMIN_IDS=           # Admin user IDs (can run /snipe, /vault)

# ── Wallet (optional, signal-only mode works without) ─
SOLANA_PRIVATE_KEY=           # Base58 keypair (only for live trade execution)
SOLANA_PUBLIC_KEY=            # Default wallet for /balance, /tokens, /txs

# ── AI / Social (optional) ───────────────────────────
XAI_API_KEY=                  # xAI Grok API (chat, vision, image/video gen, search)
CONSUMER_KEY=                 # Twitter/X OAuth 1.0a (for /tweet, /reply, etc.)
SECRET_KEY=                   # Twitter/X OAuth 1.0a
ACCESS_TOKEN=                 # Twitter/X OAuth 1.0a
ACCESS_TOKEN_SECRET=          # Twitter/X OAuth 1.0a
BEARER_TOKEN=                 # Twitter/X Bearer (read-only search)

# ── Pump.fun Sniper (optional) ───────────────────────
PUMP_MIN_SCORE=60             # Minimum signal score to trade
BOT_BUY_AMOUNT=0.05          # SOL per buy
BOT_TAKE_PROFIT=50           # TP %
BOT_STOP_LOSS=15             # SL %
BOT_TIMEOUT_SECS=120         # Position timeout

# ── Vault ─────────────────────────────────────────────
VAULT_PASSPHRASE=             # Encryption passphrase (falls back to SOLANA_PRIVATE_KEY)

# ── Webhook Mode (optional, default is long-polling) ──
TELEGRAM_WEBHOOK_URL=         # Tailscale Funnel URL
TELEGRAM_WEBHOOK_PORT=3000    # Port for webhook server
```

### Bot Commands (60+)

#### Market Data
| Command | Description |
|---------|-------------|
| `/sol` | SOL price (CoinGecko) |
| `/price <mint\|symbol>` | Token price via Solana Tracker |
| `/trending` | Top 10 trending tokens |
| `/token <mint>` | Token info + security flags |
| `/wallet <address>` | Wallet PnL analysis |
| `/market` | Full market overview with signals |
| `/latest` | Latest launched tokens |
| `/graduated` | Recently graduated tokens |

#### Deep Analysis (Agent-Powered)
| Command | Description |
|---------|-------------|
| `/research <mint\|symbol>` | Token research with signal scoring |
| `/deepresearch <mint>` | Full report: holders, pools, top traders, chart, narrative |
| `/ooda` | OODA trading loop (observe/orient/decide/act) |
| `/chart <mint> [tf]` | OHLCV chart summary (1m/5m/15m/1h/4h/1d) |
| `/trades <mint>` | Recent token trades |
| `/toptraders <mint>` | Top traders for a token |
| `/holders <mint>` | Holder count + history |
| `/pools <mint>` | Liquidity pools |
| `/walletfull <address>` | Full wallet profile (identity + balance + PnL) |

#### Watchlist
| Command | Description |
|---------|-------------|
| `/watch` | Show watchlist |
| `/watch <mint>` | Add/remove token from watchlist |
| `/watch check` | Scan watchlist for significant moves |

#### Helius RPC
| Command | Description |
|---------|-------------|
| `/balance [address]` | SOL balance |
| `/tokens [address]` | Token accounts |
| `/txs [address]` | Recent transactions |
| `/slot` | Current slot + block height |
| `/assets [address]` | Helius DAS assets |

#### Birdeye
| Command | Description |
|---------|-------------|
| `/bprice <mint>` | Birdeye token price |
| `/bsearch <query>` | Birdeye token search |
| `/btoken <mint>` | Birdeye full overview |

#### Pump.fun Trading
| Command | Description |
|---------|-------------|
| `/scan` | Toggle background pump scanner |
| `/signal` | Show active pump signals |
| `/snipe [config]` | Start sniper bot (requires private key) |
| `/stop` | Stop sniper/scanner |
| `/grad <mint>` | Graduation progress |
| `/mcap <mint>` | Market cap |
| `/cashback <mint>` | Cashback info |

#### xAI / Grok AI
| Command | Description |
|---------|-------------|
| `/grok <question>` | Chat with Grok |
| `/xsearch <query>` | Search X/Twitter live |
| `/wsearch <query>` | Web search live |
| `/imagine <prompt>` | Generate images |
| `/video <prompt>` | Generate video (up to 5 min) |
| `/vision <url> [q]` | Analyze image |
| `/file <url> <question>` | Chat with PDF/CSV |

#### Twitter/X
| Command | Description |
|---------|-------------|
| `/tweet <text>` | Post a tweet |
| `/reply <id> <text>` | Reply to a tweet |
| `/deltweet <id>` | Delete tweet |
| `/like <id>` | Like tweet |
| `/rt <id>` | Retweet |
| `/tsearch <query>` | Search recent tweets |
| `/mytweets` | Show account's recent tweets |
| `/autotweet on [min] [topics]` | Start auto-tweet daemon |
| `/smarttweet <topic>` | Generate tweet with Grok + X context |

#### Vault & System
| Command | Description |
|---------|-------------|
| `/vault` | List encrypted secrets |
| `/vault store <label> <secret>` | Encrypt & store |
| `/vault get <id>` | Decrypt (masked) |
| `/vault lock` | Wipe key from memory |
| `/status` | Bot status |
| `/agentstate` | Agent internal state |
| `/skills` | List available skills |
| `/help` | Full command reference |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     solana-clawd Telegram Bot                    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Telegram API  │  │  SolanaAgent     │  │  PumpSniper      │  │
│  │ (long-poll    │  │  (autonomous     │  │  (PumpPortal     │  │
│  │  or webhook)  │  │   OODA + memory) │  │   WebSocket)     │  │
│  └──────┬────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                    │                      │            │
│         └────────┬───────────┘                      │            │
│                  │                                  │            │
│  ┌──────────────▼──────────────────────────────────▼──────────┐ │
│  │              SolanaTrackerAPI (unified client)              │ │
│  │                                                            │ │
│  │  Solana Tracker  │  Helius RPC/DAS  │  Birdeye  │ CoinGecko│ │
│  │  data.solana     │  Wallet API      │  REST     │ Price    │ │
│  │  tracker.io      │  DAS Assets      │  Search   │          │ │
│  │  • tokens        │  • getBalance    │  • price  │          │ │
│  │  • trades        │  • getAssets     │  • search │          │ │
│  │  • chart/OHLCV   │  • identity      │  • overview          │ │
│  │  • PnL           │  • history       │           │          │ │
│  │  • top traders   │  • transfers     │           │          │ │
│  │  • holders       │  • funded-by     │           │          │ │
│  │  • pools         │                  │           │          │ │
│  │  • trending      │                  │           │          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ xAI/Grok   │  │ Twitter/X  │  │ SolanaVault│                │
│  │ Vision,Gen │  │ OAuth 1.0a │  │ AES-256-GCM│                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Solana Tracker Data API Server

The Express server in `solana-tracker/server/` provides a REST + WebSocket API layer:

```bash
cd solana-tracker/server
npm install
npm run dev    # starts on port 3001
```

#### Endpoints

```
GET  /api/health                         -- Service status
GET  /api/tokens/trending?limit=20       -- Trending tokens
GET  /api/tokens/latest?limit=20         -- Latest launches
GET  /api/tokens/graduated?limit=20      -- Recently graduated
GET  /api/tokens/search?q=BONK           -- Search tokens
GET  /api/tokens/:mint                   -- Token info
GET  /api/tokens/:mint/chart?type=5m     -- OHLCV chart data
GET  /api/tokens/:mint/trades            -- Recent trades
GET  /api/tokens/:mint/holders           -- Holder data
GET  /api/tokens/:mint/pools             -- Liquidity pools
GET  /api/tokens/:mint/top-traders       -- Top traders
POST /api/tokens/multi-price             -- Batch price lookup
GET  /api/trading/pnl/:address           -- Wallet PnL
GET  /api/trading/research/:mint         -- Deep research + signal
GET  /api/trading/overview               -- Market overview
GET  /api/trading/profile/:address       -- Full wallet profile
POST /api/trading/score                  -- Batch token scoring
GET  /api/wallet/:address/identity       -- Helius wallet identity
GET  /api/wallet/:address/balances       -- Helius balances
GET  /api/wallet/:address/history        -- Helius history
GET  /api/das/assets/:owner              -- Helius DAS assets
WS   /ws                                 -- Solana Tracker Datastream relay
```

### TailClawd Dashboard (Private)

Solana-branded agentic dashboard (`tailclawd/`) — Solana Purple (#9945FF) + Green (#14F195) themed UI with live session tracking, activity feeds, metrics, and traces. Includes **Buddies** tab (hatch and animate blockchain companions in-browser) and **Spinners** tab (all 9 $CLAWD unicode animations running live).

> `tailclawd/` is private and not included in the public repository. Run locally with `cd tailclawd && npm start`.

### Web App

The `web/` directory contains the Next.js frontend — chat UI, buddies page, dual-provider voice mode, and REST API. Live at **[solanaclawd.com](https://solanaclawd.com)**.

```bash
cd web && npm install && npm run build    # production build
cd web && npm run dev                     # dev server on :3000
```

**Routes:**

| Route | Description |
|---|---|
| `/` | Chat interface |
| `/buddies` | Blockchain Buddy gallery + hatch |
| `/voice` | Voice mode — ElevenLabs + Grok dual-provider |
| `/api/chat` | Streaming chat API |
| `/api/voice/tts` | ElevenLabs text-to-speech proxy |
| `/api/voice/grok-tts` | Grok (xAI) text-to-speech proxy |
| `/api/voice/agent` | ElevenLabs Conversational Agent (signed URL) |
| `/api/voice/grok` | Grok Realtime Voice Agent (ephemeral token) |
| `/api/share` | Conversation sharing |

### Voice Mode

The `/voice` page provides a **dual-provider voice experience** — toggle between **ElevenLabs** and **Grok** in the header:

| Feature | ElevenLabs | Grok (xAI) |
|---|---|---|
| **Voice Agent** | Conversational AI via WebSocket | Realtime API with server VAD |
| **TTS Voices** | Roger, Sarah, River, Will (4) | Rex, Eve, Ara, Sal, Leo (5) |
| **Speech Tags** | — | `[laugh]` `[pause]` `<whisper>` `<emphasis>` `<slow>` |
| **Live Tools** | — | Web search enabled during conversation |
| **Auth Model** | Signed conversation URL | Ephemeral tokens (5-min TTL) |

All API keys stay server-side — ElevenLabs uses signed URLs, Grok uses ephemeral tokens via `sec-websocket-protocol`.

```bash
# Required env vars (web/.env)
ELEVEN_LABS_API_KEY=       # ElevenLabs TTS + Voice Agents
ELEVENLABS_AGENT_ID=       # Your conversational agent ID
XAI_API_KEY=               # xAI Grok voice + TTS
```

**Deploy to Netlify:**

```bash
netlify deploy --prod
```

Or connect the GitHub repo and set:
- **Build command:** `npm --prefix web run build`
- **Publish directory:** `web/.next`
- **Custom domain:** `solanaclawd.com`
- **Env vars:** `ELEVEN_LABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `XAI_API_KEY`

### Solana Vault (AES-256-GCM)

Encrypted secret storage at `~/.clawd/vault/` for keypairs, API keys, and RPC endpoints.

```typescript
import { SolanaVault, storeKeypair, retrieveKeypair } from 'solana-clawd/vault'

const vault = await SolanaVault.create('my-passphrase')
const id = await vault.store('api_key', 'sk-live-...', 'Helius prod key')
const key = await vault.retrieve(id)  // decrypted
vault.lock()                           // zero-fills key from memory
```

- Master key derived via **scrypt** from user passphrase
- Auto-locks after 15 minutes of inactivity
- Passphrase rotation without re-encrypting from scratch
- Sentinel-based passphrase validation on open

---

## Clawd Vault — Solana Research Knowledge Base

`llm-wiki-tang/` is **Clawd Vault**: a Solana-native research vault for financial agents and trading workflows. Upload sources (whitepapers, wallet exports, PDFs, governance docs), connect via MCP, and let the agent compile and maintain token dossiers, protocol pages, wallet profiles, strategy memos, and cross-referenced research.

### Three Layers

| Layer | Description |
|-------|-------------|
| **Raw Sources** | Whitepapers, filings, wallet notes, DEX research, governance posts, transcripts. Immutable. |
| **The Vault** | LLM-generated markdown pages: token dossiers, protocol pages, wallet profiles, strategy memos, timelines, diagrams. |
| **The Tools** | Search, read, write, delete. Clawd connects through MCP and orchestrates the rest. |

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────>│   FastAPI   │────>│  Supabase   │
│ Clawd Vault │     │   Backend   │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  MCP Server │<──── solana-clawd
                    └─────────────┘
```

| Component | Stack | Responsibilities |
|-----------|-------|------------------|
| **Web** (`web/`) | Next.js 16, React 19, Tailwind, Radix UI | Dashboard, PDF/HTML viewer, wiki renderer |
| **API** (`api/`) | FastAPI, asyncpg, aioboto3 | Auth, uploads, document processing, OCR, persistence |
| **Converter** (`converter/`) | FastAPI, LibreOffice | Isolated office-to-PDF conversion |
| **MCP** (`mcp/`) | MCP SDK, Supabase OAuth | Tools for Clawd: `guide`, `search`, `read`, `write`, `delete` |
| **Database** | Supabase (Postgres + RLS + PGroonga) | Documents, chunks, knowledge bases, users |
| **Storage** | S3-compatible | Raw uploads, extracted images, research assets |

### MCP Tools

| Tool | Description |
|------|-------------|
| `guide` | Explains Solana research workflow and lists available knowledge bases |
| `search` | Browse files or keyword search with PGroonga full-text ranking |
| `read` | Read documents — PDFs with page ranges, inline images, glob batch reads |
| `write` | Create dossier pages, edit with `str_replace`, append. SVG/CSV asset support |
| `delete` | Archive documents by path or glob pattern |

### Core Operations

- **Ingest** — Drop in a source. The agent reads it, writes a summary, updates token/wallet/protocol/strategy pages, and flags contradictions against existing theses.
- **Query** — Ask complex questions across the compiled vault. Knowledge is already synthesized, linked, and citation-aware.
- **Lint** — Run health checks. Find stale theses, orphan pages, unsupported claims, missing links, and gaps in the research graph.

### Quick Start

```bash
cd llm-wiki-tang

# Database
psql $DATABASE_URL -f supabase/migrations/001_initial.sql

# API
cd api && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# MCP Server
cd mcp && pip install -r requirements.txt && uvicorn server:app --reload --port 8080

# Web
cd web && npm install && npm run dev
```

### Memory Tiers

- **KNOWN** (blue) — Fresh market data from API calls. Auto-expires.
- **LEARNED** (green) — Validated patterns confirmed by Dream agent. Permanent.
- **INFERRED** (amber) — Tentative signals from scanners. Promoted or expired by Dream.

---

## Solana Worker Swarm (iii SDK)

The `tailclawd/quickstart/` directory contains a **four-worker distributed swarm** built on the [iii SDK](https://iii.dev) -- a cross-language worker framework that lets TypeScript, Rust, and Python workers call each other as if they were local functions.

### Architecture

```
              POST /swap
                  |
        ┌────────▼────────┐
        │  Client (TS)     │  Orchestrator — routes, fans out, aggregates
        │  /health /wallet │
        │  /research /swap │
        │  /transfer /fees │
        │  /orchestrate    │
        └──┬──────┬──────┬─┘
           │      │      │
    ┌──────▼──┐ ┌─▼────────┐ ┌──▼──────────┐
    │  Data   │ │  Compute  │ │  Payment    │
    │ (Python)│ │  (Rust)   │ │  (TS)       │
    │ balance │ │ fees      │ │ submit_tx   │
    │ tokens  │ │ risk_score│ │ transfer    │
    │ holders │ │ swap_tx   │ │ airdrop     │
    └─────────┘ └───────────┘ └─────────────┘
```

### Workers

| Worker | Language | Functions | What It Does |
| ------ | -------- | --------- | ------------ |
| **client** | TypeScript | `wallet`, `research`, `swap`, `transfer`, `estimate_fees`, `orchestrate` | Central orchestrator with 7 HTTP endpoints, fans out to other workers |
| **compute-worker** | Rust | `compute`, `priority_fees`, `risk_score`, `build_swap_tx` | High-perf tx building, Jupiter v6 swap quotes, priority fee percentiles, risk heuristics |
| **data-worker** | Python | `transform`, `wallet_balance`, `wallet_tokens`, `token_analytics` | On-chain intelligence via Solana RPC -- balances, SPL holdings, top-10 holder concentration |
| **payment-worker** | TypeScript | `record`, `submit_transaction`, `transfer`, `airdrop` | Tx signing/submission, SOL/SPL transfers, devnet airdrops |

### Run the Swarm

```bash
cd tailclawd/quickstart

# 1. Start the iii engine
iii -c iii-config.yaml

# 2. Start all workers
docker compose up --build
```

### Example: Token Research

```bash
curl -X POST http://localhost:3111/research \
  -H 'Content-Type: application/json' \
  -d '{"mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"}'
```

Returns analytics from data-worker (supply, top holders, concentration %) and risk score from compute-worker (heuristic 0-100).

### Example: Jupiter Swap

```bash
curl -X POST http://localhost:3111/swap \
  -H 'Content-Type: application/json' \
  -d '{
    "input_mint": "So11111111111111111111111111111111111111112",
    "output_mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "amount_lamports": 100000000,
    "slippage_bps": 100,
    "wallet": "YOUR_WALLET_ADDRESS"
  }'
```

Compute-worker fetches Jupiter v6 quote + builds the swap tx, payment-worker submits it.

---

## Skills Catalog (95 Skills)

`solana-clawd` ships with **95 on-demand knowledge skills** the agent can load when needed. Skills follow the [agentskills.io](https://agentskills.io) open standard with YAML frontmatter and progressive disclosure to minimize token usage.

> **Start here:** `skill_read("solana-clawd")` — the master skill covering the entire codebase: one-shot install, all 31 MCP tools, Telegram bot, voice mode, OODA loops, Metaplex minting, vault, deploy, and repo structure.

### How Skills Work

```
Level 0: skill_list()              -> [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view("pump-sdk-core") -> Full SKILL.md content                (varies)
Level 2: skill_view("pump-sdk-core", "references/api.md") -> Specific file   (varies)
```

The agent only loads full skill content when it actually needs it. Every skill is also a slash command:

```
/solana-clawd          # Master skill — full codebase playbook
/solanaos             # Full SolanaOS operator guide
/pumpfun-trading      # Buy/sell on Pump.fun bonding curves
/coding-agent         # Delegate to Codex/Claude Code
/swarm-orchestrator   # Multi-bot trading swarms
/weather              # Get weather forecasts
```

### Skill Categories

| Category | Count | Examples |
| -------- | ----- | ------- |
| Pump.fun / Token Launch | 22 | pump-sdk-core, pumpfun-trading, pump-bonding-curve, pump-fee-sharing |
| Solana / Blockchain | 7 | solanaos, solana-dev, solana-formal-verification, solana-research-brief |
| AI / Agents | 11 | coding-agent, swarm-orchestrator, skill-creator, e2b, cua |
| Communication | 6 | discord, slack, imsg, bluebubbles, himalaya, voice-call |
| Productivity | 8 | apple-notes, apple-reminders, notion, obsidian, 1password, trello |
| Web / Research | 9 | browse, blogwatcher, weather, pdf-to-markdown, summarize, xurl |
| Media | 8 | camsnap, canvas, gifgrep, spotify-player, video-frames, songsee |
| DevOps / Infrastructure | 7 | gateway-node-ops, healthcheck, tmux, openhue, eightctl |
| Clawd Ecosystem | 2 | clawhub, openclaw-claude-code-skill-main |
| Other | 9 | gog, goplaces, honcho-integration, mcporter, nano-pdf |

### Browse Skills

Open `web/skills/index.html` or run:

```bash
npm run skills:catalog   # regenerate catalog.json
npm run skills:serve     # serve the catalog at localhost:3333
```

### SKILL.md Format

```yaml
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
metadata:
  solanaos:
    emoji: "\U0001F680"
    requires:
      env: [HELIUS_RPC_URL]
      bins: [node]
---

# Skill Title

## When to Use
Trigger conditions for this skill.

## Procedure
1. Step one
2. Step two

## Pitfalls
- Known failure modes and fixes
```

### Install Skills

```bash
# Add from the skills hub
npx skills add x402agent/solana-clawd

# Or copy a skill directory into skills/
cp -r my-skill/ skills/my-skill/
npm run skills:catalog   # regenerate the catalog
```

---

## Metaplex Agent Minting (MPL Agent Registry)

`solana-clawd` fully integrates the **Metaplex mpl-agent-registry SDK** to mint, register, and manage AI agents as on-chain MPL Core assets on Solana.

### What It Does

- **Mint agents** -- Creates an MPL Core asset + Agent Identity PDA in a single atomic transaction
- **Register identities** -- Attach agent identities to existing Core assets with ERC-8004 metadata
- **Read agent data** -- Fetch registration status, lifecycle hooks, and agent wallet balances
- **Delegate execution** -- Register executive profiles and delegate off-chain operation to trusted operators
- **Agent wallets** -- Every agent gets a built-in wallet (Asset Signer PDA) -- no private key, can hold SOL and tokens

### Quick Mint

```typescript
import {
  createAgentUmiFromEnv,
  mintClawdAgentFromTemplate,
  verifyAgentMint,
} from 'solana-clawd/metaplex'

const umi = createAgentUmiFromEnv('solana-devnet')

const result = await mintClawdAgentFromTemplate(umi, 'trader', {
  uri: 'https://arweave.net/your-metadata.json',
  network: 'solana-devnet',
  serviceEndpoints: {
    trading: 'https://myagent.ai/trade',
    A2A: 'https://myagent.ai/agent-card.json',
    MCP: 'https://myagent.ai/mcp',
  },
})

console.log('Agent asset:', result.assetAddress)
console.log('Tx signature:', result.signature)

const identity = await verifyAgentMint(umi, result.assetAddress)
console.log('Registered:', identity.isRegistered)
```

### Role Templates

Six built-in templates for instant agent deployment:

| Template | Description | Services |
|---|---|---|
| `explorer` | Read-only Solana research agent | A2A, MCP |
| `scanner` | Market scanner for trending tokens | A2A, MCP |
| `trader` | Full OODA loop trading agent | trading, A2A, MCP |
| `analyst` | Deep research report agent | A2A, MCP |
| `monitor` | Onchain event monitoring agent | web, A2A |
| `custom` | Blank template for custom agents | (none) |

### Supported Networks

| Network | Value | RPC |
|---|---|---|
| Solana Mainnet | `solana-mainnet` | `https://api.mainnet-beta.solana.com` |
| Solana Devnet | `solana-devnet` | `https://api.devnet.solana.com` |
| Localnet | `localnet` | `http://127.0.0.1:8899` |
| Eclipse Mainnet | `eclipse-mainnet` | `https://mainnetbeta-rpc.eclipse.xyz` |
| Sonic Mainnet | `sonic-mainnet` | `https://api.mainnet.sonic.game` |
| Sonic Devnet | `sonic-devnet` | `https://api.devnet.sonic.game` |
| Fogo Mainnet | `fogo-mainnet` | `https://rpc.fogo.xyz` |
| Fogo Testnet | `fogo-testnet` | `https://rpc.testnet.fogo.xyz` |

---

## OODA Trading Loop

The multi-venue OODA cycle adapted from [SolanaOS strategy.md](strategy.md):

```
OBSERVE  -> sol_price, trending, helius_priority_fee, memory KNOWN
ORIENT   -> score candidates (trend 25 + momentum 20 + liquidity 20 + participation 15 - execution risk 20)
DECIDE   -> confidence >= 60? -> size band (0.5x / 1.0x / 1.25x / 1.5x)
ACT      -> trade_execute gated at `ask` permission (human approval required)
LEARN    -> write INFERRED signals -> Dream agent promotes to LEARNED
```

```bash
npx tsx examples/ooda-loop.ts
```

### Built-in Agent Fleet

Nine agents adapted from Clawd Code's `builtInAgents.ts`:

```
Explore        -- read-only research, 10 turns, readOnly, cheap
Scanner        -- market scan, 25 turns, watches trending + smart money
PumpScanner    -- autonomous Pump.fun curve watcher (via solana_dev_skill)
SniperBot      -- automated trade execution loop (via solana_dev_skill)
OODA           -- full trading cycle, 40 turns, ask permission, sync
Dream          -- memory consolidation, 20 turns, promotes INFERRED -> LEARNED
Analyst        -- structured research reports, 30 turns, high effort
Monitor        -- onchain listener setup, 15 turns, configures webhooks
MetaplexAgent  -- onchain agent minting via Metaplex MPL Core, 25 turns
```

---

## Onchain Event Listener

Built on [Helius WebSockets](https://docs.helius.dev/data-streaming-event-listening/overview). Auto-reconnects with exponential backoff. Uses Node 22 native `WebSocket`.

```typescript
import { HeliusListener, HeliusClient } from "./src/helius/index.js";

const client = new HeliusClient({ apiKey: process.env.HELIUS_API_KEY! });
const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });

await listener.connect();

// 1. Account changes (standard WebSocket -- accountSubscribe)
await listener.subscribeAccount("WALLET_ADDRESS", (data) => {
  console.log("SOL balance:", data.account.lamports / 1e9);
});

// 2. All Token Program transactions (Enhanced WebSocket -- Helius-specific)
await listener.subscribeTransaction({
  accountInclude: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
  vote: false,
  failed: false,
}, (tx) => console.log("Token tx:", tx.signature));

// 3. Raydium AMM logs
await listener.subscribeLogs(
  { filter: { mentions: ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"] } },
  (log) => console.log("Raydium:", log.logs),
);

// 4. Slot heartbeat (~400ms)
await listener.subscribeSlot((slot) => process.stdout.write(`\rSlot: ${slot.slot}`));

// 5. Webhooks (server-side, permanent)
// MCP tool: helius_webhook_create
// Express route: createWebhookRouter(emitter)
```

**Run the example:**
```bash
HELIUS_API_KEY=your-key npx tsx examples/listen-wallet.ts <WALLET_ADDRESS>
```

---

## Memory System

Three tiers inspired by SolanaOS epistemology + Clawd Code's memory extraction:

```typescript
import { writeMemory, recallMemory, getMemoryContext } from "./src/state/app-state.js";

// Write a fact (KNOWN = expires, LEARNED = persistent, INFERRED = tentative)
writeMemory({
  tier: "KNOWN",
  content: "SOL: $142.30, +3.2% 24h",
  source: "coingecko",
  expiresAt: Date.now() + 60_000, // KNOWN facts expire
});

writeMemory({ tier: "LEARNED", content: "BONK typically leads meme rallies by 2-4h" });
writeMemory({ tier: "INFERRED", content: "WIF showing accumulation pattern similar to March 2025" });

// Query memory
const signals = recallMemory("accumulation", "INFERRED");

// Get full context for LLM injection
const ctx = getMemoryContext(getAppState());
// -> "# Agent Memory\n## KNOWN\n- ...\n## LEARNED\n- ...\n## INFERRED\n- ..."
```

---

## Permission Engine

All trade operations are **deny-first**. Adapted from Clawd Code's permission system.

```typescript
// src/state/app-state.ts
const alwaysDenyTools = ["trade_execute", "wallet_send", "wallet_sign"];

// Read-only tools auto-approved for all agents
const alwaysAllowTools = ["solana_price", "helius_account_info", ...];

// Permission modes
type PermissionMode =
  | "ask"      // default: prompt before irreversible actions
  | "auto"     // auto-approve reads, ask for writes
  | "bypassAll"  // dev only
  | "readOnly";  // deny all writes at engine level
```

---

## Deploy to Fly.io

24/7 public MCP endpoint in 2 minutes:

```bash
cd mcp-server
fly launch --config fly.toml
fly secrets set HELIUS_API_KEY=your-key MCP_API_KEY=optional-bearer-token
```

Then connect anyone via:
```json
{ "type": "http", "url": "https://your-app.fly.dev/mcp" }
```

---

## Repository Structure

```
solana-clawd/
├── mcp-server/           MCP server (Clawd Desktop, Cursor, Fly.io)
│   ├── src/
│   │   ├── server.ts     31 tools, 4 resources, 5 prompts
│   │   ├── http.ts       HTTP + SSE + Streamable transport
│   │   └── index.ts      STDIO transport (Clawd Desktop)
│   ├── Dockerfile
│   └── fly.toml
├── src/                  Core engine (58 subsystems, 400+ source files)
│   ├── animations/       $CLAWD unicode spinners (9 custom)
│   ├── buddy/            Blockchain Buddy companion system (18 species)
│   ├── helius/           Helius RPC + DAS + Webhooks + WebSocket listener
│   ├── state/            AppState (Zustand — OODA phases, memory, permissions)
│   ├── agents/           7 built-in agents (Explore, Scanner, OODA, Dream, Analyst, Monitor, Metaplex)
│   ├── metaplex/         MPL Core agent minting + identity PDAs
│   ├── pump/             Pump.fun bonding curve scanner + client
│   ├── telegram/         Full Telegram trading bot (60+ commands, pump sniper, xAI/Grok, Twitter)
│   ├── engine/           QueryEngine (multi-LLM), PermissionEngine (deny-first), RiskEngine (128-bit)
│   ├── coordinator/      Multi-agent orchestrator (fan-out, task notifications)
│   ├── memory/           KNOWN/LEARNED/INFERRED auto-extraction
│   ├── vault/            AES-256-GCM encrypted secret store
│   ├── gateway/          SSE/WebSocket transport bridge
│   ├── bridge/           Remote bridge (JWT, device auth, session management — 34 modules)
│   ├── voice/            Voice mode (ElevenLabs + Anthropic providers)
│   ├── monitor/          Birdeye stream, Solana Tracker, wallet monitoring
│   ├── tools/            Tool registry + executor (31 MCP tools)
│   ├── services/         autoDream, SessionMemory, analytics, MCP, LSP, compact (19 modules)
│   ├── tasks/            DreamTask, LocalAgent, RemoteAgent, LocalShell, Monitor
│   ├── skills/           Skill registry and loader
│   ├── server/           Web server, PTY terminal, session manager, auth adapters
│   ├── cli/              CLI handlers, transports, structured I/O
│   ├── commands/         60+ slash commands (agents, memory, plan, config, permissions...)
│   ├── components/       113 Ink/React UI components
│   ├── hooks/            83 custom hooks
│   ├── vim/              Vi/Vim editor mode
│   ├── entrypoints/      CLI entry (demo, birth, spinners, wallet)
│   └── shared/           Message types, model catalog, tool policy
├── web/                  Next.js frontend — solanaclawd.com
│   ├── app/              Chat, Buddies, Voice (ElevenLabs + Grok dual-provider)
│   ├── components/       UI components (Button, Dialog, Tabs, Toast, etc.)
│   ├── hooks/            useConversation, useToast, useTheme, usePresence...
│   └── lib/              Store (Zustand), API client, search, export
├── gateway/              HTTP API + Telegram bot + Birdeye WebSocket
│   ├── src/index.ts      Express REST (14 endpoints: balance, tokens, txs, price, search...)
│   ├── src/telegram.ts   TelegramBot class (long-poll, access control)
│   ├── src/birdeye.ts    BirdeyeWS (live prices, new listings, whale alerts)
│   └── src/solana.ts     Helius RPC + wallet helpers
├── packages/
│   └── agentwallet/      Encrypted wallet vault SDK
│       ├── src/vault.ts  AES-256-GCM encrypted Solana + EVM keypair storage
│       ├── src/server.ts Express HTTP API (port 9099, Bearer auth)
│       ├── src/cli.ts    CLI tool (create, import, export, deploy)
│       └── src/deploy/   E2B sandbox + Cloudflare Workers deployment
├── beepboop/             macOS menu bar companion app (SwiftUI)
│   ├── leanring-buddy/   Claude vision + push-to-talk voice + screen capture
│   │   ├── CompanionManager.swift    Central state machine (1026 lines)
│   │   ├── ElevenLabsTTSClient.swift ElevenLabs voice output
│   │   ├── BuddyDictationManager.swift  Voice pipeline
│   │   └── OverlayWindow.swift       Lobster claw overlay (points at UI)
│   └── worker/           Cloudflare Worker proxy (Claude, ElevenLabs, AssemblyAI, Solana RPC)
├── MCP/                  X/Twitter FastMCP server (Python, 140+ tools)
│   └── x-mcp/           OAuth1/OAuth2, tool allowlisting, Grok test client
├── llm-wiki-tang/        Clawd Vault — research knowledge base
│   ├── web/              Next.js 16 dashboard (PDF viewer, wiki renderer)
│   ├── api/              FastAPI backend (auth, OCR, document processing)
│   └── mcp/              MCP tools (guide, search, read, write, delete)
├── tailclawd/            TailClawd — web UI wrapper via Tailscale
│   ├── src/proxy.ts      HTTP proxy with OTel tracing (38KB)
│   ├── src/ui.html       Full UI (4 tabs, activity sidebar — 30KB)
│   └── quickstart/       iii SDK worker swarm (TS + Rust + Python)
├── elevenlabs-mcp-main/  ElevenLabs MCP server (TTS, voice agents, cloning)
├── formal_verification/  Lean 4 risk engine specification (SPEC.md)
├── solana-tradingview-advanced-chart-example-main/
│                         TradingView Advanced Charts + Solana Tracker reference
├── skills/               95 SKILL.md knowledge documents
│   └── catalog.json      Generated skill manifest
├── examples/
│   ├── blockchain-buddies-demo.ts  Full buddy demo
│   ├── listen-wallet.ts            Real-time wallet monitor
│   ├── ooda-loop.ts                Full OODA cycle demo
│   └── x402-solana.ts              x402 micropayment protocol demo
├── docs/
│   ├── architecture.md             System overview + data flow diagrams (48KB)
│   ├── migrate-from-openclaw.md    clawd migrate guide + config mappings
│   └── risk-engine-spec.md         128-bit perp DEX risk engine
├── scripts/
│   ├── setup.sh                    One-shot setup
│   └── generate-skills-catalog.js  Catalog generator
├── SOUL.md               Agent identity + epistemological model
├── strategy.md           Multi-venue trading strategy (SolanaOS v2.0)
└── .env.example          All env vars documented (55 lines)
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list (55 lines with comments). Key groups:

```bash
# Core (free at helius.dev)
HELIUS_API_KEY=               # RPC, DAS, enhanced txs, webhooks, WebSocket
SOLANA_TRACKER_API_KEY=       # Trend data, token info

# LLM providers (pick one+)
ANTHROPIC_API_KEY=            # Claude
OPENROUTER_API_KEY=           # Multi-model routing
XAI_API_KEY=                  # Grok (chat, voice, vision, search)

# Voice
ELEVEN_LABS_API_KEY=          # ElevenLabs TTS + STT + Voice Agents
ELEVENLABS_AGENT_ID=          # Conversational Agent ID

# Telegram
TELEGRAM_BOT_TOKEN=           # From @BotFather
TELEGRAM_CHAT_ID=             # Alert destination

# Wallet (optional — signal-only works without)
SOLANA_PUBLIC_KEY=            # Default wallet
SOLANA_PRIVATE_KEY=           # Live trade execution only
VAULT_PASSPHRASE=             # AES-256-GCM master key

# Deployment
MCP_API_KEY=                  # Bearer token for remote MCP server
```

---

## Documentation

| Doc | Description |
| --- | --- |
| [Architecture](docs/architecture.md) | System overview, data flow diagrams, directory structure, 10 major subsystems (48KB) |
| [Migrate from OpenClaw](docs/migrate-from-openclaw.md) | `clawd migrate` guide — config mappings, memory tier conversion, wallet migration, troubleshooting |
| [Risk Engine Spec](docs/risk-engine-spec.md) | 128-bit perpetual DEX risk engine design |
| [Formal Verification](formal_verification/SPEC.md) | Lean 4 property specification (`prop_protected_principal`, `prop_conservation`) |
| [Contributing](CONTRIBUTING.md) | Setup, code style, PR process, walkthroughs for adding species/spinners |
| [SOUL.md](SOUL.md) | Agent identity, 3-tier epistemology, permission principles |

## Contributing

PRs welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for full setup and guidelines.

High-impact areas:

- **New Solana tools** -- DeFi protocols, NFT markets, compressed NFTs
- **LaserStream gRPC** -- ultra-low latency with `helius-laserstream` package
- **Persistent memory** -- swap in-process memory for Honcho v3 or SQLite
- **Yellowstone gRPC** -- Geyser plugin integration
- **New Buddy species** -- submit a PR with sprites + trading config
- **New spinners** -- braille-grid art welcome
- **Voice agent skills** -- teach the voice agents new Solana-specific capabilities
- **Mobile companion** -- Android port of the beepboop macOS menu bar app

---

## Credits

- **[Anthropic Clawd Code](https://github.com/nirholas/clawd-code)** -- agentic architecture (leaked March 2026)
- **[SolanaOS](https://github.com/x402agent/SolanaOS)** -- OODA strategy, Honcho memory, Solana tooling
- **[Helius](https://helius.dev)** -- best-in-class Solana RPC, DAS, streaming
- **[Model Context Protocol](https://modelcontextprotocol.io)** -- the glue that makes it work in Clawd Desktop

---

<div align="center">

**$CLAWD** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

MIT · [github.com/x402agent/solana-clawd](https://github.com/x402agent/solana-clawd) · [solanaclawd.com](https://solanaclawd.com)

</div>
