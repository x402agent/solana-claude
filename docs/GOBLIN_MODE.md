# Goblin Mode

`Goblin Mode` is the OpenAI-backed autonomous orchestration profile for the HERMES OODA loop.

It is intentionally constrained:

- paper mode only
- devnet only
- no wallet signing
- no private key access
- one position at a time
- existing kill-switch still applies

## What it adds

- OpenAI Responses API for the DECIDE phase
- `previous_response_id` chaining for conversation state across ticks
- optional `background=true` execution for slower orchestration turns
- server-side compaction configuration
- prompt cache key for stable repeated prefixes
- `computer_use_plan` output on each decision for browser or terminal sidecars

## Run

```bash
export OPENAI_API_KEY=...
npm run goblin
```

Background mode:

```bash
export OPENAI_API_KEY=...
npm run goblin:bg
```

Direct flags:

```bash
node --import tsx/esm ooda/operator.ts --llm --openai --goblin --computer-use
```

## Decision shape

Goblin mode still returns the same harness action:

- `hold`
- `open`
- `close`

It may also attach metadata:

- `confidence`
- `aggression`
- `goblin_mode`
- `thesis`
- `computer_use_plan`

The harness only executes the action fields. Everything else is journaling and orchestration context.
