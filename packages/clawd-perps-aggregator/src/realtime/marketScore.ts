/**
 * Realtime market scoring.
 *
 * Given the cache from MarketStream, score each (symbol, venue) by a composite
 * signal: momentum (mark-vs-mid drift), funding pressure, and spread tightness.
 * This is the same OODA signal model used by the existing Imperial agent,
 * generalised to multi-venue.
 */

import type { MarketStream } from "./marketStream.js";
import type { VenueId } from "../types.js";
import { VENUE_LABELS } from "../types.js";

export type Bias = "long" | "short" | "neutral";

export interface MarketScore {
  symbol: string;
  venue: VenueId;
  composite: number; // [-1, 1] — positive = long bias
  bias: Bias;
  confidence: number; // [0, 1]
  components: {
    momentum: number;
    funding: number;
    liquidity: number;
  };
  rationale: string;
}

export function scoreMarket(
  stream: MarketStream,
  symbol: string,
  venue: VenueId,
): MarketScore | null {
  const sym = symbol.toUpperCase();
  const mark = stream.marks.get(`${sym}:${venue}`);
  const fund = stream.funding.get(`${sym}:${venue}`);
  if (!mark) return null;

  const components = { momentum: 0, funding: 0, liquidity: 0 };
  let rationaleParts: string[] = [];

  // Funding: positive longPerHourPct → longs pay → fade-long (short bias).
  if (fund?.longPerHourPct != null) {
    const annPct = fund.longPerHourPct * 8760;
    components.funding = Math.max(-1, Math.min(1, -fund.longPerHourPct * 20));
    rationaleParts.push(`funding ${annPct.toFixed(1)}% ann`);
  }

  // Liquidity + momentum from Phoenix depth (only venue we book-cache).
  const book = stream.books.get(sym);
  if (book && book.bids.length > 0 && book.asks.length > 0) {
    const bid = book.bids[0].price;
    const ask = book.asks[0].price;
    if (bid > 0 && ask > 0) {
      const mid = (bid + ask) / 2;
      const spreadBps = ((ask - bid) / bid) * 10_000;
      components.liquidity = spreadBps < 10 ? 1 : spreadBps < 30 ? 0.5 : 0.2;
      const drift = (mark.price - mid) / mid;
      // Mark above mid → tape leads up → long bias.
      components.momentum = Math.max(-1, Math.min(1, drift * 50));
      rationaleParts.push(`spread ${spreadBps.toFixed(1)}bps`);
    }
  } else {
    // No book — neutral.
    components.liquidity = 0;
  }

  const composite =
    components.momentum * 0.4 + components.funding * 0.4 + components.liquidity * 0.2;
  const bias: Bias = composite > 0.25 ? "long" : composite < -0.25 ? "short" : "neutral";
  const confidence = Math.min(1, Math.abs(composite));

  const rationale = `${VENUE_LABELS[venue]} ${sym} → ${bias.toUpperCase()} (${composite.toFixed(3)}) | ${rationaleParts.join(" · ")}`;

  return { symbol: sym, venue, composite, bias, confidence, components, rationale };
}

/** Score a symbol across all venues with cached data; returns a leaderboard. */
export function scoreSymbolAllVenues(
  stream: MarketStream,
  symbol: string,
): MarketScore[] {
  const out: MarketScore[] = [];
  const venues: VenueId[] = ["phoenix", "flash", "jupiter", "gmtrade"];
  for (const v of venues) {
    const s = scoreMarket(stream, symbol, v);
    if (s) out.push(s);
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}
