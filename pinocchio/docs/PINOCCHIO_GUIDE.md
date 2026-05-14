# Pinocchio Guide

Pinocchio is a low-level Solana program library for developers who want maximum control over compute units, account access, and binary size. It replaces much of the `solana-program` crate surface with zero-copy types and optional runtime setup.

## When to Use It

Use Pinocchio when:

- transaction volume makes compute units materially important;
- the program has simple, predictable account layouts;
- you can write and review manual account validation;
- you are prepared to write client bindings or generate them with tools such as Shank and Codama.

Use Anchor or a higher-level framework when speed of development, IDLs, and developer ergonomics matter more than compute tuning.

## Core Model

Pinocchio program handlers still receive:

```rust
fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult
```

The difference is that Pinocchio account structures point into the runtime input buffer instead of eagerly copying owned account data. Reads and mutations can therefore be cheaper, but the program author must be precise about validation and data layout.

## Entrypoints

Pinocchio exposes multiple entrypoint styles:

- `entrypoint!` for a familiar setup with default allocator and panic handling.
- `program_entrypoint!` for input deserialization without automatically installing allocator/panic defaults.
- `lazy_program_entrypoint!` for deferring more work to the program.
- `no_allocator!` when the program is designed to avoid heap allocation entirely.

Choose the simplest entrypoint first. Move to lazy or middleware paths only after measuring the compute cost.

## Instruction Pattern

The templates in this folder use:

- a one-byte discriminator;
- an instruction wrapper struct;
- `TryFrom<(&[u8], &[AccountInfo])>` for account and data validation;
- a small `process()` method for business logic.

This gives Anchor-like organization without Anchor macros or implicit account checks.

## Account Layout

For starter programs, prefer explicit byte parsing:

- check buffer length before every read;
- use little-endian primitives such as `u64::from_le_bytes`;
- avoid direct field access on packed structs;
- keep dynamically sized data at the end of the account;
- resize accounts only with rent reconciliation.

Zero-copy structs are useful, but only when alignment, valid bit patterns, and ownership invariants are documented and tested.

## p-token Notes

p-token programs are SPL-compatible token programs optimized around Pinocchio patterns. solana-clawd treats p-tokens as mint accounts whose owner program can be the configured `P_TOKEN_PROGRAM_ID`, while still supporting classic SPL Token for fallback flows.

The existing registry in [`../../data/ptokens.json`](../../data/ptokens.json) records:

- mint;
- symbol and name;
- network;
- token program classification;
- owner program;
- decimals and supply;
- mint/freeze authority when available;
- explorer links.

## Safety Checklist

Before deploying a generated program:

- add negative tests for missing accounts, wrong owners, wrong signers, bad PDA seeds, and malformed instruction data;
- test refund/close paths for rent handling and reinitialization resistance;
- test CPI failures and signer seed failures;
- document every unchecked or unsafe block;
- compile to SBF and run local validator or Mollusk tests;
- review every authority, mint, freeze, and upgrade path.

