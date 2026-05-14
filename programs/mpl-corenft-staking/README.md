# MPL Core NFT Staking

Anchor program for a lightweight DarkDefi staking registry around Metaplex Core-style agent assets.

The program records which owner staked which asset and collection, tracks global stake count, and supports explicit unstake. It is intentionally narrow: it is a registry primitive, not a rewards engine, custody layer, marketplace, or yield product.

## Program

```text
Program ID: 7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ
Cluster config: devnet
Framework: Anchor 0.32.1
```

## Instructions

| Instruction | Purpose |
| --- | --- |
| `initialize` | Creates the global staking pool and admin authority. |
| `stake_agent` | Creates a stake record for an owner, asset, and collection. |
| `unstake_agent` | Closes the stake record and decrements global stake count. |

## Accounts

| Account | Purpose |
| --- | --- |
| `GlobalPool` | Admin, total staked count, PDA bump. |
| `StakeRecord` | Owner, asset, collection, staked timestamp, PDA bump. |

## Build

```bash
cd mpl-corenft-staking
cargo test
cargo build-sbf --manifest-path Cargo.toml
mkdir -p target/deploy
cp target/sbpf-solana-solana/release/mpl_corenft_staking.so target/deploy/
```

Expected output:

```text
target/sbpf-solana-solana/release/mpl_corenft_staking.so
```

## Devnet Deploy

Deployment requires:

- Solana CLI
- Anchor CLI
- the program keypair matching the configured program id
- enough devnet SOL for program rent and transaction fees
- a reviewed upgrade authority

```bash
solana program deploy \
  target/deploy/mpl_corenft_staking.so \
  --program-id target/deploy/mpl_corenft_staking-keypair.json \
  --url devnet \
  --upgrade-authority ~/.config/solana/id.json
```

Verify:

```bash
solana program show 7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ --url devnet
```

## Current Status

- `cargo test` passes.
- SBF build completes.
- Devnet deployment uses `target/deploy/mpl_corenft_staking-keypair.json`, whose public key matches the declared program id.
- Devnet deployment is live at `7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ`.
- No mainnet deployment has been attempted.
- The current Solana 3.1 SBF toolchain emits Anchor/Solana dependency warnings, including undefined-syscall warnings. Treat artifacts as devnet-only until the toolchain pairing is cleaned up and runtime behavior is validated.

## Safety Boundaries

- No custody is implemented.
- No rewards are implemented.
- No transfer, freeze, or delegate enforcement is implemented here.
- Asset and collection accounts are recorded as public keys only.
- Any production staking flow must add wallet-side approval UX, asset ownership validation, event indexing, and external policy review.

## License

MIT.
