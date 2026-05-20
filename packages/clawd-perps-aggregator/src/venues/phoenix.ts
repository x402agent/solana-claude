/**
 * Phoenix adapter — Solana-native CLOB perps.
 *
 * Phoenix is the only venue we have a real orderbook for, so the slippage
 * estimator walks the book directly (VWAP). Fees/leverage are taken from
 * Phoenix's public market parameters.
 */

import { BaseVenueAdapter, type VenueDefaults } from "./base.js";
import type { OrderbookSnapshot, VenueId } from "../types.js";

export class PhoenixAdapter extends BaseVenueAdapter {
  readonly id: VenueId = "phoenix";
  readonly label = "Phoenix";

  readonly defaults: VenueDefaults = {
    makerFeeBps: 1,
    takerFeeBps: 4,
    maxLeverage: 10,
    minOrderUsd: 1,
    impactCoeff: 0.0004,
    fallbackLiquidityUsd: 2_000_000,
    markSource: "phoenix-oracle",
  };

  hasBook(): boolean {
    return true;
  }

  async fetchBook(symbol: string): Promise<OrderbookSnapshot | null> {
    const sym = symbol.toUpperCase();
    try {
      const raw = await this.transport.getPhoenixDepth(sym);
      const snap = Array.isArray(raw) ? raw.find((d) => d.symbol?.toUpperCase() === sym) : raw;
      if (!snap || !snap.bids || !snap.asks) return null;
      return {
        symbol: sym,
        venue: this.id,
        bids: snap.bids.map(([price, size]) => ({ price, size })),
        asks: snap.asks.map(([price, size]) => ({ price, size })),
        fetchedAtUnixMs: Date.now(),
      };
    } catch {
      return null;
    }
  }
}
