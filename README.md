<div align="center">

```
  _____       __                        ________                __
 / ___/____  / /___ _____  ____ _     / ____/ /___ ___  ______/ /__
 \__ \/ __ \/ / __ `/ __ \/ __ `/   / /   / / __ `/ / / / __  / _ \
___/ / /_/ / / /_/ / / / / /_/ /   / /___/ / /_/ / /_/ / /_/ /  __/
/____/\____/_/\__,_/_/ /_/\__,_/    \____/_/\__,_/\__,_/\__,_/\___/
```

# solana-claude

**The Claude Code agentic engine, rebuilt for Solana.**

[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-native-blueviolet)](https://modelcontextprotocol.io)
[![Helius](https://img.shields.io/badge/Helius-RPC%20%2B%20WebSocket-orange)](https://helius.dev)
[![No Private Key](https://img.shields.io/badge/private%20key-not%20required-brightgreen)](README.md)
[![Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-ready-purple)](README.md#claude-desktop)
[![Fly.io](https://img.shields.io/badge/Fly.io-deployable-blue)](mcp-server/fly.toml)
[![Tools](https://img.shields.io/badge/MCP%20tools-23-ff6b35)](mcp-server/src/server.ts)

[**Quick Start**](#quick-start) · [**MCP Tools**](#mcp-tools-23) · [**Onchain Listener**](#onchain-event-listener) · [**OODA Loop**](#ooda-trading-loop) · [**Deploy**](#deploy-to-flyio)

</div>

---

## What Is This?

`solana-claude` is an open-source agent framework that ports the core agentic DNA from [Anthropic's Claude Code](https://github.com/x402agent/solana-claude) into the Solana ecosystem.

It runs as a **Model Context Protocol (MCP) server** — meaning any Claude-powered client (Claude Desktop, Cursor, VS Code, Windsurf) can instantly access **23 live Solana tools** without writing a single line of code.

**No private key. No wallet. No paid API. Just clone, run, and ask.**

```
You: "What are the top 5 trending tokens right now?"
Claude: [calls solana_trending] → returns live data with security scores and volume

You: "Watch wallet 8vFz... for changes"
Claude: [calls helius_listener_setup] → returns working TypeScript code to deploy

You: "Research BONK for a potential trade"
Claude: [calls solana_token_info, solana_top_traders, helius_das_asset, memory_recall]
       → structured report: price, security score, smart money, OODA signal
```

---

## Architecture

Claude Code's leaked source (March 2026) had this core pipeline:

```
User Input → Query Engine → LLM API → Tool Execution Loop → Output
                                ↑              ↓
                         Permission Engine  AppState
                                ↑              ↓
                         Coordinator    Memory (3 tiers)
```

We adapted every layer for Solana:

| Claude Code Layer | solana-claude Equivalent |
|---|---|
| `src/state/store.ts` | `src/state/store.ts` — reactive AppState store |
| `src/state/AppStateStore.ts` | `src/state/app-state.ts` — OODA phases, memory, subscriptions |
| `src/tools/AgentTool/builtInAgents.ts` | `src/agents/built-in-agents.ts` — Explore, Scanner, OODA, Dream, Analyst, Monitor |
| `src/tools/AgentTool/agentMemory.ts` | `src/memory/extract-memories.ts` — KNOWN/LEARNED/INFERRED tiers |
| `src/tools/TaskCreateTool/` | `src/tasks/task-manager.ts` — async task lifecycle |
| `src/coordinator/` | `src/coordinator/coordinator.ts` — multi-agent routing |
| `src/bridge/` (SSE) | `src/gateway/sse-transport.ts` — gateway SSE bridge |
| `src/permissions/` | `src/engine/permission-engine.ts` — deny-first trade gating |

---

## Quick Start

### Option A — Claude Desktop (zero config)

```bash
git clone https://github.com/x402agent/solana-claude
cd solana-claude && bash scripts/setup.sh
```

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "solana-claude": {
      "command": "node",
      "args": ["/absolute/path/to/solana-claude/mcp-server/dist/index.js"],
      "env": {
        "HELIUS_API_KEY": "your-free-key-from-helius.dev"
      }
    }
  }
}
```

