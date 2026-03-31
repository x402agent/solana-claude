# Risk Engine Spec (Source of Truth) — v12.0.2

**Combined Single-Document Native 128-bit Revision**  
*(Off-Chain Shortlist Keeper / Flat-Only Auto-Conversion / Full-Local-PnL Maintenance / Live Premium-Based Funding / Immutable Configuration / Unencumbered-Flat Deposit Sweep / Mandatory Post-Partial Local Health Check Edition)*

**Design:** Protected Principal + Junior Profit Claims + Lazy A/K Side Indices (Native 128-bit Base-10 Scaling)  
**Status:** implementation source-of-truth (normative language: MUST / MUST NOT / SHOULD / MAY)  
**Scope:** perpetual DEX risk engine for a single quote-token vault.  
**Goal:** preserve conservation, bounded insolvency handling, oracle-manipulation resistance, and liveness while supporting lazy ADL across the opposing open-interest side without global scans, canonical-order dependencies, or sequential prefix requirements for user settlement.

This is a single combined spec. It supersedes prior delta-style revisions by restating the full current design in one document and replacing the earlier integrated on-chain barrier-scan keeper mode with a minimal on-chain exact-revalidation crank that assumes candidate discovery is performed off chain by permissionless keepers.

## Change summary from v12.0.1

This patch release preserves v12.0.1's live premium-based funding design and fixes the following non-minor specification issues.

1. **Funding sign, floor direction, and lazy-settlement conservation are now explicit for both rate signs.** §§1.6, 5.4, and 12 now state the exact `fund_term` sign behavior for `r_last > 0` versus `r_last < 0`, and they make the conservative floor semantics explicit in both directions.
2. **Funding price-basis timing is now stated normatively.** §§2.2 and 5.4 now say explicitly that funding over the elapsed interval uses the start-of-call snapshot `fund_px_0 = fund_px_last`, i.e. the previous interval's closing funding-price sample, and only then rolls `fund_px_last` forward to the current oracle price for the next interval.
3. **The engine/wrapper boundary for funding-rate provenance is now precise.** §§0, 4.12, 5.5, 10, and 12 now distinguish the engine's enforceable duties (ordering, bound validation, storage) from the deployment wrapper's separate obligation to source the supplied rate from final post-reset state.
4. **Raw funding-numerator bounds are now explicit.** §§1.6, 1.7, and 5.4 now make the checked arithmetic and numeric fit of `fund_px_0 * r_last * dt_sub` explicit, including the intermediate bound before division by `10_000`.

## 0. Security goals (normative)

The engine MUST provide the following properties.

1. **Protected principal for flat accounts:** An account with effective position `0` MUST NOT have its protected principal directly reduced by another account's insolvency.
2. **Explicit open-position ADL eligibility:** Accounts with open positions MAY be subject to deterministic protocol ADL if they are on the eligible opposing side of a bankrupt liquidation. ADL MUST operate through explicit protocol state, not hidden execution.
3. **Oracle manipulation safety:** Profits created by short-lived oracle distortion MUST NOT immediately dilute the live haircut denominator, immediately become withdrawable principal, or immediately satisfy initial-margin / withdrawal checks.
4. **Profit-first haircuts:** When the system is undercollateralized, haircuts MUST apply to junior matured profit claims before any protected principal.
5. **Conservation:** The engine MUST NOT create withdrawable claims exceeding vault tokens.
6. **Liveness:** The engine MUST NOT require `OI == 0`, manual admin recovery, a global scan, or reconciliation of an unrelated prefix of accounts before a user can safely settle, deposit, withdraw, trade, or liquidate.

## 1. Types, units, scaling, and arithmetic requirements

### 1.1 Amounts
- `u128` unsigned amounts are denominated in quote-token atomic units.
- `i128` signed amounts represent realized PnL, K-space liabilities, and fee-credit balances.

### 1.2 Prices and internal positions
- `POS_SCALE = 1_000_000` (6 decimal places).
- `price: u64` is quote-token atomic units per `1` base.

### 1.3 A/K scale
- `ADL_ONE = 1_000_000` (6 decimal places of fractional decay).
- `A_side` dimensionless multiplier.
- `K_side` has units `(ADL scale) * (quote atomic units per 1 base)`.

---
*Note: This document represents the core specification provided by the user. Subsequent sections describe ADL triggers, K-side indices, and oracle integration rules not shown here.*
