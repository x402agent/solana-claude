---
name: imperial-risk-management
description: Risk checks for Imperial-routed perps: profile funding, existing exposure, venue choice, margin headroom, and Telegram pre-trade snapshots.
---

# Imperial Risk Management

Use before any live trade:

1. Read per-profile balance with `/mobile/balances`.
2. Read current positions with `/positions`.
3. Read venue/funding context with `/funding-rates` and `/route`.
4. Confirm requested notional, side, venue, and `profileIndex`.

Important:

- A route check is not a liquidation guarantee.
- USDC balance alone does not prove leverage feasibility.
- Always present existing same-symbol exposure before increasing a position.
