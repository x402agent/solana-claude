# Clawd Memory Agent Rules

This directory contains Clawd Memory, the local-first memory layer for Clawd agents.

## Use Clawd Names First

- Product/workflow name: `Clawd Memory`
- CLI: `clawd-brain`
- Python agent API: `mnemosyne.clawd_brain.ClawdBrain`
- Default bank: `clawd`
- Default vault: `MemeBRain/vault`

The `mnemosyne` package, `MNEMOSYNE_*` environment variables, and `mnemosyne_*` Hermes/MCP tools are compatibility surfaces. Do not rename them casually.

## Agent Memory Workflow

1. Recall before planning when a task depends on prior context.
2. Remember durable facts, user preferences, architecture decisions, protocol research, public wallet labels, risk findings, and deployment details.
3. Archive URLs or investigation topics with `research`.
4. Import OODA journal ticks with `ingest-ooda` when operational observations should become reusable context.
5. Avoid storing secrets, raw API keys, private keys, seed phrases, session cookies, or noisy transient logs.

## Local Commands

```bash
python3 -m mnemosyne.clawd_brain init
python3 -m mnemosyne.clawd_brain status
python3 -m mnemosyne.clawd_brain remember "Title" "Durable fact." --kind agent --tag clawd
python3 -m mnemosyne.clawd_brain recall "query"
python3 -m mnemosyne.clawd_brain research "https://example.com" --tag research
```

## Documentation Rule

User-facing docs should say Clawd Memory. Mention Mnemosyne only when referring to the underlying package, Python import path, engine internals, or compatibility tooling.
