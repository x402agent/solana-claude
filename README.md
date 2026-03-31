<div align="center">

```
  ____  ___  _       _    _   _    _        ____ _        _    _   _ ____
 / ___|/ _ \| |     / \  | \ | |  / \      / ___| |      / \  | | | |  _ \
 \___ \| | | | |    / _ \ |  \| | / _ \    | |   | |     / _ \ | | | | | | |
  ___) | |_| | |___/ ___ \| |\  |/ ___ \   | |___| |___ / ___ \| |_| | |_| |
 |____/ \___/|_____/_/   \_\_| \_/_/   \_\  \____|_____/_/   \_\\___/|____/
```

# solana-claude

### The open-source Solana AI agent framework — Claude Code architecture meets Solana

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](#)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blueviolet?logo=anthropic&logoColor=white)](#mcp-quick-start)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)
[![No Private Key](https://img.shields.io/badge/Private_Key-Not_Required-brightgreen)](#no-private-key-required)
[![One Shot](https://img.shields.io/badge/Setup-One_Shot-orange)](#quick-start)

**Live Solana data · Multi-agent coordination · Memory · Skills · MCP-native**

Works with Claude Desktop, Cursor, VS Code, and any MCP-compatible AI client — **no wallet or private key required.**

</div>

---

## What is this?

`solana-claude` is an open-source TypeScript framework that brings the architecture of Claude Code's leaked agentic engine — tool execution loops, multi-agent coordination, permission gating, memory extraction, SSE streaming — to Solana.

It ships as a **Model Context Protocol (MCP) server** that gives any Claude/Cursor/VS Code session access to live Solana data, an agent fleet, and a persistent memory system — all without needing a wallet.

> **No private key. No wallet. No paid API required.**
> Use it read-only with Claude Desktop in under 2 minutes.

---

## Quick Start

### Option A — Claude Desktop (2 minutes, no API key)

```bash
# 1. Clone and setup
git clone https://github.com/YOUR_USERNAME/solana-claude
cd solana-claude
bash scripts/setup.sh

# 2. Add to Claude Desktop config
# ~/Library/Application Support/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "solana-claude": {
      "command": "node",
      "args": ["/path/to/solana-claude/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. You now have 15 live Solana tools in Claude.

---

### Option B — Cursor / VS Code

Add to `.cursor/mcp.json` or `.vscode/mcp.json`:

```json
{
  "servers": {
    "solana-claude": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Then run the HTTP server:

```bash
npm run mcp:http
```

---

### Option C — Deploy to Fly.io (24/7 public access)

```bash
# Install Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
fly launch --name solana-claude --config mcp-server/fly.toml
fly deploy

# Connect any MCP client to: https://solana-claude.fly.dev/mcp
```

---

## No Private Key Required

`solana-claude` is designed to run in **read-only mode** by default:

| Feature | Private Key Required? |
|---|---|
| Live token prices | ✅ No |
| Trending tokens | ✅ No |
| Token metadata & security score | ✅ No |
| Wallet PnL (any public wallet) | ✅ No |
| Token search | ✅ No |
| Memory recall & write | ✅ No |
| Skill execution | ✅ No |
| Agent spawning (research) | ✅ No |
| **Live trade execution** | ❌ Yes (not included by default) |

Trade execution is **not wired** in this repo. The permission engine (`src/engine/permission-engine.ts`) rate-gates all trading tools at the `ask` level by default.

---

## What's Inside

```
solana-claude/
├── src/
│   ├── engine/
│   │   ├── tool-base.ts          # SolanaOSTool interface + ToolRegistry
│   │   ├── permission-engine.ts  # Wildcard rules, sim-mode, trade thresholds
│   │   ├── tool-executor.ts      # Validation, timeout, retry, concurrency
│   │   └── query-engine.ts       # Multi-model streaming LLM (OpenRouter/xAI/Anthropic)
│   ├── coordinator/
│   │   └── coordinator.ts        # Multi-agent orchestrator (OODA phases)
│   ├── tasks/
│   │   └── task-manager.ts       # Task lifecycle (ooda, scanner, dream, skill, shell)
│   ├── skills/
│   │   └── skill-registry.ts     # SKILL.md loader + remote sync
│   ├── memory/
│   │   └── extract-memories.ts   # KNOWN/LEARNED/INFERRED auto-extraction
│   ├── gateway/
│   │   ├── sse-transport.ts      # Bidirectional SSE (adapted from Claude Code bridge)
│   │   └── gateway-integration.ts # Event router wiring all gateway pieces
│   ├── cli/
│   │   └── cli.ts                # NDJSON IO, auto-mode rules, CLI transport
│   └── shared/
│       └── message-types.ts      # 19 message types for all rendering surfaces
│
└── mcp-server/                   # MCP server (Fly.io deployable)
    ├── src/
    │   ├── server.ts             # 15 tools, 4 resources, 5 prompts
    │   ├── http.ts               # HTTP + SSE entrypoint
    │   └── index.ts              # STDIO entrypoint (Claude Desktop)
    ├── Dockerfile                # Multi-stage build
    └── fly.toml                  # Fly.io config
```

---

## MCP Tools

Once connected, your AI assistant has access to:

| Tool | Description |
|---|---|
| `solana_price` | Live price + 24h change for any token |
| `solana_trending` | Trending tokens by timeframe |
| `solana_token_info` | Token metadata, security score, market data |
| `solana_wallet_pnl` | Wallet PnL and trade history (any public wallet) |
| `solana_search` | Token search by name or symbol |
| `agent_spawn` | Spawn a research/analysis coordinator worker |
| `agent_list` | List active coordinator workers |
| `agent_stop` | Stop a worker |
| `memory_recall` | Query persistent agent memory |
| `memory_write` | Write facts to persistent memory |
| `task_create` | Create background tasks (OODA, scanner, dream, skill) |
| `task_list` | List active tasks |
| `skill_list` | List available skills |
| `skill_run` | Execute a skill |
| `gateway_health` | Health check |

---

## MCP Prompts

| Prompt | What it does |
|---|---|
| `solanaos_overview` | Architecture tour |
| `trade_research` | Full token research workflow |
| `ooda_loop` | Observe → Orient → Decide → Act cycle |
| `explain_skill` | Deep dive on any skill |
| `soul_context` | Load agent identity context |

---

## Architecture

Adapted from Anthropic's Claude Code architecture (the leaked source, March 2026):

```
User prompt
    │
    ▼
QueryEngine (streaming, multi-model)
    │  tool call detected
    ▼
PermissionEngine (wildcard rules: allow/ask/deny)
    │  approved
    ▼
ToolExecutor (validate → timeout → retry → concurrency)
    │  result
    ▼
Memory Extraction (KNOWN / LEARNED / INFERRED)
    │
    ▼
Coordinator (multi-agent fan-out, OODA phases)
    │
    ▼
SSE Transport → Client (web / Telegram / CLI / MCP)
```

**Key design decisions:**
- **No React+Ink** — message types are platform-agnostic (web, Telegram, NDJSON)
- **Provider-agnostic** — OpenRouter, xAI, Anthropic, local MLX all work
- **Deny-first** — trading tools require explicit approval, no surprise buys
- **SOUL.md** — agent identity document drives coordinator system prompts

---

## Optional: Add an LLM key for standalone agent mode

The MCP server routes data only — your Claude Desktop provides the LLM. But if you want the standalone `QueryEngine` to call LLMs directly:

```bash
# Free models via OpenRouter (no CC required for basic tier)
echo "OPENROUTER_API_KEY=sk-or-..." >> .env

# Or xAI Grok
echo "XAI_API_KEY=..." >> .env
```

Free models available on OpenRouter that work with the query engine:
- `meta-llama/llama-4-scout:free`
- `google/gemini-2.0-flash:free`
- `mistralai/mistral-7b-instruct:free`

---

## Contributing

PRs welcome. Key areas:

- **New Solana tools** — add to `src/engine/tool-base.ts` + `mcp-server/src/server.ts`
- **New skills** — drop a `SKILL.md` in `skills/`
- **New memory tiers** — extend `src/memory/extract-memories.ts`
- **Frontend renderers** — use message types from `src/shared/message-types.ts`

---

## License

MIT — use it, fork it, build on it.

---

<div align="center">

**Built with the architecture of [Claude Code](https://github.com/nirholas/claude-code) · Runs on [Solana](https://solana.com)**

</div>
