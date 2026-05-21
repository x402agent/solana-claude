import type { OrderSide, PoolStateView, VenueName } from "../types.js";

export type PoolState = PoolStateView;

export interface PoolImpactInputs {
  pool: PoolState;
  markPrice: number;
  side: OrderSide;
  sizeUsd: number;
  impactCoeff?: number;
}

export interface PoolImpactResult {
  expectedPrice: number;
  slippageBps: number;
  fillable: boolean;
  filledUsd: number;
  preUtilization: number;
  postUtilization: number;
  reason?: string;
}

export interface PoolSummary {
  venue: VenueName;
  symbol: string;
  pool: PoolState;
  longUtilization: number;
  shortUtilization: number;
  longCapacityUsd: number;
  shortCapacityUsd: number;
  oiSkew: number;
  predictedLongFundingPerHourPct: number;
  predictedShortFundingPerHourPct: number;
  longBorrowPerHourPct: number;
  shortBorrowPerHourPct: number;
  health: ReturnType<typeof poolHealthScore>;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function utilizationFor(pool: PoolState, side: OrderSide): number {
  const oi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const cap = side === "long" ? pool.maxLongOiUsd : pool.maxShortOiUsd;
  if (cap <= 0) return 0;
  return finite(oi / cap);
}

export function capacityFor(pool: PoolState, side: OrderSide): number {
  const oi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const cap = side === "long" ? pool.maxLongOiUsd : pool.maxShortOiUsd;
  return Math.max(0, cap - oi);
}

export function oiSkew(pool: PoolState): number {
  const total = pool.longOiUsd + pool.shortOiUsd;
  if (total <= 0) return 0;
  return finite((pool.longOiUsd - pool.shortOiUsd) / total);
}

export function poolImpact({
  pool,
  markPrice,
  side,
  sizeUsd,
  impactCoeff = 0.0006,
}: PoolImpactInputs): PoolImpactResult {
  const preUtilization = utilizationFor(pool, side);
  const capacity = capacityFor(pool, side);

  if (markPrice <= 0 || sizeUsd <= 0) {
    return {
      expectedPrice: markPrice,
      slippageBps: 0,
      fillable: false,
      filledUsd: 0,
      preUtilization,
      postUtilization: preUtilization,
      reason: "non-positive mark or size",
    };
  }

  if (capacity <= 0) {
    return {
      expectedPrice: markPrice,
      slippageBps: 0,
      fillable: false,
      filledUsd: 0,
      preUtilization,
      postUtilization: preUtilization,
      reason: `pool ${side} side at cap (${(preUtilization * 100).toFixed(1)}% utilization)`,
    };
  }

  const sideOi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const liquidityUsd =
    pool.perSideLiquidityUsd?.[side] ??
    Math.max(pool.aumUsd - sideOi, pool.aumUsd * 0.1, 1);

  const ratio = sizeUsd / liquidityUsd;
  const baseBps = Math.min(impactCoeff * Math.sqrt(ratio) * 10_000, 500);
  const sideSign = side === "long" ? 1 : -1;
  const imbalancePremiumBps = sideSign * oiSkew(pool) * 100;
  const slippageBps = Math.max(0, baseBps + imbalancePremiumBps);

  const expectedPrice = markPrice * (1 + sideSign * (slippageBps / 10_000));
  const filledUsd = Math.min(sizeUsd, capacity);
  const nextPool: PoolState = {
    ...pool,
    longOiUsd: side === "long" ? pool.longOiUsd + filledUsd : pool.longOiUsd,
    shortOiUsd: side === "short" ? pool.shortOiUsd + filledUsd : pool.shortOiUsd,
  };
  const postUtilization = utilizationFor(nextPool, side);
  const fillable = sizeUsd <= capacity && slippageBps <= 500;

  return {
    expectedPrice,
    slippageBps,
    fillable,
    filledUsd,
    preUtilization,
    postUtilization,
    reason: !fillable
      ? sizeUsd > capacity
        ? `size $${sizeUsd.toFixed(0)} exceeds ${side} capacity $${capacity.toFixed(0)}`
        : `impact ${slippageBps.toFixed(1)}bps exceeds safety cap`
      : undefined,
  };
}

export function predictFundingPerHourPct(pool: PoolState, opts: { k?: number } = {}): number {
  const peak = pool.fundingPeakPerHourPct ?? 0.005;
  const skew = oiSkew(pool);
  const exponent = opts.k ?? 1;
  return peak * Math.sign(skew) * Math.pow(Math.abs(skew), exponent);
}

export function borrowRatePerHourPct(pool: PoolState, side: OrderSide): number {
  const peak = pool.borrowPeakPerHourPct ?? 0.01;
  const utilization = utilizationFor(pool, side);
  if (utilization <= 1) return peak * utilization * utilization;
  return peak * (1 + (utilization - 1) * 2);
}

export function poolHealthScore(pool: PoolState): {
  score: number;
  components: { skewPenalty: number; longUtil: number; shortUtil: number; aumDepth: number };
} {
  const skewPenalty = Math.abs(oiSkew(pool));
  const longUtil = utilizationFor(pool, "long");
  const shortUtil = utilizationFor(pool, "short");
  const utilizationPenalty = Math.max(longUtil, shortUtil);
  const aumDepth = Math.min(1, Math.log10(Math.max(pool.aumUsd, 1) / 50_000_000 + 1) / Math.log10(2));
  const score = Math.max(
    0,
    Math.min(1, (1 - skewPenalty) * (1 - utilizationPenalty * 0.5) * (0.7 + aumDepth * 0.3)),
  );
  return { score, components: { skewPenalty, longUtil, shortUtil, aumDepth } };
}

export function summarisePool(venue: VenueName, symbol: string, pool: PoolState): PoolSummary {
  const predictedLongFundingPerHourPct = predictFundingPerHourPct(pool);
  return {
    venue,
    symbol,
    pool,
    longUtilization: utilizationFor(pool, "long"),
    shortUtilization: utilizationFor(pool, "short"),
    longCapacityUsd: capacityFor(pool, "long"),
    shortCapacityUsd: capacityFor(pool, "short"),
    oiSkew: oiSkew(pool),
    predictedLongFundingPerHourPct,
    predictedShortFundingPerHourPct: -predictedLongFundingPerHourPct,
    longBorrowPerHourPct: borrowRatePerHourPct(pool, "long"),
    shortBorrowPerHourPct: borrowRatePerHourPct(pool, "short"),
    health: poolHealthScore(pool),
  };
}
