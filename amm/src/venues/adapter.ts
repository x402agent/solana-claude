import type {
  BuiltOrderTx,
  FundingRate,
  Market,
  MarkPrice,
  OrderBook,
  OrderBuildRequest,
  Position,
  PoolStateView,
  QuoteRequest,
  VenueName,
  VenueQuote,
} from "../types.js";
import type { PoolStateProvider } from "./poolState.js";

export interface VenueAdapter {
  readonly name: VenueName;
  listMarkets(): Promise<Market[]>;
  getMarkPrice(symbol: string): Promise<MarkPrice>;
  getFundingRate(symbol: string): Promise<FundingRate>;
  getOrderBook(symbol: string): Promise<OrderBook | null>;
  getPoolState(symbol: string): Promise<PoolStateView | null>;
  setPoolStateProvider(provider: PoolStateProvider | null): void;
  quote(request: QuoteRequest): Promise<VenueQuote>;
  buildOrder(request: OrderBuildRequest): Promise<BuiltOrderTx>;
  submitOrder(request: OrderBuildRequest): Promise<{ signature: string | null; orderPda: string | null; success: boolean; error?: string | null }>;
  getPositions(wallet: string): Promise<Position[]>;
}

export interface VenueDefaults {
  venue: VenueName;
  feeBps: number;
  maxLeverage: number;
  defaultLiquidityUsd: number;
  defaultOpenInterestUsd: number;
  impactCoefficientBps: number;
  markets: string[];
}
