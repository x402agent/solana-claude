/**
 * Fixed-point math utilities for the DBC bonding curve.
 * All sqrt_price values are Q64.64 fixed-point (128-bit).
 * Liquidity and amounts use u64/u128 with explicit scaling.
 */

import BN from "bn.js";
import { Q64, FEE_DENOMINATOR } from "../constants.js";

// ─── Q64.64 Helpers ───────────────────────────────────────────────────────────

/** Convert a floating-point price to Q64.64 sqrt_price */
export function priceToSqrtPrice(price: number): bigint {
  const sqrt = Math.sqrt(price);
  return BigInt(Math.floor(sqrt * Number(Q64)));
}

/** Convert a Q64.64 sqrt_price back to a floating-point price */
export function sqrtPriceToPrice(sqrtPrice: bigint): number {
  const sqrtFloat = Number(sqrtPrice) / Number(Q64);
  return sqrtFloat * sqrtFloat;
}

/** Multiply two Q64.64 values (returns Q64.64) */
export function mulQ64(a: bigint, b: bigint): bigint {
  return (a * b) >> 64n;
}

/** Divide two Q64.64 values (a/b, returns Q64.64) */
export function divQ64(a: bigint, b: bigint): bigint {
  return (a << 64n) / b;
}

// ─── Curve Math ───────────────────────────────────────────────────────────────

/**
 * Compute base token delta for a given sqrt_price range and liquidity.
 *   Δbase = L * (√P_upper - √P_lower) / (√P_upper * √P_lower)
 */
export function getBaseDelta(
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  liquidity: bigint
): bigint {
  if (sqrtPriceLower >= sqrtPriceUpper) return 0n;
  const numerator = liquidity * (sqrtPriceUpper - sqrtPriceLower);
  const denominator = mulQ64(sqrtPriceUpper, sqrtPriceLower);
  return numerator / denominator;
}

/**
 * Compute quote token delta for a given sqrt_price range and liquidity.
 *   Δquote = L * (√P_upper - √P_lower)
 */
export function getQuoteDelta(
  sqrtPriceLower: bigint,
  sqrtPriceUpper: bigint,
  liquidity: bigint
): bigint {
  if (sqrtPriceLower >= sqrtPriceUpper) return 0n;
  return mulQ64(liquidity, sqrtPriceUpper - sqrtPriceLower);
}

/**
 * Given an exact-in quote amount, compute the next sqrt_price.
 * Used when buying (quote → base).
 *   √P_new = √P + amount / L
 */
export function getNextSqrtPriceFromQuoteIn(
  sqrtPrice: bigint,
  liquidity: bigint,
  amountIn: bigint
): bigint {
  return sqrtPrice + divQ64(amountIn, liquidity);
}

/**
 * Given an exact-in base amount, compute the next sqrt_price.
 * Used when selling (base → quote).
 *   √P_new = (L * √P) / (L + amount * √P)
 */
export function getNextSqrtPriceFromBaseIn(
  sqrtPrice: bigint,
  liquidity: bigint,
  amountIn: bigint
): bigint {
  const numerator = liquidity * sqrtPrice;
  const denominator = liquidity + mulQ64(amountIn, sqrtPrice);
  return numerator / denominator;
}

// ─── Fee Utilities ────────────────────────────────────────────────────────────

/** Apply a fee in basis points, returns { netAmount, fee } */
export function applyFeeBps(
  amount: bigint,
  feeBps: number
): { netAmount: bigint; fee: bigint } {
  const fee = (amount * BigInt(feeBps)) / 10_000n;
  return { netAmount: amount - fee, fee };
}

/** Apply a fee using FEE_DENOMINATOR (1e9) as used by DBC */
export function applyFeeNumerator(
  amount: bigint,
  feeNumerator: bigint
): { netAmount: bigint; fee: bigint } {
  const fee = (amount * feeNumerator) / FEE_DENOMINATOR;
  return { netAmount: amount - fee, fee };
}

// ─── Entropy Burn Math ────────────────────────────────────────────────────────

/**
 * Compute the entropy burn amount.
 * burn = reserve * max(0, accumulator - threshold) * sensitivity / 1e9
 */
export function computeEntropyBurn(
  inflationReserve: bigint,
  volatilityAccumulator: number,
  entropyThreshold: number,
  sensitivityBps: number
): bigint {
  const excess = volatilityAccumulator - entropyThreshold;
  if (excess <= 0) return 0n;
  const burnRate = (BigInt(excess) * BigInt(sensitivityBps)) / 10_000n;
  const burnAmount = (inflationReserve * burnRate) / 10_000n;
  return burnAmount;
}

// ─── Anti-Gravity Math ────────────────────────────────────────────────────────

/**
 * Compute the anti-gravity buy amount.
 * strength = (floor - current) / floor (capped at max_strength)
 * buy_amount = fee_reserve * strength
 */
