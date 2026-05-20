import type {
  BuiltOrderTx,
  FundingRate,
  Market,
  MarkPrice,
  OrderBook,
  OrderBuildRequest,
  Position,
  QuoteRequest,
  VenueName,
  VenueQuote,
} from "../types.js";

export interface VenueAdapter {
  readonly name: VenueName;
  listMarkets(): Promise<Market[]>;
  getMarkPrice(symbol: string): Promise<MarkPrice>;
  getFundingRate(symbol: string): Promise<FundingRate>;
  getOrderBook(symbol: string): Promise<OrderBook | null>;
  quote(request: QuoteRequest): Promise<VenueQuote>;
  buildOrder(request: OrderBuildRequest): Promise<BuiltOrderTx>;
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
