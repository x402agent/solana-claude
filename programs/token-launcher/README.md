# token-launcher

Anchor token launchpad program that initializes a global launch configuration and launches SPL token mints with Metaplex metadata.

## Program ID

```text
funvWGBmpr8N7pTNqpxkWPgWnQbL3Yr5vzCHNJT2YkL
```

## What It Does

- Initializes launchpad global state.
- Stores authority, fee recipient, virtual reserves, real reserves, and fee basis points.
- Creates an SPL mint.
- Creates an associated token account for the payer.
- Mints initial supply.
- Creates Metaplex token metadata.
- Emits launch events.

## Innovation

This is a compact launch primitive that connects launch configuration, SPL minting, and token metadata in one Anchor program. It is useful as a base for richer p-token or bonding-curve launch flows.

## Instructions

| Instruction | Purpose |
| --- | --- |
| `initialize` | Creates the global launchpad config. |
| `launch_token` | Creates the mint, ATA, initial supply, metadata, and launch event. |

## Install and Build

This folder is currently excluded from the root Cargo workspace, so build it directly after adding a local `Cargo.toml` if needed or use it as a source template.

Expected Anchor dependencies:

- `anchor-lang`
- `anchor-spl`
- `mpl-token-metadata`
- `solana-program`

## Deployment Notes

- Keep `declare_id!` synchronized with the deployment keypair.
- Decide whether payer or PDA should be mint authority before production.
- Wire fee collection and reserve accounting before accepting live funds.
- Extend validation for name/symbol/URI lengths.

## Safety Notes

- Current minimum amount is fixed for 6-decimal mints.
- Vesting constants exist but are not fully wired in this file.
- Metadata CPI must use the correct Metaplex Token Metadata program id.

