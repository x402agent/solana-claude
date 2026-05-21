---
name: imperial-market-intel
description: Imperial and Phoenix market data: funding, mark prices, route checks, Phoenix depth, and pre-trade venue context.
---

# Imperial Market Intel

Use for:

- `GET /api/v1/funding-rates`
- `GET /api/v1/mark-prices`
- `GET /api/v1/phoenix/mark-prices`
- `GET /api/v1/phoenix/depth`
- `GET /api/v1/route`

Preferred workflow:

1. Check funding and mark price for the canonical symbol.
2. Inspect Phoenix depth when the user cares about direct Phoenix fills.
3. Use `/route` for venue choice and expected fee/price context.
4. Distinguish canonical symbols (`SOL`, `BTC`, `XAU`) from Phoenix raw depth symbols (`SOL`, `GOLD`).
