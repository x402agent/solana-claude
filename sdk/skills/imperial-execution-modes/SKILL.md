---
name: imperial-execution-modes
description: Execution-mode taxonomy for Imperial router workflows in this repo: observe, route-check, paper/spec, live single-shot, and external durable runner.
---

# Imperial Execution Modes

Use these modes consistently:

- `observe`: read-only market, funding, depth, balances, positions, and orders.
- `route-check`: evaluate venue, fees, and notional with `/funding-rates`, `/mark-prices`, and `/route`.
- `paper/spec`: build a trade or strategy plan without submitting.
- `live-single-shot`: one immediate authenticated order or close through `POST /mobile/orders`.
- `external-runner`: durable TWAP/grid logic owned by a real runner, not a webhook.

Telegram note:

- The current Telegram bot can safely do `observe`, `route-check`, and `live-single-shot`.
- Long-lived TWAP/grid behaviour should be described as runner-backed unless a durable worker owns the loop.
