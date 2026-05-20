/**
 * Venue scoring — composite [0,1] score per venue quote.
 *
 * We score on five factors and combine with weights that the operator can
 * override. Inputs are all already-normalised per-quote numbers; this
 * function only does the comparison math.
 *
 *   Cost      (slippage + fee + funding, lower better)
 *   Liquidity (one-side market liquidity, higher better)
 *   OI        (open interest as a proxy for venue depth and confidence)
 *   Spread    (tighter spread → better)
 *   Funding   (cheaper or rebated funding → better)
 *
 * Weights default per the user's spec but can be overridden per call.
 */

import type { VenueQuote } from "../types.js";

export interface ScoringWeights {
  cost: number;
  liquidity: number;
  openInterest: number;
  funding: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  cost: 0.55,
  liquidity: 0.20,
  openInterest: 0.10,
  funding: 0.15,
};

export interface ScoredQuote {
  quote: VenueQuote;
  score: number;
  components: {
    cost: number;
    liquidity: number;
    openInterest: number;
    funding: number;
  };
}

/** Normalise an array of values to [0,1] where smaller is better. */
function normaliseAscending(values: number[]): number[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return values.map((v) => (Number.isFinite(v) ? 1 : 0));
  return values.map((v) => {
    if (!Number.isFinite(v)) return 0;
    return 1 - (v - min) / (max - min);
  });
}

/** Normalise where bigger is better. Missing → 0. */
function normaliseDescending(values: (number | null)[]): number[] {
  const finite = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return values.map((v) => (v != null && Number.isFinite(v) ? 1 : 0));
  return values.map((v) => {
    if (v == null || !Number.isFinite(v)) return 0;
    return (v - min) / (max - min);
  });
}

export function scoreQuotes(
  quotes: VenueQuote[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoredQuote[] {
  if (quotes.length === 0) return [];

  const fillable = quotes.filter((q) => q.fillable);
  // If nothing is fillable, score over the whole set so the operator still
  // sees ranking, but every score will be 0 for cost.
  const pool = fillable.length > 0 ? fillable : quotes;

  const costs = pool.map((q) => q.totalCostUsd);
  const liq = pool.map((q) => q.liquidityUsd);
  const oi = pool.map((q) => q.openInterestUsd);
  // Funding cost is bidirectional: rebates (negative) are best. Lower=better.
  const funding = pool.map((q) => q.fundingCostUsd);

  const nCost = normaliseAscending(costs);
  const nLiq = normaliseDescending(liq);
  const nOi = normaliseDescending(oi);
  const nFunding = normaliseAscending(funding);

  const scored = pool.map<ScoredQuote>((q, i) => {
    const comp = {
      cost: nCost[i] ?? 0,
      liquidity: nLiq[i] ?? 0,
      openInterest: nOi[i] ?? 0,
      funding: nFunding[i] ?? 0,
    };
    const score =
      comp.cost * weights.cost +
      comp.liquidity * weights.liquidity +
      comp.openInterest * weights.openInterest +
      comp.funding * weights.funding;
    return { quote: q, score, components: comp };
  });

  // Re-attach any unfillable quotes with score 0 so the caller sees the full set.
  const fillableSet = new Set(scored.map((s) => s.quote.venue));
  const rest = quotes
    .filter((q) => !fillableSet.has(q.venue))
    .map<ScoredQuote>((q) => ({
      quote: q,
      score: 0,
      components: { cost: 0, liquidity: 0, openInterest: 0, funding: 0 },
    }));

  return [...scored, ...rest].sort((a, b) => b.score - a.score);
}
