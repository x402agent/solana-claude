export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: any;
}

export interface PerpsConfig {
  rpcUrl: string;
  apiUrl: string;
  apiKey?: string;
  walletName?: string;
  traderPdaIndex?: number;
  traderSubaccountIndex?: number;
}

export interface MarketInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketAddress: string;
  markPrice?: number | null;
  spotPrice?: number | null;
  openInterest?: number | null;
  status?: string;
}

export interface Ticker {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  volume24h: number;
  priceChange24h: number;
  fundingRate: number;
  openInterest: number;
}

export interface Position {
  marketAddress: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number;
}

export interface Order {
  orderId: string;
  marketAddress: string;
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price?: number;
  size: number;
  filledSize: number;
  status: string;
  createdAt: string;
}

export interface MarginStatus {
  totalCollateral: number;
  availableMargin: number;
  usedMargin: number;
  marginRatio: number;
  unrealizedPnl: number;
}

export interface OrderParams {
  market: string;
  side: "buy" | "sell";
  size: number;
  orderType: "market" | "limit";
  price?: number;
  reduceOnly?: boolean;
}

export interface TpSlParams {
  market: string;
  takeProfit?: number;
  stopLoss?: number;
  positionSide: "long" | "short";
}

export interface HistoryParams {
  market?: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface CandleParams {
  market: string;
  resolution: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  limit?: number;
  startTime?: number;
  endTime?: number;
}
