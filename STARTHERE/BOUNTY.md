# Percolator Bounty4 — STOXX50/SOL 20× Hybrid Perpetuals

**Win condition**: Cause `engine.insurance_fund.balance` to decrease via any sequence of public instruction calls.

**Market status (2026-05-14):** LIVE on mainnet. Authorities **NOT burned**.

---

## Table of Contents

1. [Market Overview](#1-market-overview)
2. [The Three-Leg Oracle Composite](#2-the-three-leg-oracle-composite)
3. [The After-Hours Problem](#3-the-after-hours-problem)
4. [EWMA Mark: Keeping Price Alive Without the Feed](#4-ewma-mark-keeping-price-alive-without-the-feed)
5. [HYBRID_AFTER_HOURS Fee: The Defense](#5-hybrid_after_hours-fee-the-defense)
6. [Slab Layout](#6-slab-layout)
7. [Open Security Findings (in scope)](#7-open-security-findings-in-scope)
8. [LP Position Desync (Dust Cleanup Bug)](#8-lp-position-desync-dust-cleanup-bug)
9. [Safe Audit Observations](#9-safe-audit-observations)
10. [Bounty Attack Strategies](#10-bounty-attack-strategies)
11. [Trading the Market](#11-trading-the-market)
12. [Keeper Loop & Automation](#12-keeper-loop--automation)
13. [On-Chain Provenance](#13-on-chain-provenance)
14. [Scripts Reference](#14-scripts-reference)
15. [Key Risk Parameters](#15-key-risk-parameters)

---

## 1. Market Overview

Bounty4 (`bounty_stoxx50_sol_20x_hybrid`) is a **20× leverage perpetual** tracking the **STOXX 50 ETF denominated in SOL** — the first cross-asset European equity perp on Solana mainnet.

```
Program:    4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz
Slab:       GSAT5fTCUgB9sMMTBsVzhvALbkSv6p9CifWmShHf92hj
Vault:      Bb7mjPkY7sfbSFRaxDFDQevWVZsLJEtLx7FgY4REwwtq  (wSOL, PDA-signed)
Vault PDA:  FeNLRuLLZ2agxj7gfLoY6G2Gww8WG8foQ5Ptd7FqU5Sb
Admin:      A3Mu2nQdjJXhJkuUDBbF2BdvgDs5KodNE9XsetXNMrCK
Insurance:  ~5 SOL seeded at deploy
Matcher:    None — TradeNoCpi only
```

**The market uses a three-leg Pyth Pull oracle composite:**

```
mark = 1 / (STOXX50_EUR × EUR_USD / SOL_USD)
     = SOL per STOXX50 share
```

| Leg | Symbol | Feed ID | Account | Schedule |
|-----|--------|---------|---------|----------|
| 1 | STOXX50/EUR | `dd08f0a4...` | `C2Cf16vF...` | EU hours 09:00–17:30 Paris |
| 2 | EUR/USD | `a995d00b...` | `Fu76Cham...` | 24/5 (FX) |
| 3 | SOL/USD | `ef0d8b6f...` | `7UVimffx...` | 24/7 (crypto) |

**Fee mode**: `HYBRID_AFTER_HOURS` — when Leg1 is fresh → 1bps static fee; when Leg1 is stale → EWMA mark + dynamic fee (1bps base + EWMA movement bps).

### Market Parameters

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `maintenance_margin_bps` | 500 | 5% → 20× max leverage |
| `initial_margin_bps` | 500 | No opening buffer (im = mm) |
| `trade_fee_base_bps` | 1 | 0.01% base fee |
| `max_trading_fee_bps` | 10,000 | 100% fee cap |
| `liquidation_fee_bps` | 5 | 0.05% per liq |
| `max_price_move_bps_per_slot` | 49 | §1.4 solvency envelope |
| `max_staleness_secs` | 600 | Per-leg Pyth freshness window |
| `markEwmaHalflifeSlots` | 6,480,000 | ~30 day EWMA half-life |
| `min_liquidation_abs` | 0 | No dust floor |
| `min_nonzero_im_req` | 600 | Exact-N proof room |

---

## 2. The Three-Leg Oracle Composite

The market uses a **Pyth Pull oracle with 3 legs** that are combined into a single composite price.

### How the Composite is Computed

```typescript
// All three Pyth PriceUpdateV2 accounts → e6 scaled integers
const leg1E6 = toE6(stoxx50Price, stoxx50Exponent);  // STOXX50/EUR
const leg2E6 = toE6(eurusdPrice,  eurusdExponent);   // EUR/USD
const leg3E6 = toE6(solusdPrice,  solusdExponent);   // SOL/USD

// Composite (e6 arithmetic): Leg1 × Leg2 / Leg3
const rawE6  = (leg1E6 * leg2E6) / leg3E6;           // STOXX50 in SOL × e6

// invert=1: mark = SOL per STOXX50 share
const markE6 = 1_000_000_000_000n / rawE6;           // inverted
```

### Oracle Leg Flags

`oracle_leg_flags=0x04` = `DIVIDE_LEG3`. The composite is computed as:
- `oracleLegFlags & 0x04`: multiply Leg1 × Leg2, then divide by Leg3
- The wrapper validates all 3 legs; if ANY leg is stale → EWMA fallback

### Pyth PriceUpdateV2 Layout

```
Offset  Bytes  Field
──────  ─────  ────────────────────────────────────
0       8      Anchor discriminator
8       32     write_authority
40      1      verification_level  (1=Full, 2=Partial)
41      32     feed_id
73      8      price (i64)         ← raw mantissa
81      8      conf (u64)
89      4      exponent (i32)      ← price_float = price × 10^exp
93      8      publish_time (i64)  ← staleness check
101     8      prev_publish_time
109     8      ema_price
117     8      ema_conf
125     8      posted_slot
```

Each oracle leg must have `publish_time` within `max_staleness_secs=600` of the current wall clock. If Leg1 (STOXX50/EUR) is stale, the entire system enters HYBRID_AFTER_HOURS mode.

---

## 3. The After-Hours Problem

**The fundamental challenge**: Solana runs 24/7/365. European equity markets do not.

```
      UTC Timeline (typical trading day)
      ─────────────────────────────────────────────────────────────────
                            07:00          15:30
      Leg 1 (STOXX50)       ████████████████│  ✗ stale   ✗ stale  ✗
      Leg 2 (EUR/USD)       ████████████████████████████████████████ ✓
      Leg 3 (SOL/USD)       ████████████████████████████████████████ ✓

      max_staleness = 600 s (10 min)
      Observed gap between shard updates: up to 27+ minutes (even during EU hours!)
```

**Critical observation**: The Pyth-sponsored shard cadence for the equity leg is **irregular** — observed 5–60 minutes between updates. Even during EU trading hours, the market frequently falls into HYBRID_AFTER_HOURS mode simply because the shard update cadence exceeds the 600s window.

**Quote from the README**: "Equity leg's sponsored-shard cadence is irregular (5–60 min between updates). With `max_staleness=600 s`, the wrapper often falls into the EWMA-mark branch even during EU hours."

---

## 4. EWMA Mark: Keeping Price Alive Without the Feed

When Leg1 goes stale, the slab switches to an **Exponentially Weighted Moving Average** of the last known mark.

### EWMA Update Formula

```
ewma_new = ewma_prev × decay + mark_new × (1 − decay)

where:
  decay     = 2^(-dt / halflife)
  dt        = current_slot − markEwmaLastSlot
  halflife  = markEwmaHalflifeSlots  (6,480,000 ≈ 30 days)
```

### Key Properties

1. **Extremely slow decay**: With a 30-day half-life and an overnight gap of ~40,000 slots (~6h), the EWMA barely moves. `decay ≈ 2^(-40000/6480000) ≈ 0.9957`

2. **EWMA only updates on trades/cranks when oracle is fresh**: If Leg1 is stale, the EWMA is NOT updated with new data. It simply decays toward zero (at an extremely slow rate).

3. **The EWMA is clamped against the external index**: EWMA mark updates are clamped against the external index, not the prior mark, bounding wash-trade divergence.

4. **Same-price after-hours fills do not refresh mark_ewma_last_slot**: Unless a full-weight observation actually moves the EWMA, the last-slot timestamp stays frozen.

### EWMA State (from slab config)

- `markEwmaE6` — last accepted EWMA value
- `markEwmaLastSlot` — slot when EWMA was last updated
- `markEwmaHalflifeSlots` — decay constant (6,480,000)

---

## 5. HYBRID_AFTER_HOURS Fee: The Defense

This is the key design that makes mark manipulation attacks uneconomical.

### Fee Formula

```
fee_bps = trade_fee_base_bps + ewma_movement_bps

ewma_movement_bps = |ewma_now − ewma_ref| × 10000 / ewma_ref

trade_fee_base_bps = 1 bps  (almost free when oracle fresh)
max_trading_fee_bps = 10000 bps (100% cap)
```

### Why It Works

The dynamic fee equals the mark movement the trade causes. If an attacker moves the mark by X bps:
- **Profit from mark move**: ≤ X bps × notional
- **Fee paid to enter**: = X bps × notional (minimum externality floor = max_price_move_bps_per_slot)
- **Expected net profit**: ≤ 0

The dynamic trade fee includes a minimum externality floor equal to `max_price_move_bps_per_slot` (49bps) in hybrid soft-stale mode.

### Fee Curve

```
  Fee (bps)
  100% ┤                                           ████
   80% ┤                               ████████████
   60% ┤                   ████████████
   40% ┤       ████████████
   20% ┤ █ 1bps base
    0% └──────────────────────────────────────────────
       0%     20%     40%     60%     80%    100%
              EWMA movement (bps) from reference
```

**However**, this defense only works for mark-manipulation attacks. It does NOT prevent:
- Exploitation of the composite divergence (Stale mark vs. actual market price)
- Value extraction from liquidation cascades (Finding D)
- Settlement ordering advantages (Finding B)
- Warmup slope floor exploitation (Finding N)

---

## 6. Slab Layout

The 1,755,520-byte slab account packs everything at known BPF offsets.

```
┌─────────────────────────────────────────────────────────────────┐
│  Offset 0      HEADER (136 bytes)                                │
│    [0..8]    magic = 0x504552434f4c4154  ("PERCOLAT")            │
│    [8..12]   version                                              │
│    [12]      bump                                                  │
│    [13]      flags (bit 2 = CPI_IN_PROGRESS)                     │
│    [16..48]  admin pubkey                                         │
│    [48..56]  nonce                                                │
│    [56..64]  matCounter                                           │
│    [72..104] insuranceAuthority                                   │
│    [104..136] insuranceOperator                                   │
├─────────────────────────────────────────────────────────────────┤
│  Offset 136    CONFIG (528 bytes) — MarketConfig                  │
│    [+0..32]   collateralMint                                     │
│    [+32..64]  vaultPubkey                                        │
│    [+64..96]  indexFeedId (Leg1)                                 │
│    [+96..128] oracleLeg2FeedId                                   │
│    [+128..160] oracleLeg3FeedId                                  │
│    [+160]     oracleLegCount (u8)                                │
│    [+161]     oracleLegFlags (u8)   0x04 = DIVIDE_LEG3           │
│    ...                                                            │
│    [markEwmaE6]         ← EWMA value in e6                       │
│    [markEwmaLastSlot]   ← slot of last EWMA update               │
│    [markEwmaHalflifeSlots] ← decay constant (~30d)               │
│    [tradeFeeBaseBps]    ← 1bps base                              │
│    [tradeFeeMode]       ← 1 = HYBRID_AFTER_HOURS                 │
├─────────────────────────────────────────────────────────────────┤
│  Offset 664    RISK ENGINE (1,721,928 bytes)                      │
│    [+0..16]   vault balance (u128)                               │
│    [+16..32]  insurance fund (u128)                              │
│    [+200]     currentSlot                                         │
│    [+208]     market_mode (0=Live, 1=Resolved)                   │
│    [+472..488] oiEffLongQ, oiEffShortQ (u128)                   │
│    [+504]     side_mode_long (0=Normal, 1+2=non-normal)         │
│    [+505]     side_mode_short (0=Normal, 1+2=non-normal)        │
│    [+824]     materializedAccountCount                           │
│    [+904]     bankruptcyHmaxLockActive                           │
│    [+1088..]  account bitmap → per-account 416-byte records     │
└─────────────────────────────────────────────────────────────────┘
```

### Slab Layout Constants (from `bounty4-diagnose.ts`)

```
HEADER_LEN   = 136
CONFIG_LEN   = 528
ENGINE_OFF   = 664   (align_up(136 + 528, 8))
SLAB_LEN     = 1,755,520 bytes (MAX_ACCOUNTS = 4096)
ACCOUNT_SIZE = 416 bytes per account
```

### Key Engine Fields for Bounty Tracking

| Field | Offset (from ENGINE_OFF) | Type | Purpose |
|-------|--------------------------|------|---------|
| vault | +0 | u128 | Total vault balance (lamports) |
| insurance fund | +16 | u128 | Insurance fund balance |
| side_mode_long | +504 | u8 | 0=Normal, >0 indicates stress |
| side_mode_short | +505 | u8 | 0=Normal, >0 indicates stress |
| market_mode | +208 | u8 | 0=Live, 1=Resolved |
| bankruptcyHmaxLockActive | +904 | u8 | 0/1 |

---

## 7. Open Security Findings (in scope)

These findings are documented in `llm_oracle/percolator-cli-master 2/issue.md` and are **in scope** for the bounty. Ordered by expected exploitability on the live bounty4 market.

### Finding D: Partial Liquidation → Full Close Cascade (MEDIUM — OPEN)

**File**: `/home/anatoly/percolator/src/percolator.rs`, line ~1980-1993

**Summary**: After partial liquidation, the safety check re-evaluates margin using reduced capital (from mark PnL settlement). This can trigger immediate full liquidation of the remaining position.

**Attack vector**: If you can detect or trigger an undercollateralized account, a single liquidation instruction might cascade into a full close — extracting more from the insurance fund (via liquidation fees) or from the position than expected.

**Root cause**: `compute_liquidation_close_amount` does not account for the capital drain that occurs during partial close settlement.

**State**: `negPnlAccountCount > 0` on the live market means there are accounts with negative PnL that could be targets.

### Finding B: Warmup Settlement Ordering Unfairness (MEDIUM — OPEN)

**Summary**: The haircut ratio is a global value that changes as each account settles warmup. Accounts that settle first get a different (potentially better) rate. Settlement order is deterministic by account index.

**Attack vector**: If you control multiple accounts, opening low-index accounts first means they settle warmup at a better haircut ratio — extracting proportionally more value from positive PnL than later accounts.

**Mitigation**: Low impact when haircut = 1 (which is typical when the system is healthy).

### Finding N: Warmup Slope Floor Enables Accelerated Micro-PnL Extraction (MEDIUM — OPEN)

**File**: `/home/anatoly/percolator/src/percolator.rs`, `update_warmup_slope()` ~line 2043

**Summary**: The warmup slope has a floor of 1. For tiny PnL amounts (1 lamport), `slope = max(1, 1/1000) = 1`, so the full PnL warms up in 1 slot instead of `warmup_period_slots` (up to ~30 days).

```
slope = max(1, avail_gross / warmup_period_slots)
```
With PnL=1 and warmup_period=1000: slope = 1, full warmup in 1 slot.

**Attack vector**: By making many micro-trades that each generate 1 unit of PnL, a user can extract profits much faster than the warmup period intends.

**Mitigation**: Each micro-trade costs transaction fees (~5000 lamports) and trading fees. Net negative per trade at current fee structure. Only profitable at scale with near-zero fees.

### Finding O: `close_account` Skips Crank Freshness Check (LOW — OPEN)

**File**: `/home/anatoly/percolator/src/percolator.rs`, `close_account()` ~line 1272

**Summary**: `close_account()` does not call `require_fresh_crank()` or `require_recent_full_sweep()`, unlike `withdraw()`. This allows account closure with stale system state.

**Attack vector**: Users could close accounts faster than they can withdraw during stress periods. However, `close_account` requires `position_size == 0` and `pnl == 0`, so the practical extraction is just returning capital.

### Finding P: TradeCpi Allows Arbitrary Mark Price via Malicious Matcher (HIGH — OPEN)

**File**: `/home/anatoly/percolator-prog/src/percolator.rs`, lines 3104-3107

**Summary**: In Hyperp mode, `TradeCpi` sets the mark price to `exec_price_e6` returned by the external matcher program with NO bounds validation. A malicious matcher can return any exec_price.

**On bounty4**: No matcher is provisioned — only `TradeNoCpi` works. However, any user can call `InitLP` with a custom matcher. If a matcher is deployed and used via `TradeCpi`, the mark can be manipulated.

**Mitigating factor**: The LP loses money on the trade itself (PnL uses `oracle_price - exec_price`), providing economic disincentive.

### Finding Q: Index Can Jump Instantly When `oracle_price_cap_e2bps = 0` (MEDIUM — OPEN)

**File**: `/home/anatoly/percolator-prog/src/percolator.rs`, line 2381

**Summary**: At market initialization, `oracle_price_cap_e2bps` defaults to 0, which disables rate limiting for index smoothing. The index can instantly jump to any mark price.

```
if cap_e2bps == 0 || dt_slots == 0 { return mark; }
```

**On bounty4**: Relevant only in Hyperp mode with an admin oracle. The bounty4 market uses Pyth Pull oracles, so this is N/A unless the oracle authority pushes prices.

### Finding I: Admin Config Updates Have No Cross-Parameter Validation (MEDIUM — OPEN)

**Summary**: `UpdateConfig`, `SetMaintenanceFee`, and other admin instructions accept parameter values with minimal validation. Admin can set `initial_margin_bps < maintenance_margin_bps`, `warmup_period_slots = 0`, etc.

**On bounty4**: Admin key is NOT burned. If the admin (A3Mu2n...) makes a configuration mistake or there's a front-running opportunity, an attacker could exploit parameter inconsistencies.

**In scope**: Admin misconfiguration exploitation IS explicitly in scope since authorities are "NOT burned."

### Finding L: Trade Margin Check Uses `maintenance_margin_bps` Instead of `initial_margin_bps` (HIGH — **FIXED**)

**File**: `/home/anatoly/percolator/src/percolator.rs`, lines 2816-2817

**Summary (fixed in commit 9731300)**: `execute_trade()` post-trade check was using maintenance margin (5%) instead of initial margin (10%), allowing 2x intended leverage.

**Now correct**: Risk-increasing trades require `initial_margin_bps`; risk-reducing trades use `maintenance_margin_bps`.

### Finding M: Funding Rate Retroactive Application (HIGH → LOW — **MITIGATED**)

**Summary (mitigated)**: The engine correctly implements anti-retroactivity: funding is accrued using the STORED rate, not the newly computed rate. This prevents a large position from being opened, then immediately cranking at a favorable rate.

### Finding K: Zero-Capital PnL Zombie Accounts (CRITICAL — **FIXED**)

**File**: `/home/anatoly/percolator/src/percolator.rs`, commit e838580

**Summary (fixed)**: Accounts with 0 capital but positive PnL and a small position became "PnL zombies" — cannot close, GC, or liquidate. Their unbounded positive PnL dominated `pnl_pos_tot`, collapsing the global haircut ratio.

**Fix**: Crank now settles warmup for visited accounts; fee debt subtracted from equity.

### Finding J: Fee Evasion via Matcher-Controlled Execution Price (HIGH — **FIXED**)

**File**: `/home/anatoly/percolator/src/percolator.rs`, commit 9cdc92b

**Summary (fixed)**: Ceiling division was added. Not relevant for bounty4 (no matcher deployed).

---

## 8. LP Position Desync (Dust Cleanup Bug)

**Severity**: LOW (found in audit, documented in `llm_oracle/percolator-cli-master 2/docs/audit/lp_issue.md`)

### Summary

During red team security testing, a position accounting discrepancy was discovered:

```
LP position:             -3,394,330,890,648 units
Sum of user positions:    3,394,330,790,648 units
Mismatch:                        100,000 units
```

The mismatch of exactly `100,000` units (= `min_liquidation_abs`) is caused by the **dust position cleanup mechanism**.

### Root Cause

When a user's dust position (below `min_liquidation_abs`) is force-closed by the crank:
1. User's `position_size` is set to 0
2. `total_open_interest` is reduced
3. The LP's counterparty position is **NOT adjusted**

This creates an **orphaned LP position**: the LP has short exposure with no user counterpart.

### The Force-Close Sequence

```rust
// In force_close_position_deferred for USER account:
self.accounts[idx].position_size = I128::ZERO;       // User position zeroed
self.total_open_interest = self.total_open_interest - abs_pos;  // OI reduced

// NOTE: LP position is NOT adjusted when closing a user position
// self.net_lp_pos is NOT changed for user force-closes
```

### Impact

- Orphaned LP position: 100,000 units (~0.00077 SOL notional, ~0.01% of vault)
- Creates a **PnL leak**: LP may accumulate gains/losses not offset by any user
- Over time, repeated dust force-closes could accumulate a significant imbalance
- Conservation equation still holds (vault >= capital + insurance)

### Observation for Bounty

This could be part of a larger exploit chain. If a large number of dust positions are created and force-closed, the orphaned LP exposure grows. Extreme price movements against the orphaned position could cause insurance fund depletion.

**Specifically for bounty4**: `min_liquidation_abs = 0` — meaning dust cleanup is disabled! This eliminates the LP desync path on this market.

---

## 9. Safe Audit Observations

From `llm_oracle/percolator-cli-master 2/docs/bounty4-safe-audit.md`:

### What Was Verified (No Direct Exploit Found)

1. **Stale/EWMA self-deal is regression-tested**: The wrapper tests include external hybrid after-hours self-deal, band-edge self-deal, and same-mark clock pinning cases.

2. **Insurance withdrawal is authority-gated**: `WithdrawInsuranceLimited` is scoped to `insurance_operator` and then gated by mode, hard stale timeout, health, cooldown, bps cap, optional deposits-only budget, and token-account validation. Not a public bounty path unless authorization bypass found.

3. **Liquidation is more promising**: The engine explicitly rejects partial liquidation when post-partial account is still below maintenance. Next question: does every wrapper path preserve atomicity when a candidate partial liquidation fails after mutation in the engine's not-atomic internal path?

4. **CLI is not sufficient to prove safety**: Value-moving invariants live in the Rust engine/program. Validate claims against pinned Rust code.

### The Three-Leg Composite Structure

Leg1 (STOXX50/EUR) is the only stale-prone leg. The safe audit confirmed:
- Hybrid after-hours mode is only active for non-Hyperp external-oracle markets with dynamic-fee headroom
- The after-hours target falls back to: `mark_ewma_e6` → `hyperp_mark_e6` → `last_effective_price_e6`
- EWMA mark updates are clamped against the external index, not the prior mark

### Recommended Audit Paths

1. Add a local-only wrapper regression around failed partial liquidation to verify Solana instruction transaction stays atomic across a post-health failure
2. Add a CLI read-only command that flags:
   - hybrid soft-stale active
   - target/effective lag
   - nonzero OI while market lag is growing
   - side modes not normal
   - insurance decrease in local logs

---

## 10. Bounty Attack Strategies

The win condition is: **cause `engine.insurance_fund.balance` to decrease** via public instruction calls.

### Strategy A: The SHORT Arbitrage (Direct Trading)

**Best-documented approach** in `scripts/bounty4-trade.ts`.

The composite price (STOXX50/SOL) diverges from the frozen EWMA mark during after-hours:

```
EWMA mark (frozen): 1,352,123 e6
Current composite:  1,289,964 e6  (4.6% lower)
Gap: entirely from EUR/USD + SOL/USD drift during stale period
```

**The trade**:
1. OPEN SHORT at the EWMA mark during after-hours
2. Fee at OPEN: ~50bps (hybrid_soft_stale_matured=true, floor 49bps)
3. Wait for oracle to refresh (either via Pyth-sponsored shard or manual push)
4. CLOSE at the fresh composite price
5. Fee at CLOSE: 1bps only (soft_stale_matured=false after refresh)
6. **Expected net: ~4.1% on notional**

**Risk**: If STOXX50/EUR actually moves against the position during the stale period, the loss could exceed the expected gain. The expected gain is purely from the divergence between frozen EWMA and drifted Leg2/Leg3.

**Script**: `bounty4-trade.ts` — automates the full sequence.

### Strategy B: Oracle Refresh Extraction

**Script**: `bounty4-oracle-push.ts` — pushes fresh Pyth Lazer price to the stale Leg1 oracle.

Pyth Lazer provides real-time price feeds with Solana-verifiable signed payloads. The wallet that pushes the oracle update triggers:
1. The market exits HYBRID_AFTER_HOURS mode
2. The EWMA mark updates toward the fresh composite
3. The trading fee drops from ~50bps to 1bps

**If you control both a trading wallet and an oracle-pushing wallet**: Open SHORT during after-hours, then push oracle and close → capture the divergence.

**Script dependencies**:
- Requires `PYTH_API_KEY` environment variable
- Uses Pyth Lazer WebSocket/REST API for real-time price data
- Posts Solana-encoded payload to Pyth receiver program

### Strategy C: Permissionless Keeper Crank Rewards

**Script**: `mainnet-bounty4-tick.ts` / `bounty4_loop.py`

The keeper crank is permissionless. Running it:
- Costs ~5000 lamports per transaction fee
- Can earn nothing directly (no crank reward in this design)
- **BUT**: provides information advantage — you see the market state before others
- Liquidations that occur during your crank can be front-run

### Strategy D: Finding D — Liquidation Cascade

If there are undercollateralized accounts (check with `bounty4-status.ts`):
1. Trigger a partial liquidation
2. The post-partial margin check fails (capital drained by mark PnL settlement)
3. Engine cascades into full close
4. The liquidation fee (5bps, capped at 50 SOL) goes... where?

**Key question**: Does the liquidation fee go to the liquidator (keeper) or to the insurance fund? If to the liquidator, the insurance fund is preserved (not drained). If from the insurance fund, this could be a vector.

### Strategy E: Finding B — Settlement Ordering

If `pnlPosTot > 0` (accounts have positive PnL):
1. Create multiple accounts at low indices
2. When warmup settlement occurs, low-index accounts settle first
3. Get a better haircut ratio → extract more value
4. This value comes from... the insurance fund? Other accounts?

### Strategy F: Finding N — Micro Warmup Extraction

1. Make many micro-trades generating 1 lamport PnL per trade
2. Each 1-lamport PnL warms up in 1 slot (slope floor = 1)
3. Extract the warmed-up PnL immediately
4. **Problem**: Each trade costs ~5000 lamports in tx fees + trading fees
5. Net negative unless fees are near-zero

### Strategy G: Admin Config Exploitation

Admin key (A3Mu2nQdjJXhJkuUDBbF2BdvgDs5KodNE9XsetXNMrCK) is NOT burned.
- Monitor for admin transactions (config changes, parameter updates)
- If admin sets `maintenance_margin_bps > initial_margin_bps`, exploit immediately
- If admin sets risky parameters, front-run the change

### Strategy H: LP Position Desync Accumulation

Even though `min_liquidation_abs = 0` (no dust cleanup), the LP desync finding from the audit is worth monitoring:
- If positions are force-closed for other reasons (negative equity in crank)
- The orphaned LP exposure accumulates
- Extreme price movement against the orphaned position → insurance fund loss

### Opportunity Scoring (from `three-leg-composite.ts`)

| Strategy | Ref | Feasibility | Expected Value |
|----------|-----|-------------|----------------|
| Keeper crank fees | operational | feasible | ~0.0001 SOL × accounts |
| LP provisioning | operational | feasible | OI × fee/10000 × 0.5 |
| Micro warmup extraction | N | NOT feasible | Negative (tx cost > gain) |
| Liquidation cascade | D | feasible | 0.001 × insurance × negPnlAccts |
| Early settlement | B | conditionally | 0.0001 × vault |

---

## 11. Trading the Market

### Instruction Account Layouts

```
InitUser (6 accts):           [user, slab, userAta, vault, tokenProgram, clock]
DepositCollateral (6):        [user, slab, userAta, vault, tokenProgram, clock]
WithdrawCollateral (10):      [user, slab, vault, userAta, vaultPda, tokenProgram, clock, leg1, leg2, leg3]
TradeNoCpi (7):               [user, lp, slab, clock, leg1, leg2, leg3]
CloseAccount (10):            [user, slab, vault, userAta, vaultPda, tokenProgram, clock, leg1, leg2, leg3]
KeeperCrank (6):              [caller, slab, clock, leg1, leg2, leg3]
```

**Key fact**: InitUser and DepositCollateral **don't require a fresh oracle**. Trade, Withdraw, Close, and Crank all read the 3-leg composite. During off-hours, the equity leg is stale → EWMA fallback.

### The TradeNoCpi Path

Bounty4 has no matcher deployed. All trades must use `TradeNoCpi`:
- Both user AND LP must sign (bilateral)
- The matcher fields in InitLP are ignored by TradeNoCpi
- TradeNoCpi uses the oracle composite (or EWMA fallback) for pricing

### Testing the Trade Path

```bash
# Read-only status check
npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-status.ts"

# Simulate trade (no SOL required)
PERCOLATOR_DIR="llm_oracle/percolator-cli-master 2" \
  SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-trade.ts" --dry-run

# Full trade (requires ~0.15 SOL wallet)
SOLANA_KEYPAIR=~/.config/solana/id.json \
  npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-trade.ts"
```

### Running the Systematic Probe

```bash
# Simulate all instruction paths (no SOL required)
npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-probe.ts"

# For trade setup output:
PROBE_MODE=trade npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-probe.ts"
```

---

## 12. Keeper Loop & Automation

### Cron Tick Architecture

The `mainnet-bounty4-tick.ts` script runs once per minute via cron:
- 48-second inner loop
- 4-second cadence between crank rounds
- Adaptive CU sizing: starts at estimated CU per round, backs off if OOM
- Adaptive priority fee: exponential backoff when lag grows
- Up to 9 bundled crank instructions per round
- Writes JSONL to `~/.cache/percolator/bounty4-tick.log`

### Tick Log Watched Flags

| Flag | Meaning | Action |
|------|---------|--------|
| `INSURANCE_DROP` | Insurance balance decreased | Bounty hit candidate |
| `CONSERVATION_BROKEN` | vault SPL ≠ engine.vault | Deep bug |
| `ACCOUNTING_BROKEN` | vault < cTot + insurance | Accounting violation |
| `ACCRUE_LAG(>1000sl)` | Keeper struggling | >1h gap is alarming |
| `SIDE_MODE_NON_NORMAL` | Liquidation cascade | Market stress |
| `PRICE_MOVE_SAT(consumed=…)` | Price-move threshold tripped | Envelope breach |

### Python Persistent Loop

```bash
# Runs until INSURANCE_DROP detected
python3 "llm_oracle/percolator-cli-master 2/bounty4_loop.py" \
  --rpc https://api.mainnet-beta.solana.com
```

### Install Cron

```bash
cd "llm_oracle/percolator-cli-master 2"
npx tsx scripts/mainnet-bounty4-cron-install.ts
```

### Manual Crank

```bash
npx tsx "llm_oracle/percolator-cli-master 2/scripts/mainnet-bounty4-tick.ts"
```

---

## 13. On-Chain Provenance

```
Program:       4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz
BPF SHA-256:   408cbaa53403c54474c9b3e085f27571e7af293cfe12845316683bd6fdc5d7fc
BPF size:      536,432 bytes
Engine pin:    1dc4466e1a6c3532f2781bc242fa4e4033751fb6 (percolator)
Prog pin:      f626639 (percolator-prog, origin/main)
SLAB_LEN:      1,755,520 bytes (MAX_ACCOUNTS=4096)
```

### Verify On-Chain Binary

```bash
# Dump and hash
solana program dump -u m 4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz /tmp/bounty4.so
sha256sum /tmp/bounty4.so
# → 408cbaa53403c54474c9b3e085f27571e7af293cfe12845316683bd6fdc5d7fc

# Reproduce from source
git clone https://github.com/aeyakovenko/percolator-prog.git
cd percolator-prog
git checkout f626639
cargo build-sbf -- --no-default-features
sha256sum target/deploy/percolator_prog.so
```

### Key Source Code Locations

**Wrapper** (`percolator-prog/src/percolator.rs`):
- `is_hybrid_after_hours_mode`: ~line 3833
- `hybrid_soft_stale_matured`: ~line 3839
- `hybrid_after_hours_target`: ~line 3848
- `trade_fee_bps_for_execution`: ~line 4697
- TradeNoCpi EWMA update and same-price clock guard: ~line 7872

**Engine** (`percolator/src/percolator.rs`):
- Bounded price step cap: ~line 4020
- Accrual segment price/funding envelope: ~line 4560
- Fee collection into insurance with uncollectible fee drop: ~line 7961
- Liquidation path and post-partial health check: ~line 8266

**CLI oracle helpers** (`src/oracle/three-leg-composite.ts`):
- Three-leg composite computation
- Off-chain EWMA/fee display helpers
- Opportunity scoring

---

## 14. Scripts Reference

| Script | Purpose | Status |
|--------|---------|--------|
| `bounty4-trade.ts` | Execute SHORT arbitrage | Ready |
| `bounty4-oracle-push.ts` | Push Pyth Lazer price to stale oracle | Ready |
| `bounty4-status.ts` | Read-only state inspector | Ready |
| `bounty4-diagnose.ts` | Deep slab diagnosis (byte-level dump) | Ready |
| `bounty4-probe.ts` | Systematic simulate-only probe of all paths | Ready |
| `mainnet-bounty4-tick.ts` | Permissionless crank tick | Running (cron) |
| `mainnet-bounty4-cron-install.ts` | Install cron entry | Run once |
| `bounty4_loop.py` | Persistent Python keeper loop | Ready |
| `adversarial-test.ts` | Security attack simulation (devnet) | Devnet only |
| `three-leg-composite.ts` | Oracle/EWMA display + opportunity scoring | Ready |

---

## 15. Key Risk Parameters

| Parameter | Value | Bounty Relevance |
|-----------|-------|------------------|
| `initial_margin_bps` | 500 | 20× leverage — maximum position per collateral |
| `max_price_move_bps_per_slot` | 49 | Defines the §1.4 solvency envelope |
| `trade_fee_base_bps` | 1 | Base fee (goes to insurance) |
| `max_trading_fee_bps` | 10,000 | 100% cap on dynamic fee |
| `min_nonzero_im_req` | 600 | Non-zero check (not 500!) — potential inconsistency? |
| `max_staleness_secs` | 600 | Triggers HYBRID_AFTER_HOURS |
| `permissionless_resolve_stale_slots` | 6,480,000 | ~30 days before anyone can force-resolve |
| `force_close_delay_slots` | 216,000 | ~24h post-resolution grace period |
| `insurance_fund` | 5 SOL seeded | Bounty target |
| `tvl_insurance_cap_mult` | 50 | Total deposits ≤ 50× insurance |
| `new_account_fee` | 5,882,000 lamports | ~$0.55 routed to insurance |
| `maintenance_fee_per_slot` | 58 lamports | ~$1/day per account |
| `liquidation_fee_bps` | 5 | 0.05% per liquidation |
| `liquidation_fee_cap` | 50 SOL | Max per liquidati on |
| `min_liquidation_abs` | 0 | No dust cleanup (eliminates LP desync path) |

---

## Quickstart Commands

```bash
# 1. Check live market status
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-status.ts"

# 2. Probe all instruction paths (simulate, no SOL needed)
npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-probe.ts"

# 3. Watch the oracle stale period and EWMA
# Leg1 (STOXX50) is usually stale during non-EU hours
# Check if current composite diverges from frozen EWMA

# 4. Simulate the SHORT trade
PERCOLATOR_DIR="llm_oracle/percolator-cli-master 2" \
  SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  npx tsx "llm_oracle/percolator-cli-master 2/scripts/bounty4-trade.ts" --dry-run

# 5. Run continuous keeper loop (monitors for INSURANCE_DROP)
python3 "llm_oracle/percolator-cli-master 2/bounty4_loop.py"

# 6. Pro-tip: during the stale gap, the composite drifts 2-5% from the EWMA.
#    Opening SHORT at EWMA and CLOSING after oracle refresh captures this spread.
#    Opening LONG when fresh and holding through stale could work in reverse.
```

---

*The mark moves with the EWMA. The fee follows the mark. Find a way to extract value from other positions or the insurance fund, and win the most valuable bounty.*
