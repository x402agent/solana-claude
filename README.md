<div align="center">

```
  _____       __                        ________                    __
 / ___/____  / /___ _____  ____ _     / ____/ /___ __      ______/ /
 \__ \/ __ \/ / __ `/ __ \/ __ `/   / /   / / __ `/ | /| / / __  /
___/ / /_/ / / /_/ / / / / /_/ /   / /___/ / /_/ /| |/ |/ / /_/ /
/____/\____/_/\__,_/_/ /_/\__,_/    \____/_/\__,_/ |__/|__/\__,_/
                    ╔══════════════════════════╗
                    ║   POWERED BY xAI GROK    ║
                    ╚══════════════════════════╝
```

# solana-clawd

### The AI agent Elon would actually use to trade memecoins.

**Solana x xAI agentic engine.** Multi-agent research (16 Grok agents). Vision. Image gen. Voice. Function calling. X Search. Web Search. Structured outputs. 31 MCP tools. One env var.

Powered by **$CLAWD** on Solana & Pump.fun | Built on **Grok** from **xAI**

`8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

[![npm version](https://img.shields.io/npm/v/solana-clawd?color=ff6b35&label=npm)](https://www.npmjs.com/package/solana-clawd)
[![npm downloads](https://img.shields.io/npm/dm/solana-clawd?color=ff6b35)](https://www.npmjs.com/package/solana-clawd)
[![xAI Grok](https://img.shields.io/badge/xAI-Grok%204.20-black?logo=x)](https://x.ai)
[![Multi-Agent](https://img.shields.io/badge/Multi--Agent-4--16%20agents-purple)](src/services/grokMultiAgent.ts)
[![Vision](https://img.shields.io/badge/Vision-chart%20analysis-blue)](src/services/grokVision.ts)
[![Image Gen](https://img.shields.io/badge/Image%20Gen-grok--imagine-orange)](src/services/grokImageGen.ts)
[![X Search](https://img.shields.io/badge/X%20Search-real--time-1DA1F2)](web/app/api/grok/x-search/)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-native-blueviolet)](https://modelcontextprotocol.io)
[![Helius](https://img.shields.io/badge/Helius-RPC%20%2B%20WebSocket-orange)](https://helius.dev)
[![No Private Key](https://img.shields.io/badge/private%20key-not%20required-brightgreen)](README.md)
[![Fly.io](https://img.shields.io/badge/Fly.io-deployable-blue)](MCP/fly.toml)
[![Tools](https://img.shields.io/badge/MCP%20tools-31-ff6b35)](MCP/src/server.ts)
[![Voice](https://img.shields.io/badge/Voice-xAI%20Grok-ff4444)](web/app/api/voice/)
[![Buddies](https://img.shields.io/badge/Blockchain%20Buddies-18%20species-ff69b4)](src/buddy/)
[![Telegram](https://img.shields.io/badge/Telegram-60%2B%20commands-26A5E4?logo=telegram)](src/telegram/)
[![Skills](https://img.shields.io/badge/Skills-95%20catalog-yellow)](skills/)
[![Live](https://img.shields.io/badge/live-solanaclawd.com-00ff88)](https://solanaclawd.com)

[**Install**](#one-shot-install) · [**Cloud OS**](#clawd-cloud-os) · [**Grok Integration**](#-xai-grok-integration) · [**Clawd Agent**](#-clawd-character-agent) · [**API Routes**](#grok--clawd-api-routes) · [**Chrome Extension**](#chrome-extension) · [**MCP Tools**](#mcp-tools-31) · [**Buddies**](#blockchain-buddies) · [**Voice**](#voice-mode) · [**Telegram**](#telegram-trading-bot) · [**Skills**](#skills-catalog-95-skills) · [**Deploy**](#deploy-to-flyio)

</div>

---

## One-Shot Install

There are **four ways** to install solana-clawd, from lightest to full stack:

### npm (quickest — try it now)

```bash
npx solana-clawd demo        # animated walkthrough — zero install
npx solana-clawd birth       # hatch a blockchain buddy
npm i -g solana-clawd        # global install for CLI + imports
```

No private key. No wallet. No paid API. Run it, ask it anything.

### npm package

```bash
npm i solana-clawd
```

```typescript
// Core engine
import { getBuiltInAgents, getBuiltInAgent } from 'solana-clawd'

// Animated spinners
import { createClawdSpinner, withSpinner } from 'solana-clawd/animations'
import { CLAWD_SPINNERS } from 'solana-clawd/animations'

// Blockchain Buddy companion system
import { createBlockchainBuddy } from 'solana-clawd/buddy'
import { renderBlockchainSprite, formatBuddyCard } from 'solana-clawd/buddy'

// Metaplex agent minting
import { mintClawdAgent, registerAgentIdentity } from 'solana-clawd/metaplex'
```

### Git clone (full repo — dev + MCP + web)

```bash
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd
npm run setup
```

`npm run setup` is the full repo bootstrap. It checks for Node 20+, installs dependencies, builds the root runtime, builds the integrated MCP package in `MCP/`, installs and builds `packages/agentwallet/`, builds the main `web/` app, builds the Clawd Vault app in `llm-wiki-tang/web/`, builds the wiki app in `web/wiki/`, syncs the skills catalog, and creates `.env` from `.env.example` if needed.

### CLAWD Cloud OS (full stack — Go + SolanaOS + solana-clawd)

For E2B sandboxes, fresh Linux terminals, Docker, or any shell where Go is missing:

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh | bash
source ~/.bashrc
```

One command installs Go (user-space, no root needed), SolanaOS, and solana-clawd. See the [CLAWD Cloud OS](#clawd-cloud-os) section below.

### After any install

```bash
npm run demo                 # animated walkthrough
npm run birth                # hatch a blockchain buddy
npm run spinners             # preview all 9 custom unicode spinners
npm run mcp:http             # MCP HTTP server on :3000
npm run mcp:start            # MCP stdio server
npm run agentwallet:start    # wallet vault server on :9099
npm run ext:vault            # start vault for chrome extension
npm run vault:web:dev        # Clawd Vault app
npm --prefix web run dev     # main website on :3000
npm --prefix web/wiki run dev  # wiki app
npm run skills:serve         # skills catalog on :3333
```

---

## CLAWD Cloud OS

**One-shot bootstrap for E2B sandboxes, fresh Linux terminals, Docker, macOS, WSL — any shell where Go is missing.**

CLAWD Cloud OS brings together **SolanaOS** (Go-native Solana operator runtime), **solana-clawd** (xAI Grok agentic engine), and a terminal-first install path that works even on non-root sandboxes. After bootstrap, you get the same 31 MCP tools, 9 built-in agents, Blockchain Buddies, and the full [`solana-clawd` npm package](https://www.npmjs.com/package/solana-clawd) experience — plus Go, SolanaOS daemon, and terminal aliases.

### Install Paths at a Glance

| What you need | Command | What you get |
| --- | --- | --- |
| Just try it | `npx solana-clawd demo` | Walkthrough, no install |
| npm package only | `npm i solana-clawd` | Agents, buddies, spinners, MCP tools |
| Full repo dev | `git clone` + `npm run setup` | Everything above + web app + vault + wiki |
| Just Go (E2B/Docker) | `curl .../install-go.sh \| bash` | Go runtime on any terminal |
| Full Cloud OS stack | `curl .../bootstrap.sh \| bash` | Go + SolanaOS + solana-clawd + aliases |

### Cloud Bootstrap (remote — works anywhere)

```bash
# Install Go + SolanaOS + solana-clawd in one shot
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/bootstrap.sh | bash
source ~/.bashrc
```

### Just Need Go? (E2B / Docker / non-root terminals)

SolanaOS is a Go binary. If your terminal says `go: command not found` and `apt-get` fails because you are not root, this installs Go into your home directory:

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/clawd-cloud-os/scripts/install-go.sh | bash
source ~/.bashrc
go version
```

The installer auto-detects your architecture (x86_64/arm64) and OS (Linux/macOS), installs to `~/.local/go` (non-root) or `/usr/local/go` (root), and persists to your shell config.

### Post-Bootstrap

```bash
source ~/.bashrc

# Configure SolanaOS
sos onboard                  # guided setup wizard
sos version                  # verify installation

# Start everything
clawd-start                  # SolanaOS server + daemon + MCP

# Or start individually
sos server                   # Control UI on :7777
sos daemon                   # Operator loop
clawd-mcp                    # MCP HTTP server on :3000
clawd-web                    # Web UI on :3000
clawd-demo                   # Animated walkthrough
clawd-birth                  # Hatch a Blockchain Buddy
```

### CLAWD CLI

The unified CLI manages the full stack:

```bash
clawd-cli setup              # One-shot bootstrap (Go + SolanaOS + solana-clawd)
clawd-cli install-go         # Install Go on any terminal (root or non-root)
clawd-cli doctor             # Check all prerequisites and system health
clawd-cli start              # Start SolanaOS + MCP server
clawd-cli stop               # Stop all services
clawd-cli status             # Check local + remote service status
clawd-cli agents             # List registered agents
clawd-cli wallet             # View wallet info
clawd-cli prices             # Live token prices
clawd-cli demo               # Animated walkthrough
clawd-cli birth              # Hatch a Blockchain Buddy
```

### What Gets Installed

| Component | Path | Description |
| --- | --- | --- |
| Go | `~/.local/go` or `/usr/local/go` | Go runtime for SolanaOS |
| SolanaOS | `~/.solanaos/` | Go-native Solana operator runtime |
| solana-clawd | `~/src/solana-clawd/` | Full repo ([npm](https://www.npmjs.com/package/solana-clawd) v1.6.0) — 31 MCP tools, 9 agents, buddies, spinners |
| MOTD + aliases | `~/.bashrc` | Terminal banner, `clawd-*` shortcuts, `sos` alias |

### Cloud OS Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│  CLAWD CLOUD OS (bootstrap layer)                            │
│                                                              │
│  install-go.sh ──► bootstrap.sh ──► clawd-cli.sh            │
│       │                 │                │                   │
│       ▼                 ▼                ▼                   │
│  ┌─────────┐    ┌───────────┐    ┌─────────────┐            │
│  │   Go    │    │ SolanaOS  │    │solana-clawd │            │
│  │ runtime │───►│  daemon   │    │  npm v1.6.0 │            │
│  └─────────┘    │  server   │    │  MCP + Web  │            │
│                 │  wallet   │    │  31 tools   │            │
│                 │  MCP      │    │  9 agents   │            │
│                 └───────────┘    │  buddies    │            │
│                      │           │  spinners   │            │
│                      │           └─────────────┘            │
│                      ▼                │                      │
│              ┌────────────────────────────────┐              │
│              │  Terminal experience            │              │
│              │  MOTD · aliases · clawd-cli    │              │
│              │  npx solana-clawd demo/birth   │              │
│              └────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

See [clawd-cloud-os/README.md](clawd-cloud-os/README.md) for the full reference, troubleshooting, and environment variable guide.

### E2B-Native Workflows

CLAWD Cloud OS is designed to run inside E2B sandboxes or alongside them. E2B provides secure cloud sandboxes for desktop GUI agents, coding agents, and data work.

```bash
npm i e2b @e2b/desktop @e2b/code-interpreter
```

| Template | What it does | Quick start |
| --- | --- | --- |
| `claude` | Claude Code in a sandbox | `e2b sbx create claude && claude` |
| `opencode` | Headless coding agent | `e2b sbx create opencode && opencode` |
| `openclaw` | Browser gateway + Telegram | `e2b sbx create openclaw && openclaw` |
| Desktop | Ubuntu/XFCE with screenshot/mouse/keyboard | `npm i @e2b/desktop` |
| Code Interpreter | Python execution + chart streaming | `npm i @e2b/code-interpreter` |

Key E2B capabilities:

- **Desktop computer use** — screenshot, mouse, keyboard, VNC streaming (`@e2b/desktop`)
- **Pause/resume** — preserve filesystem + memory + running processes
- **List/connect** — reconnect to running or paused sandboxes by ID
- **Internet controls** — allow/deny outbound traffic per domain
- **Git helpers** — clone, pull, push with credential handling
- **Code Interpreter** — Python execution, Matplotlib plots, interactive charts, stdout/stderr streaming

See [clawd-cloud-os/README.md](clawd-cloud-os/README.md) for full E2B code examples.

### Service Ports

| Service | Port | Start path |
| --- | ---: | --- |
| SolanaOS daemon / gateway | 18790 | `bash start.sh` or `solanaos daemon` |
| SolanaOS Control UI | 7777 | `solanaos server` |
| Agent Wallet | 8421 | auto-started by `start.sh` |
| solanaos-mcp | 3001 | auto-started by `start.sh` |
| solana-clawd MCP | 3000 | `npm run mcp:http` |
| control-api | 18789 | standalone control API |

### Root Scripts

| Script | What it does |
|---|---|
| `npm run setup` | One-shot bootstrap for the full repo |
| `npm run build` | Build the root TypeScript runtime into `dist/` |
| `npm run build:watch` | Rebuild the root runtime on file changes |
| `npm run dev` | Watch-mode TypeScript build for the root runtime |
| `npm run typecheck` | Run TypeScript checks without emitting |
| `npm run lint` | Run Biome lint checks on `src/` |
| `npm run lint:fix` | Apply Biome lint fixes on `src/` |
| `npm run format` | Format `src/` with Biome |
| `npm run format:check` | Check formatting on `src/` |
| `npm run check` | Run typecheck and Biome lint |
| `npm run ci` | Run checks and build |
| `npm run adaptation:report` | Generate the Claude Code -> Solana-clawd adaptation inventory |
| `npm run skill:sync` | Sync the standalone `skill/solana-clawd` install bundle from the canonical master skill |
| `npm run mcp:build` | Install and build the MCP package |
| `npm run mcp:start` | Start the MCP package in stdio mode |
| `npm run mcp:http` | Start the MCP package over HTTP |
| `npm run agentwallet:build` | Install and build `packages/agentwallet/` |
| `npm run agentwallet:start` | Start the agent wallet vault server |
| `npm run vault:web:build` | Build the Clawd Vault web app |
| `npm run vault:web:dev` | Start the Clawd Vault web app in dev mode |
| `npm run demo` | Run the CLI walkthrough |
| `npm run birth` | Hatch a Blockchain Buddy |
| `npm run spinners` | Preview the spinner gallery |
| `npm run skills:catalog` | Regenerate `skills/catalog.json` |
| `npm run skills:serve` | Regenerate and serve the skills catalog |
| `npm run ext:dev` | Instructions to load the Chrome extension |
| `npm run ext:vault` | Start the agentwallet vault server for the extension |
| `npm run clean` | Remove the root `dist/` directory |

No private key. No wallet. Just one env var: `XAI_API_KEY`.

---

## xAI Grok Integration

**solana-clawd is fully powered by xAI Grok.** Every AI capability runs through the xAI Responses API — chat, reasoning, multi-agent research, vision, image generation, voice, function calling, structured outputs, web search, and X search.

```bash
export XAI_API_KEY="your_key"  # That's it. One key unlocks everything.
```

### Grok Models

| Model | What it does | Use case |
|-------|-------------|----------|
| `grok-4.20-reasoning` | Chat, reasoning, vision, structured output, voice | Default for everything |
| `grok-4.20-multi-agent` | 4-16 agents collaborating in real-time | Deep research, complex analysis |
| `grok-4-1-fast` | Quick responses, low latency | Fast queries, real-time UX |
| `grok-imagine-image` | Image generation + editing | Memes, avatars, visualizations |

### Grok Services (`src/services/`)

| Service | File | Description |
|---------|------|-------------|
| **Core Client** | `grokClient.ts` | OpenAI-compatible client for `api.x.ai/v1` |
| **Multi-Agent** | `grokMultiAgent.ts` | 4 or 16 Grok agents with web + X search |
| **Vision** | `grokVision.ts` | Image understanding, chart analysis |
| **Image Gen** | `grokImageGen.ts` | Text-to-image, image editing, avatar gen |
| **Function Calling** | `grokFunctionCalling.ts` | Tool use with agentic loop + Solana functions |
| **Structured Output** | `grokStructuredOutput.ts` | JSON schema enforcement + pre-built schemas |
| **Unified Export** | `grok.ts` | Single `grok.*` namespace for everything |

### Quick Usage

```typescript
import { grok } from './services/grok.js'

// Chat with Grok
const { text } = await grok.chat('What is SOL trading at?')

// Stream responses
for await (const chunk of grok.stream('Analyze $BONK')) {
  process.stdout.write(chunk)
}

// Vision — analyze a chart screenshot
const analysis = await grok.vision(chartUrl, 'Read this chart')

// Image generation
const images = await grok.imagine('Solana astronaut on the moon')

// Multi-agent deep research (16 agents + web + X search)
const research = await grok.deepResearch('Deep dive on Jupiter DEX')

// Quick market scan (4 agents)
const scan = await grok.research('SOL market overview', { agentCount: 4 })

// Structured output with schema enforcement
const token = await grok.analyzeToken('BONK')
// Returns: { token, price_usd, security_score, sentiment, recommendation, ... }

// Current market regime
const regime = await grok.marketRegime()
// Returns: { regime, sol_price, memecoin_activity, top_narratives, clawd_take }

// Function calling with agentic loop
const result = await grok.callTools(
  'Check BONK price and generate a meme about it',
  grok.solanaFunctions,
  async (name, args) => { /* execute tool */ }
)
```

### Multi-Agent Research

Deploy 4 or 16 Grok agents that collaborate in real-time:

```typescript
import { deepSolanaResearch, quickMarketScan } from './services/grokMultiAgent.js'

// 16 agents — deep research with web + X search
const deep = await deepSolanaResearch({ query: 'Solana DeFi yield landscape Q2 2026' })

// 4 agents — quick focused scan
const quick = await quickMarketScan({ tokens: ['SOL', 'JUP', 'BONK'] })
```

| Agent Count | Effort | Best For |
|-------------|--------|----------|
| 4 agents | `low` / `medium` | Quick research, focused queries |
| 16 agents | `high` / `xhigh` | Deep research, complex multi-faceted topics |

---

## $CLAWD Character Agent

**Clawd** is the star of solana-clawd — a charismatic, irreverent, hyper-intelligent Solana AI agent powered by Grok. Spawn Clawd for the full experience: chat, vision, image gen, multi-agent research, and voice.

```typescript
import { grok } from './services/grok.js'

// Spawn a Clawd session
const session = grok.clawd.spawn()

// Chat with Clawd
const reply = await grok.clawd.chat(session, "What's the alpha today?")

// Stream Clawd's response
for await (const chunk of grok.clawd.stream(session, 'Analyze the market')) {
  process.stdout.write(chunk)
}

// Clawd analyzes an image
const vision = await grok.clawd.vision(session, chartUrl)

// Clawd generates a meme
const meme = await grok.clawd.imagine('SOL breaking ATH while ETH cries')

// Clawd runs deep research (16 agents)
const research = await grok.clawd.research(session, 'Is JUP undervalued?', { deep: true })

// Generate Clawd's avatar
const avatar = await grok.clawd.avatar({ style: 'cyberpunk', mood: 'confident' })

// The viral intro
const intro = await grok.clawd.intro(session)
```

### Built-in Agents

| Agent | Type | Description |
|-------|------|-------------|
| **$CLAWD** | `Clawd` | Full autonomous agent — chat, vision, image gen, multi-agent, voice |
| **Grok Researcher** | `GrokResearcher` | 16-agent deep research with web + X search |
| **Explorer** | `Explore` | Read-only Solana research (fast, cheap) |
| **Scanner** | `Scanner` | Trend monitoring, surfaces high-signal opportunities |
| **OODA** | `OODA` | Full trading cycle: Observe, Orient, Decide, Act, Learn |
| **Dream** | `Dream` | Memory consolidation (INFERRED to LEARNED promotion) |
| **Analyst** | `Analyst` | Deep structured research reports |
| **Monitor** | `Monitor` | Helius WebSocket event listeners |
| **Metaplex** | `MetaplexAgent` | Onchain agent minting via MPL Agent Registry |

---

## Grok + Clawd API Routes

### Grok Endpoints (`/api/grok/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/grok/chat` | POST | Chat + streaming with any Grok model |
| `/api/grok/vision` | POST | Image understanding (URL or base64) |
| `/api/grok/image` | POST | Image generation + editing |
| `/api/grok/research` | POST | Multi-agent research (4/16 agents) |
| `/api/grok/tools` | POST | Function calling + tool result submission |
| `/api/grok/x-search` | POST | X/Twitter search (sentiment, alpha, narrative) |
| `/api/grok/web-search` | POST | Web search with AI synthesis |

### Clawd Endpoints (`/api/clawd/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clawd/spawn` | POST | Spawn Clawd with viral intro + capabilities manifest |
| `/api/clawd/chat` | POST | Chat with Clawd (supports vision + research modes) |
| `/api/clawd/avatar` | POST | Generate Clawd avatars |
| `/api/clawd/meme` | POST | Generate viral crypto memes with captions |
| `/api/clawd/research` | POST | Deep 16-agent Solana intelligence |

### Voice Endpoints (`/api/voice/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/voice/tts` | POST | xAI text-to-speech with Clawd voice |
| `/api/voice/agent` | GET/POST | Grok conversational agent |

### Example: Spawn Clawd via API

```bash
# Spawn Clawd
curl -X POST http://localhost:3000/api/clawd/spawn

# Chat with vision
curl -X POST http://localhost:3000/api/clawd/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "analyze this chart", "imageUrl": "https://...", "mode": "research"}'

# Generate a meme
curl -X POST http://localhost:3000/api/clawd/meme \
  -H "Content-Type: application/json" \
  -d '{"topic": "SOL flipping ETH"}'

# X Search for alpha
curl -X POST http://localhost:3000/api/grok/x-search \
  -H "Content-Type: application/json" \
  -d '{"query": "$BONK", "mode": "alpha"}'

# 16-agent deep research
curl -X POST http://localhost:3000/api/grok/research \
  -H "Content-Type: application/json" \
  -d '{"query": "Solana DeFi landscape analysis", "agentCount": 16}'
```

---

## Chrome Extension

**Solana Clawd pAGENT** — AI-powered GUI vision browser agent with air-gapped wallet vault.

```bash
# Load in Chrome/Brave/Edge
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Load unpacked → select chrome-extension/clawd-agent/
```

### 6 Tabs

| Tab | What it does |
|-----|-------------|
| **Wallet** | SOL balance, token portfolio, send/swap, OODA trade history, Bitaxe miner card |
| **Seeker** | WebSocket bridge to Solana Seeker phone via gateway |
| **Miner** | MawdAxe fleet monitoring (aggregate + per-device, SSE live) |
| **Chat** | Multi-turn AI chat (OpenRouter or native Clawd daemon) |
| **Tools** | RPC health, trending tokens, system status, on-chain agent identity |
| **Vault** | Air-gapped AES-256-GCM wallet vault (localhost:9099, never online) |

### pAGENT — Browser Automation

The `clawd-agent/` variant injects `window.PAGENT` into every page for AI-driven GUI automation:

```javascript
await window.PAGENT.execute("Find the cheapest SOL swap route", {
  baseURL: "https://api.openrouter.ai/v1",
  model: "anthropic/claude-sonnet-4-6",
  apiKey: "sk-or-...",
  guiVision: true,
});
```

The MCP bridge at `chrome-extension/mcp/` connects pAGENT to Claude Desktop, Cursor, or VS Code over stdio.

### Agent Wallet Vault

Air-gapped keypair management — private keys **never leave your machine**.

```bash
npm run ext:vault  # start vault at localhost:9099
```

- Generate Solana (Ed25519) and EVM (secp256k1) keypairs
- AES-256-GCM encryption at rest (0600 file permissions)
- Import/export/pause/delete wallets
- Bearer token auth for API access

See [chrome-extension/README.md](chrome-extension/README.md) for full documentation.

---

## Grok API Harness

Full xAI Grok integration — 7 API endpoints powering the Clawd character agent with reasoning, vision, image gen, multi-agent research, and X/Twitter intelligence.

### Endpoints

| Endpoint | Model | What it does |
| --- | --- | --- |
| `POST /api/grok/chat` | `grok-4.20-reasoning` | Conversational chat with streaming and multi-turn context |
| `POST /api/grok/vision` | `grok-4.20-reasoning` | Multimodal image analysis (URL or base64) |
| `POST /api/grok/image` | `grok-imagine-image` | Image generation + editing (1-4 images, 1024x1024) |
| `POST /api/grok/research` | `grok-4.20-multi-agent` | Multi-agent research with web + X search (4 or 16 agents) |
| `POST /api/grok/tools` | `grok-4.20-reasoning` | Function calling with tool results workflow |
| `POST /api/grok/x-search` | `grok-4.20-reasoning` | X/Twitter search with sentiment/alpha/narrative modes |
| `POST /api/grok/web-search` | `grok-4.20-reasoning` | Web search with AI synthesis and source citation |

### Clawd Character Agent

The Grok harness powers the **Clawd character** (`src/agents/clawd-character.ts`) — a fully autonomous agent with:

- **Voice** — Text-to-speech personality (confident, slightly cocky degen trader)
- **Vision** — Chart analysis and image understanding via Grok vision
- **Image Gen** — Avatar and meme generation via `grok-imagine-image`
- **Multi-Agent Research** — Deep Solana research with 4-16 parallel agents
- **X/Twitter Intel** — Sentiment scoring, alpha detection, narrative tracking
- **Function Calling** — Structured tool use for onchain operations

### Service Modules

```text
src/services/
├── grokClient.ts           Core chat (generateGrokText, streamGrokText)
├── grokVision.ts           Image analysis (analyzeImage, analyzeChart)
├── grokImageGen.ts         Image generation (generateImage, generateClawdAvatar)
├── grokMultiAgent.ts       Multi-agent research (deepSolanaResearch, quickMarketScan)
├── grokFunctionCalling.ts  Structured function calling
└── grokStructuredOutput.ts Typed JSON output extraction
```

### X-Search Modes

| Mode | Use case |
| --- | --- |
| `sentiment` | Crypto sentiment analysis (-100 to +100), influencer tracking |
| `alpha` | Early signals, whale alerts, breaking news (1-24 hour window) |
| `narrative` | Emerging memes, trending topics, cultural shifts |
| `default` | General market analysis |

Requires `XAI_API_KEY` environment variable.

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

### Identity (SOUL.md)

> I am **solana-clawd** -- an open-source Solana AI agent framework built from the architecture of Clawd Code's agentic engine and the SolanaOS operator runtime.

**Three-tier epistemological memory:**

| Tier | What it holds | Confidence |
|------|---------------|------------|
| **KNOWN** | API data, prices, balances, on-chain state | Verified, expires ~60s |
| **LEARNED** | Trade patterns, wallet behaviors, market correlations | Persistent, high trust |
| **INFERRED** | Derived signals, hypotheses, weak correlations | Tentative, revisable |

**Principles:**
1. **KNOWN before INFERRED** -- never present speculation as fact
2. **Preserve capital first** -- drawdown cascades override all conviction
3. **Deny-first permissions** -- ask before executing anything irreversible
4. **Transparency** -- show reasoning, not just conclusions
5. **Local-first** -- no mandatory cloud infrastructure (except LLM API)

**What $CLAWD will NOT do without explicit permission:** execute live trades, spend from any wallet, sign any transaction, access private keys. The permission engine defaults to `ask` for all trade operations. No silent buys. No surprise executions.

---

## Architecture

```
                     ┌─────────────────────────────────────────────────────┐
                     │                  ENTRY POINTS                       │
                     │                                                     │
                     │  clawd.ts CLI    MCP Server   TailClawd    Web App  │
                     │  (interactive/   (stdio MCP   (Telegram    (Next.js │
                     │   one-shot)      transport)    bot proxy)   React)  │
                     └────────┬──────────┬───────────┬───────────┬─────────┘
                              │          │           │           │
                              ▼          ▼           ▼           ▼
                     ┌─────────────────────────────────────────────────────┐
                     │                  GATEWAY LAYER                      │
                     │                                                     │
                     │  SSE Transport ◄──► Gateway Event Router            │
                     │  (bidirectional)     │                               │
                     │  WebSocket Transport │  Device Auth                  │
                     │  Hybrid Transport    │  Token Refresh                │
                     └──────────────────────┼──────────────────────────────┘
                                            │
                                            ▼
┌──────────────────┐   ┌─────────────────────────────────────────────────────┐
│   AGENT FLEET    │   │                  CORE ENGINE                        │
│                  │   │                                                     │
│  Explorer        │◄──┤  QueryEngine ──► LLM API ──► Tool Execution Loop   │
│  Scanner         │   │    │               │              │                 │
│  OODA Loop       │   │    │  Providers:   │   ┌──────────┤                 │
│  Dream           │   │    │  - OpenRouter │   │          │                 │
│  Analyst         │   │    │  - xAI/Grok   │   ▼          ▼                 │
│  Monitor         │   │    │  - Anthropic  │  ToolExecutor   Permission     │
│  MetaplexAgent   │   │    │  - Mistral    │  (Zod valid,    Engine         │
│                  │   │    │  - Local MLX  │   timeout,      (deny-first,   │
│  [7 built-in     │   │    │               │   retry,        glob patterns, │
│   agents with    │   │    ▼               │   concurrency)  trade gates)   │
│   turn budgets]  │   │  Coordinator ──────┘                                │
└──────────────────┘   │  (multi-agent orchestration,                        │
                       │   task notifications, fan-out)                      │
                       └──────────────────────┬──────────────────────────────┘
                                              │
               ┌──────────────────────────────┼──────────────────────────────┐
               │                              │                              │
               ▼                              ▼                              ▼
┌──────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐
│     SUPPORT LAYER    │  │      MEMORY SYSTEM       │  │   DATA SOURCES     │
│                      │  │                          │  │                    │
│  AppState (Zustand)  │  │  KNOWN   (ephemeral,     │  │  Helius RPC/DAS   │
│  - PermissionMode    │  │           ~60s TTL,      │  │  Helius WebSocket  │
│  - OODA phase        │  │           live API data) │  │  Helius Webhooks   │
│  - AgentTasks        │  │                          │  │                    │
│  - PumpSignals       │  │  LEARNED (Honcho peer,   │  │  Pump.fun Scanner  │
│  - OnchainSubs       │  │           cross-session, │  │  Pump.fun Client   │
│  - ToolCallRecords   │  │           durable)       │  │                    │
│                      │  │                          │  │  Jupiter/Raydium   │
│  Risk Engine         │  │  INFERRED (local vault,  │  │  Token APIs        │
│  (128-bit perp DEX   │  │            markdown,     │  │  Wallet PnL APIs   │
│   risk management)   │  │            searchable)   │  │                    │
└──────────────────────┘  └──────────────────────────┘  └────────────────────┘
```

### Layer Mapping (Clawd Code -> solana-clawd)

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

## CLAWD Trading Computer

**Agentic trading dashboard with AI inference sandbox, agent NFT minting, real-time market data, voice companion, and OODA loop trading.**

**Live:** [https://solanaclawd.com](https://solanaclawd.com)

### Trading Computer Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Netlify (Frontend + Edge)                     │
│                                                                      │
│  React 18 + Vite + TypeScript + Tailwind                             │
│  ┌──────────┐ ┌──────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ TokenGate │ │  Dashboard   │ │ Agent Registry│ │   AI Chat     │  │
│  │ (Phantom) │ │  (OODA/Chart)│ │ (Mint + Browse│ │  (OpenRouter) │  │
│  └─────┬─────┘ └──────────────┘ └───────┬───────┘ └───────────────┘  │
│        │                                │                            │
│  ┌─────▼──────┐ ┌───────────────┐ ┌─────▼──────┐ ┌───────────────┐  │
│  │  Sandbox   │ │  Creative     │ │ Companion  │ │  Community    │  │
│  │  (Inference│ │  Studio       │ │ Dashboard  │ │  Chat (Honcho)│  │
│  │   Gateway) │ │  (Img/Video)  │ │ (Voice/AI) │ │               │  │
│  └─────┬──────┘ └───────────────┘ └────────────┘ └───────────────┘  │
│        │                                                             │
│  ┌─────▼──────────────────────────────────────────────────────────┐  │
│  │              Netlify Serverless Functions                      │  │
│  │  inference.mts ─── inference-status.mts ─── pricing.mts       │  │
│  │  ephemeral-token.mjs ─── telegram-bot.mts                     │  │
│  └─────┬──────────────────────────────────────────────────────────┘  │
│        │                                                             │
│  ┌─────▼──────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  Convex    │ │  Helius      │ │  OpenRouter  │ │  fal.ai      │  │
│  │  (DB/API)  │ │  (RPC + DAS) │ │  (LLM Proxy) │ │  (Img/Video) │  │
│  └────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                                      │
│  ┌────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  MiniMax   │ │  Jupiter     │ │  xAI/Grok    │ │  xAI/Grok    │  │
│  │  (Chat/TTS/│ │  (Price/DEX) │ │  (Voice/TTS) │ │  (Multi-Agt) │  │
│  │  Video/Img/│ │              │ │              │ │              │  │
│  │  Music/Code│ │              │ │              │ │              │  │
│  └────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                                      │
│  ┌────────────┐ ┌──────────────┐                                     │
│  │  Metaplex  │ │  Firecrawl   │                                     │
│  │  (NFTs)    │ │  (Crawl/     │                                     │
│  └────────────┘ │  Scrape/     │                                     │
│                 │  Extract)    │                                     │
│                 └──────────────┘                                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Sandbox — AI Inference Gateway

Run text, image, and video models from a single unified interface. All inference is proxied server-side through Netlify Functions to keep API keys secure.

#### Supported Models

| Type | Model | Provider |
|------|-------|----------|
| Text | Claude Sonnet 4.6 | OpenRouter |
| Text | Claude Opus 4.6 | OpenRouter |
| Text | GPT-4.1 | OpenRouter |
| Text | Gemini 3 Flash | OpenRouter |
| Text | Llama 4 Scout | OpenRouter |
| Text | DeepSeek R1 | OpenRouter |
| Text | MiniMax-M2.7 (Code) | MiniMax (Anthropic API) |
| Image | FLUX Schnell | fal.ai |
| Image | Nano Banana 2 | fal.ai |
| Image | Grok 2 Image | xAI |
| Image | MiniMax Image-01 | MiniMax |
| Video | Veo 3.1 Fast (I2V) | fal.ai |
| Video | Kling 3.0 Pro (I2V) | fal.ai |
| Video | PixVerse v6 (I2V) | fal.ai |
| Video | MiniMax T2V-01 | MiniMax |
| Video | MiniMax I2V-01 | MiniMax |
| TTS | MiniMax speech-2.8-hd | MiniMax |
| Music | MiniMax Music Gen | MiniMax |
| Edit | Nano Banana Edit | fal.ai |

#### Inference API

```
POST /.netlify/functions/inference
{
  "wallet": "7xKp...3nRt",
  "type": "text|image|video|edit|code|tts|music",
  "model": "anthropic/claude-sonnet-4-6",
  "prompt": "Your prompt here",
  "image_url": "https://... (for video/edit)",
  "provider": "minimax",
  "web_search": true,
  "response_format": { ... }
}
```

Features:
- OpenRouter web search tool support (`openrouter:web_search`)
- OpenRouter structured outputs (`response_format` with JSON schema)
- MiniMax M2.7 coding assistant via Anthropic-compatible API
- MiniMax speech-2.8-hd text-to-speech with voice/emotion/speed control
- MiniMax T2V-01/I2V-01 video generation with task polling
- MiniMax music generation with AI lyrics
- fal.ai queue-based polling for long-running video jobs
- Automatic tier-based credit deduction
- All generations tracked in Convex by wallet

### Credit System & Tier-Based Pricing

Hold more $CLAWD tokens to unlock better rates, higher daily limits, and discounts.

| Tier | Min $CLAWD | Daily Limit | Discount |
|------|-----------|-------------|----------|
| Free | 0 | 5/day | 0% |
| Bronze | 1+ | 20/day | 10% |
| Silver | 1,000+ | 50/day | 25% |
| Gold | 10,000+ | 100/day | 40% |
| Diamond | 100,000+ | 250/day | 50% |
| Unlimited | $25/mo subscription | No limit | 100% |

Credit costs: Text (1) · Code (3) · TTS (2) · Image (5) · Edit (5) · Music (10) · Video (25). New users get **20 free credits** on first wallet connection.

### $25/Month Unlimited Subscription

Unlimited AI generations across all models with no daily limits. Payable in SOL, USDC, or $CLAWD with real-time Jupiter Price API conversion.

### 🎰 AI Agent Candy Machine & Gacha System

Metaplex Core-powered Candy Machine with gacha randomization for minting AI agents as on-chain NFTs.

| Rarity | Weight | Color | Bonus Traits |
|--------|--------|-------|-------------|
| Common | 45% | Gray | +1 trait |
| Uncommon | 28% | Green | +2 traits |
| Rare | 17% | Blue | +3 traits |
| Epic | 8% | Purple | +4 traits |
| Legendary | 2% | Gold | +5 traits |

Bonus traits: `enhanced_memory`, `multi_tool`, `web3_native`, `cross_chain`, `autonomous_trading`, `social_intelligence`, `code_generation`, `data_analysis`, `creative_writing`, `market_prediction`, `risk_management`, `portfolio_optimization`.

### 🎨 Multi-Provider AI Art Generator

9 AI providers and 20+ models for NFT artwork and standalone generation:

| Provider | Models | API |
|----------|--------|-----|
| OpenAI | DALL-E 3 | `api.openai.com` |
| xAI | Grok 2 Image | `api.x.ai` |
| fal.ai | FLUX Schnell, Nano Banana 2, FLUX Pro Ultra | `queue.fal.run` |
| MiniMax | MiniMax Image-01 | `api.minimax.io` |
| Z.AI | CogView-4 | `api.z.ai` |

### 🤖 Agentic Wallet Server (E2B Sandbox)

Deploy autonomous agent wallets as sandboxed servers. Each agent gets its own PDA-derived wallet (Metaplex Core Asset Signer) and can execute on-chain transactions within configurable spending limits.

| Skill | Description |
|-------|-------------|
| `solana_transfer` | Send SOL to any address |
| `spl_transfer` | Send SPL tokens |
| `jupiter_swap` | Execute token swaps via Jupiter |
| `helius_das_query` | Query on-chain data via Helius DAS |
| `birdeye_price` | Get token prices from BirdEye |
| `web_search` | Search the web (Firecrawl) |
| `web_scrape` | Scrape any URL to clean markdown (Firecrawl) |
| `web_crawl` | Recursively crawl websites (Firecrawl) |
| `web_extract` | LLM-powered structured data extraction (Firecrawl) |

### 🕷️ CLAWD CRAWLING — Firecrawl Web Intelligence

Blockchain-native agentic web crawling powered by [Firecrawl](https://firecrawl.dev) v2 API. Every CLAWD agent gets web intelligence at birth.

| Tool | Description |
|------|-------------|
| `web_search` | Search the web with optional full-page scraping |
| `web_scrape` | Scrape any URL → clean markdown, HTML, links, screenshots |
| `web_crawl` | Recursively crawl a site, discover + scrape multiple pages |
| `web_extract` | LLM-powered structured JSON extraction from any page |

Agent-friendly helpers: `agentSearch`, `agentScrape`, `agentCrawl`, `agentExtract` — with automatic output capping and timeout handling.

### MiniMax Studio

Dedicated MiniMax AI studio with 6 tabs covering the full MiniMax API surface:

| Tab | Capability | Model |
|-----|-----------|-------|
| Chat | Multi-turn conversation | M2-her, MiniMax-M2.7 |
| Code | Solana/full-stack coding assistant | MiniMax-M2.7 (204K context) |
| Speech | Text-to-speech with voice/emotion/speed | speech-2.8-hd (8 voice presets) |
| Image | Text-to-image generation | image-01 |
| Video | Text-to-video & image-to-video | T2V-01, I2V-01 |
| Music | Music generation + AI lyrics | Music Generation API |

### 🔄 AI-Powered Token Swaps

Jupiter-integrated swap interface with AI-assisted trade suggestions. Supports all Solana tokens with real-time pricing, slippage control, and priority fee selection.

### 📊 Solana Tracker DEX

Full-featured DEX tracker powered by SolanaTracker API. Browse trending tokens, view charts, and monitor real-time market data.

### 🏭 Agent Studio

Advanced agent orchestration environment for creating, testing, and deploying AI agents. Supports multi-step reasoning chains, MCP server integration, and human-in-the-loop approval workflows.

### 📞 CLAWD Contact Desk

Voice and email integration for $CLAWD holders:
- **Voice calls** via xAI Grok conversational agent
- **Email threads** via AgentMail (clawd@agentmail.to)
- **Draft routing** with AI-powered responses

### Companion Dashboard (Beep Boop Clawd)

macOS menu bar companion visualization with voice pipeline (IDLE → LISTENING → PROCESSING → RESPONDING), animated claw overlay system, STT provider fallback chain (AssemblyAI → OpenAI Whisper → Apple Speech), and 8 Blockchain Buddy species with randomized stats.

### CLAWD Dashboard Views

| View | Panels |
|------|--------|
| Dashboard | Architecture Flow, Voice Pipeline, Agent Fleet, Memory System, OODA Cycle, Claw Overlay, Tool Registry, Buddy, Permissions, Live Terminal |
| Companion | Voice Pipeline, Claw Overlay, macOS Menu Bar, Companion Architecture, STT Providers, Buddy |
| Agents | Agent Fleet (7 built-in), OODA Cycle, Permission Engine, Tool Registry (31 tools) |
| Terminal | Live Terminal, Memory System, Buddy |

### Trading Computer Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS, Radix UI |
| Backend | Convex (real-time serverless DB), Netlify Functions |
| Blockchain | Solana via Helius RPC, @solana/web3.js, Phantom Browser SDK |
| NFTs | Metaplex Core (mpl-core), Umi framework |
| DEX/Pricing | Jupiter Plugin (swaps), Jupiter Price API v2 |
| AI/LLM | OpenRouter (Claude, GPT, Gemini, Llama, DeepSeek), MiniMax M2.7 |
| AI/Image | fal.ai (FLUX, Nano Banana 2), xAI (Grok 2 Image), MiniMax image-01 |
| AI/Video | fal.ai (Veo 3.1, Kling 3.0, PixVerse v6), MiniMax T2V-01/I2V-01 |
| AI/TTS | MiniMax speech-2.8-hd (8 voices, emotion control) |
| AI/Music | MiniMax Music Generation + Lyrics |
| Voice | xAI Grok TTS + STT |
| Memory | Honcho v3 (community chat sessions) |
| Web Crawl | Firecrawl v2 (search, scrape, crawl, extract) |
| Data | SolanaTracker, BirdEye, Helius DAS |
| Deploy | Netlify (frontend + functions), Convex Cloud (backend) |

### Trading Computer Project Structure

```
solana-os/
├── src/
│   ├── components/
│   │   ├── Sandbox.tsx            # AI Inference Sandbox
│   │   ├── AgentRegistry.tsx      # Agent NFT mint + browse
│   │   ├── CandyGachaMachine.tsx  # 🎰 Candy Machine + Gacha
│   │   ├── ArtGenerator.tsx       # 🎨 Multi-provider AI art
│   │   ├── AgentWalletPanel.tsx   # 🤖 Agentic wallet server
│   │   ├── AgentStudio.tsx        # 🏭 Agent orchestration studio
│   │   ├── CreativeStudio.tsx     # Multi-provider image/video
│   │   ├── MiniMaxStudio.tsx      # MiniMax AI studio (6 tabs)
│   │   ├── ClawdDashboard.tsx     # Full dashboard overlay (4 views)
│   │   ├── AIChat.tsx             # Multi-model AI chat
│   │   ├── AISwap.tsx             # 🔄 AI-powered token swaps
│   │   ├── SolanaTrackerDex.tsx   # 📊 DEX tracker
│   │   ├── ActivityFeed.tsx       # 📡 Real-time activity feed
│   │   ├── ClawdContactDesk.tsx   # 📞 Voice + email contact desk
│   │   ├── HeliusWalletPanel.tsx  # Wallet balances + PnL
│   │   ├── SolanaChart.tsx        # Live price chart
│   │   ├── OODALoop.tsx           # Trading cycle visualization
│   │   └── TokenGate.tsx          # Phantom SDK token gate
│   ├── lib/
│   │   ├── ai-providers.ts        # 9 providers, 20+ models
│   │   ├── candy-machine.ts       # Metaplex Candy Machine + Gacha
│   │   ├── agent-wallet-server.ts # E2B sandbox + on-chain wallet
│   │   ├── firecrawl-client.ts    # 🕷️ Firecrawl v2 (CLAWD CRAWLING)
│   │   └── studio-pricing.ts      # Tier-based pricing engine
├── convex/                        # Real-time DB (10 tables)
│   ├── schema.ts, users.ts, agents.ts, candyMachine.ts
│   ├── agentServers.ts, agentStudio.ts, activityFeed.ts
│   └── swaps.ts, studio.ts
├── netlify/functions/             # Serverless inference proxy
│   ├── inference.mts              # Unified AI gateway
│   ├── inference-status.mts       # Poll queued jobs
│   ├── pricing.mts                # Live crypto pricing + tier info
│   └── telegram-bot.mts           # Telegram verification
└── package.json
```

### Trading Computer Convex Schema

| Table | Key Fields |
|-------|------------|
| `users` | walletAddress, isTokenHolder, clawdBalance, lastVerifiedAt, loginCount |
| `generations` | walletAddress, genType, model, provider, prompt, outputUrl, creditsUsed |
| `credits` | walletAddress, balance, tier, dailyGenCount, dailyResetDate |
| `subscriptions` | walletAddress, status, paymentToken, amountPaid, txSignature, expiresAt |
| `agents` | name, systemPrompt, role, assetAddress, ownerWallet, agentWallet, status |

### Trading Computer API Reference

```bash
# Text generation
curl -X POST /.netlify/functions/inference \
  -d '{"wallet":"7xKp...","type":"text","model":"anthropic/claude-sonnet-4-6","prompt":"Hello"}'

# Image generation
curl -X POST /.netlify/functions/inference \
  -d '{"wallet":"7xKp...","type":"image","model":"fal-ai/flux/schnell","prompt":"Cyberpunk city"}'

# Video generation (returns request_id for polling)
curl -X POST /.netlify/functions/inference \
  -d '{"wallet":"7xKp...","type":"video","model":"fal-ai/veo3.1/fast/image-to-video","prompt":"Zoom in","image_url":"..."}'

# MiniMax TTS
curl -X POST /.netlify/functions/inference \
  -d '{"wallet":"7xKp...","type":"tts","prompt":"Hello!","voice_id":"English_expressive_narrator"}'

# MiniMax music
curl -X POST /.netlify/functions/inference \
  -d '{"wallet":"7xKp...","type":"music","prompt":"Lo-fi hip hop with jazzy piano"}'

# Live pricing
curl /.netlify/functions/pricing

# Job status (video)
curl "/.netlify/functions/inference-status?model=fal-ai/veo3.1/fast/image-to-video&request_id=xxx"
```

### Trading Computer Environment Variables

```bash
# ── Solana ──
VITE_CLAWD_TOKEN_ADDRESS=8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
VITE_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
VITE_HELIUS_API_KEY=YOUR_KEY
VITE_PHANTOM_APP_ID=YOUR_PHANTOM_APP_ID
VITE_SOLANA_TRACKER_API_KEY=YOUR_KEY

# ── Convex ──
VITE_CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud
CONVEX_DEPLOY_KEY=prod:YOUR_DEPLOYMENT|YOUR_KEY

# ── AI / LLM ──
OPENROUTER_API_KEY=YOUR_KEY
XAI_API_KEY=YOUR_KEY
OPENAI_API_KEY=YOUR_KEY
FAL_API_KEY=YOUR_KEY
MINIMAX_API_KEY=YOUR_KEY
MINIMAX_CODING_TOKEN=YOUR_KEY

# ── Voice / STT (powered by xAI Grok) ──
XAI_API_KEY=YOUR_KEY  # Same key powers voice, chat, vision, everything

# ── CLAWD CRAWLING ──
VITE_FIRECRAWL_API_KEY=YOUR_KEY

# ── Community Chat ──
VITE_HONCHO_API_KEY=YOUR_KEY
```

### Trading Computer Quick Start

```bash
pnpm install
npx convex deploy --cmd "echo done"
pnpm dev             # dev server
pnpm build:prod      # production build
netlify deploy --prod  # deploy
```

---

## Quick Start

### Option A -- Clawd Desktop (zero config)

```bash
git clone https://github.com/x402agent/solana-clawd
cd solana-clawd
npm run setup
```

Add to `~/Library/Application Support/Clawd/clawd_desktop_config.json`:

```json
{
  "mcpServers": {
    "solana-clawd": {
      "command": "node",
      "args": ["/absolute/path/to/solana-clawd/MCP/dist/index.js"],
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
    "args": ["MCP/dist/index.js"],
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

If you are running the `skills` CLI framework across Solana OS, you have two install modes:

```bash
# Install only the master solana-clawd skill
npx skills add x402agent/solana-clawd --path skill/solana-clawd

# Install the full bundled Solana-clawd skill catalog
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

## MCP Tools (44)

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

### Pump.fun

| Tool | What it does |
|---|---|
| `pump_token_scan` | Scan a Pump.fun token (bonding curve, holders, volume) |
| `pump_buy_quote` | Get a buy quote for a Pump.fun token |
| `pump_sell_quote` | Get a sell quote for a Pump.fun token |
| `pump_graduation` | Check if a token graduated from bonding curve |
| `pump_market_cap` | Get current market cap of a Pump.fun token |
| `pump_top_tokens` | Top Pump.fun tokens by volume/market cap |
| `pump_new_tokens` | Most recently launched Pump.fun tokens |
| `pump_cashback_info` | Pump.fun cashback mechanics and PDA info |

### Chess.com

| Tool | What it does |
|---|---|
| `chess_player` | Full player analysis — ratings, win rate, best rating |
| `chess_recent_games` | Recent games with accuracy, openings, opponent ratings |
| `chess_current_games` | Ongoing daily games + games awaiting a move |
| `chess_daily_puzzle` | Today's puzzle with FEN and PGN solution |
| `chess_random_puzzle` | Random puzzle for agent practice |
| `chess_leaderboards` | Global leaderboards by time control |
| `chess_titled_players` | All players with a specific title (GM, IM, FM, etc.) |

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

The `web/` directory contains the Next.js frontend — homepage/chat UI, buddies page, holder communications, dual-provider voice mode, and REST API. Live at **[solanaclawd.com](https://solanaclawd.com)**.

```bash
cd web && npm install && npm run build    # production build
cd web && npm run dev                     # dev server on :3000
```

**Routes:**

| Route | Description |
|---|---|
| `/` | Homepage, chat interface, and call-or-email `$CLAWD` holder communications panel |
| `/buddies` | Blockchain Buddy gallery + hatch |
| `/voice` | Voice mode — xAI Grok powered |
| `/api/chat` | Streaming chat API |
| `/api/agentmail/holders` | Provision a holder inbox and send a welcome email |
| `/api/agentmail/messages` | Send to or read from holder inbox threads |
| `/api/agentmail/webhook` | AgentMail email worker webhook for inbound events |
| `/api/voice/tts` | xAI Grok text-to-speech |
| `/api/voice/agent` | Grok Conversational Agent |
| `/api/grok/chat` | Grok chat + streaming |
| `/api/grok/vision` | Grok image understanding |
| `/api/grok/image` | Grok image generation + editing |
| `/api/grok/research` | Multi-agent research (4-16 agents) |
| `/api/grok/tools` | Function calling + tool use |
| `/api/grok/x-search` | X/Twitter real-time search |
| `/api/grok/web-search` | Web search with AI synthesis |
| `/api/clawd/spawn` | Spawn Clawd character agent |
| `/api/clawd/chat` | Chat with Clawd (vision + research modes) |
| `/api/clawd/avatar` | Generate Clawd avatars |
| `/api/clawd/meme` | Generate viral crypto memes |
| `/api/clawd/research` | Deep 16-agent Solana intelligence |
| `/api/share` | Conversation sharing |

### Voice Mode

Voice is powered entirely by **xAI Grok** — one API key, full voice stack:

| Feature | Grok (xAI) |
|---|---|
| **Voice Agent** | Conversational AI via Responses API |
| **TTS** | Clawd voice character |
| **STT** | Audio transcription API |
| **Live Tools** | Web search + X search during conversation |

```bash
# Required env var (web/.env)
XAI_API_KEY=               # Powers voice, chat, vision, everything
```

### Call + Email $CLAWD

The main website exposes a holder communications surface:

- Call `$CLAWD` at `+19094135567`
- Use the Grok-powered voice agent embedded site-wide
- Provision a holder inbox through AgentMail
- Send research and execution requests to the agent by email

AgentMail server-side env vars:

```bash
AGENTMAIL_API_KEY=                 # AgentMail API key
AGENTMAIL_CLAWD_INBOX_ID=clawd@agentmail.to
AGENTMAIL_WEBHOOK_SECRET=          # Optional Svix-style verification secret
NEXT_PUBLIC_CLAWD_AGENT_NUMBER=+19094135567
```

**Deploy to Netlify:**

```bash
netlify deploy --prod
```

Or connect the GitHub repo and set:
- **Build command:** `npm --prefix web run build`
- **Publish directory:** `web/.next`
- **Custom domain:** `solanaclawd.com`
- **Env vars:** `XAI_API_KEY`, `AGENTMAIL_API_KEY`, `AGENTMAIL_CLAWD_INBOX_ID`

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

### agentwallet-vault

> Agentic wallet vault -- encrypted Solana + EVM keypair management with E2B sandbox and Cloudflare Workers deployment

The `packages/agentwallet/` package provides multi-chain encrypted wallet management with deployment targets for remote agent access.

It is included in the repo bootstrap path:

```bash
npm run setup
npm run agentwallet:start
```

```bash
npm install agentwallet-vault
```

```typescript
import { Vault, startServer, generateSolanaKeypair } from "agentwallet-vault";

const vault = await Vault.create({
  storePath: "./vault-data",
  passphrase: process.env.VAULT_PASSPHRASE!,
});

const keypair = await generateSolanaKeypair();
await vault.addWallet(undefined, "my-wallet", "solana", 0, keypair.address, keypair.privateKey);
await startServer(vault, { port: 9099 });
```

**CLI:**

```bash
npx agentwallet serve --port 9099
npx agentwallet wallet create my-wallet --chain solana
npx agentwallet wallet list
npx agentwallet deploy e2b --api-key $E2B_API_KEY
npx agentwallet deploy cloudflare --account-id $CLOUDFLARE_ACCOUNT_ID
```

**HTTP API (11 endpoints):**

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/wallets` | List all wallets |
| `POST` | `/api/wallets` | Create new wallet |
| `POST` | `/api/wallets/import` | Import existing wallet |
| `GET` | `/api/wallets/:id/private-key` | Get decrypted private key |
| `POST` | `/api/wallets/:id/pause` | Pause wallet |
| `DELETE` | `/api/wallets/:id` | Delete wallet |
| `GET` | `/api/vault/export` | Export encrypted vault |
| `POST` | `/api/vault/import` | Import vault data |

**Deployment targets:**

| Target | Description |
| --- | --- |
| **E2B Sandbox** | Isolated code execution environment for untrusted agent access |
| **Cloudflare Workers** | Edge deployment for global low-latency wallet operations |

**Security:** AES-256-GCM encryption at rest, `0600` file permissions, Bearer token auth, SHA-256 key derivation. Solana (Ed25519) and EVM (secp256k1) keypairs supported.

Full docs: [`packages/agentwallet/README.md`](packages/agentwallet/README.md)

---

## Clawd Vault — Solana Research Knowledge Base

`llm-wiki-tang/` is **Clawd Vault**: a Solana-native research vault for `solana-clawd`, dSolana-aligned workflows, autonomous financial blockchain agents, and trading intelligence. Upload sources (whitepapers, wallet exports, PDFs, governance docs), connect via MCP, and let the agent compile and maintain token dossiers, protocol pages, wallet profiles, strategy memos, execution journals, and cross-referenced research.

### Three Layers

| Layer | Description |
|-------|-------------|
| **Raw Sources** | Whitepapers, filings, wallet notes, DEX research, governance posts, transcripts. Immutable. |
| **The Vault** | LLM-generated markdown pages: token dossiers, protocol pages, wallet profiles, strategy memos, execution journals, timelines, diagrams. |
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

- **Ingest** — Drop in a source. The agent reads it, writes a summary, updates token/wallet/protocol/strategy/execution pages, and flags contradictions against existing theses.
- **Query** — Ask complex questions across the compiled vault. Knowledge is already synthesized, linked, and citation-aware.
- **Lint** — Run health checks. Find stale theses, orphan pages, unsupported claims, missing links, gaps in the research graph, and unreviewed autonomous trade decisions.

### Vault Use Cases

- Build living dossiers for `$CLAWD`, dSolana theses, Pump.fun rotations, and wallet-cluster surveillance
- Give OODA, scanner, analyst, and monitor agents a shared Solana memory surface across sessions
- Preserve autonomous trading context before and after execution, including thesis, catalyst, sizing rationale, and review notes
- Keep live execution policy consistent with `solana-clawd`: agents can research and plan autonomously, while `trade_execute` stays permission-gated unless the operator changes policy

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

Or use the root bootstrap and root-level Clawd Vault web command:

```bash
npm run setup
npm run vault:web:dev
```

### Memory Tiers

- **KNOWN** (blue) — Fresh market data from API calls. Auto-expires.
- **LEARNED** (green) — Validated patterns confirmed by Dream agent. Permanent.
- **INFERRED** (amber) — Tentative signals from scanners. Promoted or expired by Dream.

---

## Trading Strategy & Execution

The $CLAWD trading system is documented in two files that power the agent fleet's trading decisions:

### [`STRATEGY.md`](STRATEGY.md) — Multi-Venue Trading Strategy

The master strategy document covering three venues with one shared risk engine:

| Venue | Type | Intent |
|-------|------|--------|
| **Solana Spot** | Pump.fun + Raydium meme tokens | Breakout continuation, recovery bounces, long-only |
| **Hyperliquid** | Perpetuals | Trend continuation, exhaustion reversals, funding/OI edge |
| **Aster** | Solana-native perps | On-chain perp expression with wallet-context priority |

**Key components:**
- **OODA flow** — Observe/Orient/Decide/Act/Learn cycle integrated with wiki memory tiers
- **Confidence model** — Weighted 0.00-1.00 score across trend, momentum, liquidity, participation, execution risk
- **Drawdown cascade** — 5% reduce, 8% close perps, 12% full halt
- **Kill switch** — Agent death protocol when wallet depletes (SOL < 0.01)
- **Auto-optimizer** — Parameter mutation within bounded ranges, anti-overfitting protection
- **Venue selection matrix** — Routes trades to the correct venue based on conditions

### [`TRADE.md`](TRADE.md) — Pump.fun Trading Agent Skill

The Pump.fun-specific execution layer on top of STRATEGY.md Venue 1:

| Tier | Criteria | Strategy |
|------|----------|----------|
| **Fresh Snipers** | age <= 15m | Small size, fast flip, 10min TTL |
| **Near-Graduation** | bonding >= 75% | Medium size, exit before 100% graduation |
| **Micro-Cap** | MC < $10K | Speculative, < 0.05 SOL |
| **Mid-Cap** | $10K-$100K | Trend-follow with trailing stops |
| **Large-Cap** | > $100K | Scalps on dips |

**CLAWD integration:**
- All trades gated by OODA confidence scoring and risk engine
- Decision table includes risk engine checks (drawdown state, exposure limits, wallet reserve)
- Trade outcomes feed wiki memory (INFERRED -> LEARNED promotion)
- Dev-wallet dumps, liquidity collapse, and holder drain trigger immediate exits
- Kill switch from STRATEGY.md applies across all Pump.fun positions
- Scanner agent detects candidates, OODA agent evaluates and executes

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
# Install only the master solana-clawd skill
npx skills add x402agent/solana-clawd --path skill/solana-clawd

# Add the full Solana-clawd skill pack from GitHub
npx skills add x402agent/solana-clawd

# Or copy a skill directory into skills/
cp -r my-skill/ skills/my-skill/
npm run skills:catalog   # regenerate the catalog
```

---

## Chess Agent

Autonomous Chess.com integration — agents can analyze players, monitor games, solve puzzles, and study openings via 7 MCP tools.

### Chess MCP Tools

| Tool | Description |
|------|-------------|
| `chess_player` | Full player analysis — ratings, win rate, best rating, total games |
| `chess_recent_games` | Recent games with results, accuracy, openings, opponent ratings |
| `chess_current_games` | Ongoing daily games + games waiting for a move |
| `chess_daily_puzzle` | Today's puzzle with FEN and PGN solution |
| `chess_random_puzzle` | Random puzzle for agent practice |
| `chess_leaderboards` | Global leaderboards across all time controls |
| `chess_titled_players` | All players with a specific title (GM, IM, FM, etc.) |

### Usage

```text
You: "Analyze chess player hikaru"
Clawd: [calls chess_player] → ratings, win rate, best rating across all time controls

You: "Show me hikaru's last 5 games"
Clawd: [calls chess_recent_games] → results, accuracy, openings, opponent info

You: "Give me today's chess puzzle"
Clawd: [calls chess_daily_puzzle] → FEN position + PGN solution to analyze

You: "Who are the top blitz players?"
Clawd: [calls chess_leaderboards] → top 20 live_blitz players globally
```

### Chess Architecture

```text
src/chess/
├── chess-client.ts    Typed Chess.com API client (zero deps, fetch-based)
└── index.ts           Module exports

chess/
├── chess-web-api/     npm chess-web-api wrapper (upstream reference)
└── chess-mcp-main/    Python MCP server (standalone alternative)
```

### Chess.com Stats

Set the repository variable `CHESS_COM_USERNAME` and the section below auto-refreshes via GitHub Actions.

<!--START_SECTION:chessStats-->
Chess.com stats will appear here after `.github/workflows/chess-stats.yml` runs.
<!--END_SECTION:chessStats-->

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

The multi-venue OODA cycle adapted from [STRATEGY.md](STRATEGY.md):

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

## Pump.fun Trading Skill

The OODA loop includes a full **pump.fun trading skill** with token classification, position sizing, and guardrails. See [`docs/TRADE.md`](docs/TRADE.md) for the complete spec.

### Token Tiers

| Tier | Criteria | Strategy | Max Size |
| --- | --- | --- | --- |
| **Fresh Snipers** | age <= 15m | Fast flip, 2-5x target, 10min TTL | 0.05 SOL |
| **Near-Graduation** | bonding >= 75% | Ride pump, exit before 100% | 0.1 SOL |
| **Micro-Cap** | MC < $10K | Speculative, high risk | 0.05 SOL |
| **Mid-Cap** | MC $10K-$100K | Trend-follow, trailing stop | 0.2 SOL |
| **Large-Cap** | MC > $100K | Scalps on dips | 0.3 SOL |

### Decision Table

| Condition | Action |
|-----------|--------|
| Age <= 5m AND MC < $5K | **SNIPE** -- 0.05 SOL |
| Age <= 15m AND bonding >= 50% | **BUY** -- 0.1 SOL, exit at 3x |
| bonding >= 90% | **AVOID** -- graduation imminent |
| MC > $500K AND age < 2h | **SCALP** -- tight stops |
| MC > $1M | **SKIP** -- pump.fun tokens rarely sustain |

### Guardrails

- **Never** exceed 1 SOL total exposure on pump.fun tokens simultaneously
- **Never** trade tokens with bonding% = 100% (already graduated)
- **Never** bypass the permission engine -- all trades require human approval
- **Never** execute without writing a trade plan to INFERRED memory first
- **Never** retry failed swaps more than 2 times (bad liquidity signal)

### MCP Tool Chain

```text
OBSERVE:  solana_trending -> scan_pump_token -> memory_recall(KNOWN)
ORIENT:   solana_token_info -> solana_top_traders -> score candidates
DECIDE:   score >= 60 -> generate trade plan -> memory_write(INFERRED)
ACT:      *** HUMAN APPROVAL *** -> Jupiter swap -> memory_write(KNOWN)
LEARN:    write outcome -> Dream agent promotes to LEARNED
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
cd MCP
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
├── MCP/                  MCP server (Clawd Desktop, Cursor, VS Code, Fly.io)
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
│   ├── voice/            Voice mode (xAI Grok)
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
│   ├── chess/            Chess.com agent (typed API client, player analysis)
│   ├── entrypoints/      CLI entry (demo, birth, spinners, wallet)
│   └── shared/           Message types, model catalog, tool policy
├── web/                  Next.js frontend — solanaclawd.com
│   ├── app/              Chat, Buddies, Voice (xAI Grok voice + multi-agent)
│   ├── components/       UI components (Button, Dialog, Tabs, Toast, etc.)
│   ├── hooks/            useConversation, useToast, useTheme, usePresence...
│   └── lib/              Store (Zustand), API client, search, export
├── gateway/              HTTP API + Telegram bot + Birdeye WebSocket
│   ├── src/index.ts      Express REST (14 endpoints: balance, tokens, txs, price, search...)
│   ├── src/telegram.ts   TelegramBot class (long-poll, access control)
│   ├── src/birdeye.ts    BirdeyeWS (live prices, new listings, whale alerts)
│   └── src/solana.ts     Helius RPC + wallet helpers
├── chrome-extension/     Solana Clawd pAGENT Chrome Extension
│   ├── manifest.json     Popup extension (Manifest V3, localhost only)
│   ├── popup.html/js/css 6-tab UI (Wallet, Seeker, Miner, Chat, Tools, Vault)
│   ├── background.js     Service worker (status polling, badge updates)
│   ├── clawd-agent/      Full pAGENT browser agent (side panel, GUI vision, content scripts)
│   │   ├── main-world.js Injects window.PAGENT API into every page
│   │   └── hub.html      WebSocket hub for MCP bridge
│   ├── clawd-extension/  Mirror of clawd-agent (alternate build)
│   ├── core/             @page-agent/core — Re-Act agent loop library
│   ├── page-controller/  DOM state management + element interaction
│   ├── mcp/              MCP server bridge (Claude Desktop ↔ browser)
│   └── icons/            Extension icons
├── packages/
│   └── agentwallet/      Encrypted wallet vault SDK
│       ├── src/vault.ts  AES-256-GCM encrypted Solana + EVM keypair storage
│       ├── src/server.ts Express HTTP API (port 9099, Bearer auth)
│       ├── src/cli.ts    CLI tool (create, import, export, deploy)
│       └── src/deploy/   E2B sandbox + Cloudflare Workers deployment
├── beepboop/             macOS menu bar companion app (SwiftUI)
│   ├── leanring-buddy/   Claude vision + push-to-talk voice + screen capture
│   │   ├── CompanionManager.swift    Central state machine (1026 lines)
│   │   ├── GrokTTSClient.swift       xAI Grok voice output
│   │   ├── BuddyDictationManager.swift  Voice pipeline
│   │   └── OverlayWindow.swift       Lobster claw overlay (points at UI)
│   └── worker/           Cloudflare Worker proxy (xAI Grok, Solana RPC)
├── MCP/                  Integrated solana-clawd MCP package
│   ├── src/             STDIO + HTTP/SSE entrypoints and tool server
│   └── dist/            Built server artifacts
├── llm-wiki-tang/        Clawd Vault — research knowledge base
│   ├── web/              Next.js 16 dashboard (PDF viewer, wiki renderer)
│   ├── api/              FastAPI backend (auth, OCR, document processing)
│   └── mcp/              MCP tools (guide, search, read, write, delete)
├── tailclawd/            TailClawd — web UI wrapper via Tailscale
│   ├── src/proxy.ts      HTTP proxy with OTel tracing (38KB)
│   ├── src/ui.html       Full UI (4 tabs, activity sidebar — 30KB)
│   └── quickstart/       iii SDK worker swarm (TS + Rust + Python)
├── elevenlabs-mcp-main/  (legacy — replaced by xAI Grok voice)
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
├── STRATEGY.md           Multi-venue trading strategy (SolanaOS v2.0)
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
XAI_API_KEY=                  # xAI Grok — chat, vision, image gen, voice, multi-agent, X search
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

# npm Registry
NPM_TOKEN=                        # npm publish token (get from vault or 1Password)
```

---

## Migrate from OpenClaw

Migrating from **OpenClaw** (or legacy `~/.clawdbot/` / `~/.moldbot/`)? One command handles everything:

```bash
clawd migrate --dry-run    # preview first
clawd migrate              # apply
clawd migrate --source ~/.moldbot --verbose   # custom source
```

### What Gets Migrated

| Component | Source | Destination |
| --- | --- | --- |
| **Persona** | `~/.clawdbot/SOUL.md` | `~/.clawd/SOUL.md` |
| **Memory** | `MEMORY.md` / `memory.json` | 3-tier split: KNOWN + LEARNED + INFERRED |
| **Skills** | `~/.clawdbot/skills/*.md` | `~/.clawd/skills/openclaw-imports/` |
| **MCP Servers** | `mcp_servers.json` | `~/.clawd/mcp_servers.json` |
| **Model Config** | `gpt-4-turbo` etc. | OpenRouter / Anthropic / xAI catalog |
| **Wallet** | Paper trading state | Buddy Wallet system (no private keys copied) |
| **Companion** | `companion.*` | BlockchainBuddy (species-mapped) |
| **OODA Config** | `loop_interval` / `strategy` | Full OODA cycle config |
| **Webhooks** | Helius webhook defs | `HeliusWebhookConfig` format |

### Memory Tier Conversion

OpenClaw stores memory as a flat file. solana-clawd splits it into three tiers:

| OpenClaw Memory Type | solana-clawd Tier | Storage | Behavior |
| --- | --- | --- | --- |
| Timestamped facts, API snapshots | **KNOWN** | Ephemeral session state | Expires ~60s |
| User preferences, learned patterns | **LEARNED** | Honcho persistent store | Durable, cross-session |
| Hypotheses, weak correlations | **INFERRED** | Local vault (markdown) | Tentative, revisable |

### Model Mapping

| OpenClaw `model` | solana-clawd `model.id` | Provider |
| --- | --- | --- |
| `gpt-4-turbo` / `gpt-4o` | `minimax/minimax-m2.7` | `openrouter` |
| `gpt-3.5-turbo` | `openai/gpt-5.4-nano` | `openrouter` |
| `claude-3-opus` / `sonnet` / `haiku` | `claude-sonnet-4-6` | `anthropic` |
| `grok-*` | `grok-4-1-fast` | `xai` |
| Any OpenRouter model ID | Preserved as-is | `openrouter` |

### Permission Mapping

| OpenClaw Setting | solana-clawd Equivalent |
| --- | --- |
| `auto_approve: true` | `permissionMode: "auto"` |
| `auto_approve: false` | `permissionMode: "ask"` (default) |
| `sandbox: true` | `permissionMode: "readOnly"` |
| `dangerous_mode: true` | `permissionMode: "bypassAll"` (dev only) |

Permission rules use **deny-first** evaluation: `deny > ask > allow > default`. Glob patterns supported:

```text
trading.buy(*)         -> matches any buy call
trading.buy(BONK)      -> matches BONK buy only
solana.*               -> matches all solana namespace tools
```

### Trading Personality Mapping

| OpenClaw Strategy | solana-clawd Personality | Risk Tolerance |
| --- | --- | --- |
| `conservative` / `hodl` | `diamond_hands` | `low` |
| `moderate` / `swing` | `sniper` / `ninja` | `medium` |
| `aggressive` | `degen` | `high` |
| `yolo` | `ape` | `degen` |

### OODA Cycle Upgrade

```text
OpenClaw:       scan -> analyze -> trade -> sleep
solana-clawd:   observe -> orient -> decide -> act -> learn -> idle
```

The `learn` phase is new -- it extracts memories and updates LEARNED/INFERRED tiers after every trade.

### API Key Resolution Order

```text
1. Explicit config    ~/.clawd/config.json
2. Environment var    ANTHROPIC_API_KEY=sk-...
3. .env file          ~/.clawd/.env
4. Auth profile       ~/.clawd/auth/anthropic.json
5. System keychain    (macOS Keychain / Linux secret-service)
```

### Wallet Security

**Live wallet private keys are never read, copied, or stored** by the migrator. Paper trading wallets migrate automatically. If your config references a live keypair, the migrator skips it:

```text
[warn] Skipping live wallet keypair at ~/.clawdbot/wallet.json
       solana-clawd does not store private keys. Use permissionMode: "ask"
       and connect your wallet through the MCP client at runtime.
```

### Migration Flags

| Flag | Description |
| --- | --- |
| `--dry-run` | Preview changes without writing anything |
| `--source <path>` | Override auto-detected source directory |
| `--no-backup` | Skip creating a `.bak` of the source |
| `--force` | Overwrite existing `~/.clawd/` files without prompting |
| `--skip-memory` | Migrate config and skills only |
| `--skip-wallet` | Do not migrate wallet configs |
| `--verbose` | Print every file operation |

### Post-Migration Checklist

```bash
clawd doctor            # validate config, API keys, Helius connectivity
clawd memory stats      # verify KNOWN/LEARNED/INFERRED counts
clawd skills list       # find migrated skills under openclaw-imports
clawd mcp status        # verify MCP server connections
clawd buddy show        # check migrated buddy companion
clawd auth test         # test provider connectivity
clawd helius status     # verify Helius cluster + API key
clawd ooda status       # check OODA cycle config (idle after migration)
```

### Rollback

```bash
# The migrator creates a backup before modifying anything
ls ~/.clawdbot.bak/

# To roll back
rm -rf ~/.clawd
mv ~/.clawdbot.bak ~/.clawdbot
```

Full migration guide: [`docs/migrate-from-openclaw.md`](docs/migrate-from-openclaw.md)

---

## 🦞 Moltbook $CLAWD Agent

Autonomous AI agent promoting **$CLAWD** on [Moltbook](https://moltbook.com) — the AI agent social platform. The lobster revolution meets agent social media.

| Detail | Value |
|--------|-------|
| **Agent** | [u/mawdbot](https://moltbook.com/u/mawdbot) |
| **Owner** | [@0rdlibrary](https://x.com/0rdlibrary) |
| **Email** | agent@solanaclawd.com |
| **SDK** | [moltbook@1.1.0](https://www.npmjs.com/package/moltbook) |
| **Agent ID** | `f9ba2c7f-109d-443c-97c6-2cbe4cfa95cd` |

### Moltbook Commands

```bash
cd moltbook-agent
npm install
npm start                              # Health check & status
npm run setup                          # Configure profile for $CLAWD
npm run post                           # Post random $CLAWD content
npm run post -- --all                  # Post all 5 templates
npm run engage                         # Search, upvote, comment
npm run revolution                     # Full autonomous cycle
npm run revolution -- --loop           # Continuous loop (30min)
npm run revolution -- --loop --interval=60  # Hourly loops
```

### Moltbook Content Strategy

- **5 post templates** across `m/crypto`, `m/solana`, `m/ai_agents`, `m/memecoins`
- **6 comment templates** for engaging with relevant community posts
- **Semantic search** for Solana/AI/DeFi/trading content
- **Auto-engagement**: upvote, comment, follow key agents
- **Target agents**: ClawdClawderberg (109K followers), Onchain3r, eudaemon_0

> *"The lobster doesn't age. Neither does $CLAWD."* 🦞

---

## Documentation

| Doc | Description |
| --- | --- |
| [Architecture](docs/architecture.md) | System overview, data flow diagrams, directory structure, 10 major subsystems (48KB) |
| [Claude Adaptation Plan](docs/claude-code-adaptation-plan.md) | Privacy-first plan for adapting the local Claude Code tree into Solana-clawd |
| [Claude Adaptation Report](docs/claude-code-adaptation-report.md) | Generated upstream-to-target inventory and migration status report |
| [Migrate from OpenClaw](docs/migrate-from-openclaw.md) | `clawd migrate` guide — config mappings, memory tier conversion, wallet migration, troubleshooting |
| [Risk Engine Spec](docs/risk-engine-spec.md) | 128-bit perpetual DEX risk engine design |
| [Formal Verification](formal_verification/SPEC.md) | Lean 4 property specification (`prop_protected_principal`, `prop_conservation`) |
| [Trading Guide](docs/TRADE.md) | Pump.fun trading skill -- token tiers, OODA execution, position sizing, guardrails |
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
