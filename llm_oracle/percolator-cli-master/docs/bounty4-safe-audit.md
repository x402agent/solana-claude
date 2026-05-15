# Bounty 4 Safe Audit Notes

Scope:
- CLI tree: `percolator-cli-master 2/src`
- Upstream engine pinned by Bounty 4 README: `aeyakovenko/percolator@1dc4466e1a6c3532f2781bc242fa4e4033751fb6`
- Upstream wrapper pinned by Bounty 4 README: `aeyakovenko/percolator-prog@f626639`

This note is limited to defensive bounty analysis. It does not document a live
fund-drain sequence.

## Current Result

I did not find a direct stale-STOXX/EWMA path in the pinned code that makes
mark manipulation economically favorable. The wrapper and engine contain
explicit controls for the path described in the bounty:

- Hybrid after-hours mode is only active for non-Hyperp external-oracle markets
  with dynamic-fee headroom.
- The after-hours target falls back to `mark_ewma_e6`, then `hyperp_mark_e6`,
  then `last_effective_price_e6`.
- The dynamic trade fee is based on EWMA movement and, in hybrid soft-stale
  mode, includes a minimum externality floor equal to
  `max_price_move_bps_per_slot`.
- EWMA mark updates are clamped against the external index, not the prior mark,
  bounding wash-trade divergence.
- Same-price after-hours fills do not refresh `mark_ewma_last_slot` unless a
  full-weight observation actually moves the EWMA.

## Relevant Code References

Pinned wrapper source:

- `percolator-prog/src/percolator.rs`
  - `is_hybrid_after_hours_mode`: line ~3833
  - `hybrid_soft_stale_matured`: line ~3839
  - `hybrid_after_hours_target`: line ~3848
  - `trade_fee_bps_for_execution`: line ~4697
  - TradeNoCpi EWMA update and same-price clock guard: line ~7872

Pinned engine source:

- `percolator/src/percolator.rs`
  - bounded price step cap: line ~4020
  - accrual segment price/funding envelope: line ~4560
  - fee collection into insurance with uncollectible fee drop: line ~7961
  - liquidation path and post-partial health check: line ~8266

CLI helper source:

- `src/oracle/three-leg-composite.ts`
  - local three-leg composite and stale-leg status
  - off-chain EWMA/fee display helpers
- `scripts/bounty4-status.ts`
  - safe state inspector; no trading or fund-moving instructions

## Bounty-Relevant Observations

1. Stale/EWMA self-deal is already directly regression-tested upstream.
   The linked wrapper tests include external hybrid after-hours self-deal,
   band-edge self-deal, and same-mark clock pinning cases.

2. The strongest live-insurance path is authority-gated, not public.
   `WithdrawInsuranceLimited` is scoped to `insurance_operator` and then gated
   by mode, hard stale timeout, health, cooldown, bps cap, optional deposits-only
   budget, and token-account validation. That is not a public bounty path unless
   an authorization bypass is found.

3. Liquidation is more promising for audit than stale-mark trading.
   The engine explicitly rejects partial liquidation when the post-partial
   account is still below maintenance. A useful next test is not "can I drain",
   but "does every wrapper path preserve atomicity when a candidate partial
   liquidation fails after mutation in the engine's not-atomic internal path?"

4. The CLI is not sufficient to prove accounting safety.
   It serializes instructions and decodes state. The value-moving invariants
   live in the Rust engine/program. Keep new detectors in the CLI tree, but
   validate claims against the pinned Rust code.

## Safe Next Work

- Add a local-only wrapper regression around failed partial liquidation to verify
  the Solana instruction transaction stays atomic across a post-health failure.
- Add a CLI read-only command that flags:
  - hybrid soft-stale active
  - target/effective lag
  - nonzero OI while market lag is growing
  - side modes not normal
  - insurance decrease in local logs
- If a new issue is found, produce a bounty report with:
  - root cause
  - local/devnet-only reproduction
  - expected vs actual accounting deltas
  - proposed fix
