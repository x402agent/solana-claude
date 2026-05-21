/**
 * AMM math — pool-based perp primitives.
 *
 * Solana perps AMMs (Flash, Jupiter, GMTrade) are pool-backed: LPs deposit
 * collateral, traders borrow against the pool, and funding/borrow rates are
 * driven by per-side utilization. The slippage model in `slippage.ts` is a
 * generic sqrt-impact placeholder; this module is the real thing — it
 * accounts for:
 *
 *   - Per-side capacity (max OI long / short), so we refuse to fill a quote
 *     that would exceed the pool's allowance.
 *   - Utilization-aware impact: opening into the heavy side is cheap, opening
 *     into the light side is expensive (the pool is short of inventory).
 *   - Predicted next-period funding from current OI imbalance.
 *
 * All math here is pure — no I/O — so it can be unit-tested and reused by
 * any adapter that can produce a `PoolState`.
 */

import type { Side } from "../types.js";

/**
 * Live pool state for a single perp market on an AMM venue.
 *
 * Conventions:
 *   - All notional/AUM values are USD (float).
 *   - "Long OI" is the dollar notional of long positions; "short OI" is the
 *     dollar notional of short positions.
 *   - "Max OI" is the protocol-imposed per-side cap (often expressed as a
 *     fraction of total AUM or pool-asset notional). Required for capacity
 *     checks.
 */
export interface PoolState {
  /** Total LP-deposited AUM, USD. */
  aumUsd: number;
  /** Open long notional, USD. */
  longOiUsd: number;
  /** Open short notional, USD. */
  shortOiUsd: number;
  /** Protocol max long OI cap, USD. */
  maxLongOiUsd: number;
  /** Protocol max short OI cap, USD. */
  maxShortOiUsd: number;
  /**
   * Optional: explicit per-side liquidity for the AMM impact model. When
   * not supplied, the model derives liquidity from the spread between
   * `aumUsd` and the dominant side's OI.
   */
  perSideLiquidityUsd?: { long: number; short: number };
  /** Target neutral utilization (e.g. 0.5 for balanced books). */
  targetUtilization?: number;
  /** Funding rate model coefficient — peak per-hour percent at full skew. */
  fundingPeakPerHourPct?: number;
  /** Borrow rate at 100% utilization, per-hour percent. */
  borrowPeakPerHourPct?: number;
}

export interface PoolImpactInputs {
  pool: PoolState;
  markPrice: number;
  /** Side of the order being opened (open). For closes, callers should flip. */
  side: Side;
  /** Order notional, USD. */
  sizeUsd: number;
  /** Tunable: coefficient controlling how steeply impact climbs with size. */
  impactCoeff?: number;
}

export interface PoolImpactResult {
  expectedPrice: number;
  /** Slippage in bps from mark, magnitude only (always >= 0). */
  slippageBps: number;
  /** True if the pool can absorb this order without exceeding caps. */
  fillable: boolean;
  /** Filled USD (== sizeUsd if fillable, max-fittable otherwise). */
  filledUsd: number;
  /** Pre-trade utilization on the side being opened, [0, 1+]. */
  preUtilization: number;
  /** Post-trade utilization, [0, 1+]. Used to surface "you'd hit the cap" warnings. */
  postUtilization: number;
  /** Human reason if not fillable. */
  reason?: string;
}

const SAFE = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);

/** Per-side utilization = side OI / side OI cap. >1 means the cap is breached. */
export function utilizationFor(pool: PoolState, side: Side): number {
  const oi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const cap = side === "long" ? pool.maxLongOiUsd : pool.maxShortOiUsd;
  if (cap <= 0) return 0;
  return SAFE(oi / cap);
}

/** Remaining open capacity on a side, USD. Floors at 0. */
export function capacityFor(pool: PoolState, side: Side): number {
  const oi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const cap = side === "long" ? pool.maxLongOiUsd : pool.maxShortOiUsd;
  return Math.max(0, cap - oi);
}

/** OI imbalance in [-1, 1]. Positive = longs skew. */
export function oiSkew(pool: PoolState): number {
  const tot = pool.longOiUsd + pool.shortOiUsd;
  if (tot <= 0) return 0;
  return (pool.longOiUsd - pool.shortOiUsd) / tot;
}

/**
 * Utilization-aware AMM impact.
 *
 * The intuition: opening into the heavier side actually unwinds pool risk
 * and is cheap; opening into the lighter side forces the pool to take
 * more risk and is expensive. We model this with a linear "imbalance
 * premium" added to the base sqrt-impact slippage.
 */
