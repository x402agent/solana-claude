/**
 * Core types for the Clawd Perps Aggregator.
 *
 * The aggregator unifies multiple Solana perps venues — Phoenix, Flash Trade,
 * Jupiter, and GMTrade — behind a single routing, SDK, and MCP surface.
 *
 * Conventions:
 *   - All prices are in human USD (number, not fixed-point) at the SDK boundary.
 *     The execution layer converts to venue-native units when building txs.
 *   - All notional/size values are USD floats at this layer; fixed-point
 *     conversion happens inside the execution adapter.
 *   - Funding rates are signed percent per hour (long-perspective). Positive
 *     means longs pay shorts.
 *   - All sides match the Imperial convention: 0 = long, 1 = short.
 */

// ─── Venue identity ───────────────────────────────────────────────────────────

export type VenueId = "phoenix" | "flash" | "jupiter" | "gmtrade";

export const VENUE_IDS: readonly VenueId[] = ["phoenix", "flash", "jupiter", "gmtrade"] as const;

/** Imperial underwriter codes — kept stable so on-wire payloads match. */
export const UNDERWRITER_CODE: Record<VenueId, 0 | 1 | 2 | 3> = {
  jupiter: 0,
  flash: 1,
  phoenix: 2,
  gmtrade: 3,
};

export const VENUE_FROM_UNDERWRITER: Record<number, VenueId> = {
  0: "jupiter",
  1: "flash",
  2: "phoenix",
  3: "gmtrade",
};

export const VENUE_LABELS: Record<VenueId, string> = {
  phoenix: "Phoenix",
  flash: "Flash Trade",
  jupiter: "Jupiter",
  gmtrade: "GMTrade",
};

// ─── Side / action ────────────────────────────────────────────────────────────

export type Side = "long" | "short";
export type Action = "open" | "close";

export const SIDE_CODE: Record<Side, 0 | 1> = { long: 0, short: 1 };
export const ACTION_CODE: Record<Action, 0 | 1> = { open: 0, close: 1 };

// ─── Order types ──────────────────────────────────────────────────────────────

export type OrderType =
  | "market"
  | "limit"
  | "stop_limit"
  | "landmine"
  | "ratchet"
  | "ratchet_entry"
  | "dca"
  | "fib_ratchet"
  | "fib_ratchet_entry"
  | "dca_close"
  | "dca_time_close"
  | "dca_ratchet_close"
  | "dca_time"
  | "dca_ratchet";

export const ORDER_TYPE_CODE: Record<OrderType, number> = {
  market: 0,
  limit: 1,
  stop_limit: 2,
  landmine: 3,
  ratchet: 4,
  ratchet_entry: 6,
  dca: 9,
  fib_ratchet: 10,
  fib_ratchet_entry: 11,
  dca_close: 12,
  dca_time_close: 13,
  dca_ratchet_close: 14,
  dca_time: 15,
  dca_ratchet: 16,
};

// ─── Market data ──────────────────────────────────────────────────────────────

export interface MarkPrice {
  symbol: string;
  venue: VenueId;
  price: number;
  source: string;
  fetchedAtUnixMs: number;
}

export interface FundingRate {
  symbol: string;
  venue: VenueId;
  source: string;
  /** Long-side funding per hour, signed percent. Positive → longs pay shorts. */
  longPerHourPct: number | null;
  shortPerHourPct: number | null;
  longBorrowPerHourPct: number | null;
  shortBorrowPerHourPct: number | null;
}

export interface OrderbookLevel {
  price: number;
  size: number; // base units (token quantity)
}

export interface OrderbookSnapshot {
  symbol: string;
  venue: VenueId;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  fetchedAtUnixMs: number;
}

export interface MarketMeta {
  symbol: string;
  venue: VenueId;
  /** Maker fee in basis points. */
  makerFeeBps: number;
  /** Taker fee in basis points. */
  takerFeeBps: number;
  /** Max leverage offered, e.g. 10 for 10x. */
  maxLeverage: number;
  /** Open interest in USD (notional), if known. */
  openInterestUsd: number | null;
  /** Available liquidity in USD for market orders (one-side, approx). */
  liquidityUsd: number | null;
  /** Min order size in USD notional. */
  minOrderUsd: number;
  /** Mark price source — "oracle" | "book-mid" | "pool". */
  markSource: string;
  /** Pool state for AMM-style venues. Null for pure CLOB venues. */
  pool?: PoolStateView | null;
}

/**
 * Pool state surfaced through MarketMeta. Mirrors `PoolState` in
 * `aggregator/ammMath.ts` but lives in the public types so SDK consumers
 * can read it without importing the math module.
 */
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

export interface MarketSnapshot {
  symbol: string;
  venue: VenueId;
  markPrice: number | null;
  funding: FundingRate | null;
  book: OrderbookSnapshot | null;
  meta: MarketMeta | null;
}

// ─── Positions / balances ─────────────────────────────────────────────────────

export interface Position {
  wallet: string;
  profileIndex: number;
  venue: VenueId;
  symbol: string;
  side: Side;
  sizeUsd: number;
  entryPrice: number;
  markPrice: number | null;
  unrealizedPnlUsd: number | null;
  collateralUsd: number;
  leverage: number;
  liquidationPrice: number | null;
  fundingAccruedUsd: number | null;
}

