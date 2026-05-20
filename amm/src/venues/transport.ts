import type { OrderSide, VenueName } from "../types.js";

export interface RawFundingEntry {
  symbol: string;
  venue?: string;
  source?: string;
  longFundingRatePerHourPercent?: number | null;
  shortFundingRatePerHourPercent?: number | null;
  longBorrowRatePerHourPercent?: number | null;
  shortBorrowRatePerHourPercent?: number | null;
}

export interface RawMarkEntry {
  symbol: string;
  venue?: string;
  source?: string;
  price?: number;
  markPrice?: number;
  fetchedAtUnixMs?: number;
  timestamp?: number;
}

export interface RawDepth {
  symbol: string;
  bids?: [number, number][];
  asks?: [number, number][];
}

export interface RawPosition {
  wallet?: string;
  profileIndex?: number;
  symbol: string;
  venue?: string;
  underwriter?: number;
  side: 0 | 1 | "long" | "short";
  sizeUsd?: number;
  notionalUsd?: number;
  entryPrice?: number;
  markPrice?: number | null;
  unrealizedPnlUsd?: number | null;
  collateralUsd?: number;
  leverage?: number;
  liquidationPrice?: number | null;
  fundingAccruedUsd?: number | null;
}

export interface RawOrderResponse {
  success?: boolean;
  error?: string | null;
  orderPda?: string | null;
  signature?: string | null;
  transaction?: string | null;
}

export interface ImperialTransportOptions {
  base: string;
  jwt?: string;
  fetchImpl?: typeof fetch;
}

export class ImperialTransport {
  readonly base: string;
  readonly jwt?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ImperialTransportOptions) {
    this.base = options.base.replace(/\/+$/, "");
    this.jwt = options.jwt;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    return this.jwt ? { Authorization: `Bearer ${this.jwt}` } : {};
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, { headers: this.headers() });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GET ${path} failed with ${res.status}: ${body.slice(0, 240)}`);
    }
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`POST ${path} failed with ${res.status}: ${text.slice(0, 240)}`);
    }
    return res.json() as Promise<T>;
  }

  async getFundingRates(): Promise<RawFundingEntry[]> {
    return this.get<RawFundingEntry[]>("/funding-rates");
  }

  async getMarkPrices(): Promise<RawMarkEntry[]> {
    return this.get<RawMarkEntry[]>("/mark-prices");
  }

  async getPhoenixDepth(symbol?: string): Promise<RawDepth | RawDepth[]> {
    const suffix = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
    return this.get<RawDepth | RawDepth[]>(`/phoenix/depth${suffix}`);
  }

  async getVenueMarkets(venue: VenueName): Promise<unknown> {
    return this.get<unknown>(`/${venue}/markets`);
  }

  async getPositions(wallet: string): Promise<RawPosition[]> {
    return this.get<RawPosition[]>(`/positions?wallet=${encodeURIComponent(wallet)}`);
  }

  async placeOrder(payload: Record<string, unknown>): Promise<RawOrderResponse> {
    return this.post<RawOrderResponse>("/mobile/orders", payload);
  }

  async buildOrder(payload: Record<string, unknown>): Promise<RawOrderResponse> {
    return this.post<RawOrderResponse>("/mobile/orders/build-tx", payload);
  }

  wsBase(): string {
    return this.base.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
  }
}

export function rawSideToSide(side: RawPosition["side"]): OrderSide {
  if (side === 0 || side === "long") return "long";
  return "short";
}
