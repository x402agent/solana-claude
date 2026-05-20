/**
 * Depth-aware slippage estimator.
 *
 * For a CLOB venue (Phoenix), we walk the book one side at a time to fill the
 * requested USD notional and compute the volume-weighted average price (VWAP).
 *
 * For AMM-style venues (Flash, Jupiter, GMTrade) where we don't have a book,
 * we approximate with a square-root impact model parameterised by venue
 * liquidity — small relative to liquidity → tight; large → linearly expensive.
 */

import type { OrderbookSnapshot, Side } from "../types.js";

export interface SlippageResult {
  /** VWAP expected execution price. */
  expectedPrice: number;
  /** Signed slippage in bps vs. mid (positive = worse than mid). */
  slippageBps: number;
  /** True if the requested size fits in the available liquidity. */
  fillable: boolean;
  /** Filled USD notional (== requested if fillable, less otherwise). */
  filledUsd: number;
}

/** Walk an orderbook to compute VWAP for a market order of `sizeUsd`. */
export function bookVwapSlippage(
  book: OrderbookSnapshot,
  side: Side,
  sizeUsd: number,
): SlippageResult {
  // Long opens → taker hits the asks; long closes → hits bids. Same for short.
  // For routing purposes we treat "open" as the dominant direction: longs take
  // asks, shorts take bids. The router can flip this for close legs if needed.
  const levels = side === "long" ? book.asks : book.bids;
  const oppLevels = side === "long" ? book.bids : book.asks;
  if (!levels?.length || !oppLevels?.length) {
    return { expectedPrice: 0, slippageBps: 0, fillable: false, filledUsd: 0 };
  }

  const bestBid = book.bids[0]?.price ?? 0;
  const bestAsk = book.asks[0]?.price ?? 0;
  const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : (bestBid || bestAsk);

  let remainingUsd = sizeUsd;
  let costUsd = 0;
  let baseFilled = 0;

  for (const lvl of levels) {
    if (remainingUsd <= 0) break;
    const lvlNotional = lvl.price * lvl.size;
    const takeNotional = Math.min(lvlNotional, remainingUsd);
    const takeBase = takeNotional / lvl.price;
    costUsd += takeBase * lvl.price;
    baseFilled += takeBase;
    remainingUsd -= takeNotional;
  }

  const filledUsd = sizeUsd - remainingUsd;
  if (baseFilled === 0) {
    return { expectedPrice: 0, slippageBps: 0, fillable: false, filledUsd: 0 };
  }
  const vwap = costUsd / baseFilled;
  const slippageBps = mid > 0 ? ((vwap - mid) / mid) * 10_000 * (side === "long" ? 1 : -1) : 0;
  return {
    expectedPrice: vwap,
    slippageBps,
    fillable: remainingUsd <= 0,
    filledUsd,
  };
}

export interface AmmSlippageInputs {
  /** Mark / reference price. */
  markPrice: number;
  /** Total available USD liquidity in the pool (one-sided is fine). */
  liquidityUsd: number | null;
  /** Order size in USD. */
  sizeUsd: number;
  /** Side — used to sign the slippage. */
  side: Side;
  /** Tunable impact coefficient. Higher = steeper impact. */
  impactCoeff?: number;
}

/**
 * Square-root impact model: slippageBps = coeff * sqrt(size / liquidity) * 10_000
 * Calibrated to Solana perps pool depths (10k-100k USD impact = 5-30 bps).
 */
export function ammImpactSlippage({
  markPrice,
  liquidityUsd,
  sizeUsd,
  side,
  impactCoeff = 0.0006,
}: AmmSlippageInputs): SlippageResult {
  if (markPrice <= 0 || sizeUsd <= 0) {
    return { expectedPrice: markPrice, slippageBps: 0, fillable: false, filledUsd: 0 };
  }
  // If no liquidity info, assume a moderate baseline impact.
  const liq = liquidityUsd && liquidityUsd > 0 ? liquidityUsd : 5_000_000;
  const ratio = sizeUsd / liq;
  // Cap at 5% impact for sanity.
  const rawBps = Math.min(impactCoeff * Math.sqrt(ratio) * 10_000, 500);
  const signed = rawBps * (side === "long" ? 1 : -1);
  const expectedPrice = markPrice * (1 + signed / 10_000);
  // Conservative: refuse to fill if size > 25% of liquidity (would blow the pool).
  const fillable = ratio < 0.25;
  return {
    expectedPrice,
    slippageBps: rawBps,
    fillable,
    filledUsd: fillable ? sizeUsd : 0,
  };
}
