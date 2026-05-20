/**
 * GMTrade adapter — GMX-style multi-asset perps on Solana.
 *
 * Pool-backed; competitive funding rates on alts. Liquidity is fetched
 * via Imperial's `/gmtrade/liquidity` when available.
 */

import { BaseVenueAdapter, type VenueDefaults } from "./base.js";
import type { MarketMeta, VenueId } from "../types.js";

export class GMTradeAdapter extends BaseVenueAdapter {
  readonly id: VenueId = "gmtrade";
  readonly label = "GMTrade";

  readonly defaults: VenueDefaults = {
    makerFeeBps: 0,
    takerFeeBps: 7,
    maxLeverage: 50,
    minOrderUsd: 10,
    impactCoeff: 0.0009,
    fallbackLiquidityUsd: 4_000_000,
    markSource: "gmtrade-oracle",
  };

  async fetchMeta(symbol: string): Promise<MarketMeta | null> {
    const base = await super.fetchMeta(symbol);
    if (!base) return null;
    // Best-effort augmentation from /gmtrade/liquidity.
    try {
      const liq = (await this.transport.getGMTradeLiquidity()) as
        | { symbol: string; liquidityUsd: number }[]
        | undefined;
      const match = Array.isArray(liq)
        ? liq.find((l) => l.symbol?.toUpperCase() === symbol.toUpperCase())
        : null;
      if (match?.liquidityUsd) {
        base.liquidityUsd = match.liquidityUsd;
      }
    } catch {
      // best-effort only
    }
    return base;
  }
}
