<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,12:1a0a2e,28:ff5f1f,50:ffd166,72:9945FF,88:14F195,100:05060d&height=320&section=header&text=solana-clawd%20MCP&fontSize=68&fontColor=ffffff&animation=twinkling&fontAlignY=36&desc=Orchestrated%20Command%20%26%20Control%20%E2%80%94%20Plugin%20Registry%20%C2%B7%20Federation%20%C2%B7%20Perps%20Aggregator%20%C2%B7%20p-token%20Settlement&descAlignY=58&descAlign=50&descSize=18" alt="solana-clawd MCP banner" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=26&duration=1600&pause=400&color=FFD166&center=true&vCenter=true&width=1080&lines=ONE+MCP+SERVER+%E2%86%92+105+TOOLS+%E2%86%92+14+CATEGORIES;PLUGIN+REGISTRY+%E2%86%92+FEDERATION+%E2%86%92+TASK+ROUTER;PERPS+AGGREGATOR+%E2%86%92+SOR+%E2%86%92+AMM+POOL+INTEL+%E2%86%92+SPLIT+ROUTING;PHOENIX+%C2%B7+FLASH+%C2%B7+JUPITER+%C2%B7+GMTRADE+%E2%86%92+ONE+SURFACE;PAPER-FIRST+%E2%86%92+LIVE+GATED+%E2%86%92+p-token+SETTLED" alt="MCP animated header" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=15&duration=1300&pause=250&color=14F195&center=true&vCenter=true&width=1000&lines=tools%2Fcall+perps_route_trade+%7B+symbol%3A+SOL%2C+side%3A+long%2C+sizeUsd%3A+250+%7D;tools%2Fcall+perps_get_pools+%7B+symbol%3A+SOL+%7D+%E2%86%92+util+%C2%B7+skew+%C2%B7+funding+%C2%B7+health;tools%2Fcall+perps_route_trade_split+%7B+symbol%3A+SOL%2C+sizeUsd%3A+25000+%7D;tools%2Fcall+market_signal+%E2%86%92+STRONG+%2F+MODERATE+%2F+WEAK;tools%2Fcall+perps_simulate_order+%E2%86%92+paper-first+%E2%9C%93" alt="animated tool calls" />

<br/><br/>

