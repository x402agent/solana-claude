import axios, { type AxiosInstance, isAxiosError } from "axios";
import type {
  ToolResult,
  PerpsConfig,
  OrderParams,
  TpSlParams,
  HistoryParams,
  CandleParams,
} from "./types.js";

function wrap(err: unknown, label: string): ToolResult {
  if (isAxiosError(err)) {
    if (err.code === "ECONNABORTED") return { success: false, error: `${label}: request timeout` };
    if (err.response)
      return {
        success: false,
        error: `${label}: ${err.response.status} ${err.response.statusText} ${JSON.stringify(err.response.data || {})}`,
      };
    if (err.request) return { success: false, error: `${label}: network error` };
  }
  return { success: false, error: `${label}: ${err instanceof Error ? err.message : "unknown"}` };
}

/**
 * ClaWD Perps — Phoenix Perpetuals DEX integration.
 *
 * Mirrors the Vulcan CLI command surface (market, trade, position, margin,
 * history, portfolio) but exposed as a TypeScript tool class that fits the
 * clawd tool pattern. All network calls hit the Phoenix perps REST API; no
 * Vulcan binary dependency required.
 *
 * Environment variables:
 *   CLAWD_PERPS_API_URL   — Phoenix perps API base URL (default: https://perp-api.phoenix.trade)
 *   CLAWD_PERPS_RPC_URL   — Solana RPC URL              (default: https://api.mainnet-beta.solana.com)
 *   CLAWD_PERPS_API_KEY   — Optional bearer token for authenticated endpoints
 *   CLAWD_PERPS_WALLET    — Trader public key / wallet address
 */
export class ClaWDPerps {
  private cfg: PerpsConfig;
  private api: AxiosInstance;

  constructor(overrides: Partial<PerpsConfig> = {}) {
    this.cfg = {
      apiUrl: overrides.apiUrl ?? process.env.CLAWD_PERPS_API_URL ?? "https://perp-api.phoenix.trade",
      rpcUrl: overrides.rpcUrl ?? process.env.CLAWD_PERPS_RPC_URL ?? "https://api.mainnet-beta.solana.com",
      apiKey: overrides.apiKey ?? process.env.CLAWD_PERPS_API_KEY,
      walletName: overrides.walletName ?? process.env.CLAWD_PERPS_WALLET,
    };

    const headers: Record<string, string> = { accept: "application/json" };
    if (this.cfg.apiKey) headers["authorization"] = `Bearer ${this.cfg.apiKey}`;

    this.api = axios.create({
      baseURL: this.cfg.apiUrl,
      headers,
      timeout: 20_000,
    });
  }

  private async get(path: string, params?: Record<string, any>): Promise<ToolResult> {
    try {
      const resp = await this.api.get(path, { params });
      return { success: true, output: JSON.stringify(resp.data, null, 2), data: resp.data };
    } catch (e) {
      return wrap(e, `GET ${path}`);
    }
  }

  private async post(path: string, body?: any): Promise<ToolResult> {
    try {
      const resp = await this.api.post(path, body);
      return { success: true, output: JSON.stringify(resp.data, null, 2), data: resp.data };
    } catch (e) {
      return wrap(e, `POST ${path}`);
    }
  }

  private requireWallet(): ToolResult | null {
    if (!this.cfg.walletName)
      return {
        success: false,
        error: "Wallet address required. Set CLAWD_PERPS_WALLET or pass walletName in config.",
      };
    return null;
  }

  // ── Market data ──────────────────────────────────────────────────────────────

  async listMarkets(): Promise<ToolResult> {
    return this.get("/markets");
  }

  async getMarketInfo(market: string): Promise<ToolResult> {
    return this.get(`/markets/${encodeURIComponent(market)}`);
  }

  async getTicker(market: string): Promise<ToolResult> {
    return this.get(`/markets/${encodeURIComponent(market)}/ticker`);
  }

  async getAllTickers(): Promise<ToolResult> {
    return this.get("/tickers");
  }

  async getOrderbook(market: string, depth = 20): Promise<ToolResult> {
    return this.get(`/markets/${encodeURIComponent(market)}/orderbook`, { depth });
  }

  async getCandles(params: CandleParams): Promise<ToolResult> {
    const { market, ...rest } = params;
    return this.get(`/markets/${encodeURIComponent(market)}/candles`, rest);
  }

  // ── Account / portfolio ──────────────────────────────────────────────────────

