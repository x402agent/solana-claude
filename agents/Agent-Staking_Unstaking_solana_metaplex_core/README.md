# OpenClawd Agent Staking Protocol

OpenClawd Agent Staking is an Anchor program and frontend-ready transaction
surface for staking Metaplex Core agent assets on Solana. It lets an agent owner
lock a Core asset in place by adding a frozen `FreezeDelegate` plugin, then later
unstake by unfreezing and removing that plugin.

This is a staking primitive for Solana-native agents. The asset stays in the
owner wallet; the program tracks only global staking state and enforces owner,
collection, and admin recovery rules.

## Position in the OpenClawd stack

This package is the **live devnet lock layer** of the broader OpenClawd Agent
Staking platform. It proves the critical primitive: a Metaplex Core agent can be
made non-transferable through `FreezeDelegate` without transferring custody.

The larger reward/position protocol lives in:

```text
programs/clawd-stake/
server/_core/clawdStakeRoutes.ts
server/_core/clawdStakeWebhook.ts
convex/clawdStake.ts
```

That layer adds weighted `StakePosition` accounts, lock durations, CLAWD
emissions, SOL fee-share, and phase-2 gacha fee routing. The live `/staking`
frontend surfaces the lock layer today and documents the reward protocol as the
next layer of the same product, not a separate experiment.

## Live Devnet Deployment

Current devnet deployment:

```text
Program ID:      D5MLxrKAnppBVLuukKQzQGTMSfEwBqWCDPGAhGhthdLP
Global pool PDA: EyDhP1HU3yqCmqCpKkQHFuX3wMD6sJF1kK8eeRwmTr1K
MPL Core:        CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
Cluster:         devnet
```

The main OpenClawd frontend route is:

```text
/staking
```

The legacy `/agents/stake` and `/stake` URLs redirect to `/staking`. The
frontend builds wallet-signed transactions directly for `initialize`,
`stakeAgent`, and `unstakeAgent`; it also reads the global pool PDA and inspects
the Core asset `FreezeDelegate` state.

## What It Does

- Initializes a global staking pool PDA with an admin authority.
- Stakes a Metaplex Core asset by adding `FreezeDelegate { frozen: true }`.
- Unstakes by updating the `FreezeDelegate` to `frozen: false`, then removing it.
- Tracks `total_agents_staked` in the global pool.
- Allows normal unstake by owner and emergency unstake by the configured admin.
- Provides a TypeScript CLI for `init`, `stake`/`lock`, and `unstake`/`unlock`.

## What It Does Not Do Yet

- It does not issue token rewards.
- It does not create per-position accounts.
- It does not enforce lock durations, tiers, or reward weights.
- It does not escrow the agent asset; the asset remains in the owner's wallet.

Those features can be layered later with additional accounts, indexers, and
reward vault logic. The current scope is intentionally narrow: prove agent
ownership and lock transferability at the Core asset layer.

## Project Layout

```text
programs/mpl-corenft-staking/   Anchor Rust program
cli/                            command-line init/stake/unstake entrypoint
lib/                            IDL, constants, and transaction builders
tests/                          Anchor integration tests
Anchor.toml                     cluster, wallet, and program-id config
```

Related frontend files in the main OpenClawd app:

```text
client/src/lib/agentStaking.ts
client/src/pages/AgentStake.tsx
```

## Program Accounts

### `initialize`

Creates the global pool PDA:

```text
seed: ["global-authority"]
```

Accounts:

- `admin` signer and payer
- `global_pool` PDA
- `system_program`

### `stakeAgent`

Adds a frozen Core `FreezeDelegate` plugin.

Accounts:

- `owner` asset owner
- `user` signer and payer, must equal `owner`
- `global_pool`
- `asset` Metaplex Core asset account
- `collection` Metaplex Core collection account
- `core_program`
- `system_program`

Validation:

- `user == owner`
- decoded Core `asset.owner == owner`
- decoded Core `asset.update_authority == Collection(collection)`

### `unstakeAgent`

Unfreezes and removes the Core `FreezeDelegate` plugin.

Accounts:

- `owner` asset owner
- `user` signer and payer
- `global_pool`
- `asset` Metaplex Core asset account
- `collection` Metaplex Core collection account
- `core_program`
- `system_program`

Validation:

- `asset.owner == owner`
- decoded Core `asset.update_authority == Collection(collection)`
- `user == owner`, or `user == global_pool.admin` for emergency recovery

## Environment

Devnet defaults:

```bash
export SOLANA_RPC_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="$HOME/.config/solana/id.json"
export OPENCLAWD_AGENT_STAKING_PROGRAM_ID="D5MLxrKAnppBVLuukKQzQGTMSfEwBqWCDPGAhGhthdLP"
export OPENCLAWD_AGENT_COLLECTION="<metaplex-core-collection-address>"
export NPM_TOKEN="${NPM_TOKEN:-unused}"
```

Mainnet should use a dedicated deployer or Squads-controlled upgrade authority:

