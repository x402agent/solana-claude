/**
 * Split-execution router — fan out a notional across venues when AMM
 * capacity or slippage tolerance demands it.
 *
 * Algorithm:
 *   1. Quote every enabled venue for the full notional (so we see best
 *      single-venue cost as a baseline).
 *   2. Identify venues that are fillable for the full size and venues that
 *      are not. If at least one venue is fully fillable AND its total cost
 *      is within `splitThresholdBps` of the best partial split, use single.
 *   3. Otherwise, greedily allocate notional in chunks across the fillable
 *      venues by ascending marginal cost — re-quote per leg so the impact
 *      curve updates.
 *
 * This is conservative: it never splits when a single venue can clear the
 * order at competitive cost, and never proposes a leg below the venue's
 * minimum order size.
 */

import type { VenueAdapter } from "../venues/adapter.js";
import type {
  QuoteRequest,
  RouteLeg,
  RoutePlan,
  VenueId,
  VenueQuote,
} from "../types.js";
import { VENUE_LABELS } from "../types.js";
import { DEFAULT_WEIGHTS, scoreQuotes, type ScoringWeights } from "./scoring.js";

export interface SplitRouterOpts {
  adapters: Record<VenueId, VenueAdapter>;
  weights?: ScoringWeights;
  defaultSlippageBps?: number;
  defaultHoldSeconds?: number;
  /** Minimum cost improvement (bps of notional) needed to prefer split over single. */
  splitThresholdBps?: number;
  /** Maximum number of legs to consider in a split. */
  maxLegs?: number;
  /** Step size for the greedy allocator, USD. */
  stepUsd?: number;
}

export class SplitRouter {
  readonly adapters: Record<VenueId, VenueAdapter>;
  readonly weights: ScoringWeights;
  readonly defaultSlippageBps: number;
  readonly defaultHoldSeconds: number;
  readonly splitThresholdBps: number;
  readonly maxLegs: number;
  readonly stepUsd: number;

  constructor(opts: SplitRouterOpts) {
    this.adapters = opts.adapters;
    this.weights = opts.weights ?? DEFAULT_WEIGHTS;
    this.defaultSlippageBps = opts.defaultSlippageBps ?? 50;
    this.defaultHoldSeconds = opts.defaultHoldSeconds ?? 3600;
    this.splitThresholdBps = opts.splitThresholdBps ?? 5;
    this.maxLegs = opts.maxLegs ?? 3;
    this.stepUsd = opts.stepUsd ?? 100;
  }

  private async quoteVenue(
    venue: VenueId,
    req: QuoteRequest,
    sizeUsd: number,
  ): Promise<VenueQuote> {
    return this.adapters[venue].quote({
      symbol: req.symbol,
      side: req.side,
      action: req.action,
      sizeUsd,
      slippageBps: req.slippageBps ?? this.defaultSlippageBps,
      holdSeconds: req.holdSeconds ?? this.defaultHoldSeconds,
    });
  }

  async route(req: QuoteRequest): Promise<RoutePlan> {
    const venues = (req.venues ?? (Object.keys(this.adapters) as VenueId[]))
      .filter((v) => this.adapters[v]);

    // 1. Full-size quotes for the baseline.
    const fullQuotes = await Promise.all(
      venues.map((v) => this.quoteVenue(v, req, req.sizeUsd).catch(() => null)),
    );
    const fullCandidates: VenueQuote[] = fullQuotes.filter((q): q is VenueQuote => q !== null);
    const scoredFull = scoreQuotes(fullCandidates, this.weights);
    const singleBest = scoredFull[0];

    // 2. Greedy split allocation.
    const splitLegs = await this.greedyAllocate(req, venues);

    const fullyFillableSingle = singleBest?.quote.fillable;
    const totalSplitCost = splitLegs.reduce((acc, l) => acc + l.feeUsd, 0)
      + splitLegs.reduce((acc, l) => acc + (Math.abs(l.slippageBps) / 10_000) * l.sizeUsd, 0);
    const totalSingleCost = singleBest?.quote.totalCostUsd ?? Number.POSITIVE_INFINITY;

    const splitWinsBy = totalSingleCost - totalSplitCost;
    const splitWinsBps = req.sizeUsd > 0 ? (splitWinsBy / req.sizeUsd) * 10_000 : 0;

    const preferSplit =
      splitLegs.length > 1 &&
      (!fullyFillableSingle || splitWinsBps > this.splitThresholdBps);

    const chosenLegs: RouteLeg[] = preferSplit
      ? splitLegs
      : singleBest
        ? [
            {
              venue: singleBest.quote.venue,
              sizeUsd: singleBest.quote.sizeUsd,
              expectedPrice: singleBest.quote.expectedPrice,
              feeUsd: singleBest.quote.feeUsd,
              slippageBps: singleBest.quote.slippageBps,
            },
          ]
        : [];

    const totalFilled = chosenLegs.reduce((acc, l) => acc + l.sizeUsd, 0);
    const effectivePrice = totalFilled > 0
      ? chosenLegs.reduce((acc, l) => acc + l.expectedPrice * l.sizeUsd, 0) / totalFilled
      : 0;

    const totalCostUsd = preferSplit ? totalSplitCost : totalSingleCost;
    const score = preferSplit ? Math.min(1, splitLegs.length / this.maxLegs) : singleBest?.score ?? 0;

    const rationale = preferSplit
      ? this.buildSplitRationale(splitLegs, splitWinsBps, !fullyFillableSingle)
      : this.buildSingleRationale(singleBest, scoredFull);

    return {
      symbol: req.symbol.toUpperCase(),
      side: req.side,
      action: req.action,
      totalSizeUsd: req.sizeUsd,
      legs: chosenLegs,
      totalCostUsd,
      effectivePrice,
      candidates: scoredFull.map((s) => s.quote),
      rationale,
      score,
      generatedAtUnixMs: Date.now(),
    };
  }

