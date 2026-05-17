/**
 * Multi-range bonding curve math — mirrors the Rust DBC program's curve.rs.
 * Supports up to 16 active price ranges (20 in config storage).
 */

import type { CurvePoint, SwapQuote } from "../types/index.js";
import {
  getBaseDelta,
  getQuoteDelta,
  getNextSqrtPriceFromQuoteIn,
  getNextSqrtPriceFromBaseIn,
  applyFeeNumerator,
} from "../utils/math.js";
import { MIN_SQRT_PRICE, MAX_SQRT_PRICE } from "../constants.js";

export interface CurveRange {
  sqrtPriceLower: bigint;
  sqrtPriceUpper: bigint;
  liquidity: bigint;
}

/** Build ordered ranges from PoolConfig curve points + start price */
export function buildRanges(
  sqrtStartPrice: bigint,
  curvePoints: CurvePoint[]
): CurveRange[] {
  const sorted = [...curvePoints].sort((a, b) =>
    a.sqrtPrice < b.sqrtPrice ? -1 : 1
  );
  const ranges: CurveRange[] = [];
  let lower = sqrtStartPrice;
  for (const pt of sorted) {
    if (pt.sqrtPrice > lower && pt.liquidity > 0n) {
      ranges.push({
        sqrtPriceLower: lower,
        sqrtPriceUpper: pt.sqrtPrice,
        liquidity: pt.liquidity,
      });
    }
    lower = pt.sqrtPrice;
  }
  return ranges;
}

/**
 * Quote an exact-in swap (buy: quote → base).
 * Iterates through ranges until amountIn is consumed.
 */
export function quoteExactInBuy(
  sqrtPrice: bigint,
  ranges: CurveRange[],
  amountIn: bigint,
  feeNumerator: bigint
): SwapQuote {
  const { netAmount, fee: tradingFee } = applyFeeNumerator(amountIn, feeNumerator);
  const protocolFee = (tradingFee * 2n) / 10n; // 20% of trading fee

  let remaining = netAmount;
  let outputAmount = 0n;
  let currentSqrtPrice = sqrtPrice;

  for (const range of ranges) {
    if (currentSqrtPrice < range.sqrtPriceLower) break;
    if (currentSqrtPrice >= range.sqrtPriceUpper) continue;

    const maxQuoteInRange = getQuoteDelta(
      currentSqrtPrice,
      range.sqrtPriceUpper,
      range.liquidity
    );

    if (remaining >= maxQuoteInRange) {
      // Consume entire range
      const baseOut = getBaseDelta(
        currentSqrtPrice,
        range.sqrtPriceUpper,
        range.liquidity
      );
      outputAmount += baseOut;
      remaining -= maxQuoteInRange;
      currentSqrtPrice = range.sqrtPriceUpper;
    } else {
      // Partial range
      const nextSqrtPrice = getNextSqrtPriceFromQuoteIn(
        currentSqrtPrice,
        range.liquidity,
        remaining
      );
      const baseOut = getBaseDelta(currentSqrtPrice, nextSqrtPrice, range.liquidity);
      outputAmount += baseOut;
      remaining = 0n;
      currentSqrtPrice = nextSqrtPrice;
      break;
    }
  }

  const priceImpact = computePriceImpact(sqrtPrice, currentSqrtPrice);

  return {
    inputAmount: amountIn,
    outputAmount,
    tradingFee,
    protocolFee,
    priceImpactBps: priceImpact,
    nextSqrtPrice: currentSqrtPrice,
    amountLeft: remaining,
  };
}

/**
 * Quote an exact-in swap (sell: base → quote).
 */
export function quoteExactInSell(
  sqrtPrice: bigint,
  ranges: CurveRange[],
  amountIn: bigint,
  feeNumerator: bigint
): SwapQuote {
  const { netAmount, fee: tradingFee } = applyFeeNumerator(amountIn, feeNumerator);
  const protocolFee = (tradingFee * 2n) / 10n;

  let remaining = netAmount;
  let outputAmount = 0n;
  let currentSqrtPrice = sqrtPrice;

  // Sell traverses ranges in reverse (price goes down)
  const reversedRanges = [...ranges].reverse();

  for (const range of reversedRanges) {
    if (currentSqrtPrice > range.sqrtPriceUpper) continue;
    if (currentSqrtPrice <= range.sqrtPriceLower) break;

    const maxBaseInRange = getBaseDelta(
      range.sqrtPriceLower,
      currentSqrtPrice,
      range.liquidity
    );

    if (remaining >= maxBaseInRange) {
      const quoteOut = getQuoteDelta(
        range.sqrtPriceLower,
        currentSqrtPrice,
        range.liquidity
      );
      outputAmount += quoteOut;
      remaining -= maxBaseInRange;
      currentSqrtPrice = range.sqrtPriceLower;
    } else {
      const nextSqrtPrice = getNextSqrtPriceFromBaseIn(
        currentSqrtPrice,
        range.liquidity,
        remaining
      );
      const quoteOut = getQuoteDelta(nextSqrtPrice, currentSqrtPrice, range.liquidity);
      outputAmount += quoteOut;
      remaining = 0n;
      currentSqrtPrice = nextSqrtPrice;
      break;
    }
  }

  const priceImpact = computePriceImpact(sqrtPrice, currentSqrtPrice);

  return {
    inputAmount: amountIn,
    outputAmount,
    tradingFee,
    protocolFee,
    priceImpactBps: priceImpact,
    nextSqrtPrice: currentSqrtPrice,
    amountLeft: remaining,
  };
}

/** Compute price impact in basis points from sqrt_price change */
function computePriceImpact(
  oldSqrtPrice: bigint,
  newSqrtPrice: bigint
): number {
  if (oldSqrtPrice === 0n) return 0;
  const diff =
    newSqrtPrice > oldSqrtPrice
      ? newSqrtPrice - oldSqrtPrice
      : oldSqrtPrice - newSqrtPrice;
  return Number((diff * 10_000n) / oldSqrtPrice);
}

/** Check if current price has reached the migration threshold */
export function hasReachedMigration(
  quoteReserve: bigint,
  migrationQuoteThreshold: bigint
): boolean {
  return quoteReserve >= migrationQuoteThreshold;
}

/** Clamp sqrt_price to protocol bounds */
export function clampSqrtPrice(sqrtPrice: bigint): bigint {
  if (sqrtPrice < MIN_SQRT_PRICE) return MIN_SQRT_PRICE;
  if (sqrtPrice > MAX_SQRT_PRICE) return MAX_SQRT_PRICE;
  return sqrtPrice;
}
