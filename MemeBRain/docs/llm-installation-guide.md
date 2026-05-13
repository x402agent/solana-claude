# Clawd Memory Installation Guide For LLM Agents

> Target audience: AI agents that need to install, configure, and verify Clawd Memory for a user.
> Use this when the user asks to set up Clawd memory, agent memory, Hermes memory, or local persistent memory.

## Decision Path

| User has | Use |
|---|---|
| This source checkout | Run `python3 -m mnemosyne.clawd_brain ...` directly |
| Wants editable development install | `python3 -m pip install -e ".[all,dev]"` |
| Wants package install | `pip install mnemosyne-memory[all]` |
| Uses Hermes | Register the existing Mnemosyne-compatible provider |

The package and module names remain `mnemosyne-memory` and `mnemosyne` for compatibility. The Clawd-facing CLI is `clawd-brain`.

## Source Checkout Setup

```bash
cd /Users/8bit/bots/Cladwbot-solana/solana-clawd/MemeBRain
python3 -m mnemosyne.clawd_brain init
python3 -m mnemosyne.clawd_brain status
```

If imports fail, install editable:

```bash
python3 -m pip install -e ".[all,dev]"
```

## Verify Clawd Memory

Run a write and recall:

```bash
python3 -m mnemosyne.clawd_brain remember \
  "Clawd Memory Install Check" \
  "Clawd Memory was initialized and verified locally." \
  --kind agent \
  --tag clawd \
  --importance 0.8

python3 -m mnemosyne.clawd_brain recall "install check" --top-k 3
```

Expected result: JSON containing at least one matching memory or vault note.

## Hermes Setup

Install or register the provider:

```bash
pip install mnemosyne-memory[all]
python -m mnemosyne.install
```

Configure Hermes:

```bash
hermes config set memory.provider mnemosyne
```

Or edit `~/.hermes/config.yaml`:

```yaml
memory:
  provider: mnemosyne
plugins:
  enabled:
    - mnemosyne
```

Verify:

```bash
hermes gateway restart
hermes memory status
hermes mnemosyne stats
hermes tools list | grep mnemosyne
```

Expected provider/tool names still contain `mnemosyne`. Treat those as compatibility names for Clawd Memory.

## Agent Usage Rules

- Always recall before answering if the task depends on prior Clawd context.
- Use `remember` for durable facts, preferences, decisions, and risk findings.
- Use `research` for URLs and investigation topics.
- Do not store secrets or private keys.
- Prefer `kind`, `source`, `tag`, and `importance` on every durable memory.

## Environment

| Variable | Use |
|---|---|
| `CLAWD_BRAIN_VAULT` | Override the Clawd markdown vault |
| `MNEMOSYNE_DATA_DIR` | Override the SQLite engine data directory |
| `MNEMOSYNE_HOST_LLM_ENABLED` | Route consolidation through a host framework LLM |
| `MNEMOSYNE_LLM_BASE_URL` | Use an OpenAI-compatible consolidation endpoint |
| `MNEMOSYNE_LLM_API_KEY` | API key for that endpoint |
| `MNEMOSYNE_LLM_MODEL` | Consolidation model |

## Troubleshooting

### `No module named mnemosyne`

Install from the source directory:

```bash
python3 -m pip install -e ".[all]"
```

### Hermes provider not found

```bash
python -m mnemosyne.install
hermes gateway restart
hermes memory status
```

### Recall returns nothing

Write a test memory, confirm `status`, and check that the same `--bank` and `CLAWD_BRAIN_VAULT` are being used.
