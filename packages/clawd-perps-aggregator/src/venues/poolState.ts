/**
 * Pool-state helpers for AMM venues.
 *
 * The Imperial transport doesn't yet expose canonical per-side OI / max-OI
 * for Flash, Jupiter, and GMTrade. Until those endpoints land, the
 * aggregator either:
 *
 *   - Accepts a `PoolStateProvider` injected by the operator (preferred —
 *     plug in a Jupiter JLP RPC reader, a Flash pool deserialiser, etc.).
 *   - Falls back to a synthetic pool derived from venue defaults + funding
 *     skew, which is good enough for routing/comparison but not for risk
 *     limits.
 *
 * Both paths produce the same `PoolStateView` consumed by `BaseVenueAdapter`.
 */

import type { FundingRate, PoolStateView, Side, VenueId } from "../types.js";

export type PoolStateProvider = (
  venue: VenueId,
  symbol: string,
) => Promise<PoolStateView | null> | PoolStateView | null;

export interface SyntheticPoolOpts {
  /** Total advertised AUM, USD. */
  aumUsd: number;
  /** Max OI per side as fraction of AUM. */
  oiCapFrac?: number;
  /** Current funding rate (long-side, per-hour percent), used to back into skew. */
  funding?: FundingRate | null;
  /** Peak per-hour funding the venue tops at — used to invert the rate to a skew. */
  peakFundingPerHourPct?: number;
  /** Peak per-hour borrow rate. */
  peakBorrowPerHourPct?: number;
}

/**
 * Derive a `PoolStateView` from venue AUM + funding signals.
 *
 * Most AMM perps run a linear funding model funding = peak * skew. Given
 * the observed long-side funding, we invert:
 *   skew = clamp(funding / peak, -1, 1)
 * then split AUM into long/short OI consistent with the observed skew.
 *
 * This is a model, not a fact. Use only when the venue doesn't expose
 * real pool state; otherwise inject a `PoolStateProvider`.
 */
export function syntheticPoolState({
  aumUsd,
  oiCapFrac = 0.4,
  funding,
  peakFundingPerHourPct = 0.005,
  peakBorrowPerHourPct = 0.01,
}: SyntheticPoolOpts): PoolStateView {
  const peak = Math.max(peakFundingPerHourPct, 1e-9);
  const longRate = funding?.longPerHourPct ?? 0;
  const skew = Math.max(-1, Math.min(1, longRate / peak));

  // total OI ≈ oiCapFrac * AUM utilized at ~50% by default; widen with |skew|.
  const totalOiTarget = aumUsd * oiCapFrac * (0.4 + 0.4 * Math.abs(skew));
  const longOiUsd = Math.max(0, totalOiTarget * (1 + skew) * 0.5);
  const shortOiUsd = Math.max(0, totalOiTarget * (1 - skew) * 0.5);
  const cap = aumUsd * oiCapFrac;

  return {
    aumUsd,
    longOiUsd,
    shortOiUsd,
    maxLongOiUsd: cap,
    maxShortOiUsd: cap,
    fundingPeakPerHourPct: peakFundingPerHourPct,
    borrowPeakPerHourPct: peakBorrowPerHourPct,
  };
}

/**
 * Convenience: a registry-style provider that lets callers register a
 * static pool per (venue, symbol). Useful for unit tests and for
 * operators who want to pin a known pool snapshot.
 */
export class StaticPoolStateProvider {
  private readonly map = new Map<string, PoolStateView>();
  set(venue: VenueId, symbol: string, state: PoolStateView): void {
    this.map.set(`${venue}:${symbol.toUpperCase()}`, state);
  }
  get(venue: VenueId, symbol: string): PoolStateView | null {
    return this.map.get(`${venue}:${symbol.toUpperCase()}`) ?? null;
  }
  /** Use this object as a PoolStateProvider directly. */
  provider: PoolStateProvider = (venue, symbol) => this.get(venue, symbol);
}

/** Compose multiple providers — first one returning a non-null wins. */
export function chainPoolStateProviders(
  ...providers: PoolStateProvider[]
): PoolStateProvider {
  return async (venue, symbol) => {
    for (const p of providers) {
      const v = await p(venue, symbol);
      if (v) return v;
    }
    return null;
  };
}

/** Convenience: side-aware remaining capacity from a PoolStateView. */
export function remainingCapacityUsd(pool: PoolStateView, side: Side): number {
  const oi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const cap = side === "long" ? pool.maxLongOiUsd : pool.maxShortOiUsd;
  return Math.max(0, cap - oi);
}
