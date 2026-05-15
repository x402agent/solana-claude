# {{project_name}}

Pinocchio escrow starter for make/take/refund token swaps.

The starter mirrors the common escrow flow:

- `Make`: maker defines terms and deposits token A into a vault.
- `Take`: taker sends token B to the maker and receives token A.
- `Refund`: maker cancels and receives token A back.

This is a scaffold, not an audited program. Fill in token CPI transfers, PDA seed checks, ATA policy, close behavior, and tests before deployment.

