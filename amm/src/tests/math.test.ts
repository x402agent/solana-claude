import { strict as assert } from "node:assert";
import { estimateAmmSlippage, estimateBookSlippage } from "../aggregator/slippage.js";
import {
  borrowRatePerHourPct,
  capacityFor,
  oiSkew,
  poolImpact,
  predictFundingPerHourPct,
  utilizationFor,
} from "../aggregator/ammMath.js";
import { SplitRouter } from "../aggregator/splitRouter.js";
import { rankQuotes } from "../aggregator/scoring.js";
import type { BuiltOrderTx, OrderBook, OrderBuildRequest, Position, QuoteRequest, VenueQuote } from "../types.js";
import type { VenueAdapter } from "../venues/adapter.js";

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

const pool = {
  aumUsd: 10_000_000,
  longOiUsd: 4_000_000,
  shortOiUsd: 1_000_000,
  maxLongOiUsd: 5_000_000,
  maxShortOiUsd: 5_000_000,
  perSideLiquidityUsd: { long: 6_000_000, short: 9_000_000 },
  fundingPeakPerHourPct: 0.005,
  borrowPeakPerHourPct: 0.01,
};

assert.equal(utilizationFor(pool, "long").toFixed(2), "0.80");
assert.equal(capacityFor(pool, "long"), 1_000_000);
assert.equal(oiSkew(pool).toFixed(2), "0.60");
assert.equal(predictFundingPerHourPct(pool).toFixed(3), "0.003");
assert.equal(borrowRatePerHourPct(pool, "long").toFixed(4), "0.0064");

const longImpact = poolImpact({ pool, markPrice: 100, side: "long", sizeUsd: 1_000_000 });
assert.equal(longImpact.fillable, true);
assert.equal(longImpact.slippageBps.toFixed(0), "62");

const shortImpact = poolImpact({ pool, markPrice: 100, side: "short", sizeUsd: 1_000_000 });
assert.equal(shortImpact.fillable, true);
assert.equal(shortImpact.slippageBps, 0);

const capBreach = poolImpact({ pool, markPrice: 100, side: "long", sizeUsd: 1_250_000 });
assert.equal(capBreach.fillable, false);
assert.match(capBreach.reason ?? "", /exceeds long capacity/);

class StubAdapter implements VenueAdapter {
  readonly name: "flash" | "jupiter";
  constructor(name: "flash" | "jupiter", private readonly capUsd: number, private readonly feeBps: number) {
    this.name = name;
  }

  async listMarkets() { return []; }
  async getMarkPrice() { return { symbol: "SOL-PERP", venue: this.name, price: 100, source: "test", timestamp: Date.now() }; }
  async getFundingRate() {
    return { symbol: "SOL-PERP", venue: this.name, longRateHourlyPct: 0, shortRateHourlyPct: 0, source: "test", timestamp: Date.now() };
  }
  async getOrderBook() { return null; }
  async getPoolState() { return null; }
  setPoolStateProvider() {}
  async quote(request: QuoteRequest): Promise<VenueQuote> {
    const fillable = request.notionalUsd <= this.capUsd;
    return {
      ...baseQuote,
      venue: this.name,
      notionalUsd: request.notionalUsd,
      estimatedFeeUsd: request.notionalUsd * (this.feeBps / 10_000),
      estimatedSlippageBps: fillable ? this.feeBps : 10_000,
      liquidityUsd: this.capUsd,
      openInterestUsd: 1_000_000,
      warnings: fillable ? [] : [`size exceeds cap ${this.capUsd}`],
    };
  }
  async buildOrder(_request: OrderBuildRequest): Promise<BuiltOrderTx> { throw new Error("unused"); }
  async submitOrder() { return { signature: null, orderPda: null, success: false }; }
  async getPositions(): Promise<Position[]> { return []; }
}

const splitRouter = new SplitRouter([
  new StubAdapter("flash", 5_000, 6),
  new StubAdapter("jupiter", 5_000, 4),
], { splitThresholdBps: 1, stepUsd: 1_000 });

const splitRoute = await splitRouter.route(
  { symbol: "SOL-PERP", side: "long", notionalUsd: 8_000 },
  [
    await new StubAdapter("flash", 5_000, 6).quote({ symbol: "SOL-PERP", side: "long", notionalUsd: 8_000 }),
    await new StubAdapter("jupiter", 5_000, 4).quote({ symbol: "SOL-PERP", side: "long", notionalUsd: 8_000 }),
  ],
);
assert.equal(splitRoute.mode, "split");
assert.equal(splitRoute.legs.reduce((sum, leg) => sum + leg.notionalUsd, 0), 8_000);

console.log("amm math tests passed");
