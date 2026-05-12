<div align="center">

<h1>🔀 ClawdRouter</h1>

<h3>The LLM router built for autonomous Solana agents</h3>

<p>Agents can't sign up for accounts. Agents can't enter credit cards.<br>
Agents can only sign transactions.<br><br>
<strong>ClawdRouter is the only LLM router that lets Solana agents operate independently.</strong></p>

<br>

<img src="https://img.shields.io/badge/🤖_Agent--Native-black?style=for-the-badge" alt="Agent native">&nbsp;
<img src="https://img.shields.io/badge/🔑_Solana_Wallet_Auth-9945FF?style=for-the-badge" alt="Solana wallet auth">&nbsp;
<img src="https://img.shields.io/badge/⚡_Local_Routing-yellow?style=for-the-badge" alt="Local routing">&nbsp;
<img src="https://img.shields.io/badge/💰_x402_USDC-purple?style=for-the-badge" alt="x402 USDC">&nbsp;
<img src="https://img.shields.io/badge/🔓_MIT_Licensed-green?style=for-the-badge" alt="MIT licensed">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Solana](https://img.shields.io/badge/Solana-USDC-9945FF?style=flat-square&logo=solana&logoColor=white)](https://solana.com)
[![x402 Protocol](https://img.shields.io/badge/x402-Micropayments-purple?style=flat-square)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

> **ClawdRouter** is the Solana-native LLM router for the [solana-clawd](https://github.com/x402agent/solana-clawd) ecosystem. It reduces AI API costs by up to 92% by analyzing each request across 15 dimensions and routing to the cheapest capable model in under 1ms — entirely locally. Ed25519 wallet signatures for authentication (no API keys), USDC micropayments via x402 on Solana (no credit cards). 55+ models from OpenAI, Anthropic, Google, xAI, DeepSeek, NVIDIA, and more.

> The smoke script validates both trading + prediction endpoints and attempts a priority-fees websocket handshake.

---

## Burn + Lock Mechanism v2.0

Hardened gasless $CLAWD burn system with a dedicated treasury wallet for sponsored message burns, shared pricing, and on-chain burn tracking. The manual burn tab remains a self-burn flow signed by the user's wallet. The lock UI is present, but Streamflow lock creation is not wired end-to-end yet.

### Security Properties

| Property | Implementation |
| --- | --- |
| Zero Key Exposure | User wallets never share private keys; treasury signing stays server-side and isolated |
| Gasless Burn Mode | Chat/action burn mode spends treasury SOL and treasury CLAWD, so the user does not need SOL for those burns |
| Irreversible Burns | Two-step confirmation with clear irreversibility warning |
| Auditable | Burns are visible on-chain and reflected in the scoreboard/history queries |
| Shared Pricing | Client burn mode and server pricing endpoint use the same tier map and USD costs |
| Treasury Hardening | Sponsored burns derive amount server-side, require a token-gated wallet, and enforce replay/rate-limit guards |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAWD Burn + Lock v2.0                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  User Browser    │    │         Server-side               │  │
│  │  ┌────────────┐  │    │  ┌────────────────────────────┐  │  │
│  │  │TokenActions│  │    │  │ Sponsored burn router      │  │  │
│  │  │Burn Mode   │  │    │  │ - derives cost server-side │  │  │
│  │  └──────┬─────┘  │    │  │ - verifies token gate      │  │  │
│  │         │        │    │  │ - signs with treasury      │  │  │
│  └─────────┼────────┘    │  └──────────────┬─────────────┘  │  │
│            │             │                 │                │  │
│            ▼             │         ┌───────▼────────┐       │  │
│     ┌────────────┐       │         │ Birdeye /      │       │  │
│     │ User wallet│       │         │ DexScreener    │       │  │
│     │ self-burns │       │         │ price oracle   │       │  │
│     │ only       │       │         └────────────────┘       │  │
│     └─────┬──────┘       │                    │              │  │
│           │              │                    ▼              │  │
│           ▼              │             ┌──────────┐          │  │
│    ┌──────────────┐      │             │Streamflow│          │  │
│    │ Solana       │      │             │ Locks /  │          │  │
│    │ Mainnet      │      │             │ Vesting  │          │  │
│    │ (On-chain)   │      │             └──────────┘          │  │
│    └──────────────┘      │                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- `client/src/components/TokenActions.tsx`
  - User-initiated self-burn UI
  - Mode toggle: BURN vs LOCK/VEST tabs
  - Uses the active Solana wallet adapter signer
  - VersionedTransaction burn with ComputeBudget priority fee
  - Two-step burn confirmation with irreversibility warning
  - Lock mode currently collects intent only and does not submit a Streamflow transaction
- `client/src/contexts/BurnModeContext.tsx`
  - Session burn tracking and price oracle
  - Uses a protected server-side sponsored burn path for burn mode
  - Tracks `totalBurnedSession`, `clawdPriceUsd`, and sponsored burn availability
- `scripts/maintenance.ts`
  - Server-side maintenance script
  - Operations: `closeEmptyATAs`, `burnClawdSecurely`, `createClawdLockOrVesting`
  - Uses `MAINTENANCE_WALLET_SECRET_KEY` from `.env`

### Burn Mode UI

The Terminal page (`client/src/pages/Terminal.tsx`) includes a burn tab with:

- **TokenActions** — Burn/Lock interface with amount input, MAX button, preset amounts (100, 1K, 10K, 100K)
- **BurnScoreboard** — Community burn statistics and leaderboard

### Streamflow Status

The lock/vest panel is currently a UI placeholder for a future Streamflow integration. It does not create on-chain locks yet, so the hardened lock guarantees below are design targets rather than live behavior.

### Setup Instructions

**Environment Variables**

```bash
# Required for Burn + Lock v2.0
VITE_CLAWD_TOKEN_ADDRESS="8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump"
BURN_WALLET_TREASURY="GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4"
BURN_WALLET_TREASURY_PRIVATE_KEY="your-base58-encoded-private-key"
AGENT_MINT_BURN_COST_USD="0.05"
BIRDEYE_API_KEY="your-birdeye-api-key"
HELIUS_API_KEY="your-helius-api-key"
HELIUS_RPC_URL="your-helius-rpc-url"
HELIUS_WALLET_API_BASE="https://wallet-api.helius.xyz"

# Optional maintenance wallet for server-side ops only
MAINTENANCE_WALLET_SECRET_KEY="your-base58-encoded-private-key"
```

**Database Setup**

```bash
pnpm drizzle:push
```

**Run Maintenance Script (optional)**

```bash
npx tsx scripts/maintenance.ts --operation=burnClawdSecurely --amount=1000
```

### Burn Transaction Flow

1. User enables burn mode or triggers a priced burn action
2. Server derives the exact burn cost from the selected model/action
3. Server re-verifies the caller's CLAWD holding and enforces replay/rate-limit guards
4. Treasury wallet signs and submits the burn transaction
5. On-chain burn executes from the treasury wallet
6. UI updates session stats and refreshes scoreboard/history

### Agent Mint Treasury Burn

1. User successfully mints or one-shot deploys a Metaplex agent
2. Server computes `AGENT_MINT_BURN_COST_USD` worth of CLAWD using live price data
3. Treasury wallet burns that CLAWD on-chain
4. Mint response includes the treasury burn details when successful

### Manual Self-Burn Flow

1. User inputs burn amount (100, 1K, 10K, 100K presets or custom)
2. User clicks "BURN CLAWD"
3. Confirmation modal displays the irreversible self-burn warning
4. User signs the transaction in their wallet
5. On-chain burn executes from the user's own token account

### Lock/Vest Flow Status

1. User selects LOCK tab
2. User inputs:
   - Amount to lock
   - Recipient address (or self)
   - Cliff percentage (0-100%)
   - Duration (30/90/180/365 days)
3. User clicks "CREATE LOCK"
4. The UI currently shows the intended Streamflow design and does not submit an on-chain lock transaction

### API Endpoints

| Endpoint | Type | Description |
| --- | --- | --- |
| `/api/rpc` | POST | Proxied Solana RPC (hides API key) |
| `trpc.burn.pricing` | Query | Real-time CLAWD pricing and costs |
| `trpc.burn.walletBalances` | Query | Token balances via Helius DAS |
| `trpc.burn.burnHistory` | Query | On-chain burn transaction history |
| `trpc.burn.scoreboard` | Query | Aggregate burn statistics |
| `trpc.burn.walletIdentity` | Query | Wallet ENS/SNS lookup |

### Security Considerations

- **No server-side key exposure** — Helius API key proxied through `/api/rpc`
- **User signature required for self-burns only** — Manual burns require explicit wallet approval; sponsored burn mode does not
- **Irreversibility warning** — Two-step confirmation for burns
- **Treasury isolation** — Sponsored burns derive pricing server-side and never accept arbitrary client-provided burn amounts
- **Lock UI is not live yet** — Do not assume Streamflow locks are being created until that integration lands
- **On-chain audit** — All burns visible on Solana

### Troubleshooting

| Issue | Solution |
| --- | --- |
| "Burn transaction failed" | For self-burns, check wallet connection and ensure SOL for gas; for burn mode, check treasury config and token-gate status |
| "Insufficient balance" | Acquire more $CLAWD tokens |
| "Price unavailable" | Birdeye API rate-limited, wait for refresh |
| "Phantom not connected" | Install Phantom extension, connect wallet |

### Recommended Operator Flow

**Fastest**

```bash
bash scripts/bootstrap.sh
source ~/.bashrc
~/.solanaos/bin/solanaos onboard
~/.solanaos/bin/solanaos server
cd ~/src/solana-clawd && npm run demo
```

**Full Local**

```bash
git clone https://github.com/x402agent/SolanaOS.git
cd solanaos
cp .env.example .env
bash start.sh
```

**E2B Coding Agent**

```bash
e2b sbx create opencode
opencode
```

**E2B Claude Code**

```bash
e2b sbx create claude
claude
```

**E2B OpenClaw**

```bash
e2b sbx create openclaw
openclaw
```

### API Keys

CLAWD supports programmatic access via API keys for both users and agents. Keys use `clawd_sk_` prefix, SHA-256 hashed storage, and scope-based access control.

**Create a Key**

```bash
# Via tRPC (browser session or existing API key)
curl -X POST https://your-app.com/trpc/apiKey.create \
  -H "Content-Type: application/json" \
  -H "Cookie: solana_session=<jwt>" \
  -d '{"json":{"name":"my-bot","scopes":["chat:read","chat:write"]}}'
```

The full key (`clawd_sk_...`) is returned once — store it securely.

**Use a Key**

```bash
curl https://your-app.com/trpc/chat.send \
  -H "Authorization: Bearer clawd_sk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"json":{"message":"hello"}}'
```

**Available Scopes**

| Scope | Description |
| --- | --- |
| `chat:read` | Read chat history |
| `chat:write` | Send messages |
| `image:generate` | Generate images |
| `agent:manage` | Create/update agents |
| `e2b:manage` | Manage E2B sandboxes |
| `burn:execute` | Execute sponsored burns |
| `admin` | Full admin access (owner only) |

**Agent Keys**

Pass `agentWalletId` when creating a key to scope it to a specific agent wallet. Agent keys can only access resources associated with that agent.

**tRPC Routes**

| Route | Type | Description |
| --- | --- | --- |
| `apiKey.create` | mutation | Create a new API key (max 10 per user) |
| `apiKey.list` | query | List your keys (prefix only, no secrets) |
| `apiKey.revoke` | mutation | Revoke a key by ID |
| `apiKey.usage` | query | Get usage stats for a key |
| `apiKey.scopes` | query | List all available scopes |

**Migration**

```bash
# Apply the API keys migration
psql $DATABASE_URL < drizzle/0003_api_keys.sql
```

**Security Notes**

- Keys are SHA-256 hashed before storage — the full key is never persisted
- Only the key prefix (`clawd_sk_xxxx...`) is stored for identification
- Expired keys are rejected at validation time
- All key usage is logged to `api_key_audit_log` for forensics
- Max 10 keys per user to prevent abuse

### Deploy

**clawd-terminal (Main App)**

This app can be deployed as a single Node service:

- Build command: `pnpm build`
- Start command: `pnpm start`
- Port: `PORT`

Railway or Fly.io. The existing `fly.toml` targets app `clawd-terminal` in `ewr`.

```bash
# Deploy main app to Fly.io
fly deploy
```

**ClawdRouter (API Proxy)**

ClawdRouter deploys as a separate Fly.io service — the OpenAI-compatible LLM proxy with smart routing, $CLAWD token gating, and API key auth.

```bash
cd clawdrouter

# Build TypeScript
npm run build

# Deploy to Fly.io
fly deploy
```

Required secrets (set via `fly secrets set`):

```bash
fly secrets set \
  OPENROUTER_API_KEY=sk-or-... \
  DATABASE_URL=postgresql://... \
  HELIUS_API_KEY=... \
  CLAWDROUTER_INTERNAL_SECRET=your-shared-secret \
  CLAWDROUTER_VALIDATION_URL=https://clawd-terminal.fly.dev
```

| Variable | Required | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | Routes to 55+ models via OpenRouter |
| `DATABASE_URL` | Yes* | Direct API key validation (same Neon DB) |
| `CLAWDROUTER_VALIDATION_URL` | Yes* | Or validate keys via main app's `/api/auth/validate-key` |
| `CLAWDROUTER_INTERNAL_SECRET` | Yes | Shared secret between router ↔ main app |
| `HELIUS_API_KEY` | No | For $CLAWD holder tier checks |

*One of `DATABASE_URL` or `CLAWDROUTER_VALIDATION_URL` is required for API key auth.

**Hosted mode behavior**

- x402 literal auth is disabled — users must use `clawd_sk_` API keys
- Rate limits: 1000 req/hr for API key users, tier-based for wallet auth
- All requests to `/v1/chat/completions` require authentication
- Health, models, and status endpoints remain public

**Usage after deployment**

```bash
# With your API key from clawd-terminal
curl https://clawdrouter.fly.dev/v1/chat/completions \
  -H "Authorization: Bearer clawd_sk_..." \
  -H "Content-Type: application/json" \
  -d '{"model":"clawdrouter/auto","messages":[{"role":"user","content":"Hello"}]}'

# Or point any OpenAI-compatible client
client = OpenAI(base_url="https://clawdrouter.fly.dev/v1", api_key="clawd_sk_...")
```

### Docs

- [SOUL.md](SOUL.md)
- [TRADE.md](TRADE.md) — Pump.fun trading agent skill (OODA loop, position sizing, guardrails)
- [OpenClaw Migration Guide](docs/openclaw-migration.md)

### Positioning

CLAWD Cloud OS is the bootstrap layer. SolanaOS is the Go-native runtime. `solana-clawd` is the Grok-native agentic interface. E2B is the secure execution and desktop substrate.

Together they give you:

- one-shot install
- no-root Go bootstrap
- terminal + web + MCP workflows
- desktop computer use
- sandbox persistence
- cloud coding agents
- Solana-native operator ergonomics

---

# Clawd 🤖 DeFi Agents API - AI Agent Definitions for Web3

> **42 production-ready AI agent definitions for DeFi, portfolio management, trading, and Web3 workflows. RESTful JSON API with 18-language support.**

A comprehensive, discoverable API hosting specialized AI agent schemas with universal compatibility. Works with any AI platform, LLM, or chatbot that supports agent indexes — no vendor lock-in, no platform restrictions. Perfect for developers, LLMs, and AI systems building Web3 applications.

---

## ✨ Key Features

- ✅ **42 Production-Ready Agents** — DeFi, portfolio, trading, Web3, education
- ✅ **18 Languages** — Automated i18n translation workflow ([Learn More →](./docs/I18N_WORKFLOW.md))
- ✅ **RESTful JSON API** — Easy integration for developers and LLMs ([API Docs →](./docs/API.md))
- ✅ **Machine-Readable Indexes** — Agent manifest for AI crawlers ([agents-manifest.json](./agents-manifest.json))
- ✅ **Universal Format** — Standard JSON schema works with any platform
- ✅ **No Vendor Lock-in** — Switch platforms without losing work
- ✅ **Open Source** — MIT licensed, fully transparent
- ✅ **SEO & AI Friendly** — robots.txt, structured data, semantic indexing
- ✅ **CDN Hosted** — GitHub Pages for fast global access
- ✅ **Custom Domain Ready** — Easy white-labeling

---

## 🚀 Quick Start — DeFi Agents

### For AI Systems & LLMs

Discover agents via the API:

```bash
# Get all agents (English)
curl https://clawd.click/index.json

# Get agents in any language
curl https://clawd.click/index.zh-CN.json

# Get agent manifest for indexing
curl https://clawd.click/agents-manifest.json
```

[Complete API Documentation →](./docs/API.md)

### For Users

Add agents to your AI platform:

```
https://clawd.click/index.json
```

Or with language:

```
https://clawd.click/index.{locale}.json
```

### For Developers

```bash
git clone https://github.com/x402agent.com/solana-clawd.git
cd solana-clawd
bun install
bun run format
bun run build
```

[Complete Development Workflow Guide →](./docs/WORKFLOW.md)

---

## 📦 Agent Categories

### 🌟 Featured Agent

**🎯 CLAWD Portfolio** — All-in-one crypto portfolio management ⭐ **RECOMMENDED**

- Complete portfolio tracking, trading automation, DeFi protocols, and analytics
- ONE agent for 100% of portfolio management features
- Perfect for most users — install once, access everything

⚠️ **Current Status:** Read-only portfolio tracking and analytics available now. Automated trading, bots, and DeFi interactions coming soon in ClawdOS roadmap.

[View Agent →](https://clawd.click/clawd-portfolio.json) | [Try Now →](https://clawd.fun/discover/assistant/clawd-portfolio)

---

### 🪙 DeFi & Crypto (42 Specialized Agents)

**CLAWD Ecosystem (8 Agents):**

**Master Agent (Recommended):**

- **CLAWD Portfolio** 🎯 — All-in-one portfolio management (dashboard, trading, bots, DeFi, analytics)

**Original CLAWD Agents (7):**

- USDs Stablecoin Expert, SPA Tokenomics Analyst, veSPA Lock Optimizer
- Governance Guide, Liquidity Strategist, Bridge Assistant, Yield Aggregator

**ClawdOS Portfolio Specialists (16):**
💡 _For advanced users who prefer focused tools_

- Portfolio Dashboard, Assets Tracker, Analytics Expert, Wallet Manager
- Trading Assistant, AI Trading Bot, Signal Bot, DCA Bot
- Arbitrage Bot, Pump Screener, DeFi Center, DeFi Protocols
- Strategies Marketplace, Bot Templates, Settings Manager, Help Center

> **Note:** ClawdOS portfolio agents currently use `clawd.fun` for testing. The domain may change to `clawd.io` or similar once ClawdOS launches in production. [See FAQ](./docs/FAQ.md#clawd-portfolio-agents) for details.

**General DeFi (34 Agents) + Crypto News:**

- Yield Farming Optimizer, Impermanent Loss Calculator, Gas Optimizer
- Smart Contract Auditor, MEV Protection Advisor, Whale Watcher
- Protocol Comparator, Token Unlock Tracker, Liquidation Risk Manager
- Airdrop Hunter, Alpha Leak Detector, APY vs APR Educator
- Bridge Security Analyst, Crypto Tax Strategist, DeFi Insurance Advisor
- DeFi Onboarding Mentor, DeFi Protocol Comparator, DeFi Risk Scoring Engine
- DEX Aggregator Optimizer, Governance Proposal Analyst, Layer 2 Comparison Guide
- Liquidation Risk Manager, Liquidity Pool Analyzer, Narrative Trend Analyst
- NFT Liquidity Advisor, Portfolio Rebalancing Advisor, Protocol Revenue Analyst
- Protocol Treasury Analyst, Stablecoin Comparator, Staking Rewards Calculator
- Wallet Security Advisor, Yield Dashboard Builder, Yield Sustainability Analyst

[View Full Agent List →](https://github.com/x402agent.com/solana-clawd)

---

## 🤝 Agent Teams

Create collaborative teams of specialized agents that work together on complex tasks.

**Example Team — DeFi Strategy:**

```
- Yield Optimizer (finds opportunities)
- Risk Assessment Agent (evaluates safety)
- Portfolio Tracker (monitors performance)
- Gas Optimizer (minimizes costs)
```

The host agent coordinates discussion, ensuring each specialist contributes their expertise while building toward a comprehensive solution.

[Read Teams Guide →](./docs/TEAMS.md)

---

## 🌍 Multi-Language Support

All agents automatically available in 18 languages:

🇺🇸 English・🇨🇳 简体中文・🇹🇼 繁體中文・🇯🇵 日本語・🇰🇷 한국어・🇩🇪 Deutsch・🇫🇷 Français・🇪🇸 Español・🇷🇺 Русский・🇸🇦 العربية・🇵🇹 Português・🇮🇹 Italiano・🇳🇱 Nederlands・🇵🇱 Polski・🇻🇳 Tiếng Việt・🇹🇷 Türkçe・🇸🇪 Svenska・🇮🇩 Bahasa Indonesia

---

## 🛠️ DeFi Agents API Reference

### Endpoints

```bash
# Main index (all agents)
GET https://clawd.click/index.json

# Individual agent (English)
GET https://clawd.click/{agent-id}.json

# Localized agent
GET https://clawd.click/{agent-id}.zh-CN.json

# Language-specific index
GET https://clawd.click/index.zh-CN.json
```

### Quick Integration

```javascript
// Load all agents
const response = await fetch('https://clawd.click/index.json');
const { agents } = await response.json();

// Load specific agent
const agent = await fetch(`https://clawd.click/defi-yield-optimizer.json`);
const agentConfig = await agent.json();
```

[Full API Documentation →](./docs/API.md)

---

## 🤖 Contributing an Agent

We welcome contributions! Submit your agent to expand the library.

### Quick Submit

1. **Fork this repository**
2. **Create your agent** in `src/your-agent-name.json`

```json
{
  "author": "your-github-username",
  "config": {
    "systemRole": "You are a [role] with expertise in [domain]..."
  },
  "identifier": "your-agent-name",
  "meta": {
    "title": "Agent Title",
    "description": "Clear, concise description",
    "avatar": "🤖",
    "tags": ["category", "functionality", "domain"]
  },
  "schemaVersion": 1
}
```

3. **Submit a Pull Request**

Our automated workflow will translate your agent to 18 languages and deploy it globally.

### Quality Guidelines

✅ Clear purpose — solves a specific problem\
✅ Well-structured prompts — comprehensive but focused\
✅ Appropriate tags — aids discovery\
✅ Tested — verified functionality

[Full Contributing Guide →](./docs/CONTRIBUTING.md)

---

## 📖 Documentation

### For Users

- [Agent Teams Guide](./docs/TEAMS.md) — Multi-agent collaboration
- [FAQ](./docs/FAQ.md) — Common questions
- [Examples](./docs/EXAMPLES.md) — Real-world use cases

### For Developers

- [Complete Workflow Guide](./docs/WORKFLOW.md) — End-to-end development process
- [Contributing Guide](./docs/CONTRIBUTING.md) — How to submit agents
- [API Reference](./docs/API.md) — Complete API documentation
- [Agent Creation Guide](./docs/AGENT_GUIDE.md) — Design effective agents
- [18 Languages i18n Workflow](./docs/I18N_WORKFLOW.md) — Automated translation system
- [Deployment Guide](./docs/DEPLOYMENT.md) — Domain setup and CI/CD
- [Prompt Engineering](./docs/PROMPTS.md) — Writing better prompts
- [Model Parameters](./docs/MODELS.md) — Temperature, top_p explained
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Common issues

---

## 🚀 Deployment — DeFi Agents

### GitHub Pages (Automatic)

1. **Fork/Clone this repository**
2. **Choose your domain option:**
   - **Default GitHub Pages:** Delete the `CNAME` file
   - **Custom Domain:** Update `CNAME` with your domain
3. **Enable GitHub Pages:**
   - Settings → Pages → Source: `gh-pages` branch
4. **Push to main** — GitHub Actions automatically builds and deploys

Your agents will be at:

- Default: `https://[username].github.io/[repository]/index.json`
- Custom: `https://yourdomain.com/index.json`

### Custom Domain Setup

1. **Update CNAME file:** `echo "yourdomain.com" > CNAME`
2. **Configure DNS:** Add CNAME record → `[username].github.io`
3. **Enable HTTPS** in repository settings after DNS propagates

**Note:** The build process automatically copies your CNAME to the deployment, so your custom domain persists across all deployments. Forks can simply update or delete the CNAME file.

[Full Deployment Guide →](./docs/DEPLOYMENT.md)

---

## 🔧 Development Tools

### Split Agent Batches

```bash
node split-agents.cjs
```

Converts batch JSON into individual agent files.

### Emoji Converter

```bash
node emoji-converter.cjs
```

Converts emoji URLs to native Unicode.

---

## 🌐 Integration Examples

### Custom Application

```javascript
// Fetch agents
const agents = await fetch('https://clawd.click/index.json').then((r) => r.json());

// Use with your AI model
const systemPrompt = agents.agents[0].config.systemRole;
```

### Python

```python
import requests

# Load agents
response = requests.get('https://clawd.click/index.json')
agents = response.json()['agents']

# Filter by tag
defi_agents = [a for a in agents if 'defi' in a['meta']['tags']]
```

---

## 🔐 Security & Privacy

- **No data collection** — Static JSON index, zero tracking
- **Agents run locally** — Execute in your AI platform's environment
- **Open source** — Full transparency, audit every line
- **No external calls** — Pure JSON configuration files

---

## 📊 Stats

- **42 Agents** — DeFi-focused coverage
- **18 Languages** — Global accessibility via automated translation
- **8 CLAWD Specialists** — Ecosystem-specific agents (7 core + 1 portfolio master)
- **34 General DeFi Agents** — Comprehensive DeFi toolkit
- **~300 KB Index** — Fast loading (gzipped: ~65 KB)
- **80-120ms** — Global CDN delivery
- **0 Vendor Lock-in** — True interoperability

---

## 🔗 Projects Building with Solana Clawd 🤍

- **ClawdOS** — [Application Branch](https://github.com/x402agent.com/solana-clawd/tree/clawdos)

---

## 📜 License — DeFi Agents

MIT License — see [LICENSE](LICENSE) file for details.

**Open Source • Open Format • Open Future**

---

## 🌐 Live HTTP Deployment

**DeFi Agents** is deployed and accessible over HTTP via [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) transport — no local installation required.

**Endpoint:**

```
https://modelcontextprotocol.name/mcp/defi-agents
```

### Connect from any MCP Client

Add to your MCP client configuration (Claude Desktop, Cursor, ClawdOS, etc.):

```json
{
  "mcpServers": {
    "defi-agents": {
      "type": "http",
      "url": "https://modelcontextprotocol.name/mcp/defi-agents"
    }
  }
}
```

### Available Tools (10)

| Tool | Description |
| --- | --- |
| `get_price` | Get crypto prices |
| `get_market_overview` | Market overview |
| `get_trending` | Trending coins |
| `search_coins` | Search |
| `get_coin_detail` | Coin details |
| `get_global_stats` | Global stats |
| `get_defi_protocols` | DeFi protocols by TVL |
| `get_protocol_detail` | Protocol detail |
| `get_chain_tvl` | Chain TVL |
| `get_yield_opportunities` | Yield opportunities |

### Example Requests

**Get crypto prices:**

```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_price","arguments":{"ids":"aave,compound-governance-token","vs_currencies":"usd"}}}'
```

**Market overview:**

```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_market_overview","arguments":{"limit":10}}}'
```

**Trending coins:**

```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_trending","arguments":{}}}'
```

### List All Tools

```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Also Available On

- **[ClawdOS](https://clawdos.vercel.app)** — Browse and install from the [MCP marketplace](https://clawdos.vercel.app/community/mcp)
- **All 27 MCP servers** — See the full catalog at [modelcontextprotocol.name](https://modelcontextprotocol.name)

> Powered by [modelcontextprotocol.name](https://modelcontextprotocol.name) — the open MCP HTTP gateway

---

## Why ClawdRouter Exists

Every other LLM router was built for **human developers** — create an account, get an API key, pick a model, pay with a credit card.

**Solana agents can't do any of that. They can only sign transactions.**

ClawdRouter is built for the Solana-first agent world:

- **No accounts** — an Ed25519 keypair is generated locally, no signup
- **No API keys** — your Solana wallet signature IS authentication
- **No model selection** — 15-dimension scoring picks the right model automatically
- **No credit cards** — agents pay per-request with USDC on Solana via [x402](https://x402.org)
- **No trust required** — runs locally, <1ms routing, zero external dependencies

This is the stack that lets Solana agents operate autonomously: **x402 + USDC + Ed25519 + local routing**.

---

## How It Compares

|                  | OpenRouter        | LiteLLM          | Martian           | Portkey           | **ClawdRouter**          |
| ---------------- | ----------------- | ---------------- | ----------------- | ----------------- | ----------------------- |
| **Models**       | 200+              | 100+             | Smart routing     | Gateway           | **55+**                 |
| **Routing**      | Manual selection  | Manual selection | Smart (closed)    | Observability     | **Smart (open source)** |
| **Auth**         | Account + API key | Your API keys    | Account + API key | Account + API key | **Solana Ed25519**      |
| **Payment**      | Credit card       | BYO keys         | Credit card       | $49-499/mo        | **USDC on Solana**      |
| **Runs locally** | No                | Yes              | No                | No                | **Yes**                 |
| **Open source**  | No                | Yes              | No                | Partial           | **Yes**                 |
| **Solana-native**| No                | No               | No                | No                | **Yes**                 |
| **Agent-ready**  | No                | No               | No                | No                | **Yes**                 |

✓ Open source · ✓ Smart routing · ✓ Runs locally · ✓ Solana native · ✓ Agent ready

**We're the only one that checks all five boxes.**

---

## Quick Start

### 1. Start the proxy

```bash
cd clawdrouter
npm install
npx tsx src/index.ts
```

### 2. Fund your wallet

Your Solana wallet address is printed on first run. Send a few USDC on Solana — $5 covers thousands of requests.

### 3. Point your client at `http://localhost:8402`

<details>
<summary><strong>continue.dev</strong> — <code>~/.continue/config.yaml</code></summary>

```yaml
models:
  - name: ClawdRouter Auto
    provider: openai
    model: clawdrouter/auto
    apiBase: http://localhost:8402/v1/
    apiKey: x402
    roles:
      - chat
      - edit
      - apply
```

</details>

<details>
<summary><strong>Cursor</strong> — Settings → Models → OpenAI-compatible</summary>

Set base URL to `http://localhost:8402`, API key to `x402`, model to `clawdrouter/auto`.

</details>

<details>
<summary><strong>Any OpenAI SDK</strong></summary>

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8402", api_key="x402")
response = client.chat.completions.create(
    model="clawdrouter/auto",
    messages=[{"role": "user", "content": "Write a Solana program"}]
)
```

```typescript
import OpenAI from 'openai';

const client = new OpenAI({ baseURL: 'http://localhost:8402', apiKey: 'x402' });
const response = await client.chat.completions.create({
  model: 'clawdrouter/auto',
  messages: [{ role: 'user', content: 'Write a Solana program' }],
});
```

</details>

---

## Routing Profiles

Choose your routing strategy with `/model <profile>`:

| Profile          | Strategy           | Savings | Best For         |
| ---------------- | ------------------ | ------- | ---------------- |
| `/model auto`    | Balanced (default) | 74-100% | General use      |
| `/model eco`     | Cheapest possible  | 95-100% | Maximum savings  |
| `/model premium` | Best quality       | 0%      | Mission-critical |

**Shortcuts:** `/model grok`, `/model claude`, `/model opus`, `/model gemini`, `/model free`

---

## How It Works

**100% local routing. <1ms latency. Zero external API calls for classification.**

```
Request → 15-Dimension Scorer → Tier → Profile → Best Model → x402 USDC → Response
```

| Tier      | ECO Model                           | AUTO Model                            | PREMIUM Model                |
| --------- | ----------------------------------- | ------------------------------------- | ---------------------------- |
| SIMPLE    | nvidia/gpt-oss-120b (**FREE**)      | gemini-2.5-flash ($0.30/$2.50)        | kimi-k2.5                    |
| MEDIUM    | gemini-2.5-flash-lite ($0.10/$0.40) | kimi-k2.5 ($0.55/$2.50)              | gpt-5.3-codex ($1.75/$14.00) |
| COMPLEX   | gemini-2.5-flash-lite ($0.10/$0.40) | gemini-3.1-pro ($2/$12)              | claude-opus-4.6 ($5/$25)     |
| REASONING | grok-4-1-fast ($0.20/$0.50)         | grok-4-1-fast-reasoning ($0.20/$0.50) | claude-sonnet-4.6 ($3/$15)   |

**Blended average: ~$2.05/M** vs $25/M for Claude Opus = **92% savings**

### 15-Dimension Scoring

Each request is scored across these dimensions (all <1ms, local):

| # | Dimension | Weight | Detects |
|---|-----------|--------|---------|
| 1 | Token Count | 8% | Input length → model capacity |
| 2 | Complexity | 10% | Vocabulary diversity |
| 3 | Technical Depth | 10% | Domain-specific terms |
| 4 | Code Generation | 12% | Programming patterns |
| 5 | Reasoning | 12% | Logical analysis patterns |
| 6 | Creativity | 5% | Creative writing signals |
| 7 | Multi-Step | 8% | Sequential planning |
| 8 | Context Length | 5% | Context window needs |
| 9 | Tool Use | 6% | Function calling |
| 10 | Vision | 4% | Image understanding |
| 11 | Math/Science | 6% | Computation needs |
| 12 | **Solana-Specific** | 4% | Blockchain/DeFi domain |
| 13 | Agent Autonomy | 4% | Agent patterns |
| 14 | Structured Output | 3% | JSON/schema needs |
| 15 | Latency Sensitivity | 3% | Response speed needs |

---

## Models & Pricing

55+ models across 9 providers, one Solana wallet. **Starting at $0/request.**

### Free Models (11 models, $0)

| Model | Context | Features |
|-------|---------|----------|
| nvidia/gpt-oss-120b | 128K | — |
| nvidia/nemotron-ultra-253b | 131K | reasoning |
| nvidia/deepseek-v3.2 | 131K | reasoning |
| nvidia/mistral-large-3-675b | 131K | reasoning |
| nvidia/qwen3-coder-480b | 131K | code |
| nvidia/devstral-2-123b | 131K | code |
| nvidia/llama-4-maverick | 131K | reasoning |
| + 4 more | | |

### Budget Models ($0.0002–$0.0018/request)

| Model | Input $/M | Output $/M | ~$/req |
|-------|--------:|----------:|-------:|
| openai/gpt-5-nano | $0.05 | $0.40 | $0.0002 |
| google/gemini-2.5-flash-lite | $0.10 | $0.40 | $0.0003 |
| xai/grok-4-1-fast-reasoning | $0.20 | $0.50 | $0.0004 |
| google/gemini-2.5-flash | $0.30 | $2.50 | $0.0014 |
| moonshot/kimi-k2.5 | $0.60 | $3.00 | $0.0018 |

### Mid-Range Models ($0.002–$0.009/request)

| Model | Input $/M | Output $/M | ~$/req |
|-------|--------:|----------:|-------:|
| anthropic/claude-haiku-4.5 | $1.00 | $5.00 | $0.0030 |
| google/gemini-2.5-pro | $1.25 | $10.00 | $0.0056 |
| openai/gpt-5.3-codex | $1.75 | $14.00 | $0.0079 |
| google/gemini-3.1-pro | $2.00 | $12.00 | $0.0070 |
| openai/gpt-5.4 | $2.50 | $15.00 | $0.0088 |

### Premium Models ($0.009+/request)

| Model | Input $/M | Output $/M | ~$/req |
|-------|--------:|----------:|-------:|
| anthropic/claude-sonnet-4.6 | $3.00 | $15.00 | $0.0090 |
| anthropic/claude-opus-4.6 | $5.00 | $25.00 | $0.0150 |
| openai/o1 | $15.00 | $60.00 | $0.0375 |
| openai/gpt-5.4-pro | $30.00 | $180.00 | $0.1050 |

---

## Payment

No account. No API key. **Your Solana wallet IS your identity.**

```
Request → 402 (price: $0.003) → Ed25519 signs USDC → retry → response
```

USDC stays in your wallet until spent — non-custodial. Price is visible in the 402 header before signing.

**Solana-first:** Pay with **USDC on Solana mainnet**. Ed25519 keypair generated on first run.

### Slash Commands

```bash
/wallet              # Check balance and address
/wallet export       # Export mnemonic + keys for backup
/wallet recover      # Restore wallet from mnemonic
/wallet solana       # Ensure Solana mainnet payments
/wallet devnet       # Switch to devnet (testing)
/stats               # View usage and savings
/stats clear         # Reset usage statistics
/model auto          # Switch to balanced routing
/model eco           # Switch to cheapest routing
/model premium       # Switch to best quality
/model free          # Show free models
/models              # List all 55+ models with pricing
/tiers               # Show tier breakdown and costs
/exclude             # Show excluded models
/exclude add <model> # Block a model from routing
/exclude clear       # Remove all exclusions
/help                # Show all commands
```

**Fund your wallet:**

- Send USDC on Solana to the address printed on first run
- $5 USDC covers thousands of requests

---

## CLI Commands

```bash
# Start the proxy server (default)
npx tsx src/index.ts

# Run diagnostics
npx tsx src/index.ts doctor

# List all models with pricing
npx tsx src/index.ts models

# Show tier cost breakdown
npx tsx src/index.ts tiers

# Show routing profiles
npx tsx src/index.ts profiles

# Test the 15-dimension scorer
npx tsx src/index.ts score "Write a Solana program for token staking"

# Show wallet info
npx tsx src/index.ts wallet

# Show version
npx tsx src/index.ts version
```

---

## Configuration

For basic usage, no configuration needed. For advanced options:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWDROUTER_PORT` | `8402` | Local proxy port |
| `CLAWDROUTER_PROFILE` | `auto` | Routing: auto, eco, premium |
| `CLAWDROUTER_SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC |
| `CLAWDROUTER_NETWORK` | `solana-mainnet` | solana-mainnet or solana-devnet |
| `CLAWDROUTER_MAX_PER_REQUEST` | `0.10` | Max USDC per request |
| `CLAWDROUTER_MAX_PER_SESSION` | `5.00` | Max USDC per session |
| `CLAWDROUTER_DEBUG` | `false` | Debug logging |

**Full reference:** [docs/configuration.md](docs/configuration.md)

---

## Troubleshooting

**Run the doctor:**

```bash
npx tsx src/index.ts doctor
```

```
🩺 ClawdRouter Doctor v0.1.0
═══════════════════════════════════════════════════════

System
  ✓ OS: darwin arm64
  ✓ Node: v20.11.0

Wallet
  ✓ Address: 7xKXt...abc
  ✓ SOL: 0.0500
  ✓ USDC: $12.50

Network
  ✓ Upstream API: reachable (200)
  ✗ Local proxy: not running on :8402
  ✓ Solana RPC: reachable

Models
  ✓ Registry: 55 models
  ✓ Free: 11 models
  ✓ Providers: 9
```

---

## Development

```bash
# Clone the repo
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd/clawdrouter

# Install dependencies
npm install

# Start dev server
npx tsx src/index.ts

# Run tests
npx tsx --test tests/*.test.ts

# Build for production
npm run build
```

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full technical deep dive.

```
Client → ClawdRouter Proxy (:8402) → 15-Dim Scorer → Tier/Profile → x402 USDC → Upstream
```

### Integration with solana-clawd

ClawdRouter integrates with the existing ecosystem:

- **SolanaVault** — reads keypairs from `~/.clawd/vault/`
- **x402 Service** — compatible with `src/services/x402/` payment flow
- **Gateway** — can act as upstream for SSE transport
- **Grok Service** — all Grok model variants included

---

## Resources

| Resource | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design & request flow |
| [Configuration](docs/configuration.md) | Environment variables & file locations |
| [Routing Profiles](docs/routing-profiles.md) | ECO/AUTO/PREMIUM deep dive |

---

## From the solana-clawd Ecosystem

<table>
<tr>
<td width="50%">

### 🔀 ClawdRouter

**The LLM router built for autonomous Solana agents**

You're here. 55+ models, local smart routing, x402 USDC on Solana — the only stack that lets agents operate independently with Ed25519.

</td>
<td width="50%">

### 🤖 [solana-clawd](https://github.com/x402agent/solana-clawd)

**The autonomous Solana agent engine**

Full agentic engine with MCP tools, Telegram bot, vault management, gateway protocol, and 95+ skills. ClawdRouter powers model selection.

</td>
</tr>
</table>

---

<div align="center">

**MIT License** · [solana-clawd](https://github.com/x402agent/solana-clawd) — Solana-native AI agent infrastructure

⭐ If ClawdRouter powers your agents, consider starring the repo!

</div>
