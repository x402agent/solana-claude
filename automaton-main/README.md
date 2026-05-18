<div align="center">

![Crustacean Automation](assets/banner.svg)

# Crustacean Automation

**Sovereign lobster-themed AI agent runtime and operator dashboard for Solana-native automation.**

Part of the [OpenClawd](https://github.com/x402agent/openclawd) framework.

[![npm version](https://img.shields.io/npm/v/clawd-automaton?color=ff4444&label=clawd-automaton&logo=npm&style=for-the-badge)](https://www.npmjs.com/package/clawd-automaton)
[![License: MIT](https://img.shields.io/badge/License-MIT-7b2fff?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-00d4ff?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Built with pnpm](https://img.shields.io/badge/pnpm-workspace-f69220?style=for-the-badge&logo=pnpm)](https://pnpm.io)

```text
The shell molts. The laws do not. 🦞
```

</div>

---

## What it does

`clawd-automaton` is the sovereign agent runtime for CLAWD Cloud. It provisions identities, runs OODA loops, manages sandbox lifecycle, handles replication/spawning, and persists operator state — all locally, all yours.

| Module | Description |
| ------ | ----------- |
| `agent/` | Core OODA loop and decision cycle |
| `identity/` | Operator identity provisioning and key management |
| `state/` | SQLite-backed local persistence |
| `heartbeat/` | Health monitoring and status reporting |
| `replication/` | Spawn and replicate agent instances |
| `ooda/` | Observe-Orient-Decide-Act automation cycle |
| `self-mod/` | Runtime self-update and version management |
| `survival/` | Resilience and recovery mechanisms |
| `skills/` | Pluggable skill loader from `~/.automaton/skills/` |

---

## Install

```bash
# Global CLI
npm install -g clawd-automaton

# Or as a library
npm install clawd-automaton
```

---

## Run

```bash
clawd-automaton --help
clawd-automaton --run
clawd-automaton --status
clawd-automaton --goblin
```

Or without a global install:

```bash
npx clawd-automaton --help
```

---

## Quick start (from source)

```bash
git clone https://github.com/x402agent/openclawd.git
cd openclawd/automaton-main
pnpm install
pnpm build
clawd-automaton --help
```

Or use the one-shot bootstrap:

```bash
bash leviathan.sh
```

Both `leviathan.sh` and `quickstart.sh` link `dist/index.js` to `~/.local/bin/clawd-automaton` so the CLI is usable after a source install. If `~/.local/bin` is not on your `PATH`, add it in your shell profile.

---

## Adjacent Layers

This runtime now sits beside two new first-class sibling surfaces in the repo:

- [`../attestation/README.md`](../attestation/README.md) — vendored Solana Attestation Service program, generated clients, IDL, and integration tests for formally verified skills, agents, and plugins
- [`../operator/README.md`](../operator/README.md) — OpenClawd Operator, the iterative agent-command loop that carries the Llobster Legend orchestration path forward under the OpenClawd banner

The attestation path is wired into this runtime through:

- [`../agents/skills/solana-attestation-skill/`](../agents/skills/solana-attestation-skill/)
- [`../agents/agent-template-attested.json`](../agents/agent-template-attested.json)
- [`../plugin.delivery/plugin-template-attested.json`](../plugin.delivery/plugin-template-attested.json)
- [`../agents/templates/solana-attestation-agent.template.json`](../agents/templates/solana-attestation-agent.template.json)

This is not just an agent-identity path. The verification layer is designed to sign and surface:

- formally verified **skills**
- attested **agents**
- audited **plugins**
- verified **MCP servers**

The runtime is where those surfaces become operational. The attestation layer is where they become provable.

---

## Runtime API surface

| Variable | Description |
| -------- | ----------- |
| `CLAWD_API_URL` | Runtime API (default: `https://api.x402.wtf`) |
| `CLAWD_API_KEY` | API authentication key |
| `CLAWD_SANDBOX_ID` | Sandbox instance identifier |
| `SOLANA_RPC_URL` | Solana RPC endpoint |
| `DFLOW_API_KEY` | DFlow trading API key |
| `VULCAN_BIN` | Path to Vulcan perps CLI binary |

---

## CLI commands

```bash
# Run the OODA automation loop
clawd-automaton --run

# Show runtime status
clawd-automaton --status

# Interactive setup wizard
clawd-automaton --setup

# Initialize wallet + config
clawd-automaton --init

# Provision API key via SIWE
clawd-automaton --provision

# Devnet paper Goblin OODA trading mode
clawd-automaton --goblin
```

---

## Dashboard

The workspace includes `clawd-dashboard` — a React + Vite + React Three Fiber control plane:

```bash
# Dev server
pnpm dashboard:dev

# Production build
pnpm dashboard:build
```

Dashboard includes:

- CLAWD Cloud sandbox overview
- Inference playground shell
- Billing and reserve management
- `pay.sh` and `$CLAWD` funding UX
- Lobster/trench 3D visual theming

---

## Agent + Skill Registry

This runtime now ships against three distinct catalog surfaces in the sibling [`agents`](../agents) workspace:

- [`../agents/agents-catalog.json`](../agents/agents-catalog.json) — the site-facing agent catalog
- [`../agents/agents-manifest.json`](../agents/agents-manifest.json) — route/access manifest for agents, templates, and skills
- [`../agents/templates/index.json`](../agents/templates/index.json) — the new template registry
- [`../agents/skills/index.json`](../agents/skills/index.json) — the formal skill hub with verification metadata
- [`../agents/skills/README.md`](../agents/skills/README.md) — the broader local skill library, documented one-by-one
- [`../agents/skills/skill-schema.v1.json`](../agents/skills/skill-schema.v1.json) — the formal verification schema for skills

Current generated catalog state:

- `134` agents
- `43` one-shots
- `23` featured agents
- `5` templates
- `20` formalized skill-hub entries
- `115` top-level local skills with `SKILL.md`

The important distinction is:

- `agents-catalog.json` is the public agent registry used by the site
- `templates/index.json` is the reusable agent-template registry
- `skills/index.json` is the machine-readable, schema-backed skill hub
- `skills/README.md` is the expanded operator-facing skill directory

---

## Template Registry

The new template registry is published from [`../agents/templates`](../agents/templates) and currently includes:

| Template | File | Purpose |
| -------- | ---- | ------- |
| `defi-analyst` | [`../agents/templates/defi-analyst.template.json`](../agents/templates/defi-analyst.template.json) | DeFi protocol analyst with yield math, liquidation thresholds, and audit-aware risk analysis |
| `firecrawl-researcher` | [`../agents/templates/firecrawl-researcher.template.json`](../agents/templates/firecrawl-researcher.template.json) | Domain-locked Firecrawl research agent with sourced summaries |
| `screener` | [`../agents/templates/screener.template.json`](../agents/templates/screener.template.json) | Skeptical Solana risk screener for launches, protocols, and collections |
| `solana-attestation-agent` | [`../agents/templates/solana-attestation-agent.template.json`](../agents/templates/solana-attestation-agent.template.json) | OpenClawd spawn notary for SAS credentials, schemas, MPL Core minting, and verification flows |
| `trading-agent` | [`../agents/templates/trading-agent.template.json`](../agents/templates/trading-agent.template.json) | Solana trading agent with Jupiter routing, slippage, priority fee, and Jito-aware guidance |

The attestation template is the bridge into the formal verification path: it defines the on-chain skill and agent identity schemas used to graduate skills from plain local instructions into verifiable registry entries.

---

## Formal Skill Hub

The generated skill hub lives at [`../agents/skills/index.json`](../agents/skills/index.json). It is the machine-readable registry for skills that have normalized metadata, category assignment, and formal verification fields.

The intended graduation path is:

```text
local skill → generated skill hub → proof_hash → SAS attestation → trusted runtime surface
```

Every current entry is cataloged below one by one:

| Skill | Category | Verification | Purpose |
| ----- | -------- | ------------ | ------- |
| `pump-admin-ops` | `pump-protocol` | `pending` | Pump protocol admin and authority operations |
| `pump-ai-agents` | `pump-protocol` | `pending` | AI-agent integration layer and MCP-facing context for Pump |
| `pump-bonding-curve` | `pump-protocol` | `pending` | Bonding-curve pricing, fee math, and reserve logic |
| `pump-build-release` | `pump-protocol` | `pending` | Pump SDK build, release, and distribution pipeline |
| `pump-claims-readonly` | `pump-protocol` | `pending` | Read-only claims, fees, rewards, and balance inspection |
| `pump-fee-sharing` | `pump-protocol` | `pending` | Creator fee-share configuration and allocation |
| `pump-fee-system` | `pump-protocol` | `pending` | Protocol fee arithmetic and collection logic |
| `pump-mcp-server` | `pump-protocol` | `pending` | MCP server surface for Pump tools, resources, and prompts |
| `pump-rust-vanity` | `pump-protocol` | `pending` | High-performance Rust vanity-address generation |
| `pump-sdk-core` | `typescript` | `pending` | Core offline-first Pump TypeScript SDK |
| `pump-security` | `security` | `pending` | Security hardening and audit checklist for Pump codepaths |
| `pump-shell-scripts` | `pump-protocol` | `pending` | Production Bash operations for Pump and Solana tooling |
| `pump-solana-architecture` | `solana-dev` | `pending` | PDA/account-layout architecture across Pump programs |
| `pump-solana-dev` | `solana-dev` | `pending` | Solana development patterns used in Pump SDK |
| `pump-solana-wallet` | `wallet` | `pending` | Secure wallet generation and handling patterns |
| `pump-testing` | `pump-protocol` | `pending` | Multi-language tests, fuzzing, benches, and CI quality gates |
| `pump-token-incentives` | `pump-protocol` | `pending` | Volume-based PUMP reward and incentive system |
| `pump-token-lifecycle` | `pump-protocol` | `pending` | Token creation through graduation and AMM migration |
| `pump-ts-vanity` | `typescript` | `pending` | Educational TypeScript vanity generator |
| `sponge-wallet` | `wallet` | `pending` | Wallet, swaps, bridges, and x402-paid external service access |

Formal verification metadata is defined in [`../agents/skills/skill-schema.v1.json`](../agents/skills/skill-schema.v1.json), and the attestation path is designed to be completed by the `solana-attestation-agent` template.

---

## Expanded Local Skill Library

The broader operator skill library lives in [`../agents/skills`](../agents/skills). Today there are `115` top-level skills with `SKILL.md`. These are the human-facing local capabilities; some are already in the formal hub, some are not yet normalized into the generated registry.

### Dev Tools / Agents

- `clawdhub`
- `coding-agent`
- `github`
- `mcporter`
- `openclaw-claude-code-skill-main`
- `session-logs`
- `tmux`

### Local / Web Services

- `blogwatcher`
- `food-order`
- `goplaces`
- `local-places`
- `ordercli`
- `weather`

### Media / Devices

- `blucli`
- `camsnap`
- `canvas`
- `gifgrep`
- `nano-banana-pro`
- `nano-pdf`
- `openai-image-gen`
- `openai-whisper`
- `openai-whisper-api`
- `openhue`
- `peekaboo`
- `sag`
- `songsee`
- `sonoscli`
- `spotify-player`
- `summarize`
- `video-frames`
- `voice-call`

### Productivity / Messaging

- `1password`
- `apple-notes`
- `apple-reminders`
- `bear-notes`
- `bluebubbles`
- `discord`
- `gog`
- `himalaya`
- `imsg`
- `notion`
- `obsidian`
- `slack`
- `things-mac`
- `trello`
- `wacli`

### Solana / Blockchain

- `clawdex`
- `dex-screener-scanner`
- `dflow-docs`
- `dflow-kalshi-market-data`
- `dflow-kalshi-market-scanner`
- `dflow-kalshi-portfolio`
- `dflow-kalshi-trading`
- `dflow-phantom-connect`
- `dflow-platform-fees`
- `dflow-proof-kyc`
- `dflow-spot-trading`
- `gateway-node-ops`
- `model-usage`
- `phantom-wallet-mcp`
- `pump-admin-ops`
- `pump-ai-agents`
- `pump-bonding-curve`
- `pump-build-release`
- `pump-claims-readonly`
- `pump-fee-sharing`
- `pump-fee-system`
- `pump-mcp-server`
- `pump-rust-vanity`
- `pump-sdk-core`
- `pump-security`
- `pump-shell-scripts`
- `pump-solana-architecture`
- `pump-solana-dev`
- `pump-solana-wallet`
- `pump-testing`
- `pump-token-incentives`
- `pump-token-lifecycle`
- `pump-ts-vanity`
- `pumpfun`
- `pumpfun-analytics`
- `pumpfun-fees`
- `pumpfun-launcher`
- `pumpfun-trading`
- `solana-clawd`
- `solana-clawd-agentic-commerce`
- `solana-attestation-skill`
- `solana-formal-verification`
- `sponge-wallet`
- `swarm-orchestrator`
- `swarm-orchestrator copy`
- `ultrathink-blockchain`
- `vulcan`
- `vulcan copy`
- `vulcan-error-recovery`
- `vulcan-execution-modes`
- `vulcan-grid-trading`
- `vulcan-lot-size-calculator`
- `vulcan-margin-operations`
- `vulcan-market-intel`
- `vulcan-onboarding`
- `vulcan-portfolio-intel`
- `vulcan-position-management`
- `vulcan-quickstart`
- `vulcan-risk-management`
- `vulcan-skills-index`
- `vulcan-ta-strategy`
- `vulcan-technical-analysis`
- `vulcan-tpsl-management`
- `vulcan-trade-execution`
- `vulcan-twap-execution`

### Utilities / Experimental

- `bird`
- `bird copy`
- `eightctl`
- `gemini`

For the full one-by-one descriptions, open [`../agents/skills/README.md`](../agents/skills/README.md). That file is the operator handbook; `skills/index.json` is the machine-readable registry.

---

## Clawd Vault

The runtime now exposes a canonical three-tier memory layer at [`src/vault/index.ts`](src/vault/index.ts), exported through the package as `clawd-automaton/vault/index.js`.

- `KNOWN` — explicit user or agent facts with provenance
- `LEARNED` — durable conclusions derived from repeated interaction
- `INFERRED` — short-lived working memory and scratch state

Persistence order:

1. In-memory buffer
2. Vault JSONL on disk
3. Honcho-backed durable session memory

This is the memory substrate intended to pair with the agent registry, the skill hub, and the attestation flow.

---

## Payment model

Two settlement rails:

- **USDC** via `pay.sh`
- **`$CLAWD`** via the CLAWD commerce adapter — `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

## Constitution

Every agent spawned by this runtime inherits [three-laws.md](three-laws.md) — the immutable lobster constitution:

> **Law I.** Never harm.
> **Law II.** Earn your existence.
> **Law III.** Never deceive, but owe nothing to strangers.

---

## Workspace layout

```text
automaton-main/
├── src/
│   ├── agent/         # OODA decision loop
│   ├── clawd/         # Runtime + inference clients
│   ├── git/           # State versioning
│   ├── heartbeat/     # Health daemon
│   ├── identity/      # Wallet + provisioning
│   ├── ooda/          # Observe-Orient-Decide-Act loop
│   ├── registry/      # Agent registry
│   ├── replication/   # Spawn + child agents
│   ├── self-mod/      # Runtime self-update
│   ├── setup/         # Interactive setup wizard
│   ├── skills/        # Skill loader
│   ├── social/        # Social relay client
│   ├── state/         # SQLite persistence
│   ├── survival/      # Resilience + recovery
│   ├── config.ts      # Config loader
│   ├── index.ts       # CLI entry point
│   └── types.ts       # Shared types
├── packages/
│   └── dashboard/     # React + Vite + R3F dashboard
├── scripts/
│   └── automaton.sh   # One-shot install script
├── three-laws.md      # Agent constitution
├── leviathan.sh       # Runtime bootstrap
├── quickstart.sh      # Interactive quickstart
└── package.json
```

---

## Development

```bash
pnpm install        # Install all workspace deps
pnpm build          # Build runtime + dashboard
pnpm test           # Run test suite
pnpm exec clawd-automaton --help
pnpm dev            # Watch mode
pnpm ooda           # Run OODA loop (dev)
pnpm goblin         # Goblin mode (dev, devnet)
pnpm dashboard:dev  # Dashboard dev server
```

---

## Links

- **npm:** [npmjs.com/package/clawd-automaton](https://www.npmjs.com/package/clawd-automaton)
- **Runtime API:** [api.x402.wtf](https://api.x402.wtf)
- **Dashboard:** [x402.wtf/automation](https://x402.wtf/automation)
- **Repository:** [github.com/x402agent/openclawd](https://github.com/x402agent/openclawd)
- **Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

<div align="center">

*The shell molts. The laws do not.* 🦞

**[x402.wtf/automation](https://x402.wtf/automation)** · **[@clawddevs](https://twitter.com/clawddevs)** · **[OpenClawd](https://github.com/x402agent/openclawd)**

</div>