export interface AggregatedPositions {
  wallet: string;
  positions: Position[];
  totals: {
    grossNotionalUsd: number;
    netNotionalUsd: number;
    collateralUsd: number;
    unrealizedPnlUsd: number;
    /** Net exposure per symbol (longs - shorts, USD). */
    bySymbol: Record<string, number>;
  };
}

export interface ProfileBalance {
  wallet: string;
  profileIndex: number;
  usdc: number; // human USD
}

// ─── Quotes / routing ─────────────────────────────────────────────────────────

export interface QuoteRequest {
  symbol: string;
  side: Side;
  action: Action;
  /** Notional in USD. */
  sizeUsd: number;
  /** Allowed slippage in basis points. Default 50. */
  slippageBps?: number;
  /** Restrict to a subset of venues. */
  venues?: VenueId[];
  /** Hold horizon in seconds — used to weight funding cost. Default 3600. */
  holdSeconds?: number;
}

export interface VenueQuote {
  venue: VenueId;
  symbol: string;
  side: Side;
  sizeUsd: number;
  /** Best expected fill price including depth-aware slippage. */
  expectedPrice: number;
  /** Mark price at quote time. */
  markPrice: number;
  /** Slippage in bps from mid/mark. Positive = worse than mark. */
  slippageBps: number;
  /** Estimated fee in USD (taker by default). */
  feeUsd: number;
  /** Funding cost over holdSeconds, USD (signed; negative = paid to user). */
  fundingCostUsd: number;
  /** Total expected cost vs. midprice, USD (slippage + fee + funding). */
  totalCostUsd: number;
  /** Open interest in USD on this venue, if known. */
  openInterestUsd: number | null;
  /** One-side market-order liquidity available, USD. */
  liquidityUsd: number | null;
  /** True if the venue can fill this size at all. */
  fillable: boolean;
  /** Human reason if not fillable. */
  reason?: string;
  /** Per-venue breakdown of cost components. */
  breakdown: {
    slippageUsd: number;
    feeUsd: number;
    fundingUsd: number;
  };
}

export interface RouteLeg {
  venue: VenueId;
  sizeUsd: number;
  expectedPrice: number;
  feeUsd: number;
  slippageBps: number;
}

export interface RoutePlan {
  symbol: string;
  side: Side;
  action: Action;
  totalSizeUsd: number;
  /** Ordered legs; for single-best-venue this has length 1. */
  legs: RouteLeg[];
  /** Best route's net expected cost over mid, USD. */
  totalCostUsd: number;
  /** Effective execution price across legs (size-weighted). */
  effectivePrice: number;
  /** All venue quotes considered (sorted best→worst). */
  candidates: VenueQuote[];
  /** Human rationale string. */
  rationale: string;
  /** Composite venue score for the chosen leg, [0,1]. */
  score: number;
  /** Generation timestamp. */
  generatedAtUnixMs: number;
}

// ─── Order / execution ────────────────────────────────────────────────────────

export interface OrderRequest {
  wallet: string;
  profileIndex?: number;
  symbol: string;
  side: Side;
  action: Action;
  sizeUsd: number;
  venue?: VenueId; // omitted → router picks
  orderType?: OrderType;
  slippageBps?: number;
  /** For limit/stop orders: oracle-scaled trigger (number, USD). */
  triggerPrice?: number;
  /** 0=Above, 1=Below. */
  triggerCondition?: 0 | 1;
  collateralUsd?: number;
  /** Holding horizon for funding-aware routing, seconds. */
  holdSeconds?: number;
}

export interface BuildTxResult {
  /** Base64-encoded partially-signed transaction returned by the venue/router. */
  transactionBase64: string;
  /** The venue chosen, in case the input request was unrouted. */
  venue: VenueId;
  /** Route plan that produced this tx. */
  route: RoutePlan;
  /** Echo of the on-wire payload posted to the venue/router. */
  payload: Record<string, unknown>;
}

export interface SimulateResult {
  route: RoutePlan;
  ok: boolean;
  warnings: string[];
  errors: string[];
  /** Expected fills per leg. */
  fills: RouteLeg[];
}

export type ExecutionStatus = "preview" | "submitted" | "failed" | "blocked" | "paper";

export interface ExecutionRecord {
  id: string;
  ts: number;
  wallet: string;
  profileIndex: number;
  venue: VenueId;
  symbol: string;
  side: Side;
  action: Action;
  orderType: OrderType;
  sizeUsd: number;
  paperMode: boolean;
  liveMode: boolean;
  request: OrderRequest;
  route: RoutePlan;
  response: unknown;
  status: ExecutionStatus;
  error?: string;
  txSignature?: string;
  orderPda?: string;
}

// ─── Risk views ───────────────────────────────────────────────────────────────

export interface LiquidationRisk {
  symbol: string;
  venue: VenueId;
  side: Side;
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  /** Distance to liquidation in basis points of mark price. Positive = safe. */
  distanceBps: number;
  /** Heuristic risk band. */
  risk: "low" | "medium" | "high" | "critical";
}
