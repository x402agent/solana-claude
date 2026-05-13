# Clawd Memory

Local-first memory for Clawd agents.

Clawd Memory is the persistent brain layer for Solana Clawd. It gives agents a durable memory bank, a markdown research vault, fast local recall, and a simple CLI for saving decisions, user preferences, wallet notes, protocol research, trading context, and agent operating state.

The storage engine is the existing `mnemosyne` Python package. The Clawd interface is `clawd-brain`, backed by the default `clawd` bank and the `MemeBRain/vault` markdown vault. Keep the engine names stable unless you are ready to migrate imports, plugin paths, and stored data.

## What It Does

- Stores agent memory locally in SQLite, with no required cloud database.
- Keeps a Clawd markdown vault with folders for research, signals, trades, agents, protocols, wallets, and perps.
- Recalls context with hybrid memory search and matching vault notes.
- Archives URLs and research prompts into durable notes.
- Imports OODA journal ticks into memory.
- Supports Hermes/MCP integrations through the existing Mnemosyne-compatible tools.

## Quick Start

From this directory:

```bash
cd /Users/8bit/bots/Cladwbot-solana/solana-clawd/MemeBRain
python3 -m mnemosyne.clawd_brain init
python3 -m mnemosyne.clawd_brain remember "Jupiter Perps Risk" "Track [[Jupiter]] liquidity, funding, route quality, and oracle failure modes." --kind perp --tag solana --tag risk
python3 -m mnemosyne.clawd_brain recall "Jupiter perp risk"
python3 -m mnemosyne.clawd_brain status
```

If installed as a package, use the console script:

```bash
clawd-brain init
clawd-brain remember "User Preference" "The user wants concise, direct engineering updates." --kind agent --tag preference
clawd-brain research "https://docs.jup.ag/"
clawd-brain recall "user communication preferences"
```

From the repo root, the helper scripts may also be available:

```bash
npm run brain:init
npm run brain:status
npm run brain:ingest-ooda
```

## Agent Memory Contract

Agents should use Clawd Memory deliberately:

- Recall before planning when the task involves a returning user, existing protocol research, wallet history, trading notes, or previous architecture decisions.
- Remember durable facts, preferences, decisions, risk findings, protocol notes, wallet labels, deployment details, and postmortems.
- Do not remember transient command output, secrets, raw API keys, private keys, or noisy stack traces unless the user explicitly asks for an incident record.
- Prefer short, factual memories with clear titles, tags, source, and kind.
- Use `research` for URLs and investigation topics that should become vault notes.
- Use `ingest-ooda` to convert OODA ticks into durable agent context.

Useful kinds:

| Kind | Use |
|---|---|
| `agent` | Operating rules, user preferences, workflow decisions |
| `research` | URLs, protocol notes, market structure, docs |
| `signal` | Market, social, token, or infrastructure signal |
| `trade` | Trade plans, entry/exit rationale, post-trade review |
| `protocol` | Solana protocol knowledge and integration notes |
| `wallet` | Public wallet labels, behavior notes, portfolio context |
| `perp` | Perpetual venue, oracle, liquidation, funding, or route risk |
| `note` | General memory |

## Storage Layout

Clawd Memory writes to two local stores:

```text
MemeBRain/vault/
├── 00-inbox/
├── 10-research/
├── 20-signals/
├── 30-trades/
├── 40-agents/
├── 50-protocols/
├── 60-wallets/
├── 70-perps/
└── 90-indexes/clawd-brain.db
```

The SQLite memory engine uses `MNEMOSYNE_DATA_DIR`, defaulting to the Hermes data directory when unset. Named banks live under that data directory. The Clawd default bank is `clawd`.

Important environment variables:

| Variable | Purpose |
|---|---|
| `CLAWD_BRAIN_VAULT` | Override the markdown vault path |
| `MNEMOSYNE_DATA_DIR` | Override the SQLite memory data directory |
| `MNEMOSYNE_VEC_TYPE` | Vector storage type: `int8`, `float32`, or `bit` |
| `MNEMOSYNE_HOST_LLM_ENABLED` | Let a host agent framework provide the LLM for consolidation |
| `MNEMOSYNE_LLM_BASE_URL` | OpenAI-compatible remote LLM base URL for consolidation |
| `MNEMOSYNE_LLM_API_KEY` | API key for the remote LLM endpoint |
| `MNEMOSYNE_LLM_MODEL` | Model identifier for consolidation |

## CLI Reference

```bash
clawd-brain --help
clawd-brain init
clawd-brain status
clawd-brain remember TITLE CONTENT --kind research --source clawd --tag solana --importance 0.8
clawd-brain recall QUERY --top-k 8
clawd-brain research URL_OR_TOPIC --tag solana
clawd-brain ingest-ooda --journal ../ooda/journal/ticks.jsonl --limit 100
```

Every command accepts:

```bash
--bank clawd
--vault /path/to/vault
```

## Python Usage

Use the Clawd layer for agent-facing memory:

```python
from mnemosyne.clawd_brain import ClawdBrain

brain = ClawdBrain()
brain.remember(
    "Clawd Gateway",
    "The public worker endpoint is https://clawd.x402.wtf.",
    kind="agent",
    tags=["deployment", "worker"],
)

result = brain.recall("worker endpoint")
print(result)
```

Use the lower-level engine only when you need raw BEAM operations:

```python
from mnemosyne import Mnemosyne

mem = Mnemosyne(bank="clawd", session_id="clawd-brain")
mem.remember("Raw engine memory", importance=0.5)
print(mem.recall("engine memory"))
```

## Hermes And MCP

The Hermes plugin and MCP server still expose `mnemosyne_*` tool names for compatibility:

| Tool | Clawd usage |
|---|---|
| `mnemosyne_remember` | Store durable Clawd agent memory |
| `mnemosyne_recall` | Retrieve relevant context before a response or action |
| `mnemosyne_sleep` | Consolidate working memory into episodic memory |
| `mnemosyne_stats` | Inspect memory state |
| `mnemosyne_scratchpad_*` | Use temporary reasoning workspace |
| `mnemosyne_triple_*` | Store/query temporal knowledge graph facts |

For new Clawd-native code, prefer `ClawdBrain` or `clawd-brain`. For existing Hermes/MCP clients, keep the compatibility tool names.

## Architecture

Clawd Memory has four layers:

| Layer | Responsibility |
|---|---|
| Agent contract | When to recall, remember, research, and consolidate |
| Clawd brain layer | `ClawdBrain`, vault notes, tags, Solana/OODA metadata |
| Memory engine | BEAM working memory, episodic memory, scratchpad, hybrid recall |
| Persistence | SQLite databases and markdown vault files |

See [docs/architecture.md](docs/architecture.md) for details.

## Docs

- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [API Reference](docs/api-reference.md)
- [Hermes Integration](docs/hermes-integration.md)
- [LLM Agent Installation Guide](docs/llm-installation-guide.md)
- [Comparison Notes](docs/comparison.md)
- [BEAM Benchmark](docs/beam-benchmark.md)

## Compatibility Notes

- Package name: `mnemosyne-memory`
- Python module: `mnemosyne`
- Clawd CLI: `clawd-brain`
- Clawd Python class: `mnemosyne.clawd_brain.ClawdBrain`
- Default Clawd bank: `clawd`
- Default Clawd vault: `MemeBRain/vault`

This split is intentional. It lets Clawd own the agent memory workflow without breaking the existing storage engine, package metadata, import paths, Hermes adapter, or MCP clients.
