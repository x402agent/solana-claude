# 🤖 Solana Clawd Agents — Hub, Catalog, and Deploy API

> **53 production-ready AI agents for the Solana ecosystem — trading, DeFi, NFTs, security, launches, governance, dev-tools, education, research, and infrastructure. 42 one-shot deploys, 21 featured on the hub, end-to-end CLAWD Router integration, MCP install, on-chain Metaplex minting, and an 18-language RESTful JSON API.**

A discoverable, self-hosting hub for Solana-native AI agents. Every agent in the [`src/`](./src/) directory is automatically indexed into a catalog ([`agents-catalog.json`](./agents-catalog.json)), served via REST and MCP, and surfaced at [x402.wtf/agents](https://www.x402.wtf/agents) with install / chat / mint buttons. Works with any MCP-compatible client — Clawd Desktop, Cursor, ClawdOS, Windsurf.

## 🔗 openclawd Ecosystem

| Surface              | URL                                                                           | Status             |
| -------------------- | ----------------------------------------------------------------------------- | ------------------ |
| **Agents hub**       | [x402.wtf/agents](https://www.x402.wtf/agents)                      | live               |
| **Mint page**        | [x402.wtf/agents/mint](https://www.x402.wtf/agents/mint)            | live (MPL Core)    |
| **Agent staking**    | [x402.wtf/agents/stake](https://www.x402.wtf/agents/stake)          | live (MPL Core FreezeDelegate) |
| **Registry**         | [x402.wtf/agents/registry](https://www.x402.wtf/agents/registry)    | live               |
| **Terminal**         | [x402.wtf/terminal](https://www.x402.wtf/terminal)                  | drops today        |
| **Studio (Vibe)**    | [vibe.x402.wtf](https://vibe.x402.wtf)                          | live for holders   |
| **DEX**              | [dex.x402.wtf](https://dex.x402.wtf)                            | live               |
| **Telegram**         | [t.me/clawdtoken](https://t.me/clawdtoken)                                    | live               |
| **Solana OS Hub**    | [openclawd.net](https://openclawd.net)                                          | live               |
| **Mobile (Seeker)**  | [seeker.openclawd.net](https://seeker.openclawd.net)                            | live               |

---

## Agent Staking Is Part Of The Agent Hub

The agent hub does not stop at minting and catalog discovery. `/staking` is the
commitment layer for the same Metaplex Core assets minted through
`/agents/mint` and indexed through `/agents/registry`.

The platform now treats staking as a first-class agent lifecycle state:

1. **Mint** an agent as a Metaplex Core asset with Agent Registry identity.
2. **Register** its A2A, MCP, web, payment, and service endpoints.
3. **Stake** the agent at `/staking` to freeze transfers without moving custody.
4. **Index** stake state for the hub, dashboards, paid APIs, and future rewards.
5. **Route** phase-2 gacha fees and CLAWD emissions through the reward protocol.

Current layers:

| Layer | Status | Files |
|---|---|---|
| Live Core lock/unlock | devnet live | `client/src/pages/AgentStake.tsx`, `client/src/lib/agentStaking.ts` |
| Reward/position protocol | repo-ready, pre-mainnet | `programs/clawd-stake/`, `server/_core/clawdStakeRoutes.ts`, `convex/clawdStake.ts` |
| Gacha fee share | planned | `programs/clawd-gacha/` will deposit SOL into `clawd-stake` |

---

## OpenClawd Agent Staking Docs

Use these local references when working on Metaplex Agent staking, pay-gated agent APIs, and terminal operator flows:

- Main app README: `/Users/8bit/Downloads/clawd-terminal/README.md`
- Agents catalog README: `/Users/8bit/Downloads/clawd-terminal/agents/README.md`
- Pay Agents guide: `/Users/8bit/Downloads/clawd-terminal/docs/pay-agents.md`
- Clawd Stake program: `/Users/8bit/Downloads/clawd-terminal/programs/clawd-stake/README.md`
- Clawd TUI README: `/Users/8bit/Downloads/clawd-terminal/clawd-tui/clawd-tui/README.md`
- Dark Ralph TUI README: `/Users/8bit/fraud/OpenClawd/dark-ralph/README.md`

---

## 🆕 What's New (April 2026)

### Full Clawd-ification pass — every agent now Solana-native

The whole [`src/`](./src/) library was rewritten to match the CLAWD Router + CLAWD holder deploy flow used by [x402.wtf/agents](https://www.x402.wtf/agents). Two transform scripts drove the pass:

- [`scripts/clawdify-agents.cjs`](./scripts/clawdify-agents.cjs) — upgrades a legacy agent to the Solana-native one-shot schema. Strips the bulky "CLAWD IDENTITY / OUTPUT CONTRACT" boilerplate from `config.systemRole` and replaces it with a compact **Solana-native preamble** (lamports/CU, Jito tips, deny-first signing, Clawd Router context, MPL Core mint endpoint). Sets `$schema`, `oneShot`, `featured`, `endpoints`, `homepage`, `summary`, `tokenUsage`, `createdAt`. Normalises `meta.category` to the category enum the hub renders. Wires `solana.{rpcRequirements, capabilities, metaplexSkills, programDeps, walletRequirements}` per agent profile.
- [`scripts/patch-agents.cjs`](./scripts/patch-agents.cjs) — cosmetic pass for summary punctuation + restore `featured: true` on flagship Solana agents.

Result (April 2026 snapshot — regenerate any time with `node build-catalog.cjs`):

| Stat                          | Value                |
| ----------------------------- | -------------------- |
| Total agents                  | **52**               |
| One-shots (on the hub rail)   | **41**               |
| Featured (top-of-page)        | **21**               |
| Metaplex-enabled              | **50**               |
| Trading-capable (swap-execution) | **12**            |
| Launch-capable (Genesis / bonding curve / agent token) | **1** (Mayhem Mode) |
| Mint-capable (Core / Bubblegum / Candy Machine) | **2** |
| Categories                    | 10 (see below)       |
| Templates                     | 5                    |

- **CLAWD Router integration**: every agent exposes `endpoints.a2a` (`POST /api/agents/a2a`), `endpoints.mint-as-agent` (`POST /api/agents/mint`), and `endpoints.catalog`. CLAWD holders get priority routing acknowledged in-prompt. See [`scripts/clawdify-agents.cjs`](./scripts/clawdify-agents.cjs) for per-agent profiles.
- **Solana-native systemRole preamble**: lamports/CU priority fees, Jito tip guidance, deny-first on signatures, "not financial advice" disclaimers baked in.
- **Per-agent `solana.programDeps`**: Jupiter, Kamino, Marinade, Drift, MarginFi, Meteora, Orca, Raydium, Realms, Wormhole, MPL Core / Token Metadata / Bubblegum / Candy Machine / Agent Registry, Jito Tip Router, SPL Stake, Sanctum.
- **Valid `$schema`**: [`https://www.x402.wtf/schemas/clawdAgentSchema.v1.json`](./schema/clawdAgentSchema.v1.json) applied across all schema-backed agents.

### New this release

- **Catalog + deploy flow** — [`agents-catalog.json`](./agents-catalog.json) aggregates all 53 agents with per-agent Install / Chat / Mint URLs. Served via `GET /api/agents/catalog` and rendered at [/agents](https://www.x402.wtf/agents) with one-shot badges, featured rail, category chips, and Metaplex capability filters.
- **21 featured agents** across the catalog. See the [Featured Rail](#-featured-rail-21-agents) table.
- **5 reusable templates** — `trading-agent`, `defi-analyst`, `screener`, `firecrawl-researcher`, `solana-attestation-agent`. Users supply a handful of variables; we generate a working agent config.
- **Metaplex skill baked in** — every agent in the catalog carries capability metadata for Agent Registry, Genesis, Core, Token Metadata, Bubblegum, and Candy Machine. The hub surfaces per-agent badges so users can filter by "can launch tokens" or "can mint NFTs".
- **Solana-native schema v1** — [`schema/clawdAgentSchema.v1.json`](./schema/clawdAgentSchema.v1.json) extends Sperax v1 with `solana.capabilities`, `solana.metaplexSkills`, `solana.programDeps`, `onchain`, `payment`, `agentToken`, `a2a`, `endpoints`, and `deploy` blocks.
- **Author/homepage rebrand** — every agent now points at `https://www.x402.wtf/agents/{id}` with `clawd` + `solana` tags.

---

## ✨ Key Features

- ✅ **53 Production-Ready Agents** — 42 one-shots + 11 research-only across DeFi, trading, NFTs, security, education, governance, analytics, dev-tools, research, and infrastructure
- ✅ **CLAWD Router Native** — every agent declares its `endpoints.a2a` + `mint-as-agent` + catalog routes for [x402.wtf/agents](https://www.x402.wtf/agents) and [ClawdRouter-main](../ClawdRouter-main/)
- ✅ **Metaplex Skill Native** — Agent Registry, Genesis, Core, Token Metadata, Bubblegum, Candy Machine capabilities baked into the schema
- ✅ **18 Languages** — Automated i18n translation workflow ([Learn More →](./docs/I18N_WORKFLOW.md))
- ✅ **RESTful JSON API + MCP** — `/api/agents/catalog` + Streamable HTTP MCP endpoint ([API Docs →](./docs/API.md))
- ✅ **Four deploy paths** — PR, self-host A2A, on-chain MPL Core mint, MCP-server-only ([Deployment →](./docs/DEPLOYMENT.md))
- ✅ **Universal JSON schema** — works with any AI platform that supports agent indexes
- ✅ **No Vendor Lock-in** — switch platforms without losing work
- ✅ **Open Source** — MIT licensed, fully transparent
- ✅ **CDN Hosted** — GitHub Pages + Vercel for fast global access

---

## 🚀 Quick Start

### Install the hub in any MCP client

```json
{
  "mcpServers": {
    "openclawd-agents": {
      "type": "http",
      "url": "https://modelcontextprotocol.name/mcp/defi-agents"
    }
  }
}
```

### Browse the catalog

```bash
# Full catalog (52 agents, 41 one-shots, 5 templates, Metaplex skill index)
curl https://www.x402.wtf/api/agents/catalog | jq '.stats'

# Single agent as pure JSON
curl https://www.x402.wtf/api/agents/catalog/clawd-mayhem-mode.json

# Single template (for programmatic instantiation)
curl https://www.x402.wtf/api/agents/templates/trading-agent.json
```

### For developers

```bash
git clone https://github.com/clawdsolana/OpenClawd.git
cd openclawd/agents
bun install
bun run format
bun run build                     # schema validate + i18n
node build-catalog.cjs            # regenerate agents-catalog.json
node scripts/clawdify-agents.cjs  # upgrade any legacy agent to Solana-native
node scripts/patch-agents.cjs     # cosmetic pass (summary + featured)
```

[Complete Development Workflow Guide →](./docs/WORKFLOW.md)

---

## 🏷️ Categories (10)

Every agent is filed into one of the valid categories the hub renders as filter chips. See `stats.byCategory` in the catalog for the live count.

| Category       | Icon | Focus                                           | Count |
| -------------- | ---- | ----------------------------------------------- | ----- |
| **defi**       | 💰   | Yield, lending, LP, stablecoins, ve-models      | 12    |
| **trading**    | 📈   | Routing, alpha, airdrops, memecoins             | 6     |
| **analytics**  | 📊   | Portfolios, treasuries, revenue, whales, unlocks | 11    |
| **security**   | 🛡️   | Risk scoring, audits, liquidation, MEV, wallets | 8     |
| **education**  | 📚   | Onboarding, yield math, staking, L1-vs-L2       | 6     |
| **dev-tools**  | 🛠️   | Priority-fee math, SDK expertise, dashboards, paid API tooling | 4     |
| **governance** | 🗳️   | Realms, proposals, delegation                   | 2     |
| **nft**        | 🎨   | MPL Core launches, NFT liquidity                | 2     |
| **research**   | 🔎   | Web research, crawl, and sourced summaries      | 1     |
| **infrastructure** | 🏗️ | Domains, identity, IPFS, DNSLink, service rails | 1     |

---

## ⭐ Featured Rail (21 agents)

These surface at the top of [x402.wtf/agents](https://www.x402.wtf/agents). All are `oneShot: true` and `featured: true`, meaning CLAWD holders can Install / Chat / Mint them in one click.

| Agent | Avatar | Category | Purpose |
| ----- | ------ | -------- | ------- |
| [CLAWD Mayhem Mode](./src/clawd-mayhem-mode.json) | 💀 | trading | Full-stack combat: trades, deploys tokens, launches, mints NFTs, orchestrates Metaplex end-to-end |
| [CLAWD Firecrawl Researcher](./src/clawd-firecrawl.json) | 🔥 | research | Web research agent backed by Firecrawl: scrape, search, map, and crawl any site |
| [.clawd Web3 Domain Agent](./src/clawd-web3-domain-agent.json) | . | infrastructure | Mint and operate OpenClawd-native web3 identities backed by IPFS, DNSLink, x402, and holder-gated agent features |
| [CLAWD × Pump.fun Official](./src/clawd-pumpfun-official.json) | 🎰 | trading | Payment-gated random-number generator + premium pump.fun screening (0.1 SOL via `@pump-fun/agent-payments-sdk`) |
| [Solana Jupiter Router](./src/solana-jupiter-router.json) | 🪐 | trading | Best-route swap optimiser with price impact, slippage, priority fee math |
| [Solana Kamino Vault Picker](./src/solana-kamino-picker.json) | 🏦 | defi | Lending / Multiply / Liquidity vault picker with net APY + liquidation math |
| [Solana Validator Picker](./src/solana-validator-picker.json) | ⚡ | education | Validator + LST picker with commission/uptime/decentralisation thresholds |
| [Solana Pump.fun Rug Screener](./src/solana-pumpfun-screener.json) | 🧪 | security | Skeptical-by-default rug-pull risk scoring with evidence links |
| [Solana MPL Core Launcher](./src/solana-mpl-core-launcher.json) | 🎨 | nft | MPL Core collection launch consultant with plugin selection + Arweave pinning |
| [CLAWD Portfolio Tracker](./src/clawd-portfolio-tracker.json) | 💼 | analytics | Helius-DAS-driven portfolio view across CLAWD, SPL, LPs, staked SOL / LSTs |
| [CLAWD Yield Aggregator](./src/clawd-yield-aggregator.json) | 🌾 | defi | Net APY across Kamino, MarginFi, Drift, Meteora, Sanctum, Jupiter Perp LP |
| [CLAWD Liquidity Strategist](./src/clawd-liquidity-strategist.json) | 💧 | defi | DLMM range design, IL math, rebalance cadence on Meteora / Orca / Raydium |
| [CLAWD Risk Monitor](./src/clawd-risk-monitor.json) | ⚠️ | security | Liquidation distance, oracle drift, pool depeg, upgrade-authority alerts |
| [CLAWD Onboarding Guide](./src/clawd-onboarding-guide.json) | 🎓 | education | New-holder walkthrough: wallets → first SOL → CLAWD buy → staking → /agents |
| [Alpha Leak Detector](./src/alpha-leak-detector.json) | 🎯 | trading | Smart-money flows, new pump.fun bonding curves, Jito bundle patterns |
| [DeFi Yield Farmer](./src/defi-yield-farmer.json) | 🚜 | defi | Real net APY after emission decay, Kamino Multiply loops, Drift earn |
| [DEX Aggregator Optimizer](./src/dex-aggregator-optimizer.json) | 🔀 | trading | Jupiter v6 plus direct Meteora/Orca/Raydium quotes, TWAP/split suggestions |
| [Liquidation Risk Manager](./src/liquidation-risk-manager.json) | 🚨 | security | Kamino Multiply / Drift / MarginFi liquidation distance + stress tests |
| [Portfolio Rebalancing Advisor](./src/portfolio-rebalancing-advisor.json) | ♻️ | analytics | Tax-aware rebalance across SOL / stables / LSTs / CLAWD via Jupiter routes |
| [Pump.fun SDK Expert](./src/pump-fun-sdk-expert.json) | 🛠️ | dev-tools | `@pump-fun/agent-payments-sdk` / x402 / solana-pay scaffolding |
| [Wallet Security Advisor](./src/wallet-security-advisor.json) | 🔐 | security | Ledger seed handling, blind-sign risk, drainer patterns, revoke & scan flows |

---

## 🎯 Full One-Shot Rail (41 agents)

Any agent with `oneShot: true` surfaces on the `/agents` deploy rail. Beyond the 21 featured, the additional 21 one-shots are:

`airdrop-hunter`, `apy-vs-apr-educator`, `bridge-security-analyst`, `clawd-bridge-assistant`, `clawd-governance-guide`, `defi-onboarding-mentor`, `defi-protocol-comparator`, `defi-risk-scoring-engine`, `gas-optimization-expert`, `governance-proposal-analyst`, `impermanent-loss-calculator`, `layer2-comparison-guide`, `liquidity-pool-analyzer`, `mev-protection-advisor`, `nft-liquidity-advisor`, `pay-agent`, `stablecoin-comparator`, `staking-rewards-calculator`, `whale-watcher`, `yield-dashboard-builder`, `yield-sustainability-analyst`.

---

## 🧩 Templates

Pick a template, fill a few variables, get a working agent:

| Template | Avatar | Variables |
| -------- | ------ | --------- |
| [trading-agent](./templates/trading-agent.template.json) | 📈 | `AGENT_TITLE`, `SCOPE_DESCRIPTION`, `RISK_STYLE`, `OPENING_MESSAGE` |
| [defi-analyst](./templates/defi-analyst.template.json)   | 📊 | `AGENT_TITLE`, `TARGET_PROTOCOL`, `SECONDARY_PROTOCOLS`, `AUDIT_STATUS` |
| [screener](./templates/screener.template.json)           | 🛡️ | `AGENT_TITLE`, `TARGET_ASSET_TYPE`, `CHECK_LIST`, `HARD_PASS_THRESHOLD` |
| [firecrawl-researcher](./templates/firecrawl-researcher.template.json) | 🔥 | `AGENT_TITLE`, `PRIMARY_DOMAIN`, `SECONDARY_DOMAINS`, `RESEARCH_GOAL`, `MAX_CRAWL_PAGES` |
| [solana-attestation-agent](./templates/solana-attestation-agent.template.json) | 🪪 | `AGENT_TITLE`, `CREDENTIAL_AUTHORITY`, `CREDENTIAL_NAME`, `RPC_URL`, `VAULT_ADDRESS` |

Use via the hub UI (`/agents/mint?fromTemplate=<id>`) or programmatically:

```bash
curl https://www.x402.wtf/api/agents/templates/trading-agent.json
```

---

## 🎨 Metaplex Skill Coverage

Every schema-backed agent in the catalog declares Metaplex capabilities via `solana.metaplexSkills`. The hub renders these as badges; the runtime uses them to scope delegated asset-signer permissions on minted agents. 50 agents currently carry at minimum `agent-registry` so they are mintable as CLAWD on-chain agents.

| Program | Skill ID | What it unlocks |
| ------- | -------- | --------------- |
| **Agent Registry** | `agent-registry` | On-chain agent identity, delegation, execution via MPL Core asset-signer PDAs |
| **Genesis**        | `genesis`        | Token launches — launchpool (48h deposit) or bonding curve auto-graduating to Raydium CPMM |
| **Core**           | `core`           | Next-gen NFTs with plugins, royalty enforcement, asset-signer execute hooks |
| **Token Metadata** | `token-metadata` | Classic fungibles, NFTs, pNFTs, editions |
| **Bubblegum**      | `bubblegum`      | Compressed NFTs via Merkle trees — 10k+ mint scale, needs DAS-enabled RPC |
| **Candy Machine**  | `candy-machine`  | Core Candy Machine drops with allowlists, start/end, mint limits, payment guards |

Install the official Metaplex Skill alongside the Clawd hub in any compatible agent:

```bash
npx skills add metaplex-foundation/skill
```

Or add the hosted MCP endpoint:

```json
{
  "mcpServers": {
    "metaplex": {
      "type": "http",
      "url": "https://modelcontextprotocol.name/mcp/metaplex"
    }
  }
}
```

**CLAWD Mayhem Mode** already has the full skill stack pre-configured — install it once and you have trading + deployment + launch + mint in a single agent.

---

## 🌍 Multi-Language Support

All 52 agents are cataloged for 18-language distribution:

🇺🇸 English・🇨🇳 简体中文・🇹🇼 繁體中文・🇯🇵 日本語・🇰🇷 한국어・🇩🇪 Deutsch・🇫🇷 Français・🇪🇸 Español・🇷🇺 Русский・🇸🇦 العربية・🇵🇹 Português・🇮🇹 Italiano・🇳🇱 Nederlands・🇵🇱 Polski・🇻🇳 Tiếng Việt・🇹🇷 Türkçe・🇸🇪 Svenska・🇮🇩 Bahasa Indonesia

---

## 🛠️ API Reference

### Catalog + single agent / template endpoints (dynamic)

```bash
# Full catalog
GET  https://www.x402.wtf/api/agents/catalog

# Single agent as raw JSON
GET  https://www.x402.wtf/api/agents/catalog/{identifier}.json

# Single template
GET  https://www.x402.wtf/api/agents/templates/{templateId}.json

# Hosted agent registry (includes externally-registered A2A agents)
GET  https://www.x402.wtf/api/agents/hosted

# Agent-to-agent JSON-RPC
POST https://www.x402.wtf/api/agents/a2a

# Mint agent on-chain as MPL Core asset
POST https://www.x402.wtf/api/agents/mint
```

### Static CDN endpoints (localized, cached)

```bash
GET https://clawd.click/index.json
GET https://clawd.click/{agent-id}.json
GET https://clawd.click/{agent-id}.{locale}.json
GET https://clawd.click/index.{locale}.json
GET https://clawd.click/agents-manifest.json
```

### Quick Integration

```javascript
// Load the catalog and filter to one-shots
const catalog = await fetch('https://www.x402.wtf/api/agents/catalog').then((r) => r.json());

console.log(`${catalog.stats.totalAgents} agents, ${catalog.stats.totalOneShots} one-shots`);
console.log(`${catalog.stats.metaplexEnabledAgents} agents with Metaplex capabilities`);

// Filter by Metaplex capability
const launchCapable = catalog.agents.filter((a) =>
  a.capabilities.includes('metaplex-launch-token-genesis') ||
  a.capabilities.includes('metaplex-launch-bonding-curve'),
);

// Deploy into CLAWD Router
const router = await fetch('/api/agents/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'invoke',
    params: { identifier: 'solana-jupiter-router', input: 'Swap 10 SOL for USDC' },
  }),
}).then((r) => r.json());
```

[Full API Documentation →](./docs/API.md)

---

## 🤖 Contributing an Agent

Four paths to getting live on [x402.wtf/agents](https://www.x402.wtf/agents):

| Path                        | Best for                                  | Result                                             |
| --------------------------- | ----------------------------------------- | -------------------------------------------------- |
| **1. PR into the repo**     | Simple, static agent prompts              | Auto-hosted on CDN + hub + 18 locales              |
| **2. Self-host + A2A**      | Custom logic, private tools, streaming    | Your infra, discoverable via hub                   |
| **3. Mint as MPL Core**     | On-chain identity, transferable ownership | Registered on Solana, listed at `/agents/registry` |
| **4. MCP server only**      | Tool provider for Clawd Desktop / Cursor | Endpoint listed in MCP catalog                     |

### Path 1 — Quick Submit via PR

1. **Fork** this repo
2. **Create your agent** in [`src/your-agent-name.json`](./src/) using the [clawdAgentSchema.v1](./schema/clawdAgentSchema.v1.json) schema
3. **Run the transforms** — `node scripts/clawdify-agents.cjs` to upgrade any legacy fields, then `node build-catalog.cjs` to regenerate the catalog
4. **Submit a PR**

Minimal agent JSON:

```json
{
  "$schema": "https://www.x402.wtf/schemas/clawdAgentSchema.v1.json",
  "author": "your-github-or-solana-handle",
  "identifier": "your-agent-name",
  "schemaVersion": 1,
  "createdAt": "2026-04-16",
  "homepage": "https://www.x402.wtf/agents/your-agent-name",
  "oneShot": true,
  "featured": false,
  "config": {
    "systemRole": "You are a specialist inside Solana Clawd — a Solana-native AI agent stack...",
    "openingMessage": "...",
    "openingQuestions": ["...", "..."]
  },
  "meta": {
    "title": "Your Agent Title",
    "description": "Clear, concise description (max 300 chars)",
    "avatar": "🤖",
    "tags": ["solana", "clawd", "..."],
    "category": "defi"
  },
  "solana": {
    "rpcRequirements": ["das-api"],
    "capabilities": ["read-only", "a2a-message"],
    "metaplexSkills": ["agent-registry"],
    "programDeps": [],
    "walletRequirements": { "needsSigner": false }
  },
  "endpoints": {
    "a2a": "POST /api/agents/a2a",
    "mint-as-agent": "POST /api/agents/mint",
    "catalog": "GET /api/agents/catalog/your-agent-name.json"
  }
}
```

### Quality Guidelines

- ✅ Specific to a Solana protocol / domain
- ✅ Solana-native vocabulary (lamports, CU, priority fees, Jito tips, PDAs)
- ✅ Output format is consistent and scannable
- ✅ Explicit risk framing (never promise yields, always disclose audit status)
- ✅ Tested with 10+ representative prompts
- ✅ `metaplexSkills` correctly declared
- ✅ `endpoints.a2a`, `mint-as-agent`, `catalog` wired for CLAWD Router

[Full Contributing Guide →](./docs/CONTRIBUTING.md)

---

## 📖 Documentation

### For Users

- [Agent Teams Guide](./docs/TEAMS.md) — Multi-agent collaboration patterns
- [FAQ](./docs/FAQ.md) — Common questions, answered
- [Examples](./docs/EXAMPLES.md) — Real-world worked agents
- [Keywords](./docs/KEYWORDS.md) — Discoverability terminology

### For Developers

- [Complete Workflow Guide](./docs/WORKFLOW.md) — End-to-end development process
- [Contributing Guide](./docs/CONTRIBUTING.md) — How to submit agents
- [API Reference](./docs/API.md) — Catalog + A2A + MCP surface
- [Agent Creation Guide](./docs/AGENT_GUIDE.md) — Schema + metadata + publishing
- [Deployment Guide](./docs/DEPLOYMENT.md) — Four paths: PR, self-host A2A, MPL Core mint, MCP-only
- [18 Languages i18n Workflow](./docs/I18N_WORKFLOW.md) — Automated translation
- [Prompt Engineering](./docs/PROMPTS.md) — Writing Solana-native prompts
- [Model Parameters](./docs/MODELS.md) — Temperature, reasoning effort, tuning by archetype
- [OpenRouter Setup](./docs/openrouter.md) — Model provider integration
- [SEO Strategy](./docs/SEO_STRATEGY.md) — How agents get discovered
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Common issues

---

## 🔧 Build Tooling

### Regenerate the catalog

```bash
node build-catalog.cjs
```

Reads `src/*.json` + `templates/*.template.json` → emits `agents-catalog.json`. Inlines Metaplex capability rollups, per-agent deploy URLs, and the shared `metaplexSkill` block the hub renders.

### Upgrade / re-clawdify agents

```bash
# Upgrade any legacy-format agents to Solana-native one-shot schema
node scripts/clawdify-agents.cjs

# Cosmetic pass (summary punctuation + preserve featured flag)
node scripts/patch-agents.cjs
```

Idempotent — already-upgraded files are detected via `$schema` + `solana` and skipped. Safe to re-run.

### Split / merge agent batches

```bash
node scripts/split-agents.cjs
```

---

## 🌐 Integration Examples

### React (catalog-driven gallery)

See [`client/src/components/AgentCatalog.tsx`](../client/src/components/AgentCatalog.tsx) for the live implementation.

```tsx
const catalog = await fetch('/api/agents/catalog').then((r) => r.json());

return catalog.oneShots.map((agent) => (
  <AgentCard
    key={agent.identifier}
    agent={agent}
    onInstall={() => copyMcpConfig(agent)}
    onChat={() => router.push(agent.deploy.chat)}
    onMint={() => router.push(agent.deploy.mint)}
  />
));
```

### Python

```python
import requests

catalog = requests.get('https://www.x402.wtf/api/agents/catalog').json()

# Filter to agents that can launch tokens
launchers = [a for a in catalog['agents']
             if 'metaplex-launch-bonding-curve' in a['capabilities']]

# Filter to featured Solana one-shots
featured_oneshots = [a for a in catalog['featured']]
```

### CLAWD Router invocation

```bash
curl -X POST https://www.x402.wtf/api/agents/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "invoke",
    "params": {
      "identifier": "solana-jupiter-router",
      "input": "Swap 10 SOL for USDC with tight slippage"
    }
  }'
```

---

## 🔐 Security & Privacy

- **No data collection** — static JSON index, zero tracking
- **Agents run wherever you install them** — local Clawd Desktop, your own infra, or MPL Core on Solana
- **Open source** — full transparency, audit every line
- **On-chain is verifiable** — minted agents live as MPL Core assets; update authority rules govern changes
- **Deny-first signing** — every agent's system prompt instructs deny-first behaviour on irreversible actions (swap, stake, mint); signatures require explicit user confirmation
- **Payment-gated agents** are transparent — see [CLAWD × Pump.fun Official](./src/clawd-pumpfun-official.json) for the reference pattern (wallet connect → 0.1 SOL on-chain → verify → deliver)
- **Pay agent workflows** stay sandbox-first — see [Pay Agent](./src/pay-agent.json) and [Pay Agents docs](../docs/pay-agents.md) for `pay --sandbox curl`, Pay MCP, provider discovery, and gateway setup.

---

## 📊 Catalog Stats (Live)

Regenerate any time with `node build-catalog.cjs`. Current snapshot (April 2026):

- **53 agents** across 10 categories
- **42 one-shots** surfaced on `/agents`
- **21 featured** in the top-of-page rail
- **50 Metaplex-enabled** (all carry `agent-registry` minimum)
- **12 trading-capable** with `swap-execution`
- **5 reusable templates**
- **18 languages** via automated translation
- **Launch-capable** (Genesis / bonding curve / agent token): `stats.launchCapableAgents`
- **Mint-capable** (Core / Bubblegum / Candy Machine): `stats.mintCapableAgents`

---

## 🔗 Projects Building with Solana Clawd Agents

- **ClawdOS** — [Application Branch](https://github.com/clawdsolana/OpenClawd/tree/clawdos)
- **CLAWD Terminal** — the parent repo hosting this hub + server + client
- **CLAWD Router** — [ClawdRouter-main/](../ClawdRouter-main/) powers agent dispatch with tier/holder-aware routing
- **CLAWD × Pump.fun** — payment-gated agent rails via `@pump-fun/agent-payments-sdk`

---

## 📜 License

MIT License — see [LICENSE](./LICENSE) for details.

**Open Source • Open Format • Open Future**

---

## 🌐 Live HTTP Deployment

The Solana Clawd Agents hub is also published over MCP [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) — no local installation required.

**Endpoint:**

```text
https://modelcontextprotocol.name/mcp/defi-agents
```

### Available MCP Tools (10)

| Tool                     | Description                       |
| ------------------------ | --------------------------------- |
| `get_price`              | Get crypto prices                 |
| `get_market_overview`    | Market overview                   |
| `get_trending`           | Trending coins                    |
| `search_coins`           | Search                            |
| `get_coin_detail`        | Coin details                      |
| `get_global_stats`       | Global stats                      |
| `get_defi_protocols`     | DeFi protocols by TVL             |
| `get_protocol_detail`    | Protocol detail                   |
| `get_chain_tvl`          | Chain TVL                         |
| `get_yield_opportunities`| Yield opportunities               |

### Example Requests

**Get crypto prices:**

```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_price","arguments":{"ids":"solana,jupiter-exchange-solana","vs_currencies":"usd"}}}'
```

**List all tools:**

```bash
curl -X POST https://modelcontextprotocol.name/mcp/defi-agents \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Also Available On

- **[ClawdOS](https://clawdos.vercel.app)** — browse and install from the [MCP marketplace](https://clawdos.vercel.app/community/mcp)
- **All 27 MCP servers** — see the full catalog at [modelcontextprotocol.name](https://modelcontextprotocol.name)

> Powered by [modelcontextprotocol.name](https://modelcontextprotocol.name) — the open MCP HTTP gateway

---

## 🛣️ Roadmap — Known Follow-ups

Tracked here so they don't get lost between sessions.

- **Metaplex Mint UI wiring.** The Mint button on every one-shot card already routes to `/agents/mint?template=<id>`. The mint page needs to: (1) read that query param, (2) fetch the agent JSON from `/api/agents/catalog/<id>.json`, (3) prefill name / description / avatar / systemRole / `services[]` derived from `solana.capabilities`, (4) hand the composed input to `trpc.metaplex.mintAgent`, (5) write back the returned `assetAddress` into the `onchain` block.
- **Per-agent Metaplex capability badges on `/agents` cards.** Schema + catalog data is ready; the AgentCatalog component renders a category chip row but not yet Metaplex badges.
- **Delegated asset-signer scoping.** Once an agent is minted, `solana.capabilities` should gate which instructions the asset-signer PDA is allowed to sign via the MPL Core Execute hook.
- **A2A streaming.** The hub's A2A endpoint is JSON-RPC over HTTP; SSE streaming for agent-to-agent dialogue is queued.
- **Template variable UI.** The 5 templates have structured `variables[]` — the mint page should render a form per variable instead of requiring users to edit JSON.
- **Router holder-tier priority.** CLAWD Router honours holder tiers in its `ClawRouteConfig`; next step is wiring priority fee + Jito tip defaults into per-tier presets on the agent deploy flow.
