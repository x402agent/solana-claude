/**
 * Imperial transport — minimal HTTP/WS layer used by the venue adapters.
 *
 * This is intentionally narrow: the aggregator only needs read endpoints,
 * order build/submit, and the public market WS. Auth flows belong to the
 * higher-level Clawd Imperial integration; we accept a JWT and pass it
 * through.
 */

export interface RawFundingEntry {
  symbol: string;
  venue: string;
  source: string;
  longFundingRatePerHourPercent: number | null;
  shortFundingRatePerHourPercent: number | null;
  longBorrowRatePerHourPercent: number | null;
  shortBorrowRatePerHourPercent: number | null;
}

export interface RawMarkEntry {
  symbol: string;
  venue: string;
  source: string;
  price: number;
  fetchedAtUnixMs: number;
}

export interface RawDepth {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
}

export interface RawRoute {
  underwriter: 0 | 1 | 2 | 3;
  venue: string;
  estimatedFee: number;
  reason: string;
}

export interface RawPosition {
  wallet: string;
  profileIndex: number;
  symbol: string;
  venue?: string;
  underwriter?: 0 | 1 | 2 | 3;
  side: 0 | 1;
  sizeUsd: number;
  entryPrice: number;
  markPrice?: number | null;
  unrealizedPnlUsd?: number | null;
  collateralUsd?: number;
  leverage?: number;
  liquidationPrice?: number | null;
  fundingAccruedUsd?: number | null;
}

export interface RawOrderResponse {
  success: boolean;
  error: string | null;
  orderPda: string | null;
  signature: string | null;
  transaction?: string;
}

export interface RawBalancesResponse {
  wallet: string;
  profiles: { profileIndex: number; profilePda: string; usdc: number }[];
}

export interface TransportOpts {
  base: string;
  jwt?: string;
  fetchImpl?: typeof fetch;
}

export class ImperialTransport {
  readonly base: string;
  jwt: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: TransportOpts) {
    this.base = opts.base.replace(/\/+$/, "");
    this.jwt = opts.jwt ?? "";
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private authHeaders(): Record<string, string> {
    return this.jwt ? { Authorization: `Bearer ${this.jwt}` } : {};
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      headers: { ...this.authHeaders() },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GET ${path} → ${res.status}: ${body.slice(0, 256)}`);
    }
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`POST ${path} → ${res.status}: ${text.slice(0, 256)}`);
    }
    return res.json() as Promise<T>;
  }

  // ─── Read endpoints ─────────────────────────────────────────────────────────

  async getFundingRates(): Promise<RawFundingEntry[]> {
    return this.get<RawFundingEntry[]>("/funding-rates");
  }

  async getMarkPrices(): Promise<RawMarkEntry[]> {
    return this.get<RawMarkEntry[]>("/mark-prices");
  }

  async getPhoenixDepth(symbol?: string): Promise<RawDepth | RawDepth[]> {
    const path = symbol ? `/phoenix/depth?symbol=${encodeURIComponent(symbol)}` : `/phoenix/depth`;
    return this.get<RawDepth | RawDepth[]>(path);
  }

  async getMarketsForVenue(
    venue: "phoenix" | "flash" | "gmtrade",
  ): Promise<unknown> {
    return this.get<unknown>(`/${venue}/markets`);
  }

  async getRoute(asset: string, side: 0 | 1, notional: number): Promise<RawRoute> {
    const params = new URLSearchParams({
      asset,
      side: String(side),
      notional: String(notional),
    });
    return this.get<RawRoute>(`/route?${params}`);
  }

  async getPositions(wallet: string): Promise<RawPosition[]> {
    return this.get<RawPosition[]>(`/positions?wallet=${wallet}`);
  }

  async getOrders(wallet: string): Promise<unknown[]> {
    return this.get<unknown[]>(`/orders?wallet=${wallet}`);
  }

  async getBalances(): Promise<RawBalancesResponse> {
    return this.get<RawBalancesResponse>("/mobile/balances");
  }

  async getPriorityFee(): Promise<unknown> {
    return this.get<unknown>("/priority-fee");
  }

  async getGMTradeLiquidity(): Promise<unknown> {
    return this.get<unknown>("/gmtrade/liquidity");
  }

  async getGMTradeFundingRates(): Promise<unknown> {
    return this.get<unknown>("/gmtrade/funding-rates");
  }

  // ─── Order endpoints ────────────────────────────────────────────────────────

  async buildDepositTx(
    wallet: string,
    profileIndex: number,
    amount: number,
    mode: "deposit" | "withdraw",
  ): Promise<{ transaction: string }> {
    return this.post<{ transaction: string }>("/deposit/build-tx", {
      wallet,
      profileIndex,
      amount,
      mode,
    });
  }

  async placeOrder(payload: Record<string, unknown>): Promise<RawOrderResponse> {
    return this.post<RawOrderResponse>("/mobile/orders", payload);
  }

  async placeBatch(payload: {
    entry: Record<string, unknown>;
    closeOrders?: Record<string, unknown>[];
  }): Promise<{ entry: RawOrderResponse; closeOrders: RawOrderResponse[] }> {
    return this.post("/mobile/orders/batch", payload);
  }

  async cancelOrder(wallet: string, profileIndex: number, orderPda: string): Promise<RawOrderResponse> {
    return this.post<RawOrderResponse>("/mobile/orders/cancel", { wallet, profileIndex, orderPda });
  }

  /** WebSocket base derived from the HTTP base. */
  wsBase(): string {
    return this.base.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
  }
}