  async getPortfolio(wallet?: string): Promise<ToolResult> {
    const addr = wallet ?? this.cfg.walletName;
    const miss = addr ? null : this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(addr!)}/portfolio`);
  }

  async getMarginStatus(wallet?: string): Promise<ToolResult> {
    const addr = wallet ?? this.cfg.walletName;
    const miss = addr ? null : this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(addr!)}/margin`);
  }

  async getAccountInfo(wallet?: string): Promise<ToolResult> {
    const addr = wallet ?? this.cfg.walletName;
    const miss = addr ? null : this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(addr!)}`);
  }

  async getLeverageTiers(market: string): Promise<ToolResult> {
    return this.get(`/markets/${encodeURIComponent(market)}/leverage-tiers`);
  }

  // ── Positions ────────────────────────────────────────────────────────────────

  async listPositions(wallet?: string): Promise<ToolResult> {
    const addr = wallet ?? this.cfg.walletName;
    const miss = addr ? null : this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(addr!)}/positions`);
  }

  async getPosition(market: string, wallet?: string): Promise<ToolResult> {
    const addr = wallet ?? this.cfg.walletName;
    const miss = addr ? null : this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(addr!)}/positions/${encodeURIComponent(market)}`);
  }

  // ── Orders ───────────────────────────────────────────────────────────────────

  async listOrders(wallet?: string, market?: string): Promise<ToolResult> {
    const addr = wallet ?? this.cfg.walletName;
    const miss = addr ? null : this.requireWallet();
    if (miss) return miss;
    const params = market ? { market } : undefined;
    return this.get(`/account/${encodeURIComponent(addr!)}/orders`, params);
  }

  async getOrder(orderId: string): Promise<ToolResult> {
    return this.get(`/orders/${encodeURIComponent(orderId)}`);
  }

  /**
   * Build an order transaction. The response contains a serialized transaction
   * that the caller must sign and submit via Solana RPC.
   */
  async buildOrder(params: OrderParams): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/orders/build", {
      trader: this.cfg.walletName,
      ...params,
    });
  }

  /**
   * Build a cancel-order transaction.
   */
  async buildCancelOrder(orderId: string, market: string): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/orders/cancel/build", {
      trader: this.cfg.walletName,
      orderId,
      market,
    });
  }

  /**
   * Build a close-position transaction (market order to flatten).
   */
  async buildClosePosition(market: string, size?: number): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/positions/close/build", {
      trader: this.cfg.walletName,
      market,
      ...(size !== undefined ? { size } : {}),
    });
  }

  /**
   * Build a reduce-position transaction (partial close).
   */
  async buildReducePosition(market: string, size: number): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/positions/reduce/build", {
      trader: this.cfg.walletName,
      market,
      size,
    });
  }

  /**
   * Set take-profit / stop-loss on a position.
   */
  async buildSetTpSl(params: TpSlParams): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/positions/tpsl/build", {
      trader: this.cfg.walletName,
      ...params,
    });
  }

  // ── Margin operations ────────────────────────────────────────────────────────

  async buildDeposit(amount: number, mint?: string): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/margin/deposit/build", {
      trader: this.cfg.walletName,
      amount,
      ...(mint ? { mint } : {}),
    });
  }

  async buildWithdraw(amount: number, mint?: string): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/margin/withdraw/build", {
      trader: this.cfg.walletName,
      amount,
      ...(mint ? { mint } : {}),
    });
  }

  async buildAddCollateral(market: string, amount: number): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.post("/margin/collateral/build", {
      trader: this.cfg.walletName,
      market,
      amount,
    });
  }

  // ── History ──────────────────────────────────────────────────────────────────

  async getTradeHistory(params: HistoryParams = {}): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(this.cfg.walletName!)}/history/trades`, params);
  }

  async getOrderHistory(params: HistoryParams = {}): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(this.cfg.walletName!)}/history/orders`, params);
  }

  async getFundingHistory(params: HistoryParams = {}): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(this.cfg.walletName!)}/history/funding`, params);
  }

  async getPnlHistory(params: HistoryParams = {}): Promise<ToolResult> {
    const miss = this.requireWallet();
    if (miss) return miss;
    return this.get(`/account/${encodeURIComponent(this.cfg.walletName!)}/history/pnl`, params);
  }

  // ── Health ───────────────────────────────────────────────────────────────────

  async health(): Promise<ToolResult> {
    return this.get("/health");
  }

  /** Return current config (no secrets). */
  getConfig(): ToolResult {
    return {
      success: true,
      data: {
        apiUrl: this.cfg.apiUrl,
        rpcUrl: this.cfg.rpcUrl,
        wallet: this.cfg.walletName ?? "(not set)",
        hasApiKey: !!this.cfg.apiKey,
      },
      output: JSON.stringify(
        {
          apiUrl: this.cfg.apiUrl,
          rpcUrl: this.cfg.rpcUrl,
          wallet: this.cfg.walletName ?? "(not set)",
          hasApiKey: !!this.cfg.apiKey,
        },
        null,
        2
      ),
    };
  }
}