  /** Allocate notional in fixed steps across venues by marginal cost. */
  private async greedyAllocate(
    req: QuoteRequest,
    venues: VenueId[],
  ): Promise<RouteLeg[]> {
    const step = Math.max(this.stepUsd, 1);
    const target = req.sizeUsd;
    if (target <= 0) return [];

    // Per-venue running allocation, USD.
    const alloc = new Map<VenueId, number>();
    for (const v of venues) alloc.set(v, 0);

    let placed = 0;
    let safetyIters = Math.ceil((target / step) * (venues.length + 2));

    while (placed < target && safetyIters > 0) {
      safetyIters -= 1;
      const chunk = Math.min(step, target - placed);
      // For each venue, quote (current + chunk) and compute marginal cost.
      const candidates = await Promise.all(
        venues.map(async (v) => {
          const current = alloc.get(v) ?? 0;
          // Skip if adding a chunk would breach min order on first dollar but allow growth.
          try {
            const q = await this.quoteVenue(v, req, current + chunk);
            if (!q.fillable) return null;
            return { venue: v, q, marginalUsd: q.totalCostUsd - (alloc.get(v)! > 0 ? (await this.quoteVenue(v, req, current)).totalCostUsd : 0) };
          } catch {
            return null;
          }
        }),
      );
      const live = candidates.filter((c): c is { venue: VenueId; q: VenueQuote; marginalUsd: number } => c !== null);
      if (live.length === 0) break;
      live.sort((a, b) => a.marginalUsd - b.marginalUsd);
      const winner = live[0];
      alloc.set(winner.venue, (alloc.get(winner.venue) ?? 0) + chunk);
      placed += chunk;

      // Stop adding venues once we have maxLegs already with non-zero alloc.
      const distinct = [...alloc.values()].filter((u) => u > 0).length;
      if (distinct >= this.maxLegs) {
        // Continue but only on already-funded venues.
        venues = venues.filter((v) => (alloc.get(v) ?? 0) > 0);
      }
    }

    // Final quote per allocated venue to capture canonical price/fee.
    const legs: RouteLeg[] = [];
    for (const [v, sz] of alloc.entries()) {
      if (sz <= 0) continue;
      try {
        const q = await this.quoteVenue(v, req, sz);
        legs.push({
          venue: v,
          sizeUsd: sz,
          expectedPrice: q.expectedPrice,
          feeUsd: q.feeUsd,
          slippageBps: q.slippageBps,
        });
      } catch {
        /* skip */
      }
    }
    return legs.sort((a, b) => b.sizeUsd - a.sizeUsd);
  }

  private buildSingleRationale(
    top: { quote: VenueQuote; score: number } | undefined,
    all: { quote: VenueQuote; score: number }[],
  ): string {
    if (!top) return "no fillable venue";
    const q = top.quote;
    const parts = [
      `single: ${VENUE_LABELS[q.venue]}`,
      `score ${top.score.toFixed(3)}`,
      `slip ${q.slippageBps.toFixed(1)}bps`,
      `fee $${q.feeUsd.toFixed(2)}`,
    ];
    const runner = all[1]?.quote;
    if (runner) parts.push(`beats ${runner.venue} by $${(runner.totalCostUsd - q.totalCostUsd).toFixed(2)}`);
    return parts.join(" · ");
  }

  private buildSplitRationale(
    legs: RouteLeg[],
    winsBps: number,
    forcedBecauseSingleUnfillable: boolean,
  ): string {
    const parts = legs.map(
      (l) => `${l.venue} $${l.sizeUsd.toFixed(0)} @ ${l.expectedPrice.toFixed(4)} (${l.slippageBps.toFixed(1)}bps)`,
    );
    const reason = forcedBecauseSingleUnfillable
      ? `no single venue can fill full size`
      : `wins ${winsBps.toFixed(1)}bps vs best single`;
    return `split (${legs.length} legs, ${reason}): ${parts.join(" + ")}`;
  }
}
