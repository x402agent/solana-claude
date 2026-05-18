# Perps

This directory contains upstream perpetuals and market-making codebases that
are being consolidated into the Clawd agent stack.

## Current Sources

- `phoenix-onchain-market-maker-master`
- `Solana-Market-Maker-master`
- `solana-market-maker-volume-bot-master`
- `twamm-master`

## Security Policy

- Local `.env`, wallet, keypair, and ledger files in this tree must never be
  committed.
- Run `npm run perps:audit` from the repo root before pushing changes.
- Treat all upstream repos as untrusted until reviewed and adapted.

## Clawd Integration Workspace

The canonical integration target is:

- `Perps/clawd-agents-perps/`

That workspace is where Clawd-owned code should live for:

- Phoenix Rise SDK reads
- Vulcan CLI bridging
- agent-facing market-making logic
- Telegram operations
- frontend dashboards
- deployment-safe configuration
