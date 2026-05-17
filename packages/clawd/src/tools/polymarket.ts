import axios, { type AxiosInstance, isAxiosError } from "axios";
import type { ToolResult } from "../types/index.js";

function wrap(err: unknown, prefix: string): ToolResult {
  if (isAxiosError(err)) {
    if (err.response) return { success: false, error: `${prefix}: ${err.response.status} ${err.response.statusText} ${JSON.stringify(err.response.data || {})}` };
    if (err.request) return { success: false, error: `${prefix}: network error` };
  }
  return { success: false, error: `${prefix}: ${err instanceof Error ? err.message : "unknown"}` };
}

/**
 * Polymarket integration — public read endpoints.
 * Gamma API: gamma-api.polymarket.com (events, markets, tags — no auth)
 * CLOB REST:  clob.polymarket.com (book, price, trades, market info — no auth for GETs)
 *
 * Placing orders requires L2 auth (EIP-712 signing with a Polygon private key)
 * and is out of scope for this wrapper — add POLYGON_PRIVATE_KEY + CLOB client
 * signer when you want to go beyond read-only.
 */
export class PolymarketTool {
  private gamma: AxiosInstance;
  private clob: AxiosInstance;

  constructor() {
    this.gamma = axios.create({ baseURL: "https://gamma-api.polymarket.com", timeout: 15000 });
    this.clob = axios.create({ baseURL: "https://clob.polymarket.com", timeout: 15000 });
  }

  private async g(client: AxiosInstance, path: string, params?: Record<string, unknown>): Promise<ToolResult> {
    try {
      const resp = await client.get(path, { params });
      return { success: true, output: JSON.stringify(resp.data, null, 2), data: resp.data };
    } catch (e) { return wrap(e, `Polymarket ${path}`); }
  }

  // --- Gamma (metadata) ---
  async getEvents(params: Record<string, unknown> = {}): Promise<ToolResult> {
    return this.g(this.gamma, "/events", { limit: 50, ...params });
  }
  async getEvent(id: string): Promise<ToolResult> {
    return this.g(this.gamma, `/events/${encodeURIComponent(id)}`);
  }
  async getMarkets(params: Record<string, unknown> = {}): Promise<ToolResult> {
    return this.g(this.gamma, "/markets", { limit: 50, ...params });
  }
  async getMarket(id: string): Promise<ToolResult> {
    return this.g(this.gamma, `/markets/${encodeURIComponent(id)}`);
  }
  async searchEvents(query: string, limit = 20): Promise<ToolResult> {
    return this.g(this.gamma, "/events", { limit, q: query, active: true });
  }
  async getTags(): Promise<ToolResult> {
    return this.g(this.gamma, "/tags");
  }
  async getTrending(limit = 20): Promise<ToolResult> {
    return this.g(this.gamma, "/events", { limit, order: "volume24hr", ascending: false, active: true, closed: false });
  }

  // --- CLOB (live prices / orderbook) ---
  async getBook(tokenId: string): Promise<ToolResult> {
    return this.g(this.clob, "/book", { token_id: tokenId });
  }
  async getPrice(tokenId: string, side: "buy" | "sell" = "buy"): Promise<ToolResult> {
    return this.g(this.clob, "/price", { token_id: tokenId, side });
  }
  async getMidpoint(tokenId: string): Promise<ToolResult> {
    return this.g(this.clob, "/midpoint", { token_id: tokenId });
  }
  async getSpread(tokenId: string): Promise<ToolResult> {
    return this.g(this.clob, "/spread", { token_id: tokenId });
  }
  async getTrades(market: string, limit = 100): Promise<ToolResult> {
    return this.g(this.clob, "/trades", { market, limit });
  }
  async getLastTradePrice(tokenId: string): Promise<ToolResult> {
    return this.g(this.clob, "/last-trade-price", { token_id: tokenId });
  }
  async getClobMarkets(params: Record<string, unknown> = {}): Promise<ToolResult> {
    return this.g(this.clob, "/markets", params);
  }
  async getClobMarket(conditionId: string): Promise<ToolResult> {
    return this.g(this.clob, `/markets/${encodeURIComponent(conditionId)}`);
  }

  async placeOrder(): Promise<ToolResult> {
    return {
      success: false,
      error: "Polymarket order placement requires L2 auth (EIP-712 signing with a Polygon private key). Not enabled — add POLYGON_PRIVATE_KEY and a CLOB signer if you need this.",
    };
  }
}