export function poolImpact({
  pool,
  markPrice,
  side,
  sizeUsd,
  impactCoeff = 0.0006,
}: PoolImpactInputs): PoolImpactResult {
  const preUtil = utilizationFor(pool, side);
  const cap = side === "long" ? pool.maxLongOiUsd : pool.maxShortOiUsd;
  const oi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const capacity = Math.max(0, cap - oi);

  if (markPrice <= 0 || sizeUsd <= 0) {
    return {
      expectedPrice: markPrice,
      slippageBps: 0,
      fillable: false,
      filledUsd: 0,
      preUtilization: preUtil,
      postUtilization: preUtil,
      reason: "non-positive mark or size",
    };
  }

  if (capacity <= 0) {
    return {
      expectedPrice: markPrice,
      slippageBps: 0,
      fillable: false,
      filledUsd: 0,
      preUtilization: preUtil,
      postUtilization: preUtil,
      reason: `pool ${side} side at cap (${(preUtil * 100).toFixed(1)}% utilization)`,
    };
  }

  // Per-side liquidity. Either explicitly supplied, or derived from AUM
  // minus the side's current commitment.
  const liq =
    pool.perSideLiquidityUsd?.[side] ??
    Math.max(pool.aumUsd - oi, pool.aumUsd * 0.1);

  // Base sqrt impact, capped at 5%.
  const ratio = sizeUsd / Math.max(liq, 1);
  const baseBps = Math.min(impactCoeff * Math.sqrt(ratio) * 10_000, 500);

  // Imbalance premium. The pool is the counterparty to every trader, so a
  // long-heavy book means the pool is net short. A new long *adds* pool
  // risk → premium > 0 (penalty). A new short *reduces* pool risk →
  // premium < 0 (rebate). Capped at ±100 bps.
  const skew = oiSkew(pool); // positive = longs skew → pool is net short
  const sideSign = side === "long" ? 1 : -1;
  // Opening into the heavy side: sideSign and skew share sign → premium > 0.
  const imbalancePremiumBps = sideSign * skew * 100;

  const slippageBps = Math.max(0, baseBps + imbalancePremiumBps);

  const signed = (slippageBps / 10_000) * sideSign;
  const expectedPrice = markPrice * (1 + signed);

  const fillable = sizeUsd <= capacity && slippageBps <= 500;
  const filledUsd = fillable ? sizeUsd : Math.min(sizeUsd, capacity);
  const postUtil = utilizationFor(
    {
      ...pool,
      longOiUsd: side === "long" ? oi + filledUsd : oi,
      shortOiUsd: side === "short" ? oi + filledUsd : pool.shortOiUsd,
    },
    side,
  );
  const reason = !fillable
    ? sizeUsd > capacity
      ? `size $${sizeUsd.toFixed(0)} exceeds ${side} capacity $${capacity.toFixed(0)}`
      : `impact ${slippageBps.toFixed(1)}bps exceeds safety cap`
    : undefined;

  return {
    expectedPrice,
    slippageBps,
    fillable,
    filledUsd,
    preUtilization: preUtil,
    postUtilization: postUtil,
    reason,
  };
}

/**
 * Predict the next-period funding rate from current OI imbalance.
 *
 * Most Solana AMM perps use a peak-anchored funding model:
 *   funding = peak * skew^k
 * where k=1 for linear, k=3 for cubic (jup-style aggressive penalty on
 * lopsided books). We default to linear.
 *
 * Returns long-side per-hour percent. Short side is the negative.
 */
export function predictFundingPerHourPct(
  pool: PoolState,
  opts: { k?: number } = {},
): number {
  const peak = pool.fundingPeakPerHourPct ?? 0.005; // 0.005%/h ≈ 43.8% APR
  const skew = oiSkew(pool);
  const k = opts.k ?? 1;
  const signed = Math.sign(skew) * Math.pow(Math.abs(skew), k);
  return peak * signed;
}

/**
 * Borrow-rate ladder: borrow per-hour percent at the pool's current side
 * utilization. Higher utilization → steeper rate, capped at the peak.
 *
 * Convex schedule: rate(u) = peak * u^2 below 1, linearly extrapolated
 * above 1 (so a cap breach is severely penalised even before the order
 * is rejected).
 */
export function borrowRatePerHourPct(pool: PoolState, side: Side): number {
  const peak = pool.borrowPeakPerHourPct ?? 0.01; // 0.01%/h ≈ 87.6% APR at u=1
  const u = utilizationFor(pool, side);
  if (u <= 1) return peak * u * u;
  return peak * (1 + (u - 1) * 2);
}

/** Heuristic "pool health" composite score in [0,1]. Higher = healthier. */
export function poolHealthScore(pool: PoolState): {
  score: number;
  components: { skewPenalty: number; longUtil: number; shortUtil: number; aumDepth: number };
} {
  const skew = Math.abs(oiSkew(pool));
  const longU = utilizationFor(pool, "long");
  const shortU = utilizationFor(pool, "short");
  const utilPenalty = Math.max(longU, shortU);

  // Depth bonus — log scale, full credit at $50M AUM.
  const aumScore = Math.min(1, Math.log10(Math.max(pool.aumUsd, 1) / 50_000_000 + 1) / Math.log10(2));

  // 1 - penalty (skew, utilization), additively damped by depth credit.
  const score = Math.max(0, Math.min(1, (1 - skew) * (1 - utilPenalty * 0.5) * (0.7 + aumScore * 0.3)));
  return {
    score,
    components: {
      skewPenalty: skew,
      longUtil: longU,
      shortUtil: shortU,
      aumDepth: aumScore,
    },
  };
}
