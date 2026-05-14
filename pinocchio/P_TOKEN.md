# p-token: Pinocchio SPL Token Replacement

## Overview

p-token is a Pinocchio-based replacement for the canonical SPL Token program. It achieves massive CU reductions by:

1. Using Pinocchio's zero-copy `AccountInfo` (pointer into input buffer, no copies)
2. Accessing token account state directly via pointer — never deserializing into owned structs
3. Each property returned as a reference maintaining zero-copy throughout

## CU Comparison (source: Febo's GitHub benchmarks)

| Operation | SPL Token (CU) | p-token (CU) | Reduction |
|-----------|---------------|--------------|-----------|
| InitializeMint | 2,906 | 352 | −88% |
| InitializeAccount | 4,527 | 882 | −81% |
| Transfer | 4,736 | 1,188 | −75% |
| MintTo | 4,301 | 849 | −80% |
| Burn | 4,219 | 849 | −80% |
| CloseAccount | 2,708 | 441 | −84% |
| Approve | 2,904 | 336 | −88% |
| Revoke | 2,802 | 312 | −89% |

## Key Design Decisions

### Zero-copy state access

Rather than deserializing token account data into an owned `TokenAccount` struct, p-token:
1. Checks that the account data length is correct
2. Returns a pointer to the account data as a typed reference

```rust
// SPL Token style — copies data into owned struct via Borsh
let token_account = TokenAccount::unpack(&account.data.borrow())?;
let amount = token_account.amount; // owned u64

// p-token style — pointer directly into account bytes
let token_ref = TokenAccount::from_account_info(account)?; // zero copy
let amount: &u64 = token_ref.amount(); // reference, no copy
```

### AccountInfo as pointer

Pinocchio's `AccountInfo` doesn't wrap data in `Rc<RefCell<...>>`. Instead:
- `account.key()` → `&Pubkey` (pointer into input buffer)
- `account.lamports()` → `u64` (read directly from input)
- `unsafe { account.borrow_data_unchecked() }` → `&[u8]` (slice of input buffer)

## API (pinocchio-token CPI helpers)

```rust
// Initialize a mint
InitializeMint {
    mint,
    rent_sysvar,
    decimals: 9,
    mint_authority: authority,
    freeze_authority: Some(authority),
}.invoke()?;

// Transfer tokens
Transfer {
    from,
    to,
    authority,
    amount: 10_000_000,
}.invoke()?;

// MintTo
MintTo {
    mint,
    account: token_account,
    mint_authority: authority,
    amount: 1_000_000,
}.invoke()?;

// Burn
Burn {
    account: token_account,
    mint,
    authority,
    amount: 500_000,
}.invoke()?;

// CloseAccount
CloseAccount {
    account: token_account,
    destination: owner,
    authority,
}.invoke()?;
```

## Token-2022 Extensions (under development)

p-token is adding Token-2022 extension support including:
- **MetadataPointer** — points to inline or external metadata
- **TokenMetadata** — self-contained metadata in the mint account
- **TransferFee** — configurable per-transfer fees
- Confidential Transfers (planned)

## Status

- Active development by Febo (Anza)
- **Unaudited** — not recommended for mainnet production without independent security review
- Multiple signers not yet fully supported in pinocchio-token CPI crate
- Token-2022 support in progress on a feature branch

## Resources

- [GitHub: febo/p-token](https://github.com/febo/p-token)
- [crates.io: pinocchio-token](https://crates.io/crates/pinocchio-token)
- [Febo's Solana Accelerate 2025 talk](https://www.youtube.com/watch?v=pinocchio-accelerate-2025)
- [CU optimization article](https://www.helius.dev/blog/solana-cu-optimization)
