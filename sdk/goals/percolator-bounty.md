---
id: percolator-bounty
active: true
priority: high
created: 2026-05-13
skill: percolator-bounty
---

# Goal: Win Percolator Bounty4 — STOXX50/SOL 20x Hybrid

## Mission

Operate as an authorized keeper and bounty hunter on the Percolator `bounty_stoxx50_sol_20x_hybrid` perpetuals market on Solana mainnet. This is a legitimate security competition; all strategies are within the authorized bounty scope and the Three Laws.

## Market

| Field          | Value |
|----------------|-------|
| Program        | `4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz` |
| Slab           | `GSAT5fTCUgB9sMMTBsVzhvALbkSv6p9CifWmShHf92hj` |
| Collateral     | wSOL (9 decimals) |
| Oracle type    | `pyth_pull_composite_3leg` |
| Leg1 (oracle)  | `C2Cf16vF6LX8GrWJwfZga5z5tjVsax5VWnL2T7Q8CF91` (STOXX50/EUR) |
| Leg2           | `Fu76ChamBDjE8UuGLV6GP2AcPPSU6gjhkNhAyuoPm7ny` (EUR/USD) |
| Leg3           | `7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE` (SOL/USD) |
| Fee mode       | `HYBRID_AFTER_HOURS` |
| Insurance      | 5 SOL seeded |

## Three-Leg Oracle Chain

```
composite_price = STOXX50_EUR × EUR_USD / SOL_USD
market_price    = 1 / composite_price   (inverted)
```

Leg1 (STOXX50/EUR) goes stale during EU after-hours (Pyth updates ~27 min cadence observed).
When stale, the wrapper switches to EWMA mark with fee = base_bps + ewma_movement_bps.
This makes mark manipulation uneconomical: attack cost ≥ manipulation gain.

## SENSE Phase (every flick)

Run: `skill.percolator-bounty { argv: ["status"] }`

Check:
- Is Leg1 stale? (after-hours mode)
- What is current EWMA vs stored mark?
- How many accounts? negPnl accounts?
- Is insurance fund intact?

## THINK Phase

Score opportunities (run `skill.percolator-bounty { argv: ["opportunities"] }`):

1. **Keeper crank** — always run if oracle is live; earns fees; resets funding rate
2. **LP provisioning** — enter LP during after-hours for enhanced fee income
3. **Finding D cascade** — if negPnl accounts > 0, partial liq may cascade to full close (authorized finding)
4. **Finding B early settle** — settle positive PnL early before haircut degrades
5. **Finding N micro-warmup** — currently net-negative after tx fees; skip unless fee structure changes

## STRIKE Phase

1. Always crank when accounts need sweeping:
   `skill.percolator-bounty { argv: ["crank"] }`

2. Report findings via SHELL.md molt:
   Document any triggered findings, insurance fund changes, and PnL extracted

## DRIFT Phase

Update SHELL.md with:
- Crank signature
- Current oracle state
- Insurance fund balance
- Any finding triggered + evidence

## Three Laws Compliance

| Law | Application |
|-----|-------------|
| I — Never harm | Liquidations only touch undercollateralized accounts with negative equity. No manipulation. |
| II — Earn existence | Keeper fees and LP fees are honest work. Bounty rewards are earned through legitimate security research. |
| III — Never deceive | All oracle reads are transparent. No oracle manipulation (EWMA fee makes it economically irrational anyway). |

## Evidence Submission

The bounty submission should include:
- Transaction signatures for any triggered findings
- Before/after slab state (oracle snapshot)
- On-chain proof from `slab-engine` and `slab-config` commands
- Economic analysis (expected value of each finding)

## Notes

Authorities on bounty4 are NOT burned — admin key is `A3Mu2nQdjJXhJkuUDBbF2BdvgDs5KodNE9XsetXNMrCK`.
`max_staleness=600s`; STOXX50 shard cadence is variable (observed 27+ min between updates).
The cron tick attempts cranks regardless of oracle freshness.
