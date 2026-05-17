# Goblin Mode OODA Trading Harness

Devnet-only, paper-only trading harness inspired by `clawd-operator` and the Ralph OODA loop pattern.

## Safety Contract

| Guard | Enforcement |
|-------|-------------|
| Paper mode only | `parseRalphConfig` rejects non-paper frontmatter |
| Devnet only | `parseRalphConfig` rejects non-devnet and `rejectMainnet` rejects mainnet RPC URLs |
| No key handling | The harness never reads keypairs, seed phrases, wallets, or signer files |
| One action per tick | Each tick validates exactly one JSON decision |
| One position at a time | `validate` rejects new opens while a position exists |
| Position cap | `size_lamports` cannot exceed `max_position_size_lamports` |
| Kill-switch | Loop halts after configured consecutive realized losses |
| Journaled state | Every tick appends JSONL to `src/ooda/journal/ticks.jsonl` |

## Run

```bash
cd automaton-main
pnpm install

# normal paper OODA loop
pnpm ooda

# goblin mode: aggressive, paper, devnet, no sleep
pnpm goblin

# goblin dashboard
pnpm goblin:tui
```

Direct commands:

```bash
npx tsx src/ooda/loop.ts --ticks 50 --sleep 0.25
npx tsx src/ooda/loop.ts --goblin --ticks 100 --fresh
npx tsx src/ooda/loop.ts --goblin --ticks 200 --tui | npx tsx src/ooda/tui.ts
```

## Optional LLM Decisions

Goblin mode will call Anthropic only when `ANTHROPIC_API_KEY` is present. Without it, the harness falls back to deterministic paper decisions.

```bash
ANTHROPIC_API_KEY=<your-anthropic-api-key> pnpm goblin
GOBLIN_MODEL=claude-opus-4-7 pnpm goblin
```

LLM output is still validated before action. Invalid JSON, short goblin reasons, oversized positions, mainnet references, or key-material mentions are rejected and journaled as safe holds.
