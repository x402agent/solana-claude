# clawd-stake

Solana Anchor program for staking Metaplex Agent assets — the first protocol that lets you stake autonomous on-chain AI agents (MPL Core assets registered with the Metaplex Agent Registry / ERC-8004) while they keep operating and earning their own creator fees.

Part of the **Clawd Agent Metaprotocol**:

- **Phase 1 (this program)** — staking. Build TVL by locking agents in exchange for CLAWD emissions and a pro-rata share of phase-2 gacha SOL fees.
- **Phase 2 (clawd-gacha, not yet scaffolded)** — provably-fair agent gacha. Pay SOL, burn CLAWD, spin via Switchboard VRF, win exclusive Metaplex Agents and other prizes.

## First-class platform surface

Agent staking is not a sidecar feature. It is the lock layer for the whole
OpenClawd agent economy:

- `/staking` is the primary user route in the OpenClawd app.
- `/agents/stake` and `/stake` redirect into `/staking`.
- `client/src/pages/AgentStake.tsx` is the wallet console for inspecting,
  staking, and unstaking Metaplex Core agent assets.
- `client/src/lib/agentStaking.ts` targets the deployed devnet lock/unlock
  primitive so real Core assets can be frozen and unfrozen today.
- `programs/clawd-stake/` is the larger reward/position protocol that adds
  `StakePosition` PDAs, lock multipliers, CLAWD emissions, SOL fee-share, and
  gacha fee routing.
- `server/_core/clawdStakeRoutes.ts` exposes unsigned transaction builders and
  Convex-backed reads for the reward/position protocol.
- `server/_core/clawdStakeWebhook.ts` mirrors Anchor events from Helius into
  `convex/clawdStake.ts` so staking becomes queryable by dashboards, agents,
  and payment-gated APIs.

That gives the project two deliberate layers:

| Layer | Location | Status | Purpose |
|---|---|---|---|
| Core lock layer | `agents/Agent-Staking_Unstaking_solana_metaplex_core/` + `client/src/lib/agentStaking.ts` | live devnet | Proves non-custodial Metaplex Core agent locking with `FreezeDelegate` |
| Reward protocol layer | `programs/clawd-stake/` + `/api/clawd-stake/*` | repo-ready, pre-mainnet | Adds weighted positions, rewards, gacha fee share, and indexable protocol events |

## Live routes and APIs

| Surface | Path |
|---|---|
| User staking console | `/staking` |
| Legacy route | `/agents/stake` -> `/staking` |
| Short route | `/stake` -> `/staking` |
| Reward protocol config | `GET /api/clawd-stake/config` |
| Build stake tx | `POST /api/clawd-stake/build/stake` |
| Build unstake tx | `POST /api/clawd-stake/build/unstake` |
| Build claim tx | `POST /api/clawd-stake/build/claim` |
| Owner positions | `GET /api/clawd-stake/positions/:wallet` |
| Pool stats | `GET /api/clawd-stake/pool` |
| Helius webhook | `POST /api/clawd-stake/webhook` |

## Current deployed lock layer

The live devnet route uses the proven minimal Core staking primitive:

```text
Program ID:      D5MLxrKAnppBVLuukKQzQGTMSfEwBqWCDPGAhGhthdLP
Global pool PDA: EyDhP1HU3yqCmqCpKkQHFuX3wMD6sJF1kK8eeRwmTr1K
MPL Core:        CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
Cluster:         devnet
```

The reward/position program in this directory still uses the placeholder
`Stake11111111111111111111111111111111111111` until a real deploy key is
generated and synchronized.

## Related OpenClawd docs

- Main app README: `/Users/8bit/Downloads/clawd-terminal/README.md`
- Agents catalog README: `/Users/8bit/Downloads/clawd-terminal/agents/README.md`
- Pay Agents guide: `/Users/8bit/Downloads/clawd-terminal/docs/pay-agents.md`
- Clawd Stake program: `/Users/8bit/Downloads/clawd-terminal/programs/clawd-stake/README.md`
- Clawd TUI README: `/Users/8bit/Downloads/clawd-terminal/clawd-tui/clawd-tui/README.md`
- Dark Ralph TUI README: `/Users/8bit/fraud/OpenClawd/dark-ralph/README.md`

## How staking works

**Freeze-in-place model.** When a user stakes their agent:

1. Client tx adds (or updates) the MPL Core `FreezeDelegate` plugin on the agent asset, with authority set to the `StakePool` PDA.
2. The same tx invokes `clawd-stake::stake`, which writes a `StakePosition` PDA recording owner, tier, lock kind, weight, and reward debt.
3. The asset stays in the user's wallet — only transfer is blocked. The Core `Execute` lifecycle hook is independent of `Freeze`, so the agent keeps operating, keeps earning creator fees from any Genesis token it has launched, and keeps fulfilling A2A / MCP service requests.

