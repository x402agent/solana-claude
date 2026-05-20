import type { OrderBook, OrderSide } from "../types.js";

export interface SlippageEstimate {
  averagePrice: number;
  markPrice: number;
  slippageBps: number;
  filledUsd: number;
  unfilledUsd: number;
  liquidityUsd: number;
}

export function estimateBookSlippage(book: OrderBook, side: OrderSide, notionalUsd: number, markPrice: number): SlippageEstimate {
  const levels = side === "long" ? book.asks : book.bids;
  let remaining = notionalUsd;
  let cost = 0;
  let filled = 0;
  let liquidity = 0;

  for (const level of levels) {
    liquidity += level.sizeUsd;
    if (remaining <= 0) continue;
    const take = Math.min(remaining, level.sizeUsd);
    cost += take * level.price;
    filled += take;
    remaining -= take;
  }

  const averagePrice = filled > 0 ? cost / filled : markPrice;
  const directional = side === "long"
    ? (averagePrice - markPrice) / markPrice
    : (markPrice - averagePrice) / markPrice;

  return {
    averagePrice,
    markPrice,
    slippageBps: Math.max(0, directional * 10_000),
    filledUsd: filled,
    unfilledUsd: Math.max(0, remaining),
    liquidityUsd: liquidity,
  };
}

export function estimateAmmSlippage(notionalUsd: number, liquidityUsd: number, impactCoefficientBps: number): number {
  if (liquidityUsd <= 0 || notionalUsd <= 0) return 10_000;
  const utilization = notionalUsd / liquidityUsd;
  return Math.max(0, impactCoefficientBps * utilization * utilization);
}

export function priceFromSlippage(markPrice: number, side: OrderSide, slippageBps: number): number {
  const offset = slippageBps / 10_000;
  return side === "long" ? markPrice * (1 + offset) : markPrice * (1 - offset);
}
