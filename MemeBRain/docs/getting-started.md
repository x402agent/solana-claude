# Getting Started With Clawd Memory

This guide sets up the Clawd agent memory layer locally.

## 1. Install

From the source tree:

```bash
cd /Users/8bit/bots/Cladwbot-solana/solana-clawd/MemeBRain
python3 -m pip install -e ".[all]"
```

If you only need the CLI from the checked-out repo, you can run the module directly without installing:

```bash
python3 -m mnemosyne.clawd_brain --help
```

Package compatibility note: the Python package is still named `mnemosyne-memory`, and the module is still `mnemosyne`. The Clawd-facing command is `clawd-brain`.

## 2. Initialize The Clawd Bank

```bash
python3 -m mnemosyne.clawd_brain init
```

Expected output includes:

- `bank`: `clawd`
- `vault`: the markdown vault path
- `index_db`: the Clawd vault index database
- `memory`: engine statistics

Override the vault location when needed:

```bash
export CLAWD_BRAIN_VAULT="$PWD/vault"
python3 -m mnemosyne.clawd_brain init
```

## 3. Remember Durable Agent Context

```bash
python3 -m mnemosyne.clawd_brain remember \
  "Clawd Agent Contract" \
  "Recall before planning. Remember durable decisions, preferences, protocol research, and risk findings. Never store secrets." \
  --kind agent \
  --tag clawd \
  --tag agent \
  --importance 0.9
```

Use short titles and direct content. The content should be useful if another agent recalls it days later.

## 4. Recall Context

```bash
python3 -m mnemosyne.clawd_brain recall "agent memory rules" --top-k 8
```

Recall returns matching memory records and vault notes. Agents should run recall before making decisions that depend on prior context.

## 5. Archive Research

Archive a URL:

```bash
python3 -m mnemosyne.clawd_brain research "https://docs.jup.ag/" --tag solana --tag jupiter
```

Queue a topic:

```bash
python3 -m mnemosyne.clawd_brain research "BONK perpetual venue risk" --tag perp --tag risk
```

The research command creates a durable vault note and indexes it for later recall.

## 6. Ingest OODA Ticks

```bash
python3 -m mnemosyne.clawd_brain ingest-ooda --journal ../ooda/journal/ticks.jsonl --limit 100
```

Use this when the OODA loop has produced operational observations that should become durable Clawd memory.

## 7. Check Status

```bash
python3 -m mnemosyne.clawd_brain status
```

Status shows the active bank, vault path, vault note counts, link count, note counts by kind, and underlying memory stats.

## Recommended Agent Workflow

1. Recall relevant context for the user/task.
2. Do the work.
3. Remember decisions, preferences, risk findings, and deployment facts.
4. Archive URLs or research topics that should be reusable.
5. Consolidate periodically through the Hermes/MCP `mnemosyne_sleep` tool or the lower-level engine.

## What Not To Store

- API keys, private keys, seed phrases, tokens, passwords, or session cookies.
- Raw logs that contain secrets or customer data.
- Large command output that does not create future context.
- Temporary thoughts that belong in scratchpad only.

## Next

- Read [Architecture](architecture.md) for the data model.
- Read [Configuration](configuration.md) for environment variables.
- Read [API Reference](api-reference.md) for Python usage.