Restart Claude Desktop. Done. You now have 23 live Solana tools.

### Option B — Cursor / VS Code

Add to your MCP config:

```json
{
  "solana-claude": {
    "command": "node",
    "args": ["mcp-server/dist/index.js"],
    "cwd": "/path/to/solana-claude"
  }
}
```

### Option C — Public URL (no install)

```json
{
  "solana-claude": {
    "type": "http",
    "url": "https://solana-claude.fly.dev/mcp"
  }
}
```

---

## MCP Tools (23)

### Solana Market Data
| Tool | What it does | API key needed |
|---|---|:-:|
| `solana_price` | Live price for any token (mint or symbol) | ❌ |
| `solana_trending` | Top trending tokens right now | ❌ |
| `solana_token_info` | Token metadata + security score | ❌ |
| `solana_wallet_pnl` | Any wallet's realized + unrealized P&L | ❌ |
| `solana_search` | Search tokens by name or symbol | ❌ |
| `solana_top_traders` | Smart money wallets for a token | ❌ |
| `solana_wallet_tokens` | Token balances for any wallet | ❌ |
| `sol_price` | Quick SOL/USD via CoinGecko | ❌ |

### Helius Onchain (RPC + DAS + Enhanced Txs)
| Tool | What it does | API key needed |
|---|---|:-:|
| `helius_account_info` | Full account data via RPC | ❌ (public fallback) |
| `helius_balance` | SOL balance in SOL (not lamports) | ❌ |
| `helius_transactions` | Parsed transaction history (SWAP/NFT/TRANSFER filters) | ✅ (free) |
| `helius_priority_fee` | Real-time fee estimate, all levels | ❌ |
| `helius_das_asset` | DAS metadata — NFT/token, creators, royalties | ✅ (free) |
| `helius_webhook_create` | Create live address-watching webhooks | ✅ (free) |
| `helius_webhook_list` | List active webhooks | ✅ (free) |
| `helius_listener_setup` | TypeScript code for WebSocket listeners | ❌ |

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

### Skills
| Tool | What it does |
|---|---|
| `skill_list` | List available SKILL.md files |
| `skill_read` | Read a skill's content |

---

## Onchain Event Listener

