/**
 * VenueAdapter — common shape every perps venue exposes to the aggregator.
 *
 * The Imperial-backed adapters all share transport + payload conventions; we
 * still keep them as distinct classes so each can override meta defaults
 * (fees, max leverage, depth/OI heuristics) per venue and so a future
 * direct on-chain adapter can drop into the same interface without churning
 * the router.
 */

import type {
  Action,
  FundingRate,
  MarkPrice,
  MarketMeta,
  MarketSnapshot,
  OrderbookSnapshot,
  Side,
  VenueId,
  VenueQuote,
} from "../types.js";

export interface QuoteContext {
  symbol: string;
  side: Side;
  action: Action;
  sizeUsd: number;
  slippageBps: number;
  holdSeconds: number;
}

export interface VenueAdapter {
  readonly id: VenueId;
  readonly label: string;

  /** Fetch the latest mark price across the venue's symbols (filter optional). */
  fetchMarkPrices(symbols?: string[]): Promise<MarkPrice[]>;

  /** Fetch funding rates. */
  fetchFunding(symbols?: string[]): Promise<FundingRate[]>;

  /** Orderbook snapshot if the venue has a CLOB; null otherwise (AMM-style). */
  fetchBook(symbol: string): Promise<OrderbookSnapshot | null>;

  /** Venue meta — fees, leverage, OI, liquidity. */
  fetchMeta(symbol: string): Promise<MarketMeta | null>;

  /** Composite market snapshot. */
  snapshot(symbol: string): Promise<MarketSnapshot>;

  /** Quote a market order. Implementations should set fillable=false if the
   *  venue can't take the size and explain via `reason`. */
  quote(ctx: QuoteContext): Promise<VenueQuote>;

  /** Build the on-wire payload for a market order (Imperial mobile schema). */
  buildOrderPayload(opts: {
    wallet: string;
    profileIndex: number;
    symbol: string;
    side: Side;
    action: "open" | "close";
    sizeUsdFixed: number;
    collateralFixed: number;
    slippageBps: number;
    orderTypeCode: number;
    triggerPrice?: number;
    triggerCondition?: 0 | 1;
  }): Record<string, unknown>;
}