**Unstake** revokes the freeze (client-side mpl-core ix in the same tx) and closes the position, paying out accumulated rewards.

## Reward sources

Two parallel reward streams accrue per `StakePosition.weight`:

| Stream | Source | Distribution |
|---|---|---|
| CLAWD emissions | `reward_vault` token account funded by the admin / treasury | Per-second emission rate × dt, distributed pro-rata by `total_weight` |
| SOL fee share | `sol_vault` PDA, topped up by `deposit_gacha_fees` from the gacha program (or any depositor) | Each deposit is split immediately pro-rata by `total_weight` at deposit time |

Position weight = `tier_base_weight × lock_multiplier / 10_000`.

| Tier | Base weight | | Lock | Multiplier |
|---|---|---|---|---|
| Legendary | 10,000 | | Flexible | 1.0× |
| Epic | 4,000 | | 30-day | 1.5× |
| Rare | 1,500 | | 90-day | 2.5× |
| Common | 1,000 | | Cult (1y) | 5.0× |

A 1-year-locked legendary agent therefore weighs `10_000 × 5 = 50_000` — 50× a flexible common.

## Instructions

| Instruction | Signer | Purpose |
|---|---|---|
| `initialize_pool` | admin | Create the global pool keyed by CLAWD mint, set initial emission rate, allocate reward + SOL vault PDAs |
| `update_pool` | pool admin | Adjust emission rate, pause/unpause, transfer admin |
| `stake` | agent owner | Open a position; assumes the same tx has set FreezeDelegate authority = pool PDA |
| `unstake` | position owner | Close position, settle CLAWD + SOL rewards, transfer to owner; client revokes the freeze in the same tx |
| `claim_rewards` | position owner | Settle and pay out accrued rewards without closing the position |
| `deposit_gacha_fees` | anyone (typically the gacha program via CPI) | Top up the SOL vault and split pro-rata by current `total_weight` |

## Account layout

| Account | Seeds |
|---|---|
| `StakePool` | `["clawd-stake-pool", clawd_mint]` |
| `StakePosition` | `["clawd-stake-position", pool, agent_asset]` |
| `reward_vault` (SPL token) | `["clawd-reward-vault", pool]` |
| `sol_vault` (system) | `["clawd-sol-vault", pool]` |

## Phase 1B status

The repo now includes the off-chain staking transaction builder, webhook mirror,
frontend page, and pool initialization script. One on-chain enforcement item is
still deliberately marked as pre-mainnet work.

- [x] Server transaction builder (`server/_core/clawdStakeBuilder.ts`) that uses Metaplex Core SDK instructions for `FreezeDelegate`, validates `agentIdentities` via the Metaplex Agent Registry plugin, and builds unsigned stake / unstake / claim transactions.
- [x] Express API routes (`server/_core/clawdStakeRoutes.ts`) for `/api/clawd-stake/config`, build endpoints, and Convex-backed read endpoints.
- [x] Helius webhook → Convex mirror (`server/_core/clawdStakeWebhook.ts`) parsing Anchor event logs and calling `convex/clawdStake.ts`.
- [x] Frontend stake/unstake UI (`client/src/pages/AgentStake.tsx`) mounted at `/staking`.
- [x] One-shot pool initializer (`scripts/init-stake-pool.ts`) using the live CLAWD mint.
- [ ] `instructions/stake.rs::verify_freeze_delegate` — deserialize the MPL Core asset, confirm the AgentIdentity plugin is present (so this is a real Metaplex Agent, not just any Core asset), and assert the FreezeDelegate plugin's authority equals `pool.key()`.
- [ ] Mainnet-grade Core thaw/revoke authority — the current unstake builder produces the client-side Core remove instruction; before mainnet the staking program should CPI into Metaplex Core with the pool PDA signer seeds so the same on-chain authority that locks the asset is the one that unlocks it.

## CLAWD mint

`8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` (pump.fun launched).

## Program ID

The placeholder `Stake11111111111111111111111111111111111111` in `lib.rs` must be replaced with the real program ID generated by `anchor keys list` after first build.

## Verification

Run these before promoting changes:

```bash
pnpm run check
pnpm run build
cd programs && cargo check -p clawd-stake
```

For the live lock layer, test on devnet with a real Metaplex Core agent asset:

1. Open `/staking`.
2. Connect the owner wallet.
3. Paste the agent asset and collection.
4. Inspect the asset.
5. Stake and confirm `FreezeDelegate.frozen === true`.
6. Unstake and confirm the delegate is removed.
