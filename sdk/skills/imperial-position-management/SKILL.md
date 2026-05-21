---
name: imperial-position-management
description: Inspect, reduce, and close Imperial-routed positions across Phoenix, Flash, Jupiter, and GMTrade, with Phoenix preferred by default.
---

# Imperial Position Management

Use for:

- listing open positions
- checking current exposure before new trades
- sending close-side `action=1` market orders
- reviewing whether residue sync is needed after a close

Rules:

- Match `profileIndex` to the live position.
- Prefer explicit user input for symbol, side, venue, and notional when closing.
- After non-USDC collateral venues, consider `/passthrough/users/{wallet}/profiles/{index}/sync`.
