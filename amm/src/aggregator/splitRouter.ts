import type { QuoteRequest, RouteLeg, RoutePlan, VenueName, VenueQuote } from "../types.js";
import type { VenueAdapter } from "../venues/adapter.js";
import { rankQuotes } from "./scoring.js";

export interface SplitRouterOptions {
  splitThresholdBps?: number;
  maxLegs?: number;
  stepUsd?: number;
}

export class SplitRouter {
  private readonly adapters: Map<VenueName, VenueAdapter>;
  private readonly splitThresholdBps: number;
  private readonly maxLegs: number;
  private readonly stepUsd: number;

  constructor(adapters: Iterable<VenueAdapter>, options: SplitRouterOptions = {}) {
    this.adapters = new Map(Array.from(adapters).map((adapter) => [adapter.name, adapter]));
    this.splitThresholdBps = options.splitThresholdBps ?? 5;
    this.maxLegs = options.maxLegs ?? 3;
    this.stepUsd = options.stepUsd ?? 5_000;
  }

  async route(request: QuoteRequest, fullQuotes: VenueQuote[]): Promise<RoutePlan> {
    const ranked = rankQuotes(request, fullQuotes);
    const bestSingle = ranked[0]?.quote;
    if (!bestSingle) throw new Error("No route candidates");

    const venues = (request.allowedVenues ?? Array.from(this.adapters.keys()))
      .filter((venue) => this.adapters.has(venue));
    const splitLegs = await this.greedyAllocate(request, venues);
    if (splitLegs.length < 2) return this.singleRoute(request, bestSingle);

    const splitCostUsd = this.totalCostUsd(splitLegs);
    const singleCostUsd = this.quoteCostUsd(bestSingle);
    const splitWinsBps = request.notionalUsd > 0
      ? ((singleCostUsd - splitCostUsd) / request.notionalUsd) * 10_000
      : 0;

    if (splitWinsBps <= this.splitThresholdBps) {
      return this.singleRoute(request, bestSingle);
    }

    return this.routeFromLegs(request, splitLegs, `split wins ${splitWinsBps.toFixed(1)}bps vs best single`);
  }

  private async greedyAllocate(request: QuoteRequest, venues: VenueName[]): Promise<RouteLeg[]> {
    const target = request.notionalUsd;
    if (target <= 0) return [];

    let liveVenues = [...venues];
    const step = Math.max(1, Math.min(this.stepUsd, Math.max(target / 20, 100)));
    const allocation = new Map<VenueName, number>(liveVenues.map((venue) => [venue, 0]));
    let placed = 0;
    let iterations = Math.ceil(target / step) * (liveVenues.length + 2);

    while (placed < target && iterations > 0 && liveVenues.length > 0) {
      iterations -= 1;
      const chunk = Math.min(step, target - placed);
      const candidates = await Promise.all(liveVenues.map(async (venue) => {
        const adapter = this.adapters.get(venue);
        if (!adapter) return null;
        const current = allocation.get(venue) ?? 0;
        const next = current + chunk;
        try {
          const nextQuote = await adapter.quote({ ...request, notionalUsd: next });
          if (nextQuote.warnings.some((warning) => /exceeds|at cap|lacks|insufficient/i.test(warning))) {
            return null;
          }
          const previousCost = current > 0
            ? this.quoteCostUsd(await adapter.quote({ ...request, notionalUsd: current }))
            : 0;
          return {
            venue,
            quote: nextQuote,
            marginalCostUsd: this.quoteCostUsd(nextQuote) - previousCost,
          };
        } catch {
          return null;
        }
      }));

      const fillable = candidates.filter((candidate): candidate is {
        venue: VenueName;
        quote: VenueQuote;
        marginalCostUsd: number;
      } => candidate !== null);

      if (fillable.length === 0) break;
      fillable.sort((a, b) => a.marginalCostUsd - b.marginalCostUsd);
      const winner = fillable[0];
      allocation.set(winner.venue, (allocation.get(winner.venue) ?? 0) + chunk);
      placed += chunk;

      const activeCount = Array.from(allocation.values()).filter((value) => value > 0).length;
      if (activeCount >= this.maxLegs) {
        liveVenues = liveVenues.filter((venue) => (allocation.get(venue) ?? 0) > 0);
      }
    }

    const legs: RouteLeg[] = [];
    for (const [venue, notionalUsd] of allocation.entries()) {
      if (notionalUsd <= 0) continue;
      const adapter = this.adapters.get(venue);
      if (!adapter) continue;
      const quote = await adapter.quote({ ...request, notionalUsd });
      legs.push({ venue, notionalUsd, quote });
    }
    return legs.sort((a, b) => b.notionalUsd - a.notionalUsd);
  }

  private singleRoute(request: QuoteRequest, quote: VenueQuote): RoutePlan {
    return this.routeFromLegs(request, [{ venue: quote.venue, notionalUsd: request.notionalUsd, quote }], "single venue remains best");
  }

  private routeFromLegs(request: QuoteRequest, legs: RouteLeg[], reason: string): RoutePlan {
    const total = legs.reduce((sum, leg) => sum + leg.notionalUsd, 0);
    const weight = (leg: RouteLeg) => total > 0 ? leg.notionalUsd / total : 0;
    return {
      id: `route-${Date.now()}-${legs.length > 1 ? "split" : legs[0]?.venue ?? "none"}`,
      mode: legs.length > 1 ? "split" : "single",
      symbol: request.symbol,
      side: request.side,
      notionalUsd: total,
      legs,
      score: rankQuotes(request, legs.map((leg) => leg.quote))[0]?.score ?? 0,
      estimatedPrice: legs.reduce((sum, leg) => sum + leg.quote.expectedPrice * weight(leg), 0),
      estimatedFeeUsd: legs.reduce((sum, leg) => sum + leg.quote.estimatedFeeUsd, 0),
      estimatedSlippageBps: legs.reduce((sum, leg) => sum + leg.quote.estimatedSlippageBps * weight(leg), 0),
      estimatedFundingHourlyPct: legs.reduce((sum, leg) => sum + leg.quote.fundingRateHourlyPct * weight(leg), 0),
      warnings: [reason, ...legs.flatMap((leg) => leg.quote.warnings)],
      createdAt: new Date().toISOString(),
    };
  }

  private quoteCostUsd(quote: VenueQuote): number {
    return quote.estimatedFeeUsd + (Math.abs(quote.estimatedSlippageBps) / 10_000) * quote.notionalUsd;
  }

  private totalCostUsd(legs: RouteLeg[]): number {
    return legs.reduce((sum, leg) => sum + this.quoteCostUsd(leg.quote), 0);
  }
}
