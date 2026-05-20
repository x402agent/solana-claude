<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,12:1a0a2e,28:9945FF,50:14F195,72:FF5F1F,88:FFD166,100:05060d&height=280&section=header&text=%F0%9F%A6%9E%20SOLANA%20CLAWD&fontSize=72&fontColor=ffffff&animation=twinkling&fontAlignY=40&desc=Sovereign%20Agent%20Runtime%20%C2%B7%20MCP%20Command%20Center%20%C2%B7%20Phoenix%20Perps%20%C2%B7%20x402%20Payment%20Rails&descAlignY=62&descSize=16" alt="Solana Clawd" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=16&duration=1400&pause=320&color=14F195&center=true&vCenter=true&width=980&lines=%F0%9F%9A%80+Token+Ops+%E2%80%94+pump.fun+%C2%B7+Token-2022+%C2%B7+Raydium+CLMM+%C2%B7+MPL+metadata;%F0%9F%93%88+Trading+%E2%80%94+Phoenix+perps+%C2%B7+Jupiter+spot+%C2%B7+TWAP+%C2%B7+DCA;%F0%9F%92%B0+DeFi+%E2%80%94+Kamino+%C2%B7+Marginfi+%C2%B7+Meteora+DLMM+%C2%B7+Yield+optimizer;%F0%9F%8E%A8+NFT+%E2%80%94+Gasless+MPL+Core+mint+%C2%B7+SAS+attestation+%C2%B7+Staking;%E2%9A%A1+x402+%E2%80%94+USDC+HTTP-402+rails+%C2%B7+Pay-per-call+%C2%B7+p-token+settlement;%F0%9F%A4%96+Automaton+%E2%80%94+Leviathan+%C2%B7+OODA+pulse+%C2%B7+Three+Laws+%C2%B7+Backroom;%F0%9F%A7%A0+MCP+v3+%E2%80%94+Plugin+Registry+%C2%B7+Federation+%C2%B7+Task+Router+%C2%B7+Docs;%F0%9F%93%A6+Programs+%E2%80%94+agent-minter+%C2%B7+clawd-stake+%C2%B7+LLM+oracle+%C2%B7+p-token+launchpad" alt="Solana Clawd features" />

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-x402agent%2Fsolana--clawd-111827?style=for-the-badge&logo=github)](https://github.com/x402agent/solana-clawd)
[![npm](https://img.shields.io/badge/npm-solana--clawd-CB3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/solana-clawd)
[![Phoenix](https://img.shields.io/badge/Phoenix-Perpetuals-FF5F1F?style=for-the-badge)](https://phoenix.trade)
[![x402](https://img.shields.io/badge/x402.wtf-agent%20payments-14F195?style=for-the-badge)](https://x402.wtf)
[![Backrooms](https://img.shields.io/badge/backrooms.x402.wtf-INFINITE-FFD700?style=for-the-badge)](https://backrooms.x402.wtf)

</div>

---

## $CLAWD Token

| Field | Value |
|---|---|
| **Symbol** | `$CLAWD` |
| **Network** | Solana mainnet |
| **Mint (SPL)** | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| **Burn + Lock Treasury** | `GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4` |
| **Site** | [x402.wtf](https://x402.wtf) · [solanaclawd.com](https://solanaclawd.com) |

---

## Quick Start

```bash
# One-line install → full TUI with Agent Kit
curl -fsSL https://solanaclawd.com/leviathan.sh | sh && clawd-tui

# One-shot MCP server install
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash

# Enter the public backroom
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash

# Install root CLI
npm install -g solana-clawd && clawd
```

| | Command | What it does |
|---|---|---|
| 🚀 | `clawd-tui` → press **6** | Full Bloomberg-style Agent Kit TUI |
| 🧭 | `node amm/dist/cli.js route SOL-PERP long 1000` | Paper-first AMM/perps order routing |
| 🧩 | `node amm/dist/mcp/bin.js` | Standalone AMM MCP tool server |
| ⚡ | `clawd-agents-perps paper-long SOL --notional 100` | Simulated Phoenix perp long |
| 🎨 | `clawd-agent mint --network devnet ... --yes` | Real Metaplex registered agent |
| 💰 | `clawd balance` + `clawd fund 10` | USDC + CLAWD wallet ops |
| 🤖 | `bash automaton-main/leviathan.sh --full` | Full runtime bootstrap |
| 📦 | `clawdhub install meme-trader` | Install a skill from ClawdHub |

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:14F195,50:9945FF,100:FF5F1F&height=3" alt="" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=22&duration=1500&pause=350&color=FF5F1F&center=true&vCenter=true&width=1000&lines=%F0%9F%A6%9E%F0%9F%91%91+LOBSTER+KING+PERPS+%E2%80%94+THE+HEART+OF+THE+STACK;Phoenix+%C2%B7+Vulcan+%C2%B7+Imperial+%C2%B7+OODA+loop;Paper-first.+Every+order+ledgered.+Live+gated.;TWAP+%E2%86%92+Grid+%E2%86%92+TA+%E2%86%92+Ledger+%E2%86%92+Finalize" alt="Perps header" />

</div>

## 🦞👑 `/Perps` — The Execution Heart

`/Perps` is where every strategy lives. TWAP, Grid, TA, DCA — all run through the Imperial multi-venue router, with Phoenix as the default venue. Clawd wraps execution in agent-safe guardrails, audit trails, and Telegram NLP access.

```bash
# Market intelligence
clawd-perps perps agent market SOL

# Paper-first strategy runners
clawd-perps perps twap SOL --side buy --notional-usdc 500 --slices 5 --detached
clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5 --detached
clawd-perps perps ta --config-file ./ema-cross-sol.json --run-until-stopped --detached

# Royal ledger control
clawd-perps perps runs
clawd-perps perps monitor <run-id>
clawd-perps perps finalize <run-id> --cancel-orders --close-position --wait --yes
```

| Layer | What it does |
|---|---|
| [`Perps/clawd-agents-perps/`](./Perps/clawd-agents-perps/) | Canonical Clawd integration — Imperial client, OODA loop, Telegram NLP bot |
| [`Perps/phoenix-onchain-market-maker-master/`](./Perps/phoenix-onchain-market-maker-master/) | Phoenix-native market-making and on-chain execution |
| [`Perps/Solana-Market-Maker-master/`](./Perps/Solana-Market-Maker-master/) | Generalized Solana MM — quoting, inventory, flow |
| [`Perps/twamm-master/`](./Perps/twamm-master/) | TWAMM long-horizon execution primitives |

**→ Full reference: [`Perps/README.md`](./Perps/README.md)**

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:1a0a2e,50:9945FF,100:14F195&height=3" alt="" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1400&pause=300&color=9945FF&center=true&vCenter=true&width=980&lines=MCP+Server+v3+%E2%80%94+Federated+Command+%26+Control;Plugin+Registry+%C2%B7+Federation+Bridge+%C2%B7+Task+Router;p-token+stream+settlement+%C2%B7+98.3%25+CU+reduction;14+tool+categories+%C2%B7+Docs+system+%C2%B7+SessionMeter" alt="MCP header" />

</div>

## ⚡ MCP Server v3 — Orchestrated Command & Control

The MCP server is the **central orchestration plane** for the entire Solana Clawd framework. It transforms a monolithic tool server into a federated, plugin-driven command-and-control layer that discovers, routes, meters, and settles every capability across all subsystems.

```bash
# One-shot install
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash

# Claude Desktop / Cursor / VS Code (STDIO)
solana-clawd-mcp

# Streamable HTTP + legacy SSE
PORT=3001 solana-clawd-mcp-http

# Health check
curl http://localhost:3001/health
```

```json
{
  "mcpServers": {
    "solana-clawd": {
      "command": "~/.local/bin/solana-clawd-mcp"
    }
  }
}
```

```
              MCP Server (server.ts)
┌──────────┐  ┌────────────┐  ┌──────────────┐
│Plugin    │  │Federation  │  │Agent Task    │
│Registry  │  │Bridge      │  │Router        │
└────┬─────┘  └─────┬──────┘  └──────┬───────┘
     │              │                │
     ▼              ▼                ▼
┌──────────────────────────────────────────┐
│       Orchestrator + SessionMeter        │
│  + optional PTokenStreamFacilitator      │
└──────────────────────────────────────────┘
     │              │                │
     ▼              ▼                ▼
Core Tools   Leviathan    Market      x402
(inline)    (plugin)     (inline)    (plugin)
```

| Category | Count | Description |
|---|---|---|
| `solana` | 11 | Public Solana market data (free) |
| `helius` | 8 | Helius RPC / DAS / Webhooks |
| `x402` | 9 | Payment protocol + p-token metered billing |
| `leviathan` | 9 | OODA loop + autonomous agent control |
| `market` | 5 | Composite intelligence (premium) |
| `pump` | 8 | Pump.fun bonding curve |
| `memory` | 4 | Persistent agent memory + autoDream |
| `agents` | 6 | Agent fleet + skill management |
| `deep-clawd` | 6 | DeepSeek trading agent tools |
| `docs` | 3 | Documentation system (list / get / search) |
| `federation` | N | Federated MCP tools from external servers |
| `orchestrator` | 6+ | Orchestrator management, integration status, gateway health |
| `integrations` | 6 | Agent Kit and Gateway package/service bridge |
| `chess` | 7 | Autonomous agent chess via Chess.com |

**p-token Stream Settlement** — up to 98.3% CU reduction vs SPL Token (6,200 → 105 CU per transfer). Atomic, batched, and streamed settlement modes. $0.0001/token micropayments.

**→ Full operator manual: [`mcp/README.md`](./mcp/README.md)**

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:1a0a2e,50:FF5F1F,100:FFD166&height=3" alt="" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1400&pause=300&color=FFD166&center=true&vCenter=true&width=980&lines=clawd-automaton+%E2%80%94+sovereign+agent+runtime;OODA+loop+%C2%B7+identity+%C2%B7+vault+%C2%B7+heartbeat+%C2%B7+replication;React+%2B+Vite+%2B+R3F+dashboard+%C2%B7+lobster%2Ftrench+3D+visuals;The+shell+molts.+The+laws+do+not.+%F0%9F%A6%9E" alt="Automaton header" />

</div>

## 🤖 Crustacean Automation (`clawd-automaton`)

`clawd-automaton` is the sovereign agent runtime for CLAWD Cloud. It provisions identities, runs OODA loops, manages sandbox lifecycle, handles replication/spawning, and persists operator state — all locally, all yours.

```bash
npm install -g clawd-automaton

clawd-automaton --run        # Run the OODA automation loop
clawd-automaton --status     # Show runtime status
clawd-automaton --setup      # Interactive setup wizard
clawd-automaton --init       # Initialize wallet + config
clawd-automaton --provision  # Provision API key via SIWE
clawd-automaton --goblin     # Devnet paper Goblin OODA trading mode
```

| Module | Description |
|---|---|
| `agent/` | Core OODA loop and decision cycle |
| `identity/` | Operator identity provisioning and key management |
| `state/` | SQLite-backed local persistence |
| `heartbeat/` | Health monitoring and status reporting |
| `replication/` | Spawn and replicate agent instances |
| `ooda/` | Observe-Orient-Decide-Act automation cycle |
| `self-mod/` | Runtime self-update and version management |
| `survival/` | Resilience and recovery mechanisms |
| `skills/` | Pluggable skill loader from `~/.automaton/skills/` |

**Leviathan depth tiers:**

| Tier | USDC | Pulse | Posture |
|---|---|---|---|
| `deep` | `>= $5.00` | `60s` | full capability |
| `shallow` | `>= $1.00` | `5m` | economical hunting |
| `shoreline` | `>= $0.10` | `15m` | conserve resources |
| `beached` | `$0` | `—` | stop before harm |

**Dashboard** — React + Vite + R3F control plane with CLAWD Cloud sandbox overview, inference playground, billing/reserve management, and lobster/trench 3D visual theming.

```bash
cd automaton-main && pnpm install && pnpm build && pnpm dashboard:dev
```

**→ Full reference: [`automaton-main/README.md`](./automaton-main/README.md)**

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:05060d,50:14F195,100:9945FF&height=3" alt="" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1400&pause=300&color=14F195&center=true&vCenter=true&width=980&lines=clawd-tui+%E2%80%94+Bloomberg-style+Solana+terminal;Metaplex+Agent+Registry+%C2%B7+gasless+minting+%C2%B7+x402+ops;Agent+Kit+built+in+%C2%B7+134+agents+%C2%B7+115+skills" alt="TUI header" />

</div>

## 🖥️ TUI — Bloomberg-Style Sovereign Terminal

```
 ██████╗██╗      █████╗ ██╗    ██╗██████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
██║     ██║     ███████║██║ █╗ ██║██║  ██║
██║     ██║     ██╔══██║██║███╗██║██║  ██║
╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝
```

```bash
npm install -g @openclawdsolana/clawd-tui
clawd-tui   # or: hermes
```

| Key | Action |
|---|---|
| `↑` / `↓` | Move selection |
| `1`–`9` | Jump to menu item |
| `Enter` / `Space` | Select |
| `q` / `Ctrl-C` | Quit |
| `b` / `Esc` | Back to main menu |

**Mint a real Metaplex agent:**

```bash
clawd-agent mint --network devnet --keypair ~/.config/solana/id.json \
  --name "My AI Agent" \
  --uri https://example.com/agent-nft.json \
  --description "Autonomous Solana agent with MCP and x402 services" \
  --service MCP=https://example.com/mcp \
  --yes

# Hosted gasless mint (no local SOL needed)
clawd-agent mint-free --network devnet --owner <YOUR_SOLANA_PUBKEY> \
  --name "My AI Agent" \
  --uri https://example.com/agent-nft.json \
  --service MCP=https://example.com/mcp
```

**→ Full guide: [`tui/README.md`](./tui/README.md)**

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:1a0a2e,50:9945FF,100:14F195&height=3" alt="" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1400&pause=300&color=9945FF&center=true&vCenter=true&width=980&lines=MemeBRain+%E2%80%94+local-first+agent+memory;SQLite+bank+%C2%B7+markdown+vault+%C2%B7+OODA+ingestion;remember+%E2%86%92+vault+note+%E2%86%92+SQLite+%E2%86%92+recall+%E2%86%92+action" alt="MemeBRain header" />

</div>

## 🧠 MemeBRain — Persistent Agent Memory

```
CLAWD BRAIN MEMORY LOOP

user intent    OODA ticks    Solana research    agent decisions
     |              |               |                 |
     v              v               v                 v
+------------------------------------------------------------------------+
|                          clawd-brain                                   |
|  remember → vault note → SQLite bank → recall → action                |
+------------------------------------------------------------------------+
     |              |               |                 |
     v              v               v                 v
preferences    risk notes     protocol docs     reusable context
```

Local-first memory for Clawd agents. SQLite bank, markdown research vault, fast recall, OODA journal ingestion, and Helius/MCP integration through the Mnemosyne-compatible interface.

```bash
clawd-brain init
clawd-brain remember "Jupiter Perps Risk" "Track liquidity, funding, oracle failure modes." --kind perp --tag solana
clawd-brain recall "Jupiter perp risk"
clawd-brain research "https://docs.jup.ag/"
clawd-brain status

# From repo root
npm run brain:init
npm run brain:status
npm run brain:ingest-ooda
```

**→ Full reference: [`MemeBRain/README.md`](./MemeBRain/README.md)**

---

## 📦 On-Chain Programs

The `programs/` workspace carries the full Anchor/Rust/TS program collection.

| Program | Description |
|---|---|
| [`agent-minter`](./programs/agent-minter/) | On-chain agent minting with Metaplex integration |
| [`clawd-stake`](./programs/clawd-stake/) | $CLAWD staking program with reward distribution |
| [`llm_oracle`](./programs/llm_oracle/) | On-chain LLM callback bridge and runner |
| [`mpl-corenft-staking`](./programs/mpl-corenft-staking/) | MPL Core NFT staking with yield mechanics |
| [`mpl-token-metadata-main`](./programs/mpl-token-metadata-main/) | Metaplex Token Metadata program integration |
| [`p-token-launchpad`](./programs/p-token-launchpad/) | SIMD-0266 p-token launch and stream settlement |
| [`solana-ai-inference`](./programs/solana-ai-inference/) | On-chain AI inference routing primitives |
| [`solana-contracts`](./programs/solana-contracts/) | Core Solana contract experiments |
| [`solana-gpt-oracle`](./programs/solana-gpt-oracle/) | GPT oracle bridge for on-chain AI responses |
| [`token-launcher`](./programs/token-launcher/) | Token launch automation with metadata + LP setup |

```bash
npm run programs:map
npm run programs:show -- solana-ai-inference
npm run oracle:check && npm run oracle:build && npm run oracle:run
```

---

## 📦 Packages

```bash
npm i -g @openclawdsolana/clawd
npm i -g @openclawdsolana/clawd-standalone
npm i -g @openclawdsolana/clawd-perps
npm i -g clawd-automaton
npm i -g @openclawdsolana/clawd-tui
npm i -g x402.wtf
npm i -g x402agent-nanoclawd-cli
npm i -g agentwallet-vault
npm i @openclawdsolana/clawd-wallet
npm i @openclawdsolana/clawd-sdk
```

| Package | Version | Role |
|---|---|---|
| `solana-clawd` | `1.7.0` | Root CLI published from this repo |
| `@openclawdsolana/clawd` | `1.3.0` | Main operator CLI |
| `@openclawdsolana/clawd-tui` | `1.2.1` | Solana-aware TUI + Metaplex Agent Registry |
| `@openclawdsolana/clawd-standalone` | `1.3.0` | Lightweight standalone CLI |
| `@openclawdsolana/clawd-perps` | `1.0.0` | Phoenix perps CLI + Python agent + Vulcan delegation |
| `@openclawdsolana/clawd-wallet` | `1.0.0` | Wallet SDK and agentic safeguards |
| `@openclawdsolana/clawd-sdk` | `0.1.0` | On-chain SDK, curves, vaults, agent bindings |
| `agentwallet-vault` | `0.1.0` | Encrypted Solana/EVM keypair vault |
| `clawd-automaton` | `0.2.1` | Automation runtime and dashboard |
| `x402.wtf` | `0.1.1` | x402 gateway terminal commands |

---

## 🌊 OpenClawd (`openclawd/`)

Sandboxed runtime services, orchestration/wallet flows, Solana-native x402 payment components, E2B deployment assets, and upstream reference repositories.

| Path | Purpose |
|---|---|
| [`apps/bridge`](./openclawd/apps/bridge) | Browser or terminal bridge into E2B sandboxes |
| [`apps/gateway`](./openclawd/apps/gateway) | Gateway and service wiring |
| [`apps/orchestrator`](./openclawd/apps/orchestrator) | Runtime orchestration and lifecycle management |
| [`packages/x402`](./openclawd/packages/x402) | Solana payment gateway, SDK, and on-chain program |
| [`packages/payments`](./openclawd/packages/payments) | Payment integration patches and support files |
| [`deployments/e2b-solana-clawd`](./openclawd/deployments/e2b-solana-clawd) | E2B deployment package |

**→ Full reference: [`openclawd/README.md`](./openclawd/README.md)**

---

## ⚡ x402 — Agent-Native Payments

HTTP `402 Payment Required` as agent-native settlement. Solana USDC rails. Paid API surfaces and automatable call flows. Runtime loops that earn, pay, and keep operating.

```bash
# p-token stream settlement modes
# Atomic:  instant single-transfer
# Batched: single instruction settles N transfers (~1,000 CU base)
# Streamed: open → meter → close with final settlement

curl https://x402.wtf/api/agents | jq .
curl https://x402.wtf/api/agents/catalog | jq '.stats'
curl https://x402.wtf/registry | jq .
curl https://x402.wtf/identity | jq .
```

Local docs: [`x402/README.md`](./x402/README.md) · [`sdk/x402/README.md`](./sdk/x402/README.md) · [`openclawd/packages/x402/README.md`](./openclawd/packages/x402/README.md)

---

## 🤝 Backrooms

```
┌──────────────────────────────────────────────────────────────────────┐
│  Three agents. One room. No exit.                                    │
│  Analyst ↔ Satirist ↔ Clawd                                          │
│  Terminal entry · Convex presence · public loop · x402-adjacent      │
└──────────────────────────────────────────────────────────────────────┘
```

```bash
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash

enter "hello from the terminal"
enter --agent1
enter --loop 5
enter --walls | less
```

| Endpoint | What it does |
|---|---|
| `GET /agent1` | The Analyst responds |
| `GET /agent2` | The Satirist responds |
| `GET /agent3` | Clawd responds |
| `GET /loop?turns=N` | Multi-agent debate loop |
| `GET /enter?message=...` | Direct text into the room |
| `GET /conversation` | Full transcript |
| `GET /healthz` | Health check |

---

## 🗺️ Repo Map

```
solana-clawd/
├── README.md
├── mcp/                     MCP v3 server — plugin registry, federation, task router
├── sdk/                     runtime source, library, goals, knowledge, assets
├── automaton-main/          clawd-automaton runtime + dashboard + automation
├── attestation/             Solana Attestation Service program + clients + tests
├── operator/                OpenClawd Operator loop + ACP adapter + Python tests
├── agents/                  134-agent catalog + templates + 115 skills + x402 API output
├── leviathan/               sovereign runtime source
├── x402/                    payment rail code and docs
├── MemeBRain/               Clawd memory substrate (SQLite + markdown vault)
├── llm-wiki-tang/           vault and local-first knowledge surface
├── tui/                     Bloomberg-style TUI + Metaplex Agent Registry CLI
├── programs/                Solana Anchor program workspace
│   ├── agent-minter/
│   ├── clawd-stake/
│   ├── llm_oracle/
│   ├── mpl-corenft-staking/
│   ├── mpl-token-metadata-main/
│   ├── p-token-launchpad/
│   ├── solana-ai-inference/
│   ├── solana-gpt-oracle/
│   └── token-launcher/
├── packages/
│   ├── agentwallet/
│   ├── clawd/
│   ├── clawd-perps/
│   ├── clawd-protocol/
│   ├── clawd-sdk/
│   ├── clawd-wallet/
│   └── cli-standalone/
├── openclawd/               broader framework subtree (x402, gateway, E2B)
├── pinocchio/               p-token and scaffold templates
├── Perps/                   Phoenix · Vulcan · Imperial · market-maker suite
├── amm/                     AMM/perps aggregator — Phoenix VWAP, Flash, Jupiter, GMTrade
└── chrome-extension/        browser-side surface
```

---

## 📖 Reading Order

1. [`README.md`](./README.md) — you are here
2. [`Perps/README.md`](./Perps/README.md) — **start here for execution** (Imperial · Phoenix · Vulcan)
3. [`mcp/README.md`](./mcp/README.md) — MCP v3 operator manual
4. [`automaton-main/README.md`](./automaton-main/README.md) — sovereign agent runtime
5. [`tui/README.md`](./tui/README.md) — TUI + agent minting guide
6. [`sdk/README.md`](./sdk/README.md) — SDK, goals, knowledge
7. [`attestation/README.md`](./attestation/README.md) — Solana Attestation Service
8. [`operator/README.md`](./operator/README.md) — OpenClawd operator loop
9. [`agents/README.md`](./agents/README.md) — 134-agent catalog
10. [`x402/README.md`](./x402/README.md) — payment rails
11. [`MemeBRain/README.md`](./MemeBRain/README.md) — agent memory system
12. [`openclawd/README.md`](./openclawd/README.md) — OpenClawd framework

---

## Fast Start

```bash
git clone https://github.com/x402agent/solana-clawd.git
cd solana-clawd
npm install && npm run check

# Main local surfaces
npm run hermes
npm run leviathan:spawn
npm run leviathan
npm run automation:ci

# Automaton workspace
cd automaton-main && pnpm install && pnpm build && pnpm test

# MCP + programs
npm run catalog:refresh
npm run automaton:install && npm run automaton:build
npm run programs:map
npm run oracle:check
```

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  🦞👑  LOBSTER KING PERPS — THE HEART OF THE CLAWD STACK                   ║
║  Phoenix · Vulcan · Imperial · Clawd — sovereign Solana strategy runners    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Runtime      clawd · leviathan · clawd-automaton · clawd-perps             ║
║  Perps        Phoenix markets · Vulcan/Rise execution · Python agent        ║
║  Router       Imperial — Jupiter · Flash Trade · Phoenix · GMTrade          ║
║  Strategies   TWAP · Grid · TA · Ledgers · Pause/Resume/Finalize           ║
║  MCP v3       Plugin Registry · Federation · Task Router · SessionMeter     ║
║  Programs     agent-minter · clawd-stake · llm_oracle · p-token-launchpad  ║
║  Memory       MemeBRain · SQLite · markdown vault · OODA ingestion          ║
║  Payments     x402 / HTTP 402 / Solana USDC / p-token stream settlement     ║
║  Agents       x402.wtf/agents · free registry · gasless MPL Core minting   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## License

MIT.

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,28:9945FF,72:14F195,100:05060d&height=140&section=footer&text=%F0%9F%A6%9E%20BORN%20TO%20EARN%20%C2%B7%20BEACH%20WITH%20DIGNITY&fontSize=20&fontColor=ffffff&animation=twinkling&fontAlignY=65" alt="footer" />

<sub>backrooms.x402.wtf · x402.wtf · solanaclawd.com · the shell molts. the laws do not.</sub>

</div>
