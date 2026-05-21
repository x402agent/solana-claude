---
name: imperial-trade-execution
description: Safe Imperial live execution: authenticated market orders, Phoenix-first venue preference, profile-aware routing, and post-trade verification.
---

# Imperial Trade Execution

Primary endpoint: `POST /api/v1/mobile/orders`

Default live open:

- `action=0`
- `orderType=0`
- `fundingStatus=0`
- `underwriter=2` for Phoenix unless requested otherwise

Default live close:

- `action=1`
- `orderType=0`
- same wallet and profile as the open position

Always verify:

- response `success`
- transaction `signature`
- follow-up state via `/positions` and `/orders`
