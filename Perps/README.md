# Perps

This is the perp arena for `solana-clawd`: a live-looking staging ground where
raw upstream market-making engines, Phoenix-native execution paths, and Clawd
agent orchestration are being compressed into one controlled system.

Think of this directory as three layers moving at different speeds:

- upstream engines with their own assumptions and risk models
- Clawd-owned adapters that translate those engines into agent-safe surfaces
- presentation and control planes that turn perp infrastructure into something
  humans and agents can actually operate

## What Lives Here

### Upstream Engines

- `phoenix-onchain-market-maker-master`
  Phoenix-native market-making code and on-chain execution patterns
- `Solana-Market-Maker-master`
  generalized Solana MM logic worth harvesting for quoting, inventory, and flow
- `solana-market-maker-volume-bot-master`
  volume and agent-behavior ideas, plus operational control patterns
- `twamm-master`
  TWAMM flow, long-horizon execution primitives, and UI references

### Clawd Control Surface

- `clawd-agents-perps/`
  the canonical integration workspace for Clawd-owned perp logic

This is the part that matters most. It is where the repo stops being a pile of
imports and starts acting like a coherent trading stack:

- Phoenix Rise SDK market reads
- Vulcan CLI and MCP compatibility
- agent-facing market-maker runtime
- Telegram operator controls
- frontend status and dashboard payloads
- deployment-safe config and risk gates

## Current Direction

The target state is not “support every perp tool.”

The target state is:

- Rise as the read plane
- Vulcan as the execution-compatibility bridge
- Clawd as the orchestration and safety layer
- paper mode and simulation first
- live trading only behind explicit approval and hard preflight gates

## Security Policy

- Local `.env`, wallet, keypair, and ledger files in this tree must never be committed.
- Run `npm run perps:audit` from the repo root before pushing changes.
- Treat every upstream subtree as untrusted until reviewed, adapted, and pinned.
- Do not let signing logic leak into demo or status surfaces.

## First Place To Read

If you want the part that is actively being adapted instead of the raw upstream
repos, start here:

- `Perps/clawd-agents-perps/README.md`

That workspace is the animated center of gravity for the entire `Perps` tree.
