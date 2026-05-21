import type { FundingRate, OrderSide, PoolStateView, VenueName } from "../types.js";

export type PoolStateProvider = (
  venue: VenueName,
  symbol: string,
) => Promise<PoolStateView | null> | PoolStateView | null;

export interface SyntheticPoolOpts {
  aumUsd: number;
  oiCapFrac?: number;
  funding?: FundingRate | null;
  peakFundingPerHourPct?: number;
  peakBorrowPerHourPct?: number;
}

export function syntheticPoolState({
  aumUsd,
  oiCapFrac = 0.4,
  funding,
  peakFundingPerHourPct = 0.005,
  peakBorrowPerHourPct = 0.01,
}: SyntheticPoolOpts): PoolStateView {
  const peak = Math.max(peakFundingPerHourPct, 1e-9);
  const longRate = funding?.longRateHourlyPct ?? 0;
  const skew = Math.max(-1, Math.min(1, longRate / peak));
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

export class StaticPoolStateProvider {
  private readonly map = new Map<string, PoolStateView>();

  set(venue: VenueName, symbol: string, state: PoolStateView): void {
    this.map.set(`${venue}:${symbol.toUpperCase()}`, state);
  }

  get(venue: VenueName, symbol: string): PoolStateView | null {
    return this.map.get(`${venue}:${symbol.toUpperCase()}`) ?? null;
  }

  provider: PoolStateProvider = (venue, symbol) => this.get(venue, symbol);
}

export function chainPoolStateProviders(...providers: PoolStateProvider[]): PoolStateProvider {
  return async (venue, symbol) => {
    for (const provider of providers) {
      const state = await provider(venue, symbol);
      if (state) return state;
    }
    return null;
  };
}

export function remainingCapacityUsd(pool: PoolStateView, side: OrderSide): number {
  const oi = side === "long" ? pool.longOiUsd : pool.shortOiUsd;
  const cap = side === "long" ? pool.maxLongOiUsd : pool.maxShortOiUsd;
  return Math.max(0, cap - oi);
}
