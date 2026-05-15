# Pinocchio Program Map

![Animated Pinocchio program map](./assets/program-map.svg)

This is the one-by-one map of upstream Pinocchio helper programs under
`pinocchio/pinocchio-main/programs` and how Solana Clawd uses them.

Machine-readable map:

```sh
npm run pinocchio:programs
npm run pinocchio:program -- token
```

## 1. `pinocchio-system`

Path: [`pinocchio-main/programs/system`](./pinocchio-main/programs/system)

Program id: `11111111111111111111111111111111`

Purpose: CPI helpers for the Solana System Program.

Use in this repo:

- p-token mint account funding and allocation.
- Vault and escrow PDA setup.
- Lamport transfers, refunds, and close paths.
- Nonce and account assignment references for native programs.

Primary helpers: `CreateAccount`, `CreateAccountAllowPrefund`,
`CreateAccountWithSeed`, `Transfer`, `TransferWithSeed`, `Assign`,
`AssignWithSeed`, `Allocate`, `AllocateWithSeed`, nonce account helpers.

## 2. `pinocchio-token`

Path: [`pinocchio-main/programs/token`](./pinocchio-main/programs/token)

Program id: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`

Purpose: CPI helpers and state views for canonical SPL Token.

Use in this repo:

- SPL-compatible fallback for the p-token explorer.
- Escrow make/take/refund token movement.
- Vault token account validation.
- x402 token payment compatibility.
- Batch instruction reference for p-token-style compute savings.

Primary helpers: mint/account initialization, transfers, checked transfers,
approvals, authority updates, mint/burn, freeze/thaw, close account, native SOL
syncing, UI amount conversion, immutable owner, multisig, and `Batch`.

## 3. `pinocchio-token-2022`

Path: [`pinocchio-main/programs/token-2022`](./pinocchio-main/programs/token-2022)

Program id: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

Purpose: CPI helpers and state views for Token-2022 and token extensions.

Use in this repo:

- Token-2022 mint classification in the explorer.
- Future p-token launches that need metadata pointer or extension-like control.
- Agent education for extension account discriminators.
- Launch planning for pausable, guarded, fee-aware, or metadata-rich tokens.

Mapped extension groups include transfer fee, metadata pointer, group pointer,
group member pointer, default account state, memo transfer, CPI guard, pausable,
scaled UI amount, permissioned burn, and mint close authority.

## 4. `pinocchio-associated-token-account`

Path: [`pinocchio-main/programs/associated-token-account`](./pinocchio-main/programs/associated-token-account)

Program id: `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe8bXV`

Purpose: CPI helpers for associated token account operations.

Use in this repo:

- Creating recipient accounts around p-token launches.
- Escrow and vault setup helpers.
- Agent checks for derived ATA addresses.
- x402 recipient account preparation.

Primary helpers: `Create`, `CreateIdempotent`, `RecoverNested`.

## 5. `pinocchio-memo`

Path: [`pinocchio-main/programs/memo`](./pinocchio-main/programs/memo)

Program id: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

Purpose: CPI helper for SPL Memo instructions.

Use in this repo:

- p-token launch receipts.
- x402 payment memo references.
- Agent provenance markers.
- Devnet traces during tests.

Primary helper: `Memo`.

## Adaptation Status

| Program | Local map | CLI | MCP | Current adaptation |
| --- | --- | --- | --- | --- |
| `pinocchio-system` | yes | yes | yes | Used by templates and launch planning. |
| `pinocchio-token` | yes | yes | yes | Used by p-token explorer, x402 compatibility, escrow/vault templates. |
| `pinocchio-token-2022` | yes | yes | yes | Used by explorer classification and future launch planning. |
| `pinocchio-associated-token-account` | yes | yes | yes | Mapped for recipient setup and ATA checks. |
| `pinocchio-memo` | yes | yes | yes | Mapped for receipts and traces. |
