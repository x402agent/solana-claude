# solana-clawd MCP Server v3 — Orchestrated Command & Control

The MCP (Model Context Protocol) server is the **central orchestration plane** for the entire Solana Clawd framework. It transforms a monolithic tool server into a federated, plugin-driven command-and-control layer that discovers, routes, meters, and settles every capability across all subsystems.

## Architecture

```
                    MCP Server (server.ts)
  ┌──────────┐  ┌────────────┐  ┌──────────────┐
  │Plugin    │  │Federation  │  │Agent Task    │
  │Registry  │  │Bridge      │  │Router        │
  └────┬─────┘  └─────┬──────┘  └──────┬───────┘
       │              │                │
       ▼              ▼                ▼
  ┌──────────────────────────────────────────┐
  │           Orchestrator + SessionMeter    │
  │  + optional PTokenStreamFacilitator      │
  └──────────────────────────────────────────┘
       │              │                │
       ▼              ▼                ▼
  Core Tools   Leviathan    Market      x402
  (inline)    (plugin)     (inline)    (plugin)
```

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

### 7. Package and Service Integrations (`src/tools/integration-tools.ts`)
MCP now exposes first-class checks for the local Solana Clawd packages and services:
- `integration_status` verifies package paths, build artifacts, gateway reachability, and key env wiring.
- `integration_status` includes the local `packages/*` surfaces: `agentwallet`, `clawd`, `clawd-perps`, `clawd-protocol`, `clawd-sdk`, `clawd-wallet`, and `cli-standalone`.
- The perps integration also checks `perps/clawd-agents-perps`.
- `agentkit_list_agents` loads `@solana-clawd/agent-kit` from `agent-kit/packages/agent-kit/dist` and lists local catalog agents.
- `agentkit_runtime_profile` builds an Agent Kit runtime profile by identifier.
- `gateway_health` checks the configured Gateway service.
- `gateway_registry` reads the Gateway public agent registry.
- `gateway_skill_catalog` reads the Gateway Skill Hub catalog.

Gateway tools use `GATEWAY_URL` or `CLAWD_GATEWAY_URL`, defaulting to `http://127.0.0.1:8080`.

## Tool Categories

| Category       | Count | Description |
|----------------|-------|-------------|
| solana         | 11    | Public Solana market data (free) |
| helius         | 8     | Helius RPC/DAS/Webhooks |
| x402           | 9     | Payment protocol + p-token metered billing |
| leviathan      | 9     | OODA loop + autonomous agent control |
| market         | 5     | Composite intelligence (premium) |
| pump           | 8     | Pump.fun bonding curve |
| memory         | 4     | Persistent agent memory + autoDream |
| agents         | 6     | Agent fleet + skill management |
| chess          | 7     | Chess.com (autonomous agent chess) |
| federation     | N     | Federated MCP tools from external servers |
| docs           | 3     | Documentation system (list/get/search) |
| orchestrator   | 6+    | Orchestrator management, integration status, gateway health |
| deep-clawd     | 6     | DeepSeek trading agent tools |
| integrations   | 6     | Agent Kit and Gateway package/service bridge tools |

## Resources

| Resource URI | Description |
|---|---|
| `solana-clawd://docs/{sourceId}` | Documentation source by ID |
| `solana-clawd://docs/sections` | All available sections |
| `solana-clawd://federation/status` | Federation bridge status |
| `solana-clawd://plugins/status` | Plugin registry status |

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

## Running

### One-shot curl install

Install or update the MCP server, local package surfaces, and launchers:

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/mcp/install.sh | bash
```

The installer:
- clones or updates `https://github.com/x402agent/solana-clawd.git` into `~/.solana-clawd-mcp/solana-clawd`;
- installs and builds `packages/agentwallet`, `packages/clawd`, `packages/clawd-perps`, `packages/clawd-sdk`, `packages/clawd-wallet`, `packages/cli-standalone`, and `perps/clawd-agents-perps`;
- probes/builds `packages/clawd-protocol` with `anchor build` when Anchor is available, otherwise `cargo build` when Rust is available;
- installs and builds this `mcp` package;
- creates launchers in `~/.local/bin`: `solana-clawd-mcp`, `solana-clawd-mcp-http`, `agentwallet`, `clawd`, `clawd-code`, `clawd-leviathan`, `clawd-perps`, `clawd-standalone`, and `clawd-agents-perps`;
- creates `~/.config/solana-clawd-mcp/.env` for optional API keys and service URLs.

Full package injection requires Node.js 20-22 because the repository package engines are `>=20 <23`. Use `--skip-packages` for an MCP-only install on newer Node versions.

Common overrides:

```bash
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/mcp/install.sh | bash -s -- --branch=newnew
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/mcp/install.sh | bash -s -- --install-dir="$HOME/dev/solana-clawd-mcp"
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/mcp/install.sh | bash -s -- --skip-packages
```

MCP client config:

```json
{
  "mcpServers": {
    "solana-clawd": {
      "command": "/Users/YOU/.local/bin/solana-clawd-mcp"
    }
  }
}
```

### Manual local build

Install and build from this package directory:

```bash
cd mcp
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

Use the returned `mcp-session-id` header to call `tools/list` and confirm these tools are present:

```text
integration_status
agentkit_list_agents
agentkit_runtime_profile
gateway_health
gateway_registry
gateway_skill_catalog
orchestrator_health
plugin_status
```

## Building

```bash
cd mcp
npm run build
```

## Verified Status

Verified on May 20, 2026:
- `npm install` completed for `mcp`.
- `npm run build` completed successfully.
- `createServer()` initialized successfully.
- HTTP mode started on `PORT=3099`.
- `GET /health` returned `status: ok`.
- MCP `initialize` returned server `solana-clawd` version `3.0.0`.
- `tools/list` included the Agent Kit, Gateway, integration, orchestrator, docs, x402, market, Leviathan, Deep Clawd, Solana, Pump.fun, memory, and chess tools.
- `agentkit_list_agents` successfully loaded Agent Kit and returned 135 local agents.
- `integration_status` found the local `agent-kit`, `gateway`, `sdk`, `x402`, `leviathan`, `deep-clawd`, `agents`, and `formal_verification` paths.
- `gateway` built successfully; local startup requires `HELIUS_RPC_URL` or `GATEKEEPER_RPC_URL`.
- With `GATEKEEPER_RPC_URL=https://api.mainnet-beta.solana.com` and `GATEWAY_URL=http://127.0.0.1:18080`, the MCP `gateway_health` tool returned Gateway `status: ok`.

Known caveats:
- The default external Solana MCP federation URL currently returns HTTP 404 during direct discovery. Local MCP startup still works; set `SOLANA_MCP_URL` to a compatible Streamable HTTP MCP endpoint to enable that federated route.
- Gateway-backed tools require the Gateway service to be running at `GATEWAY_URL` or `CLAWD_GATEWAY_URL`.
- Helius, Birdeye, x402, Deep Clawd, and facilitator features require their matching environment variables.

## Versions

- **v1.0.0** — Original monolithic server with 15 Solana tools
- **v2.0.0** — Expanded to 50+ tools, Leviathan/OODA integration
- **v3.0.0** — Plugin Registry, Federation Bridge, Agent Task Router, Docs System, PTokenStreamFacilitator

## Related

- [Official Solana MCP](https://github.com/solana-labs/solana-mcp) — external MCP server we federate with
- [x402 Payment Protocol](../x402/) — payment stream and p-token facilitator
- [Leviathan OODA](../leviathan/) — autonomous agent loop
- [Deep Clawd](../deep-clawd/) — DeepSeek trading agent
