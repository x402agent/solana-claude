import axios, { type AxiosInstance, isAxiosError } from "axios";
import WebSocket from "ws";
import type { ToolResult } from "../types/index.js";

function wrap(err: unknown, prefix: string): ToolResult {
  if (isAxiosError(err)) {
    if (err.code === "ECONNABORTED") return { success: false, error: `${prefix}: request timeout` };
    if (err.response) return { success: false, error: `${prefix}: ${err.response.status} ${err.response.statusText} ${JSON.stringify(err.response.data || {})}` };
    if (err.request) return { success: false, error: `${prefix}: network error` };
  }
  return { success: false, error: `${prefix}: ${err instanceof Error ? err.message : "unknown"}` };
}

/**
 * DFlow integration: Trading API (swaps, prediction-market init, priority fees)
 * and Metadata API (events, markets, orderbooks, trades, live data,
 * series, tags, sports, search for Kalshi/Polymarket-style prediction markets).
 */
export class DFlowTool {
  private apiKey: string;
  private trading: AxiosInstance;
  private metadata: AxiosInstance;

  constructor() {
    this.apiKey = process.env.DFLOW_API_KEY || "";
    const tradingURL = process.env.DFLOW_TRADING_URL || "https://quote-api.dflow.net";
    const metadataURL = process.env.DFLOW_METADATA_URL || "https://dev-prediction-markets-api.dflow.net";
    const headers = { "x-api-key": this.apiKey, accept: "application/json" };
    this.trading = axios.create({ baseURL: tradingURL, headers, timeout: 20000 });
    this.metadata = axios.create({ baseURL: metadataURL, headers, timeout: 20000 });
  }

  private requireKey(): ToolResult | null {
    if (!this.apiKey) return { success: false, error: "DFLOW_API_KEY environment variable is not set. Contact hello@dflow.net to obtain one." };
    return null;
  }

  private async req(client: AxiosInstance, method: "GET" | "POST", path: string, params?: any, body?: any): Promise<ToolResult> {
    const miss = this.requireKey();
    if (miss) return miss;
    try {
      const resp = await client.request({ method, url: path, params, data: body });
      return { success: true, output: JSON.stringify(resp.data, null, 2), data: resp.data };
    } catch (e) {
      return wrap(e, `DFlow ${method} ${path}`);
    }
  }

  // --- Trading API ---
  async getTokens(): Promise<ToolResult> { return this.req(this.trading, "GET", "/tokens"); }
  async getTokensWithDecimals(): Promise<ToolResult> { return this.req(this.trading, "GET", "/tokens-with-decimals"); }
  async getVenues(): Promise<ToolResult> { return this.req(this.trading, "GET", "/venues"); }
  async getPriorityFees(): Promise<ToolResult> { return this.req(this.trading, "GET", "/priority-fees"); }

  async getPredictionMarketInit(payer: string, outcomeMint: string): Promise<ToolResult> {
    return this.req(this.trading, "GET", "/prediction-market-init", { payer, outcomeMint });
  }

  /**
   * Imperative swap: DFlow returns a built transaction to sign & send.
   * Endpoint per DFlow docs: /quote + /swap-instructions, or /swap for v0 txn.
   */
  async getSwapQuote(params: {
    userPublicKey: string;
    inputMint: string;
    outputMint: string;
    amount: string | number; // input amount (raw)
    slippageBps?: number;
    swapMode?: "ExactIn" | "ExactOut";
    venues?: string[]; // filter venues
  }): Promise<ToolResult> {
    return this.req(this.trading, "GET", "/quote", {
      userPublicKey: params.userPublicKey,
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: String(params.amount),
      slippageBps: params.slippageBps ?? 50,
      swapMode: params.swapMode ?? "ExactIn",
      ...(params.venues?.length ? { venues: params.venues.join(",") } : {}),
    });
  }

  async buildSwap(body: {
    userPublicKey: string;
    quote: any;
    priorityFeeMicroLamports?: number;
    computeUnitLimit?: number;
  }): Promise<ToolResult> {
    return this.req(this.trading, "POST", "/swap", undefined, body);
  }

  async submitIntentSwap(body: {
    userPublicKey: string;
    inputMint: string;
    outputMint: string;
    amount: string | number;
    slippageBps?: number;
    swapMode?: "ExactIn" | "ExactOut";
  }): Promise<ToolResult> {
    return this.req(this.trading, "POST", "/intent-swap", undefined, body);
  }