[![GitHub](https://img.shields.io/badge/GitHub-x402agent%2Fsolana--clawd-111827?style=for-the-badge&logo=github)](https://github.com/x402agent/solana-clawd)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-v3.0.0-9945FF?style=for-the-badge)](https://modelcontextprotocol.io)
[![Perps Aggregator](https://img.shields.io/badge/Perps-SOR%20%2B%20AMM%20%2B%20MCP-FF5F1F?style=for-the-badge)](../packages/clawd-perps-aggregator)
[![Phoenix](https://img.shields.io/badge/Phoenix-CLOB-FF5F1F?style=for-the-badge)](https://phoenix.trade)
[![x402](https://img.shields.io/badge/x402.wtf-p--token%20settled-14F195?style=for-the-badge)](https://x402.wtf)
[![Paper First](https://img.shields.io/badge/Paper--First-Live%20Gated-FFD700?style=for-the-badge)](#safety-model)

<br/>

```text
╔══════════════════════════════════════════════════════════════════════════════════╗
║  solana-clawd MCP v3 — ORCHESTRATED COMMAND & CONTROL                            ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║  Plane        Plugin Registry · Federation Bridge · Agent Task Router            ║
║  Settlement   Orchestrator + SessionMeter + PTokenStreamFacilitator             ║
║  Perps        SOR · AMM pool intel · split routing · positions · risk · realtime ║
║  Venues       Phoenix (CLOB) · Flash · Jupiter · GMTrade  → one surface          ║
║  Tools        105 across 14 categories — perps (17), market, x402, leviathan…   ║
║  Safety       Paper-first · live behind IMPERIAL_LIVE · size + symbol gated      ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

</div>

---

The MCP (Model Context Protocol) server is the **central orchestration plane** for the entire Solana Clawd framework. It transforms a monolithic tool server into a federated, plugin-driven command-and-control layer that discovers, routes, meters, and settles every capability across all subsystems — now including the full **Solana Perps Aggregator** (smart-order routing across Phoenix, Flash Trade, Jupiter, and GMTrade).

## Architecture

```text
                              MCP Server (server.ts)
  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐
  │Plugin    │  │Federation  │  │Agent Task    │  │Perps Aggregator │
  │Registry  │  │Bridge      │  │Router        │  │SOR · AMM · MCP   │
  └────┬─────┘  └─────┬──────┘  └──────┬───────┘  └────────┬────────┘
       │              │                │                   │
       ▼              ▼                ▼                   ▼
  ┌──────────────────────────────────────────────────────────────┐
  │              Orchestrator + SessionMeter                       │
  │           + optional PTokenStreamFacilitator                   │
  └──────────────────────────────────────────────────────────────┘
       │              │                │                   │
       ▼              ▼                ▼                   ▼
  Core Tools   Leviathan    Market           Perps  →  Phoenix · Flash
  (inline)    (plugin)     (inline)        (bridge)    Jupiter · GMTrade
```

---

## ⚡ Perps Aggregator — the execution layer

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=16&duration=1400&pause=300&color=FF5F1F&center=true&vCenter=true&width=920&lines=Smart+Order+Routing+across+4+Solana+perps+venues;AMM+pool+intel%3A+utilization+%C2%B7+OI+skew+%C2%B7+funding+%C2%B7+health;Split+execution+when+pool+capacity+demands+it;Paper-first+%E2%80%94+live+only+behind+IMPERIAL_LIVE" alt="perps aggregator info" />

</div>

The MCP server bridges [`@openclawdsolana/clawd-perps-aggregator`](../packages/clawd-perps-aggregator) and exposes its full surface as **17 `perps_*` tools**. The aggregator is the single source of truth — when it gains a tool, the MCP server picks it up on the next build (`src/tools/perps-tools.ts` re-tags the aggregator's `buildTools()` output into the `perps` category).

### The 17 perps tools

| Tool | What it does |
|------|--------------|
| `perps_list_venues` | Enabled venues (Phoenix, Flash, Jupiter, GMTrade) |
| `perps_list_markets` | Markets across all venues |
| `perps_get_marks` | Mark prices per venue |
| `perps_get_funding` | Funding + borrow rates (positive long = longs pay shorts) |
| `perps_get_quote` | Cross-venue quote, depth/pool-aware |
| `perps_route_trade` | **SOR** — single best venue + candidate breakdown + rationale |
| `perps_route_trade_split` | **Split execution** — fans across venues when AMM capacity demands |
| `perps_get_pools` | **AMM pool intel** — per-side util, capacity, OI skew, predicted funding, health |
| `perps_build_order_tx` | Build the on-wire payload without submitting |
| `perps_simulate_order` | Route + check fillability, fees, slippage, policy caps |
| `perps_execute_order` | Paper-first execute (live behind env) |
| `perps_get_positions` | Cross-venue positions + totals |
| `perps_get_balances` | USDC subaccount balances (needs `IMPERIAL_JWT`) |
| `perps_liquidation_risks` | Liquidation distance, sorted worst first |
| `perps_build_deposit_tx` | Build deposit/withdraw tx (caller signs) |
| `perps_stream_snapshot` | Realtime cache snapshot (lazy-starts the WS stream) |
| `perps_score_market` | OODA composite signal (momentum / funding / liquidity) |

### Smart order routing

The router scores each venue on four normalised components — **cost (0.55), liquidity (0.20), open interest (0.10), funding (0.15)** — and picks the single best venue with a full rationale. Slippage is modelled three ways:

- **Phoenix (CLOB):** walks the orderbook to compute VWAP for the requested USD notional → bps vs. mid.
- **AMM venues with pool state:** `poolImpact()` — base sqrt impact **plus a pool-counterparty imbalance premium**. Opening into the heavy side costs more (you force the pool to take on risk); opening into the light side rebate-clamps to zero. Refuses orders that breach per-side OI caps.
- **AMM venues without pool state:** generic sqrt-impact fallback parameterised by venue liquidity.

### AMM pool intel (`perps_get_pools`)

```jsonc
{
  "venue": "flash",
  "pool": { "aumUsd": 50000000, "longOiUsd": 20000000, "shortOiUsd": 5000000,
            "maxLongOiUsd": 25000000, "maxShortOiUsd": 25000000 },
  "summary": {
    "utilization": { "long": 0.8, "short": 0.2 },
    "capacityUsd": { "long": 5000000, "short": 20000000 },
    "skew": 0.6,
    "borrowPerHourPct": { "long": 0.0064, "short": 0.0004 },
    "predictedFundingLongPerHourPct": 0.003,
    "health": 0.24
  }
}
```

### Split execution (`perps_route_trade_split`)

Greedy multi-leg allocator: re-quotes each venue per chunk so the AMM impact curve updates, then allocates to the lowest **marginal** cost venue each step. Prefers single-venue unless splitting beats it by ≥ `splitThresholdBps` (default 5 bps), or no single venue can fill the full size.

### Safety model

Paper-first by construction. `perps_execute_order` only submits a live on-chain order when **`IMPERIAL_LIVE=true` AND `PERPS_AGG_PAPER!=true`**, and is bounded by `IMPERIAL_MAX_SIZE_USD` + `IMPERIAL_ALLOWED_SYMS`. Every other perps tool is read-only or build-only. Private keys never enter the server — `perps_build_*` tools return base64 transactions for the caller to sign.

---

## Core Subsystems

### 1. Plugin Registry (`src/plugins/plugin-registry.ts`)
Dynamically discovers, loads, and validates tools from every framework subsystem:
- `ooda/` → OODA loop tools (observe, orient, decide, act)
- `leviathan/` → Spawning, bridge, 3-laws, SHELL.md, survival
- `x402/` → Payment stream, p-token facilitator, billing
- `deep-clawd/` → DeepSeek trading agent tools
- `skills/` → Agent skill files as callable tools
- `programs/` → On-chain program inspection tools
- `agents/` → Agent fleet management
- `agent-kit/` → Local agent catalog/runtime profile loader
- `gateway/` → HTTP gateway health, registry, and Skill Hub API
- `sdk/` → Solana Clawd SDK package visibility

**Key innovation:** replaces the monolithic 50+ tool registration pattern with dynamic discovery. Each subsystem exposes a manifest or entry point, and the registry validates uniqueness and surfaces the full capability map back to the Orchestrator.

### 2. Federation Bridge (`src/federation/federation-bridge.ts`)
Enables MCP-to-MCP and Agent-to-Agent (A2A) communication:
- **MCP Server Federation:** Call tools on other MCP servers (e.g., solana-clawd → official Solana MCP)
- **Agent-to-Agent (A2A):** Dispatch tasks to Leviathan spawnlings, Deep Clawd agents
- **Cross-Process Bridge:** Spawn subprocess MCP servers and federate tools across them
- **Remote MCP:** Connect to remote MCP over HTTP+SSE or Streamable HTTP

Supports STDIO (child process), HTTP+SSE, Streamable HTTP, and A2A (`/.well-known/agent.json`) connection types. Federated tools are namespaced as `federation__{prefix}__{toolName}`.

### 3. Agent Task Router (`src/federation/agent-task-router.ts`)
Cross-agent task dispatch with priority queues and concurrency limits:
- Agent types: leviathan | deep-clawd | ooda | x402 | memory | orchestrator
- Priority levels: low | normal | high | critical
- Concurrency caps: max 3 leviathan, 2 deep-clawd, 1 ooda, 10 x402, 5 memory
- Fan-out mode for orchestrator-type tasks

### 4. Documentation System (`src/docs/docs-system.ts`)
Framework-wide documentation server inspired by the Official Solana MCP pattern:
- 20+ documentation sources across 8 categories (core, trading, agents, payments, tokens, governance, mcp, llms)
- `list_sections` / `get_documentation` / `search_docs` tools
- Content caching with 5-minute TTL
- Semantic search across all sources with weighted scoring

### 5. Orchestrator + SessionMeter (`src/orchestrator.ts`)
The architectural centrepiece — tool registry, pay-per-use dispatch, and on-chain settlement:
- Every tool is a `ToolDef` datum: description, schema, category, optional cost, and handler
- **SessionMeter** tracks per-session billing with optional `PTokenStreamFacilitator` integration
- **StreamFacilitator** enables on-chain p-token batch settlement
- Auto-settlement when premium budget is exhausted
- Session lifecycle: `openStreamSession` → `meterStream` → `closeStreamSession` → `autoSettle`

### 6. PTokenStreamFacilitator (`../x402/p-token-stream-facilitator.ts`)
On-chain settlement engine for p-token (SIMD-0266) micropayments:
- **Atomic mode:** instant single-transfer settlement
- **Batched mode:** single instruction settles N transfers (discriminator 255, ~1,000 CU base)
- **Streamed mode:** open → meter → close with final settlement
- **Savings:** up to 98.3% CU reduction vs SPL Token (6,200 → 105 CU per transfer)
- **Pricing:** $0.0001/token micropayments with ~1% overhead

### 7. Perps Aggregator Bridge (`src/tools/perps-tools.ts`)
Bridges `@openclawdsolana/clawd-perps-aggregator` into the orchestrator:
- Lazy-loaded — the server always boots even if the aggregator hasn't been built yet (logs to stderr and continues with zero perps tools).
- Re-tags the aggregator's `buildTools()` output into the `perps` category; one source of truth for every perps tool.
- Constructed once per server with a single `PerpsAggregator` instance reading the standard Imperial env contract.

### 8. Package and Service Integrations (`src/tools/integration-tools.ts`)
MCP exposes first-class checks for the local Solana Clawd packages and services:
- `integration_status` verifies package paths, build artifacts, gateway reachability, and key env wiring.
- Covers the local `packages/*` surfaces: `agentwallet`, `clawd`, `clawd-perps`, `clawd-perps-aggregator`, `clawd-protocol`, `clawd-sdk`, `clawd-wallet`, and `cli-standalone`.
- The perps integration also checks `Perps/clawd-agents-perps`.
- `agentkit_list_agents` loads `@solana-clawd/agent-kit` and lists local catalog agents.
- `agentkit_runtime_profile` builds an Agent Kit runtime profile by identifier.
- `gateway_health` / `gateway_registry` / `gateway_skill_catalog` check the configured Gateway service.

Gateway tools use `GATEWAY_URL` or `CLAWD_GATEWAY_URL`, defaulting to `http://127.0.0.1:8080`.

## Tool Categories

| Category       | Count | Description |
|----------------|-------|-------------|
| solana         | 11    | Public Solana market data (free) |
| helius         | 8     | Helius RPC/DAS/Webhooks |
| x402           | 9     | Payment protocol + p-token metered billing |
| leviathan      | 9     | OODA loop + autonomous agent control |
| market         | 5     | Composite intelligence (premium) |
| **perps**      | **17**| **Perps aggregator: SOR, AMM pool intel, split routing, positions, risk, realtime** |
| pump           | 8     | Pump.fun bonding curve |
| memory         | 4     | Persistent agent memory + autoDream |
| agents         | 6     | Agent fleet + skill management |
| chess          | 7     | Chess.com (autonomous agent chess) |
| federation     | N     | Federated MCP tools from external servers |
| docs           | 3     | Documentation system (list/get/search) |
| orchestrator   | 6+    | Orchestrator management, integration status, gateway health |
| deep-clawd     | 6     | DeepSeek trading agent tools |

## Resources

| Resource URI | Description |
|---|---|
| `solana-clawd://docs/{sourceId}` | Documentation source by ID |
| `solana-clawd://docs/sections` | All available sections |
| `solana-clawd://federation/status` | Federation bridge status |
| `solana-clawd://plugins/status` | Plugin registry status |
| `solana-clawd://orchestrator/tools` | All registered tools by category (incl. perps) |

## Prompts

| Prompt Name | Description |
|---|---|
| `docs_explore` | Explore framework documentation |
| `federated_query` | Query external MCP servers |
| `task_orchestrate` | Create and dispatch complex multi-agent tasks |
| `trading_ooda` | Full OODA trading cycle |
| `pump_ooda` | Pump.fun-focused OODA |
| `trade_research` | Deep token research workflow |
| `wallet_analysis` | Wallet PnL and holdings analysis |

## Environment

The perps tools honour the same Imperial env contract as the `clawd-perps` CLI:

| Variable | Default | Purpose |
|----------|---------|---------|
| `IMPERIAL_API_BASE` | `https://api.imperial.space/api/v1` | Imperial router endpoint |
| `IMPERIAL_JWT` | — | Pre-issued JWT (balances + live execution) |
| `IMPERIAL_WALLET` | — | Operator wallet pubkey |
| `IMPERIAL_LIVE` | `false` | Enable live submission (paper-first otherwise) |
| `IMPERIAL_MAX_SIZE_USD` | `100` | Hard per-order cap |
| `IMPERIAL_ALLOWED_SYMS` | `SOL,ETH,BTC` | Symbol allowlist |
| `PERPS_AGG_VENUES` | all | Enabled venues subset |
| `PERPS_AGG_PAPER` | auto | Force paper mode regardless of `IMPERIAL_LIVE` |

## Running

### One-shot curl install

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh | bash
```

The installer clones/updates the repo, installs and builds the local `packages/*` surfaces (including `clawd-perps-aggregator`) and `Perps/clawd-agents-perps`, builds this MCP package, and creates launchers in `~/.local/bin`. Full package injection requires Node.js 20-22 (engines `>=20 <23`). Use `--skip-packages` for an MCP-only install on newer Node.

MCP client config:

```json
{
  "mcpServers": {
    "solana-clawd": {
      "command": "/Users/YOU/.local/bin/solana-clawd-mcp",
      "env": {
        "IMPERIAL_API_BASE": "https://api.imperial.space/api/v1",
        "IMPERIAL_ALLOWED_SYMS": "SOL,ETH,BTC",
        "IMPERIAL_MAX_SIZE_USD": "100"
      }
    }
  }
}
```

### Manual local build

The MCP server depends on the aggregator via a `file:` reference, so build the aggregator first:

```bash
# 1. Build the aggregator (provides the perps tools)
cd packages/clawd-perps-aggregator
npm install && npm run build

# 2. Build the MCP server (links the aggregator, registers perps_* tools)
cd ../../MCP
npm install
npm run build
```

### STDIO mode (default for Cursor/VS Code/Claude Desktop)
```bash
node dist/index.js
```

### HTTP+SSE mode
```bash
PORT=3001 node dist/http.js
```

### Health check
```bash
curl http://localhost:3001/health
```

### MCP smoke test
```bash
curl -i -s -X POST http://127.0.0.1:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0.0"}}}'
```

Use the returned `mcp-session-id` header to call `tools/list` and confirm the perps tools are present:

```text
perps_list_venues   perps_route_trade        perps_get_pools
perps_get_quote     perps_route_trade_split  perps_simulate_order
perps_get_positions perps_liquidation_risks  perps_score_market
```

## Verified Status

Verified on May 22, 2026:
- `npm install` + `npm run build` completed for `packages/clawd-perps-aggregator` and `MCP`.
- The aggregator linked into MCP via `file:../packages/clawd-perps-aggregator`.
- `createServer()` initialized and `tools/list` returned **105 tools**, including all **17 `perps_*` tools** under the `perps` category.
- `tools/call perps_list_venues` executed end-to-end through the orchestrator and returned Phoenix, Flash Trade, Jupiter, and GMTrade.
- The perps bridge is lazy-loaded: when the aggregator is unbuilt, the server still boots (zero perps tools, stderr notice).
- Aggregator AMM math unit-tests pass against hand-calculated values (util 0.8, skew 0.6, predicted funding 0.003%/h, borrow 0.0064%/h at u=0.8); `poolImpact` signs verified economically correct; split router fans a capacity-constrained order across venues.

Known caveats:
- The default external Solana MCP federation URL currently returns HTTP 404 during direct discovery. Set `SOLANA_MCP_URL` to a compatible Streamable HTTP endpoint to enable that route.
- Perps reads/quotes call the live Imperial API; without network access they return graceful errors. Execution requires `IMPERIAL_JWT` + `IMPERIAL_LIVE=true`.
- Helius, Birdeye, x402, Deep Clawd, and facilitator features require their matching environment variables.

## Versions

- **v1.0.0** — Original monolithic server with 15 Solana tools
- **v2.0.0** — Expanded to 50+ tools, Leviathan/OODA integration
- **v3.0.0** — Plugin Registry, Federation Bridge, Agent Task Router, Docs System, PTokenStreamFacilitator
- **v3.1.0** — Perps Aggregator bridge: 17 `perps_*` tools (SOR, AMM pool intel, split routing, positions, risk, realtime)

## Related

- [Perps Aggregator](../packages/clawd-perps-aggregator) — the SOR/SDK/MCP package these tools come from
- [/Perps stack](../Perps) — Imperial router, Phoenix MM, TWAMM, strategy engine
- [Official Solana MCP](https://github.com/solana-labs/solana-mcp) — external MCP server we federate with
- [x402 Payment Protocol](../x402/) — payment stream and p-token facilitator
- [Leviathan OODA](../leviathan/) — autonomous agent loop
- [Deep Clawd](../deep-clawd/) — DeepSeek trading agent