```bash
export SOLANA_RPC_URL="https://your-mainnet-rpc.example"
export ANCHOR_WALLET="$HOME/.config/solana/openclawd-mainnet-deployer.json"
export OPENCLAWD_AGENT_STAKING_PROGRAM_ID="<mainnet-program-id>"
export OPENCLAWD_AGENT_COLLECTION="<mainnet-core-collection-address>"
```

Do not commit populated `.env` files, deployer keypairs, wallet JSON, or
production API secrets.

## Install

```bash
npm install
```

If Yarn or npm reads a global `.npmrc` with `${NPM_TOKEN}`, set a placeholder
before running scripts:

```bash
export NPM_TOKEN="${NPM_TOKEN:-unused}"
```

## Build

```bash
npm run build
```

Anchor writes the binary and IDL into `target/`. The active program id must
match all of:

- `declare_id!()` in `programs/mpl-corenft-staking/src/lib.rs`
- `Anchor.toml`
- `OPENCLAWD_AGENT_STAKING_PROGRAM_ID`
- `lib/constant.ts`
- `client/src/lib/agentStaking.ts` if the frontend is targeting the same deploy

The current local toolchain has emitted a warning when `anchor-cli` is `0.32.1`
and the program dependencies use `anchor-lang` / `@coral-xyz/anchor` `0.30.1`.
For deterministic release builds, align those versions before mainnet.

## Test

```bash
npm test
```

Run localnet/devnet tests before mainnet. The basic test initializes the global
pool; production readiness needs fixture tests that mint a Core collection,
mint an agent asset, stake it, verify `FreezeDelegate.frozen`, unstake it, and
verify the plugin removal.

## Deploy

### Devnet

```bash
solana config set --url "$SOLANA_RPC_URL"
solana config set --keypair "$ANCHOR_WALLET"
solana balance
npm run build
npm run deploy:devnet
```

Initialize the global pool after a first deploy:

```bash
npm run script:devnet -- init
```

If the pool already exists, do not initialize it again.

### Mainnet Gate

Mainnet deployment should only happen after:

- clean build with aligned Anchor versions
- devnet stake and unstake test with a real Core collection
- confirmed program id and upgrade authority
- funded deployer wallet
- explicit `[programs.mainnet]` block in `Anchor.toml`
- frontend env pointed at the mainnet program id and collection
- admin recovery runbook reviewed

The current `Anchor.toml` intentionally omits `[programs.mainnet]`.

## CLI Usage

Initialize:

```bash
npm run script:devnet -- init
```

Stake:

```bash
npm run script:devnet -- stake \
  --asset <agent-core-asset-address> \
  --collection "$OPENCLAWD_AGENT_COLLECTION"
```

Alias:

```bash
npm run script:devnet -- lock \
  --asset <agent-core-asset-address> \
  --collection "$OPENCLAWD_AGENT_COLLECTION"
```

Unstake:

```bash
npm run script:devnet -- unstake \
  --asset <agent-core-asset-address> \
  --collection "$OPENCLAWD_AGENT_COLLECTION"
```

Alias:

```bash
npm run script:devnet -- unlock \
  --asset <agent-core-asset-address> \
  --collection "$OPENCLAWD_AGENT_COLLECTION"
```

## Frontend Usage

The OpenClawd app exposes `/staking`.

Required frontend env when overriding defaults:

```bash
VITE_OPENCLAWD_AGENT_STAKING_PROGRAM_ID="D5MLxrKAnppBVLuukKQzQGTMSfEwBqWCDPGAhGhthdLP"
VITE_OPENCLAWD_AGENT_COLLECTION="<metaplex-core-collection-address>"
VITE_SOLANA_RPC_URL="$SOLANA_RPC_URL"
```

User flow:

1. Connect a Solana wallet.
2. Paste a Metaplex Core agent asset address.
3. Paste or preconfigure the agent collection address.
4. Inspect the asset to confirm owner, collection, and freeze status.
5. Click `stake` to add the frozen `FreezeDelegate`.
6. Click `unstake` to unfreeze and remove the delegate.

Admin recovery flow:

1. Connect the admin wallet.
2. Paste the asset address and collection.
3. Paste the real asset owner into the owner override field.
4. Submit `unstake`.

## Safety Notes

- This is a lock/unlock primitive, not a yield product.
- The admin can emergency-unstake assets only through the program constraints.
- Use a dedicated deployer and program upgrade authority.
- Public RPC is not reliable enough for production.
- Keep the collection address pinned in frontend/backend config.
- Run `anchor keys sync` after changing the program keypair.

## OpenClawd Integration

This protocol sits under the OpenClawd Solana-native agent economy:

- agent minting via Metaplex Core
- agent registration via Metaplex Agent Registry
- staking state visible in `/staking`
- wallet-gated agent actions
- policy checks in the OpenClawd backend
- staking status indexing for dashboards and future rewards
- admin runbooks for emergency unlocks

## License

MIT