  async getOrder(orderId: string): Promise<ToolResult> {
    return this.req(this.trading, "GET", `/order/${encodeURIComponent(orderId)}`);
  }

  async getOrderStatus(orderId: string): Promise<ToolResult> {
    return this.req(this.trading, "GET", `/order/${encodeURIComponent(orderId)}/status`);
  }

  // --- Metadata API (prediction markets; Kalshi passthrough) ---
  async getEvent(eventTicker: string): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/events/${encodeURIComponent(eventTicker)}`);
  }
  async getEvents(params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/events", params);
  }
  async getMarket(ticker: string): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/markets/${encodeURIComponent(ticker)}`);
  }
  async getMarkets(params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/markets", params);
  }
  async getOrderbook(marketTicker: string): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/orderbook/${encodeURIComponent(marketTicker)}`);
  }
  async getOrderbookByMint(mintAddress: string): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/orderbook/by-mint/${encodeURIComponent(mintAddress)}`);
  }
  async getTrades(params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/trades", params);
  }
  async getTradesByMint(mintAddress: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/trades/by-mint/${encodeURIComponent(mintAddress)}`, params);
  }
  async getOnchainTrades(params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/onchain-trades", params);
  }
  async getOnchainTradesByEvent(eventTicker: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/onchain-trades/by-event/${encodeURIComponent(eventTicker)}`, params);
  }
  async getOnchainTradesByMarket(marketTicker: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/onchain-trades/by-market/${encodeURIComponent(marketTicker)}`, params);
  }
  async getLiveData(milestoneIds: string[]): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/live_data", { milestoneIds: milestoneIds.join(",") });
  }
  async getLiveDataByEvent(eventTicker: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/live_data/by-event/${encodeURIComponent(eventTicker)}`, params);
  }
  async getLiveDataByMint(mintAddress: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/live_data/by-mint/${encodeURIComponent(mintAddress)}`, params);
  }
  async getSeries(params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/series", params);
  }
  async getSeriesByTicker(ticker: string): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/series/${encodeURIComponent(ticker)}`);
  }
  async getTagsByCategories(): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/tags_by_categories");
  }
  async getFiltersBySports(): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/filters_by_sports");
  }
  async searchEvents(query: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", "/api/v1/search", { q: query, ...params });
  }
  /**
   * Subscribe to the DFlow priority-fees websocket stream. Collects `samples` updates
   * (default 1) and returns them as JSON. Used for one-shot checks; long-running
   * subscriptions should call this with more samples or drive WS directly.
   */
  async streamPriorityFees(samples = 1, timeoutMs = 10000): Promise<ToolResult> {
    const miss = this.requireKey();
    if (miss) return miss;
    const wsBase = (process.env.DFLOW_TRADING_URL || "https://quote-api.dflow.net").replace(/^http/, "ws");
    const url = `${wsBase}/priority-fees/stream`;
    return new Promise<ToolResult>((resolve) => {
      const collected: unknown[] = [];
      const ws = new WebSocket(url, { headers: { "x-api-key": this.apiKey } });
      const done = (err?: string) => {
        try { ws.close(); } catch { /* ignore */ }
        if (err && !collected.length) resolve({ success: false, error: `DFlow WS: ${err}` });
        else resolve({ success: true, output: JSON.stringify(collected, null, 2), data: collected });
      };
      const timer = setTimeout(() => done(`timeout after ${timeoutMs}ms`), timeoutMs);
      ws.on("message", (data) => {
        try { collected.push(JSON.parse(data.toString())); } catch { collected.push(data.toString()); }
        if (collected.length >= samples) { clearTimeout(timer); done(); }
      });
      ws.on("error", (e: Error) => { clearTimeout(timer); done(e.message); });
      ws.on("close", () => { clearTimeout(timer); done(); });
    });
  }

  async getCandlesticks(marketTicker: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/candlesticks/${encodeURIComponent(marketTicker)}`, params);
  }
  async getForecastHistory(marketTicker: string, params: Record<string, any> = {}): Promise<ToolResult> {
    return this.req(this.metadata, "GET", `/api/v1/forecast-history/${encodeURIComponent(marketTicker)}`, params);
  }
}
