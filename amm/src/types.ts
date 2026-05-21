export type VenueName = "phoenix" | "flash" | "jupiter" | "gmtrade";
export type OrderSide = "long" | "short";
export type OrderKind = "market" | "limit";

export interface Market {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  venue: VenueName;
  active: boolean;
  maxLeverage?: number;
  minNotionalUsd?: number;
  tickSize?: number;
  lotSize?: number;
  pool?: PoolStateView | null;
}

export interface FundingRate {
  symbol: string;
  venue: VenueName;
  longRateHourlyPct: number;
  shortRateHourlyPct: number;
  source: string;
  timestamp: number;
}

export interface MarkPrice {
  symbol: string;
  venue: VenueName;
  price: number;
  source: string;
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  sizeUsd: number;
}

export interface OrderBook {
  symbol: string;
  venue: VenueName;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface QuoteRequest {
  symbol: string;
  side: OrderSide;
  notionalUsd: number;
  leverage?: number;
  allowedVenues?: VenueName[];
}

export interface VenueQuote {
  venue: VenueName;
  symbol: string;
  side: OrderSide;
  notionalUsd: number;
  expectedPrice: number;
  markPrice: number;
  estimatedFeeUsd: number;
  estimatedSlippageBps: number;
  fundingRateHourlyPct: number;
  liquidityUsd: number;
  openInterestUsd: number;
  confidence: number;
  warnings: string[];
  pool?: PoolStateView | null;
  raw?: unknown;
}

export interface RouteLeg {
  venue: VenueName;
  notionalUsd: number;
  quote: VenueQuote;
}

export interface RoutePlan {
  id: string;
  mode: "single" | "split";
  symbol: string;
  side: OrderSide;
  notionalUsd: number;
  legs: RouteLeg[];
  score: number;
  estimatedPrice: number;
  estimatedFeeUsd: number;
  estimatedSlippageBps: number;
  estimatedFundingHourlyPct: number;
  warnings: string[];
  createdAt: string;
}

export interface OrderBuildRequest extends QuoteRequest {
  wallet: string;
  profileIndex?: number;
  orderKind?: OrderKind;
  limitPrice?: number;
  reduceOnly?: boolean;
  clientOrderId?: string;
}

export interface BuiltOrderTx {
  route: RoutePlan;
  transaction: string | null;
  payload: Record<string, unknown>;
  paper: boolean;
}

export interface SimulatedOrder {
  route: RoutePlan;
  accepted: boolean;
  paper: boolean;
  marginRequiredUsd: number;
  maxLossUsd: number | null;
  warnings: string[];
}

export interface ExecutedOrder {
  route: RoutePlan;
  paper: boolean;
  signature: string | null;
  orderPda: string | null;
  status: "paper" | "submitted" | "rejected";
  error?: string;
}

export interface Position {
  wallet: string;
  profileIndex: number;
  symbol: string;
  venue: VenueName;
  side: OrderSide;
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnlUsd: number;
  collateralUsd: number;
  leverage: number;
  liquidationPrice: number | null;
  fundingAccruedUsd: number;
}

export interface AggregatedPosition {
  symbol: string;
  netSide: "long" | "short" | "flat";
  grossUsd: number;
  netUsd: number;
  weightedEntryPrice: number;
  weightedMarkPrice: number;
  unrealizedPnlUsd: number;
  collateralUsd: number;
  effectiveLeverage: number;
  liquidationRisk: "low" | "medium" | "high" | "critical";
  legs: Position[];
}

export interface MarketScore {
  symbol: string;
  venue: VenueName;
  score: number;
  momentum: number;
  funding: number;
  liquidity: number;
  risk: number;
  signal: "buy" | "sell" | "neutral";
  reasons: string[];
  timestamp: number;
}

export interface SafetyConfig {
  paper: boolean;
  live: boolean;
  maxNotionalUsd: number;
  allowedSymbols: string[];
  allowedVenues: VenueName[];
}

export interface AggregatorConfig {
  imperialApiBase: string;
  imperialJwt?: string;
  safety: SafetyConfig;
}

export interface PoolStateView {
  aumUsd: number;
  longOiUsd: number;
  shortOiUsd: number;
  maxLongOiUsd: number;
  maxShortOiUsd: number;
  perSideLiquidityUsd?: { long: number; short: number };
  targetUtilization?: number;
  fundingPeakPerHourPct?: number;
  borrowPeakPerHourPct?: number;
}
