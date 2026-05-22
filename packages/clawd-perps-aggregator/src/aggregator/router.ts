/**
 * Smart Order Router — single-best-venue routing with full per-venue breakdown.
 *
 * The API is designed so that split-execution routing (`legs` length > 1) can
 * drop in later without breaking the consumer surface.
 */

import type { VenueAdapter } from "../venues/adapter.js";
import type {
  QuoteRequest,
  RoutePlan,
  VenueId,
  VenueQuote,
  Side,
} from "../types.js";
import { VENUE_LABELS } from "../types.js";
import { scoreQuotes, DEFAULT_WEIGHTS, type ScoringWeights } from "./scoring.js";

export interface RouterOpts {
  adapters: Record<VenueId, VenueAdapter>;
  weights?: ScoringWeights;
  /** Default slippage tolerance in bps if a quote request doesn't set one. */
  defaultSlippageBps?: number;
  /** Default hold horizon for funding-aware quoting, seconds. */
  defaultHoldSeconds?: number;
}

export class SmartRouter {
  readonly adapters: Record<VenueId, VenueAdapter>;
  readonly weights: ScoringWeights;
  readonly defaultSlippageBps: number;
  readonly defaultHoldSeconds: number;

  constructor(opts: RouterOpts) {
    this.adapters = opts.adapters;
    this.weights = opts.weights ?? DEFAULT_WEIGHTS;
    this.defaultSlippageBps = opts.defaultSlippageBps ?? 50;
    this.defaultHoldSeconds = opts.defaultHoldSeconds ?? 3600;
  }

  /** Quote one venue. Useful for venue-pinned execution. */
  async quoteVenue(venueId: VenueId, req: QuoteRequest): Promise<VenueQuote> {
    const adapter = this.adapters[venueId];
    if (!adapter) {
      throw new Error(`venue ${venueId} not enabled`);
    }
    return adapter.quote({
      symbol: req.symbol,
      side: req.side,
      action: req.action,
      sizeUsd: req.sizeUsd,
      slippageBps: req.slippageBps ?? this.defaultSlippageBps,
      holdSeconds: req.holdSeconds ?? this.defaultHoldSeconds,
    });
  }

  /** Quote every enabled venue. */
  async quoteAll(req: QuoteRequest): Promise<VenueQuote[]> {
    const venues = (req.venues ?? (Object.keys(this.adapters) as VenueId[]))
      .filter((v) => this.adapters[v]);
    const settled = await Promise.allSettled(
      venues.map((v) => this.quoteVenue(v, req)),
    );
    const out: VenueQuote[] = [];
    for (let i = 0; i < settled.length; i += 1) {
      const r = settled[i];
      const v = venues[i];
      if (r.status === "fulfilled") {
        out.push(r.value);
      } else {
        out.push(unfillableQuote(v, req, r.reason instanceof Error ? r.reason.message : String(r.reason)));
      }
    }
    return out;
  }

  /** Produce a single-best-venue route plan with full candidate breakdown. */
  async route(req: QuoteRequest): Promise<RoutePlan> {
    const quotes = await this.quoteAll(req);
    const scored = scoreQuotes(quotes, this.weights);

    // Prefer the top fillable venue; fall back to runner-up if top is unfillable.
    const top = scored.find((s) => s.quote.fillable) ?? scored[0];
    if (!top) {
      throw new Error("no venue quotes available");
    }

    const chosen = top.quote;
    const rationale = buildRationale(top, scored);

    const plan: RoutePlan = {
      symbol: req.symbol.toUpperCase(),
      side: req.side,
      action: req.action,
      totalSizeUsd: req.sizeUsd,
      legs: [
        {
          venue: chosen.venue,
          sizeUsd: chosen.sizeUsd,
          expectedPrice: chosen.expectedPrice,
          feeUsd: chosen.feeUsd,
          slippageBps: chosen.slippageBps,
        },
      ],
      totalCostUsd: chosen.totalCostUsd,
      effectivePrice: chosen.expectedPrice,
      candidates: scored.map((s) => s.quote),
      rationale,
      score: top.score,
      generatedAtUnixMs: Date.now(),
    };
    return plan;
  }
}

function buildRationale(
  top: { quote: VenueQuote; score: number },
  all: { quote: VenueQuote; score: number }[],
): string {
  const q = top.quote;
  const parts: string[] = [
    `${VENUE_LABELS[q.venue]} (${q.venue})`,
    `score ${top.score.toFixed(3)}`,
    `slip ${q.slippageBps.toFixed(1)}bps`,
    `fee $${q.feeUsd.toFixed(2)}`,
  ];
  if (q.fundingCostUsd !== 0) {
    const sign = q.fundingCostUsd > 0 ? "+" : "";
    parts.push(`funding ${sign}$${q.fundingCostUsd.toFixed(2)}`);
  }
  const runner = all[1]?.quote;
  if (runner) {
    const delta = runner.totalCostUsd - q.totalCostUsd;
    parts.push(`beats ${runner.venue} by $${delta.toFixed(2)}`);
  }
  if (!q.fillable) {
    parts.unshift("UNFILLABLE");
    if (q.reason) parts.push(q.reason);
  }
  return parts.join(" · ");
}

function unfillableQuote(venue: VenueId, req: QuoteRequest, reason: string): VenueQuote {
  return {
    venue,
    symbol: req.symbol.toUpperCase(),
    side: req.side,
    sizeUsd: req.sizeUsd,
    expectedPrice: 0,
    markPrice: 0,
    slippageBps: 0,
    feeUsd: 0,
    fundingCostUsd: 0,
    totalCostUsd: Number.POSITIVE_INFINITY,
    openInterestUsd: null,
    liquidityUsd: null,
    fillable: false,
    reason,
    breakdown: { slippageUsd: 0, feeUsd: 0, fundingUsd: 0 },
  };
}

/** Convenience type re-export. */
export type { Side };
