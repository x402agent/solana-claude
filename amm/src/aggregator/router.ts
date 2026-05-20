import { assertSafeNotional } from "../config.js";
import type { VenueAdapter } from "../venues/adapter.js";
import type { AggregatorConfig, QuoteRequest, RoutePlan, VenueName, VenueQuote } from "../types.js";
import { rankQuotes } from "./scoring.js";

export interface RouterOptions {
  splitThresholdUsd?: number;
}

export class SmartRouter {
  private readonly adapters: Map<VenueName, VenueAdapter>;
  private readonly config: AggregatorConfig;
  private readonly splitThresholdUsd: number;

  constructor(config: AggregatorConfig, adapters: VenueAdapter[], options: RouterOptions = {}) {
    this.config = config;
    this.adapters = new Map(adapters.map((adapter) => [adapter.name, adapter]));
    this.splitThresholdUsd = options.splitThresholdUsd ?? 100_000;
  }

  listVenues(): VenueName[] {
    return Array.from(this.adapters.keys());
  }

  async quoteAll(request: QuoteRequest): Promise<VenueQuote[]> {
    assertSafeNotional(this.config, request.symbol, request.notionalUsd);
    const allowed = new Set(request.allowedVenues ?? this.config.safety.allowedVenues);
    const adapters = Array.from(this.adapters.values()).filter((adapter) => allowed.has(adapter.name));

    const settled = await Promise.allSettled(adapters.map((adapter) => adapter.quote(request)));
    const quotes: VenueQuote[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") quotes.push(result.value);
    }
    if (!quotes.length) {
      throw new Error(`No venue could quote ${request.symbol}`);
    }
    return quotes;
  }

  async route(request: QuoteRequest): Promise<RoutePlan> {
    const quotes = await this.quoteAll(request);
    const ranked = rankQuotes(request, quotes);
    const best = ranked[0];
    if (!best) throw new Error("No route candidates");

    if (request.notionalUsd >= this.splitThresholdUsd && ranked.length > 1) {
      return this.splitRoute(request, ranked.slice(0, 2).map((item) => item.quote));
    }

    return {
      id: `route-${Date.now()}-${best.quote.venue}`,
      mode: "single",
      symbol: request.symbol,
      side: request.side,
      notionalUsd: request.notionalUsd,
      legs: [{ venue: best.quote.venue, notionalUsd: request.notionalUsd, quote: best.quote }],
      score: best.score,
      estimatedPrice: best.quote.expectedPrice,
      estimatedFeeUsd: best.quote.estimatedFeeUsd,
      estimatedSlippageBps: best.quote.estimatedSlippageBps,
      estimatedFundingHourlyPct: best.quote.fundingRateHourlyPct,
      warnings: best.quote.warnings,
      createdAt: new Date().toISOString(),
    };
  }

  getAdapter(venue: VenueName): VenueAdapter {
    const adapter = this.adapters.get(venue);
    if (!adapter) throw new Error(`Unknown venue: ${venue}`);
    return adapter;
  }

  private splitRoute(request: QuoteRequest, quotes: VenueQuote[]): RoutePlan {
    const totalScore = quotes.reduce((sum, quote) => sum + Math.max(quote.confidence, 0.1), 0);
    const legs = quotes.map((quote) => ({
      venue: quote.venue,
      quote,
      notionalUsd: request.notionalUsd * (Math.max(quote.confidence, 0.1) / totalScore),
    }));

    const estimatedFeeUsd = legs.reduce((sum, leg) => sum + leg.quote.estimatedFeeUsd * (leg.notionalUsd / leg.quote.notionalUsd), 0);
    const estimatedSlippageBps = legs.reduce((sum, leg) => sum + leg.quote.estimatedSlippageBps * (leg.notionalUsd / request.notionalUsd), 0);
    const estimatedPrice = legs.reduce((sum, leg) => sum + leg.quote.expectedPrice * (leg.notionalUsd / request.notionalUsd), 0);
    const funding = legs.reduce((sum, leg) => sum + leg.quote.fundingRateHourlyPct * (leg.notionalUsd / request.notionalUsd), 0);

    return {
      id: `route-${Date.now()}-split`,
      mode: "split",
      symbol: request.symbol,
      side: request.side,
      notionalUsd: request.notionalUsd,
      legs,
      score: rankQuotes(request, quotes)[0]?.score ?? 0,
      estimatedPrice,
      estimatedFeeUsd,
      estimatedSlippageBps,
      estimatedFundingHourlyPct: funding,
      warnings: legs.flatMap((leg) => leg.quote.warnings),
      createdAt: new Date().toISOString(),
    };
  }
}
