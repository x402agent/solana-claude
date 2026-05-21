---
name: imperial-portfolio-intel
description: Imperial profile balances, open positions, open orders, exposure summary, and wallet-level Telegram/admin portfolio recaps.
---

# Imperial Portfolio Intel

Use for:

- `GET /api/v1/mobile/balances`
- `GET /api/v1/positions?walletAddress=...`
- `GET /api/v1/orders?walletAddress=...`

Focus on:

- per-profile USDC balance
- open notional by symbol and venue
- open order count and outstanding close legs
- simple operator summaries for Telegram

Always report which `profileIndex` or wallet scope the summary refers to.
