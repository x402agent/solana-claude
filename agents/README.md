# 🤖 Solana Clawd Agents — Hub, Catalog, and Deploy API

> **134 production-ready AI agents for the Solana ecosystem — DeFi, payments, trading, governance, security, tools, analytics, research, infrastructure, NFT, and programming. The generated x402 catalog currently exposes 43 one-shot deploys, 23 featured agents, 5 templates, the REST catalog, the registry API, and the skills hub.**

A discoverable, self-hosting hub for Solana-native AI agents. Every agent in the [`src/`](./src/) directory is automatically indexed into a catalog ([`agents-catalog.json`](./agents-catalog.json)), served via REST and MCP, and surfaced at [x402.wtf/agents](https://x402.wtf/agents) with install / chat / mint buttons. Works with any MCP-compatible client — Clawd Desktop, Cursor, ClawdOS, Windsurf.

## 🦞 Verification Layer

The agent hub now sits directly on top of the new [`../attestation/README.md`](../attestation/README.md) verification surface.

That layer is what turns OpenClawd from a plain JSON catalog into a trust-bearing system:

- **skills** can carry formal proof hashes
- **agents** can be born with attested identity records
- **plugins** can be published with audit-backed attestation metadata
- **MCP servers** can eventually advertise verified tool-surface receipts

Key local verification surfaces:

- [`../attestation/README.md`](../attestation/README.md)
- [`./skills/solana-attestation-skill/`](./skills/solana-attestation-skill/)
- [`./agent-template-attested.json`](./agent-template-attested.json)
- [`../plugin.delivery/plugin-template-attested.json`](../plugin.delivery/plugin-template-attested.json)
- [`./templates/solana-attestation-agent.template.json`](./templates/solana-attestation-agent.template.json)

```text
skill → proof → attestation → registry → deploy rail
```

## 🔗 openclawd Ecosystem

| Surface              | URL                                                                           | Status             |
| -------------------- | ----------------------------------------------------------------------------- | ------------------ |
| **Agents hub**       | [x402.wtf/agents](https://x402.wtf/agents)                      | live               |
| **Mint page**        | [x402.wtf/agents/mint](https://x402.wtf/agents/mint)            | live (MPL Core)    |
| **Agent staking**    | [x402.wtf/agents/stake](https://x402.wtf/agents/stake)          | live (MPL Core FreezeDelegate) |
| **Registry**         | [x402.wtf/agents/registry](https://x402.wtf/agents/registry)    | live               |
| **Terminal**         | [x402.wtf/terminal](https://x402.wtf/terminal)                  | drops today        |
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

## 🆕 What's New (May 2026)

### Full Clawd-ification pass — every agent now Solana-native

The whole [`src/`](./src/) library was rewritten to match the CLAWD Router + CLAWD holder deploy flow used by [x402.wtf/agents](https://x402.wtf/agents). Two transform scripts drove the pass:

- [`scripts/clawdify-agents.cjs`](./scripts/clawdify-agents.cjs) — upgrades a legacy agent to the Solana-native one-shot schema. Strips the bulky "CLAWD IDENTITY / OUTPUT CONTRACT" boilerplate from `config.systemRole` and replaces it with a compact **Solana-native preamble** (lamports/CU, Jito tips, deny-first signing, Clawd Router context, MPL Core mint endpoint). Sets `$schema`, `oneShot`, `featured`, `endpoints`, `homepage`, `summary`, `tokenUsage`, `createdAt`. Normalises `meta.category` to the category enum the hub renders. Wires `solana.{rpcRequirements, capabilities, metaplexSkills, programDeps, walletRequirements}` per agent profile.
- [`scripts/patch-agents.cjs`](./scripts/patch-agents.cjs) — cosmetic pass for summary punctuation + restore `featured: true` on flagship Solana agents.

Result (May 2026 generated snapshot — regenerate any time with `node build-catalog.cjs`):

| Stat                          | Value                |
| ----------------------------- | -------------------- |
| Total agents                  | **134**              |
| One-shots (on the hub rail)   | **43**               |
| Featured (top-of-page)        | **23**               |
| Metaplex-enabled              | **51** in the generated catalog rollup |
| Trading-capable (swap-execution) | **12** in the generated catalog rollup |
| Launch-capable (Genesis / bonding curve / agent token) | **1** in the generated catalog rollup |
| Mint-capable (Core / Bubblegum / Candy Machine) | **2** in the generated catalog rollup |
| Categories                    | 11 (see below)       |
| Templates                     | 5                    |

- **CLAWD Router integration**: every agent exposes `endpoints.a2a` (`POST /api/agents/a2a`), `endpoints.mint-as-agent` (`POST /api/agents/mint`), and `endpoints.catalog`. CLAWD holders get priority routing acknowledged in-prompt. See [`scripts/clawdify-agents.cjs`](./scripts/clawdify-agents.cjs) for per-agent profiles.
- **Solana-native systemRole preamble**: lamports/CU priority fees, Jito tip guidance, deny-first on signatures, "not financial advice" disclaimers baked in.
- **Per-agent `solana.programDeps`**: Jupiter, Kamino, Marinade, Drift, MarginFi, Meteora, Orca, Raydium, Realms, Wormhole, MPL Core / Token Metadata / Bubblegum / Candy Machine / Agent Registry, Jito Tip Router, SPL Stake, Sanctum.
- **Valid `$schema`**: [`https://x402.wtf/schemas/clawdAgentSchema.v1.json`](./schema/clawdAgentSchema.v1.json) applied across all schema-backed agents.

### New this release

- **Catalog + deploy flow** — [`agents-catalog.json`](./agents-catalog.json) aggregates all 134 agents with per-agent Install / Chat / Mint URLs where declared. Served via `GET /api/agents/catalog` and rendered at [/agents](https://x402.wtf/agents) with one-shot badges, featured rail, and category chips.
- **23 featured agents** across the catalog and **43 one-shots** on the deploy rail.
- **Template registry live** — the generated catalog now emits **5 templates** from [`templates/`](./templates/), plus a dedicated template index at [`templates/index.json`](./templates/index.json).
- **Skills hub live** — [`skills/index.json`](./skills/index.json) now exposes the OpenClawd skill registry with formal-verification metadata and a published skill schema.
- **Attestation layer live** — [`../attestation/README.md`](../attestation/README.md) now vendors the Solana Attestation Service and maps it onto skills, agents, plugins, and MCP server verification flows.
- **Metaplex skill baked in** — every agent in the catalog carries capability metadata for Agent Registry, Genesis, Core, Token Metadata, Bubblegum, and Candy Machine. The hub surfaces per-agent badges so users can filter by "can launch tokens" or "can mint NFTs".
- **Solana-native schema v1** — [`schema/clawdAgentSchema.v1.json`](./schema/clawdAgentSchema.v1.json) extends Sperax v1 with `solana.capabilities`, `solana.metaplexSkills`, `solana.programDeps`, `onchain`, `payment`, `agentToken`, `a2a`, `endpoints`, and `deploy` blocks.
- **Author/homepage rebrand** — every agent now points at `https://x402.wtf/agents/{id}` with `clawd` + `solana` tags.

---

## ✨ Key Features

- ✅ **134 Production-Ready Agents** — across DeFi, payments, trading, governance, security, tools, analytics, research, infrastructure, NFT, and programming
- ✅ **CLAWD Router Native** — every agent declares its `endpoints.a2a` + `mint-as-agent` + catalog routes for [x402.wtf/agents](https://x402.wtf/agents) and [ClawdRouter-main](../ClawdRouter-main/)
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
# API root
curl https://x402.wtf/api/agents | jq .

# Full catalog (134 agents, 43 one-shots, 23 featured, 5 templates)
curl https://x402.wtf/api/agents/catalog | jq '.stats'

# Single agent as pure JSON
curl https://x402.wtf/api/agents/catalog/solana-pumpfun-bot.json

# Template index
curl https://x402.wtf/api/agents/templates/index.json | jq '.stats'

# Skills hub index
curl https://x402.wtf/api/skills/index.json | jq '.stats'

# Registry
curl https://x402.wtf/api/agents/registry | jq .
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

## 🗂️ Agent Catalog

The live catalog is the canonical machine-readable surface for the site:

- [`agents-catalog.json`](./agents-catalog.json) — full generated agent catalog
- [`templates/index.json`](./templates/index.json) — reusable agent template index
- [`skills/index.json`](./skills/index.json) — OpenClawd skills hub with verification metadata
- [`agents-manifest.json`](./agents-manifest.json) — discovery manifest for crawlers and clients
- [`../attestation/README.md`](../attestation/README.md) — SAS-backed verification layer for skills, agents, plugins, and MCP servers

Public endpoints:

- `GET /api/agents/catalog`
- `GET /api/agents/templates/index.json`
- `GET /api/skills/index.json`
- `GET /api/agents/registry`

## 🏷️ Categories (11)

Every agent is filed into one of the valid categories the hub renders as filter chips. See `stats.byCategory` in the catalog for the live count.

| Category       | Icon | Focus                                           | Count |
| -------------- | ---- | ----------------------------------------------- | ----- |
| **defi**       | 💰   | Yield, lending, LP, staking, perps, swaps       | 66    |
| **payments**   | 💸   | x402, USDC rails, settlement, paid APIs         | 25    |
| **trading**    | 📈   | Routing, alpha, airdrops, memecoins             | 8     |
| **security**   | 🛡️   | Risk scoring, audits, wallet safety             | 8     |
| **education**  | 📚   | Onboarding and explainers                       | 6     |
| **analytics**  | 📊   | Dashboards, trackers, portfolio analytics       | 11    |
| **research**   | 🔎   | Web and market research                         | 1     |
| **governance** | 🗳️   | Realms, proposals, delegation                   | 2     |
| **infrastructure** | 🏗️ | Attestation, runtime, platform services      | 1     |
| **dev-tools**  | 🛠️   | Developer and operator tooling                  | 4     |
| **nft**        | 🎨   | NFT tooling and launch surfaces                 | 2     |

---

## ⭐ Featured Rail

These surface at the top of [x402.wtf/agents](https://x402.wtf/agents). They are generated directly from `agents-catalog.json`.

| Agent | Avatar | Category | Purpose |
| ----- | ------ | -------- | ------- |
| [Solana PumpFun Bot](./src/solana-pumpfun-bot.json) | 🚀 | defi | Pump.fun launch and trading automation surface imported from ClawdBrowser. |
| [Solana Vulcan Clawd Autonomous Perps](./src/solana-vulcan-clawd-autonomous-perps.json) | 🦞 | trading | Phoenix/Vulcan perps automation surface for autonomous trading workflows. |

---

## 🎯 Full One-Shot Rail

Any agent with `oneShot: true` surfaces on the `/agents` deploy rail. The current generated catalog exposes **43 one-shots**.

---

## 🧩 Templates

The generated snapshot emits **5 templates**:

- `defi-analyst`
- `firecrawl-researcher`
- `screener`
- `solana-attestation-agent`
- `trading-agent`

---

## 🎨 Metaplex Skill Coverage

Schema-backed agents may declare Metaplex capabilities via `solana.metaplexSkills`. The hub renders these as badges; the runtime uses them to scope delegated asset-signer permissions on minted agents. The current generated catalog rollup reports **51 Metaplex-enabled agents**.

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

All generated agent indexes are cataloged for 18-language distribution:

🇺🇸 English・🇨🇳 简体中文・🇹🇼 繁體中文・🇯🇵 日本語・🇰🇷 한국어・🇩🇪 Deutsch・🇫🇷 Français・🇪🇸 Español・🇷🇺 Русский・🇸🇦 العربية・🇵🇹 Português・🇮🇹 Italiano・🇳🇱 Nederlands・🇵🇱 Polski・🇻🇳 Tiếng Việt・🇹🇷 Türkçe・🇸🇪 Svenska・🇮🇩 Bahasa Indonesia

---

## 🛠️ API Reference

### Catalog + single agent / registry endpoints

```bash
# API root
GET  https://x402.wtf/api/agents

# Full catalog
GET  https://x402.wtf/api/agents/catalog

# Single agent as raw JSON
GET  https://x402.wtf/api/agents/catalog/{identifier}.json

# Generated registry
GET  https://x402.wtf/api/agents/registry

# Template route reserved; current generated snapshot emits 0 templates
# GET  https://x402.wtf/api/agents/templates/{templateId}.json

# Hosted agent registry (includes externally-registered A2A agents)
GET  https://x402.wtf/api/agents/hosted

# Agent-to-agent JSON-RPC
POST https://x402.wtf/api/agents/a2a

# Mint agent on-chain as MPL Core asset
POST https://x402.wtf/api/agents/mint
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
const catalog = await fetch('https://x402.wtf/api/agents/catalog').then((r) => r.json());

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

Four paths to getting live on [x402.wtf/agents](https://x402.wtf/agents):

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
  "$schema": "https://x402.wtf/schemas/clawdAgentSchema.v1.json",
  "author": "your-github-or-solana-handle",
  "identifier": "your-agent-name",
  "schemaVersion": 1,
  "createdAt": "2026-04-16",
  "homepage": "https://x402.wtf/agents/your-agent-name",
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

catalog = requests.get('https://x402.wtf/api/agents/catalog').json()

# Filter to agents that can launch tokens
launchers = [a for a in catalog['agents']
             if 'metaplex-launch-bonding-curve' in a['capabilities']]

# Filter to featured Solana one-shots
featured_oneshots = [a for a in catalog['featured']]
```

### CLAWD Router invocation

```bash
curl -X POST https://x402.wtf/api/agents/a2a \
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

Regenerate any time with `node build-catalog.cjs`. Current snapshot (May 2026):

- **124 agents** across 9 categories
- **1 one-shot** surfaced on `/agents`
- **2 featured** in the top-of-page rail
- **0 Metaplex-enabled** in the generated catalog rollup
- **0 trading-capable** in the generated catalog rollup
- **0 reusable templates**
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
- **Template variable UI.** Template JSON is currently not emitted; when `templates/*.template.json` returns, the mint page should render a form per variable instead of requiring users to edit JSON.
- **Router holder-tier priority.** CLAWD Router honours holder tiers in its `ClawRouteConfig`; next step is wiring priority fee + Jito tip defaults into per-tier presets on the agent deploy flow.
