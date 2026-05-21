---
name: imperial-margin-operations
description: Imperial profile funding, deposit/withdraw transaction building, profile isolation, and margin-state reporting.
---

# Imperial Margin Operations

Use for:

- `POST /api/v1/deposit/build-tx`
- `GET /api/v1/mobile/balances`
- profile-by-profile USDC reporting

Rules:

- Deposits and withdrawals are profile-scoped.
- `build-tx` returns a partially signed transaction; the wallet still must sign and submit it.
- Funding from native SOL is not direct; the wallet must source supported collateral as required by the upstream flow.
