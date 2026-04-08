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

[**One-Shot Install**](#one-shot-install) · [**Blockchain Buddies**](#blockchain-buddies) · [**Animations**](#clawd-animations) · [**MCP Tools**](#mcp-tools-31) · [**Metaplex Agents**](#metaplex-agent-minting-mpl-agent-registry) · [**Worker Swarm**](#solana-worker-swarm-iii-sdk) · [**Skills**](#skills-catalog-88-skills) · [**Deploy**](#deploy-to-flyio)

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

### TailClawd UI

Cypherpunk Web Dashboard in `/tailclawd`: CRT-styled command center bridging Engine Memory, Session Tracking, and Activity traces. Live at **[stalwart-queijadas-a9cb83.netlify.app](https://stalwart-queijadas-a9cb83.netlify.app)**

---

## CLAWD Wiki — Trading Intelligence Knowledge Base

Inspired by [Karpathy's LLM Wiki](https://github.com/karpathy/llm-wiki), adapted for Solana trading agents. A self-evolving knowledge base where OODA loops, scanner signals, and agent memory compile into structured wiki articles.

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CLAWD Wiki                         │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Next.js UI   │  │  REST API    │  │  Agent API │ │
│  │  :3777        │  │  /api/       │  │  (MCP)     │ │
│  └──────┬────────┘  └──────┬───────┘  └──────┬─────┘ │
│         └────────┬─────────┘                 │       │
│         ┌───────▼──────────────────────────▼──────┐ │
│         │           Wiki Store (JSON)              │ │
│         │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │ │
│         │  │  KNOWN   │ │ LEARNED │ │ INFERRED  │  │ │
│         │  │  (fresh) │ │ (valid) │ │ (tentative│  │ │
│         │  └─────────┘ └─────────┘ └───────────┘  │ │
│         └──────────────────────────────────────────┘ │
│                          ▲                           │
│  ┌───────┐ ┌─────────┐  │  ┌──────────┐             │
│  │Scanner│→│ OODA    │→─┘  │  Dream   │             │
│  │signals│ │ loops   │     │  agent   │             │
│  └───────┘ └─────────┘     └──────────┘             │
│              Helius RPC + Birdeye + Solana Tracker    │
└──────────────────────────────────────────────────────┘
```

### Categories

| Category | Icon | What It Covers |
|----------|------|---------------|
| **Tokens** | 💰 | Token profiles — SOL, BONK, JUP, memecoins |
| **Wallets** | 👛 | Smart money, whale wallets, PnL tracking |
| **Protocols** | 🔗 | Jupiter, Raydium, Pump.fun, Marinade |
| **Strategies** | 🎯 | OODA loops, scalping, arbitrage, sniper configs |
| **Signals** | 📡 | Market patterns, rug detection, alpha signals |
| **Agents** | 🤖 | Agent configs, Dream consolidation, fleet management |
| **Trade Log** | 📜 | Executed trades, PnL records, post-mortems |
| **Research** | 🔬 | Deep-dive analysis, sector reports |
| **Glossary** | 📖 | DeFi/Solana term definitions |

### Memory Tiers (SolanaOS Epistemology)

- **KNOWN** (blue) — Fresh market data from API calls. Auto-expires.
- **LEARNED** (green) — Validated patterns confirmed by Dream agent. Permanent.
- **INFERRED** (amber) — Tentative signals from scanners. Promoted or expired by Dream.

### Quick Start

```bash
cd web/wiki
npm install
npm run seed     # Pre-populate with Solana trading knowledge
npm run dev      # http://localhost:3777
```

### REST API

```
GET  /api/articles                  -- All articles
GET  /api/articles?q=bonk           -- Full-text search
GET  /api/articles?category=token   -- Filter by category
GET  /api/articles?tier=LEARNED     -- Filter by memory tier
GET  /api/articles?tree=true        -- Sidebar navigation tree
GET  /api/articles?ooda=true        -- OODA context (for agent injection)
GET  /api/articles?slug=ooda-loop   -- Single article by slug
POST /api/articles                  -- Create article (JSON body)
PUT  /api/articles                  -- Update article (requires id)
DELETE /api/articles?id=xxx         -- Soft-delete
```

### Agent Integration

Agents write to the wiki during OODA loops:
- **OBSERVE:** Scanner writes KNOWN articles (token prices, trending data)
- **ORIENT:** Analyst writes research articles with signal scores
- **LEARN:** Dream agent promotes INFERRED → LEARNED, expires stale signals
- **OODA context:** `GET /api/articles?ooda=true` returns structured memory for prompt injection

### Seed Articles (6 foundational)

| Article | Category | Tier |
|---------|----------|------|
| OODA Trading Loop | Strategy | LEARNED |
| SOL (Solana) | Token | LEARNED |
| Pump.fun Bonding Curve | Protocol | LEARNED |
| Three-Tier Memory System | Agent | LEARNED |
| Jupiter Aggregator | Protocol | LEARNED |
| Rug Pull Detection Patterns | Signal | LEARNED |

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

## Skills Catalog (88 Skills)

`solana-clawd` ships with **89 on-demand knowledge skills** the agent can load when needed. Skills follow the [agentskills.io](https://agentskills.io) open standard with YAML frontmatter and progressive disclosure to minimize token usage.

### How Skills Work

```
Level 0: skill_list()              -> [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view("pump-sdk-core") -> Full SKILL.md content                (varies)
Level 2: skill_view("pump-sdk-core", "references/api.md") -> Specific file   (varies)
```

The agent only loads full skill content when it actually needs it. Every skill is also a slash command:

```
/weather              # Get weather forecasts
/coding-agent         # Delegate to Codex/Claude Code
/pumpfun-trading      # Buy/sell on Pump.fun bonding curves
/swarm-orchestrator   # Multi-bot trading swarms
/solanaos             # Full SolanaOS operator guide
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
├── src/
│   ├── animations/       $CLAWD unicode spinners (9 custom)
│   │   ├── clawd-frames.ts    Braille-grid spinner definitions
│   │   ├── spinner.ts         createClawdSpinner / withSpinner
│   │   ├── birth-ceremony.ts  Animated buddy hatching sequence
│   │   └── index.ts
│   ├── buddy/            Blockchain Buddy companion system
│   │   ├── blockchain-types.ts   18 species, 8 trading personalities
│   │   ├── blockchain-sprites.ts ASCII art sprites (multi-frame)
│   │   ├── blockchain-wallet.ts  Per-buddy simulated wallets
│   │   ├── companion.ts          Buddy creation + formatting
│   │   ├── CompanionSprite.tsx   React component
│   │   ├── useBuddyNotification.tsx  Hook for buddy alerts
│   │   └── index.ts
│   ├── helius/           Helius RPC + DAS + Webhooks + WebSocket listener
│   │   ├── helius-client.ts     HTTP client (RPC, DAS, enhanced txs, priority fees)
│   │   ├── onchain-listener.ts  WebSocket (account/tx/logs/slot/signature/enhanced)
│   │   └── index.ts
│   ├── state/            AppState (adapted from Clawd Code)
│   │   ├── store.ts      Reactive store (pure TS, no React)
│   │   └── app-state.ts  OODA phases, memory tiers, permissions, agent fleet
│   ├── agents/           Agent definitions
│   │   └── built-in-agents.ts  Explore, Scanner, OODA, Dream, Analyst, Monitor, Metaplex
│   ├── metaplex/         Metaplex Agent Registry integration
│   │   ├── metaplex-types.ts   Types, networks, Clawd role templates
│   │   ├── agent-minter.ts     Mint agents via Metaplex API
│   │   ├── agent-registry.ts   Register, read, delegate, wallet ops
│   │   └── index.ts
│   ├── tools/            Tool definitions and registry
│   │   └── tool-registry.ts    ToolDef interface, registry, executor
│   ├── services/          Unified data + agent layer
│   │   ├── solanaTrackerAPI.ts  Unified client (Solana Tracker + Helius + Birdeye + CoinGecko)
│   │   └── solanaAgent.ts       Autonomous agent (OODA, research, watchlist, memory)
│   ├── telegram/          Full Telegram trading bot (60+ commands)
│   │   ├── bot.ts               SolanaClaudeBot class (long-poll + webhook)
│   │   ├── commands.ts          60+ command handlers
│   │   ├── types.ts             Session, signal, sniper types
│   │   ├── pump-sniper.ts       PumpPortal WebSocket scanner + sniper
│   │   ├── xai.ts               xAI/Grok integration (vision, gen, search)
│   │   ├── twitter.ts           Twitter/X OAuth 1.0a + auto-tweet daemon
│   │   └── index.ts             Entry point
│   ├── vault/             AES-256-GCM encrypted secret store
│   ├── engine/           Permission + query engine
│   ├── coordinator/      Multi-agent coordinator
│   ├── memory/           Memory extraction (KNOWN/LEARNED/INFERRED)
│   ├── gateway/          SSE transport (gateway bridge)
│   ├── tasks/            Task lifecycle manager
│   ├── skills/           Skill registry and loader
│   │   ├── skill-registry.ts   SkillRegistry class, frontmatter parser, bootstrap
│   │   ├── bundledSkills.ts    Bundled skill definitions
│   │   └── loadSkillsDir.ts    Filesystem skill loader
│   ├── entrypoints/      CLI entry (demo, birth, spinners)
│   └── shared/           Message types, model catalog, tool policy
├── solana-tracker/       Solana data API server + client
│   ├── server/
│   │   ├── index.js             Express + WebSocket server
│   │   ├── services/
│   │   │   ├── helius.js        Helius RPC/DAS/Wallet API service
│   │   │   └── solanaTracker.js Solana Tracker Data API service
│   │   └── routes/
│   │       ├── wallet.js        Helius wallet endpoints
│   │       ├── das.js           Helius DAS endpoints
│   │       ├── tracking.js      Composite tracking endpoints
│   │       ├── tokens.js        Solana Tracker token endpoints (trending/chart/trades/pools)
│   │       └── trading.js       Trading endpoints (PnL/research/overview/scoring)
│   └── client/            React dashboard (wallet tracker UI)
├── skills/              88 SKILL.md knowledge documents (agentskills.io format)
│   ├── pump-sdk-core/SKILL.md
│   ├── pumpfun-trading/SKILL.md
│   ├── solanaos/SKILL.md
│   ├── coding-agent/SKILL.md
│   ├── ... (89 total)
│   └── catalog.json     Generated skill manifest
├── web/
│   └── skills/index.html  Static skills catalog browser
├── scripts/
│   ├── setup.sh           One-shot setup
│   └── generate-skills-catalog.js  Catalog generator
├── tailclawd/           Cypherpunk Telegram Gateway + Worker Swarm
│   └── quickstart/      iii SDK worker swarm
│       ├── workers/
│       │   ├── client/          TS orchestrator (7 HTTP endpoints)
│       │   ├── compute-worker/  Rust tx builder (Jupiter, fees, risk)
│       │   ├── data-worker/     Python analytics (balances, holders)
│       │   └── payment-worker/  TS tx submission (transfers, airdrop)
│       ├── docker-compose.yaml  Spin up all 4 workers
│       └── iii-config.yaml      iii engine configuration
├── docs/                 Specs including risk-engine-spec.md
├── examples/
│   ├── listen-wallet.ts  Real-time wallet monitor
│   └── ooda-loop.ts      Full OODA cycle demo
├── SOUL.md               Agent identity
├── strategy.md           Multi-venue trading strategy (SolanaOS v2.0)
└── .env.example          All env vars documented
```

---

## Environment Variables

```bash
# Recommended -- free at helius.dev (1M credits/month)
HELIUS_API_KEY=            # RPC, DAS, enhanced txs, webhooks, WebSocket
HELIUS_RPC_URL=            # auto-built from key if blank
HELIUS_WSS_URL=            # WebSocket endpoint

# Optional -- public APIs work without these
SOLANA_TRACKER_API_KEY=    # trend data, enhanced token info

# Optional -- MCP mode uses Clawd's built-in model
OPENROUTER_API_KEY=        # or XAI_API_KEY or ANTHROPIC_API_KEY

# Optional -- secure public deployment
MCP_API_KEY=               # Bearer token for remote MCP server

# Optional -- Metaplex agent minting
SOLANA_RPC_URL=            # Custom RPC endpoint (defaults to devnet)
SOLANA_SECRET_KEY=         # JSON array of secret key bytes
```

---

## Contributing

PRs welcome. High-impact areas:

- **New Solana tools** -- DeFi protocols, NFT markets, compressed NFTs
- **LaserStream gRPC** -- ultra-low latency with `helius-laserstream` package
- **Persistent memory** -- swap in-process memory for Honcho v3 or SQLite
- **Voice integration** -- SolanaOS STT/TTS surfaces
- **Yellowstone gRPC** -- Geyser plugin integration
- **New Buddy species** -- submit a PR with sprites + trading config
- **New spinners** -- braille-grid art welcome

---

## Credits

- **[Anthropic Clawd Code](https://github.com/nirholas/clawd-code)** -- agentic architecture (leaked March 2026)
- **[SolanaOS](https://github.com/x402agent/SolanaOS)** -- OODA strategy, Honcho memory, Solana tooling
- **[Helius](https://helius.dev)** -- best-in-class Solana RPC, DAS, streaming
- **[Model Context Protocol](https://modelcontextprotocol.io)** -- the glue that makes it work in Clawd Desktop

---

<div align="center">

**$CLAWD** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

MIT · [github.com/x402agent/solana-clawd](https://github.com/x402agent/solana-clawd) · [seeker.solanaos.net](https://seeker.solanaos.net)

</div>
