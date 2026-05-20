import { strict as assert } from "node:assert";
import { estimateAmmSlippage, estimateBookSlippage } from "../aggregator/slippage.js";
import { rankQuotes } from "../aggregator/scoring.js";
import type { OrderBook, VenueQuote } from "../types.js";

const book: OrderBook = {
  symbol: "SOL-PERP",
  venue: "phoenix",
  timestamp: Date.now(),
  bids: [
    { price: 99.9, sizeUsd: 500 },
    { price: 99.8, sizeUsd: 500 },
  ],
  asks: [
    { price: 100.1, sizeUsd: 500 },
    { price: 100.2, sizeUsd: 500 },
  ],
};

const estimate = estimateBookSlippage(book, "long", 1000, 100);
assert.equal(estimate.averagePrice.toFixed(2), "100.15");
assert.equal(estimate.slippageBps.toFixed(2), "15.00");

const ammImpact = estimateAmmSlippage(50_000, 1_000_000, 50);
assert.equal(ammImpact.toFixed(3), "0.125");

const baseQuote: Omit<VenueQuote, "venue" | "estimatedFeeUsd" | "estimatedSlippageBps" | "liquidityUsd" | "openInterestUsd"> = {
  symbol: "SOL-PERP",
  side: "long",
  notionalUsd: 1000,
  expectedPrice: 100,
  markPrice: 100,
  fundingRateHourlyPct: 0,
  confidence: 1,
  warnings: [],
};

const ranked = rankQuotes(
  { symbol: "SOL-PERP", side: "long", notionalUsd: 1000 },
  [
    { ...baseQuote, venue: "phoenix", estimatedFeeUsd: 1, estimatedSlippageBps: 20, liquidityUsd: 100_000, openInterestUsd: 1_000_000 },
    { ...baseQuote, venue: "jupiter", estimatedFeeUsd: 0.5, estimatedSlippageBps: 2, liquidityUsd: 10_000_000, openInterestUsd: 50_000_000 },
  ],
);
assert.equal(ranked[0]?.quote.venue, "jupiter");

console.log("amm math tests passed");