Built on top of [Helius WebSockets](https://docs.helius.dev/data-streaming-event-listening/overview). Auto-reconnects with exponential backoff. Uses Node 22 native `WebSocket`.

```typescript
import { HeliusListener, HeliusClient } from "./src/helius/index.js";

const client = new HeliusClient({ apiKey: process.env.HELIUS_API_KEY! });
const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });

await listener.connect();

// 1. Account changes (standard WebSocket — accountSubscribe)
await listener.subscribeAccount("WALLET_ADDRESS", (data) => {
  console.log("SOL balance:", data.account.lamports / 1e9);
});

// 2. All Token Program transactions (Enhanced WebSocket — Helius-specific)
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

## OODA Trading Loop

Adapted from [SolanaOS strategy.md](strategy.md) — the multi-venue OODA cycle.

```
OBSERVE  → sol_price, trending, helius_priority_fee, memory KNOWN
ORIENT   → score candidates (trend 25pt + momentum 20pt + liquidity 20pt + participation 15pt - execution risk 20pt)
DECIDE   → confidence ≥ 60? → size band (0.5x / 1.0x / 1.25x / 1.5x)
ACT      → ⚠️  trade_execute gated at `ask` permission (human approval required)
LEARN    → write INFERRED signals → Dream agent promotes to LEARNED
```

```bash
npx tsx examples/ooda-loop.ts
```

### Built-in Agent Fleet

Adapted from Claude Code's `builtInAgents.ts`:

```
Explore   — read-only research, 10 turns, readOnly permission, cheap
Scanner   — market scan, 25 turns, watches trending + smart money
OODA      — full trading cycle, 40 turns, ask permission, sync (can show prompts)
Dream     — memory consolidation, 20 turns, promotes INFERRED → LEARNED
Analyst   — structured research reports, 30 turns, high effort
Monitor   — onchain listener setup, 15 turns, configures webhooks
```

---

## Memory System

Three tiers inspired by SolanaOS epistemology + Claude Code's memory extraction:

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
// → "# Agent Memory\n## KNOWN\n- ...\n## LEARNED\n- ...\n## INFERRED\n- ..."
```

---

## Permission Engine

All trade operations are **deny-first**. Adapted from Claude Code's permission system.

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
solana-claude/
├── mcp-server/           MCP server (Claude Desktop, Cursor, Fly.io)
│   ├── src/
│   │   ├── server.ts     23 tools, 4 resources, 5 prompts
│   │   ├── http.ts       HTTP + SSE + Streamable transport
│   │   └── index.ts      STDIO transport (Claude Desktop)
│   ├── Dockerfile
│   └── fly.toml
├── src/
│   ├── helius/           Helius RPC + DAS + Webhooks + WebSocket listener
│   │   ├── helius-client.ts     HTTP client (RPC, DAS, enhanced txs, priority fees)
│   │   ├── onchain-listener.ts  WebSocket (account/tx/logs/slot/signature/enhanced)
│   │   └── index.ts
│   ├── state/            AppState (adapted from Claude Code)
│   │   ├── store.ts      Reactive store (pure TS, no React)
│   │   └── app-state.ts  OODA phases, memory tiers, permissions, agent fleet
│   ├── agents/           Agent definitions
│   │   └── built-in-agents.ts  Explore, Scanner, OODA, Dream, Analyst, Monitor
│   ├── tools/            Tool definitions and registry
│   │   └── tool-registry.ts    ToolDef interface, registry, executor
│   ├── engine/           Permission + query engine
│   ├── coordinator/      Multi-agent coordinator
│   ├── memory/           Memory extraction (KNOWN/LEARNED/INFERRED)
│   ├── gateway/          SSE transport (gateway bridge)
│   ├── tasks/            Task lifecycle manager
│   ├── skills/           Skill registry
│   └── shared/           Message types, model catalog, tool policy
├── examples/
│   ├── listen-wallet.ts  Real-time wallet monitor (account + tx + slot subs)
│   └── ooda-loop.ts      Full OODA cycle demo
├── skills/
│   └── solanaos.md       SolanaOS install + operate skill
├── scripts/
│   └── setup.sh          One-shot setup
├── SOUL.md               Agent identity
├── strategy.md           Multi-venue trading strategy (SolanaOS v2.0)
└── .env.example          All env vars documented
```

---

## Environment Variables

```bash
# Recommended — free at helius.dev (1M credits/month)
HELIUS_API_KEY=            # RPC, DAS, enhanced txs, webhooks, WebSocket
HELIUS_RPC_URL=            # auto-built from key if blank
HELIUS_WSS_URL=            # WebSocket endpoint

# Optional — public APIs work without these
SOLANA_TRACKER_API_KEY=    # trend data, enhanced token info

# Optional — MCP mode uses Claude's built-in model
OPENROUTER_API_KEY=        # or XAI_API_KEY or ANTHROPIC_API_KEY

# Optional — secure public deployment
MCP_API_KEY=               # Bearer token for remote MCP server
```

---

## Contributing

PRs welcome. Key areas:
- **New Solana tools** — DeFi protocols, NFT markets, compressed NFTs
- **LaserStream gRPC** — ultra-low latency with `helius-laserstream` package
- **Persistent memory** — swap in-process memory for Honcho v3 or SQLite
- **Voice integration** — SolanaOS STT/TTS surfaces
- **Yellowstone gRPC** — Geyser plugin integration

---

## Credits

- **[Anthropic Claude Code](https://github.com/nirholas/claude-code)** — agentic architecture (leaked March 2026)
- **[SolanaOS](https://github.com/x402agent/SolanaOS)** — OODA strategy, Honcho memory, Solana tooling
- **[Helius](https://helius.dev)** — best-in-class Solana RPC, DAS, streaming
- **[Model Context Protocol](https://modelcontextprotocol.io)** — the glue that makes it work in Claude Desktop

---

<div align="center">

MIT · [github.com/x402agent/solana-claude](https://github.com/x402agent/solana-claude) · [seeker.solanaos.net](https://seeker.solanaos.net)

</div>