export function computeAntiGravityBuy(
  currentSqrtPrice: bigint,
  athSqrtPrice: bigint,
  floorBps: number,
  maxStrengthBps: number,
  feeReserve: bigint
): bigint {
  const floorSqrtPrice = (athSqrtPrice * BigInt(floorBps)) / 10_000n;
  if (currentSqrtPrice >= floorSqrtPrice) return 0n;

  const priceDrop = floorSqrtPrice - currentSqrtPrice;
  const strengthBps = (priceDrop * 10_000n) / floorSqrtPrice;
  const cappedStrength = strengthBps < BigInt(maxStrengthBps)
    ? strengthBps
    : BigInt(maxStrengthBps);

  return (feeReserve * cappedStrength) / 10_000n;
}

// ─── Conviction Score Math ────────────────────────────────────────────────────

/**
 * Compute conviction score for a lock position.
 * score = amount * duration_days * consistency_multiplier
 * multiplier = 1.0 + min(consecutive_epochs * 0.1, MAX_MULTIPLIER)
 */
export function computeConvictionScore(
  amount: bigint,
  durationSlots: bigint,
  consecutiveEpochs: number,
  epochDurationSlots: bigint
): bigint {
  const durationEpochs = durationSlots / epochDurationSlots;
  const consistencyBps = Math.min(
    10_000 + consecutiveEpochs * 1_000,
    100_000 // 10x cap
  );
  return (amount * durationEpochs * BigInt(consistencyBps)) / 10_000n;
}

/**
 * Compute conviction reward share for a single staker.
 * share = (staker_score / total_score) * epoch_revenue
 */
export function computeConvictionReward(
  stakerScore: bigint,
  totalScore: bigint,
  epochRevenue: bigint
): bigint {
  if (totalScore === 0n) return 0n;
  return (epochRevenue * stakerScore) / totalScore;
}

// ─── Behavioral Score Math ────────────────────────────────────────────────────

/**
 * Compute a wallet's behavioral bot score [0, 10000].
 * Higher = more bot-like.
 *
 * Factors:
 *   - trade_frequency: trades in 60 slots (>10 = suspicious, >30 = bot)
 *   - hold_duration: avg hold in slots (<10 = flipper, <3 = bot)
 *   - position_size: % of supply (>1000 bps = whale)
 */
export function computeBehaviorScore(
  tradeCountLast60Slots: number,
  avgHoldSlots: bigint,
  normalizedPositionBps: number
): number {
  // frequency score: 0 at 0 trades, 10000 at 30+ trades in 60 slots
  const freqScore = Math.min((tradeCountLast60Slots / 30) * 10_000, 10_000);

  // hold score: 10000 if avg hold < 3 slots, 0 if > 200 slots
  const holdSlots = Number(avgHoldSlots);
  const holdScore = holdSlots < 3 ? 10_000 : Math.max(0, 10_000 - holdSlots * 50);

  // position score: 0 at 0, 5000 at 1000 bps (10% of supply)
  const posScore = Math.min((normalizedPositionBps / 1_000) * 5_000, 5_000);

  // weighted sum: frequency 50%, hold 35%, position 15%
  return Math.round(
    (freqScore * 0.5 + holdScore * 0.35 + posScore * 0.15)
  );
}

// ─── Sentiment EMA ────────────────────────────────────────────────────────────

/**
 * Update exponential moving average.
 * ema_new = alpha * value + (1 - alpha) * ema_old
 * alpha = (10000 - ema_decay_bps) / 10000
 */
export function updateEma(
  current: bigint,
  newValue: bigint,
  emaDacayBps: number
): bigint {
  const alphaBps = 10_000 - emaDacayBps;
  return (newValue * BigInt(alphaBps) + current * BigInt(emaDacayBps)) / 10_000n;
}

/**
 * Compute signed sentiment score from buy/sell EMA volumes.
 * score = (buy_ema - sell_ema) / (buy_ema + sell_ema) * SENTIMENT_SCALE
 */
export function computeSentimentScore(
  emaBuyVolume: bigint,
  emaSellVolume: bigint,
  sentimentScale: bigint
): bigint {
  const total = emaBuyVolume + emaSellVolume;
  if (total === 0n) return 0n;
  return ((emaBuyVolume - emaSellVolume) * sentimentScale) / total;
}

// ─── Agent Activity Score ─────────────────────────────────────────────────────

/**
 * Compute agent activity score [0, MAX_ACTIVITY_SCORE].
 * Weighted: tasks 40%, revenue 40%, uptime 20%
 */
export function computeAgentActivityScore(
  tasksCompleted: number,
  maxExpectedTasks: number,
  revenueGeneratedLamports: bigint,
  maxExpectedRevenueLamports: bigint,
  uptimeBps: number
): number {
  const taskScore = Math.min((tasksCompleted / maxExpectedTasks) * 10_000, 10_000);
  const revenueScore = maxExpectedRevenueLamports === 0n
    ? 0
    : Number(
        (revenueGeneratedLamports * 10_000n) / maxExpectedRevenueLamports
      );
  const cappedRevenueScore = Math.min(revenueScore, 10_000);
  const uptimeScore = Math.min(uptimeBps, 10_000);

  return Math.round(
    taskScore * 0.4 + cappedRevenueScore * 0.4 + uptimeScore * 0.2
  );
}

// ─── BN ↔ bigint helpers ──────────────────────────────────────────────────────

export function bnToBigInt(bn: BN): bigint {
  return BigInt("0x" + bn.toString("hex", 1));
}

export function bigIntToBN(n: bigint): BN {
  return new BN(n.toString());
}
