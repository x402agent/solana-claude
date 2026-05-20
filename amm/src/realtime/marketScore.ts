import type { MarketScore, OrderSide, VenueQuote } from "../types.js";

export function scoreMarketFromQuote(quote: VenueQuote, side: OrderSide = "long"): MarketScore {
  const liquidity = Math.min(100, Math.log10(Math.max(quote.liquidityUsd / 100_000, 1)) * 28);
  const funding = side === "long"
    ? Math.max(-50, Math.min(50, -quote.fundingRateHourlyPct * 2000))
    : Math.max(-50, Math.min(50, quote.fundingRateHourlyPct * 2000));
  const risk = Math.max(0, 100 - quote.estimatedSlippageBps * 4);
  const momentum = quote.expectedPrice >= quote.markPrice ? 5 : -5;
  const score = Math.max(0, Math.min(100, 50 + momentum + funding * 0.25 + liquidity * 0.2 + risk * 0.25));
  const reasons: string[] = [
    `liquidity ${liquidity.toFixed(1)}`,
    `funding ${quote.fundingRateHourlyPct.toFixed(4)}%/h`,
    `slippage ${quote.estimatedSlippageBps.toFixed(2)} bps`,
  ];

  return {
    symbol: quote.symbol,
    venue: quote.venue,
    score,
    momentum,
    funding,
    liquidity,
    risk,
    signal: score > 62 ? "buy" : score < 38 ? "sell" : "neutral",
    reasons,
    timestamp: Date.now(),
  };
}
