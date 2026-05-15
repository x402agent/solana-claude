<div align="center">

# Pinocchio Program Map

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=20&duration=2200&pause=650&color=14F195&center=true&vCenter=true&width=920&lines=ZERO-COPY+CPIs+FOR+NATIVE+SOLANA;SYSTEM+%E2%86%92+TOKEN+%E2%86%92+TOKEN-2022+%E2%86%92+ATA+%E2%86%92+MEMO;FORK+THE+MAP+%E2%86%92+BUILD+THE+PROGRAM+%E2%86%92+REGISTER+THE+p-TOKEN" alt="Pinocchio program map animation" />

</div>

This folder vendors the upstream Pinocchio helper program crates used by solana-clawd agents and templates. These are not deployed app programs by themselves. They are `no_std` CPI helper crates and state definitions that make native Solana programs smaller, more explicit, and easier to tune for compute units.

## One-by-One Map

| Program crate | Folder | What it gives us | Use it when |
| --- | --- | --- | --- |
| `pinocchio-system` | [`system/`](./system/) | CPI helpers for core System Program instructions: create account, transfer lamports, assign, allocate, nonce operations. | You need to create PDAs/accounts, fund rent, transfer SOL, or resize native state. |
| `pinocchio-token` | [`token/`](./token/) | CPI helpers and state layouts for classic SPL Token. Includes batch support in the vendored implementation. | You need SPL-compatible mint/account transfers, minting, burning, freezing, closing, or p-token-style token logic. |
| `pinocchio-token-2022` | [`token-2022/`](./token-2022/) | CPI helpers and state layouts for Token-2022, including extension-oriented instructions. | You need metadata pointers, transfer fees, transfer hooks, default account state, pausable tokens, or other Token-2022 extensions. |
| `pinocchio-associated-token-account` | [`associated-token-account/`](./associated-token-account/) | CPI helpers for ATA create, idempotent create, and nested ATA recovery. | You want predictable wallet/mint token account derivation without writing ATA CPI boilerplate. |
| `pinocchio-memo` | [`memo/`](./memo/) | CPI helper for SPL Memo. | You need cheap transaction annotations, launch notes, or agent-readable memo markers. |

## How solana-clawd Adapts Them

```text
pinocchio-main/programs/
├── system/                    -> account creation, rent funding, SOL movement
├── token/                     -> p-token/SPL-compatible mint and account flows
├── token-2022/                -> extension-aware launch and metadata flows
├── associated-token-account/  -> wallet/mint ATA creation helpers
└── memo/                      -> launch and agent trace memos

solana-clawd/
├── pinocchio/templates/vault/            -> starter state + deposit/withdraw layout
├── pinocchio/templates/escrow/           -> make/take/refund starter layout
├── pinocchio/templates/p-token-launcher/ -> launch config + bonding curve planning
├── scripts/ptoken-explorer.mjs           -> inspect/register launched mints
├── scripts/ptoken-launch-planner.mjs     -> unsigned p-token launch planning
└── MCP/src/server.ts                     -> agent tools/resources for this map
```

## Agent Routing

Agents should use this order when they need to understand or extend a Pinocchio program:

1. Read [`../../README.md`](../../README.md) for solana-clawd support context.
2. Read this map to identify the upstream helper crate.
3. Read the specific program folder README.
4. Read the instruction files under `src/instructions/`.
5. Scaffold from `pinocchio/templates/*` only after identifying the required CPI helpers.
6. Register launched p-tokens through `ptoken_inspect` and `ptoken_registry_add`.

## Safety Notes

- These helper crates do not replace program-specific validation.
- Templates in `pinocchio/templates/` are starter code, not audited deployments.
- Any app program must still validate owners, signers, writable accounts, PDA seeds, mint/account layout, reserve custody, and close/refund paths.
- p-token launch planning is unsigned until a wallet explicitly signs a transaction.

