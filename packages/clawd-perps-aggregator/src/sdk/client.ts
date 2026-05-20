/**
 * PerpsAggregator — public SDK entrypoint.
 *
 * One class that wraps:
 *   - Smart order router (quotes + routes)
 *   - Cross-venue market data reads (marks, funding, books, meta)
 *   - Cross-protocol position aggregation
 *   - Order build + simulate + execute (paper-first)
 *   - Realtime market stream (lazy)
 *   - Liquidation/risk views
 *
 * The class is environment-driven by default (reads the same Imperial env
 * vars as the existing CLI) but every field can be overridden in code.
 */

import type { AggregatorConfig } from "../config.js";
import { loadAggregatorConfig, mergeConfig } from "../config.js";
import { ImperialTransport } from "../venues/transport.js";
import { buildVenueAdapters } from "../venues/registry.js";
import type { VenueAdapter } from "../venues/adapter.js";
import { SmartRouter } from "../aggregator/router.js";
import { createMarketStream, MarketStream } from "../realtime/marketStream.js";
import { fetchAggregatedPositions, computeLiquidationRisks } from "../realtime/positionAggregator.js";
import { scoreMarket, scoreSymbolAllVenues } from "../realtime/marketScore.js";
import { buildOrderTx, buildDepositTx, usdToFixed, fixedToUsd } from "./transactions.js";
import type {
  AggregatedPositions,
  ExecutionRecord,
  LiquidationRisk,
  MarketSnapshot,
  OrderRequest,
  ProfileBalance,
  QuoteRequest,
  RoutePlan,
  SimulateResult,
  VenueId,
  VenueQuote,
} from "../types.js";
import { VENUE_LABELS } from "../types.js";

export interface PerpsAggregatorOpts {
  config?: Partial<AggregatorConfig>;
  /** Inject custom adapters (e.g., for testing or direct on-chain). */
  adapters?: Partial<Record<VenueId, VenueAdapter>>;
}

let _execCounter = 0;
function makeExecId(): string {
  _execCounter += 1;
  return `agg-${Date.now()}-${_execCounter.toString(36)}`;
}

export class PerpsAggregator {
  readonly config: AggregatorConfig;
  readonly transport: ImperialTransport;
  readonly adapters: Record<VenueId, VenueAdapter>;
  readonly router: SmartRouter;

  private _stream: MarketStream | null = null;

  constructor(opts: PerpsAggregatorOpts = {}) {
    this.config = mergeConfig(loadAggregatorConfig(), opts.config);
    this.transport = new ImperialTransport({
      base: this.config.imperialBase,
      jwt: this.config.jwt,
    });
    const built = buildVenueAdapters(this.transport, this.config.enabledVenues);
    if (opts.adapters) {
      for (const [k, v] of Object.entries(opts.adapters)) {
        if (v) built[k as VenueId] = v;
      }
    }
    this.adapters = built;
    this.router = new SmartRouter({
      adapters: this.adapters,
      defaultSlippageBps: this.config.slippageBps,
      defaultHoldSeconds: this.config.defaultHoldSeconds,
    });
  }

  // ─── Market data ──────────────────────────────────────────────────────────

  listVenues(): { id: VenueId; label: string }[] {
    return (Object.keys(this.adapters) as VenueId[]).map((id) => ({ id, label: VENUE_LABELS[id] }));
  }

  async listMarkets(symbol?: string): Promise<MarketSnapshot[]> {
    const out: MarketSnapshot[] = [];
    const venues = Object.keys(this.adapters) as VenueId[];
    if (symbol) {
      const sym = symbol.toUpperCase();
      const settled = await Promise.allSettled(
        venues.map((v) => this.adapters[v].snapshot(sym)),
      );
      for (const s of settled) if (s.status === "fulfilled") out.push(s.value);
      return out;
    }
    // Without a symbol, return per-venue marks-only (cheap aggregation).
    const settled = await Promise.allSettled(venues.map((v) => this.adapters[v].fetchMarkPrices()));
    for (let i = 0; i < settled.length; i += 1) {
      const r = settled[i];
      if (r.status !== "fulfilled") continue;
      for (const m of r.value) {
        out.push({ symbol: m.symbol, venue: m.venue, markPrice: m.price, funding: null, book: null, meta: null });
      }
    }
    return out;
  }

  async marks(symbol?: string): Promise<MarketSnapshot[]> {
    return this.listMarkets(symbol);
  }

  async funding(symbol?: string): Promise<MarketSnapshot[]> {
    const out: MarketSnapshot[] = [];
    const venues = Object.keys(this.adapters) as VenueId[];
    const settled = await Promise.allSettled(
      venues.map((v) => this.adapters[v].fetchFunding(symbol ? [symbol.toUpperCase()] : undefined)),
    );
    for (let i = 0; i < settled.length; i += 1) {
      const r = settled[i];
      if (r.status !== "fulfilled") continue;
      for (const f of r.value) {
        out.push({ symbol: f.symbol, venue: f.venue, markPrice: null, funding: f, book: null, meta: null });
      }
    }
    return out;
  }

  // ─── Quotes / routing ─────────────────────────────────────────────────────

  async quote(req: QuoteRequest): Promise<VenueQuote[]> {
    return this.router.quoteAll(req);
  }

  async route(req: QuoteRequest): Promise<RoutePlan> {
    return this.router.route(req);
  }

  // ─── Positions / risk ─────────────────────────────────────────────────────

  async positions(wallet?: string): Promise<AggregatedPositions> {
    const w = wallet ?? this.config.wallet;
    if (!w) throw new Error("wallet required (pass arg or set IMPERIAL_WALLET)");
    return fetchAggregatedPositions(this.transport, w);
  }

  async liquidationRisks(wallet?: string): Promise<LiquidationRisk[]> {
    const agg = await this.positions(wallet);
    return computeLiquidationRisks(agg.positions);
  }

  async balances(): Promise<ProfileBalance[]> {
    if (!this.config.jwt) throw new Error("IMPERIAL_JWT required for balances");
    const raw = await this.transport.getBalances();
    return raw.profiles.map((p) => ({
      wallet: raw.wallet,
      profileIndex: p.profileIndex,
      usdc: fixedToUsd(p.usdc),
    }));
  }

  // ─── Execution ────────────────────────────────────────────────────────────

  /** Build a route + payload without submitting. Always safe to call. */
  async buildOrder(req: OrderRequest): Promise<{ payload: Record<string, unknown>; route: RoutePlan; venue: VenueId }> {
    this.validateOrder(req);
    const route = await this.route({
      symbol: req.symbol,
      side: req.side,
      action: req.action,
      sizeUsd: req.sizeUsd,
      slippageBps: req.slippageBps,
      venues: req.venue ? [req.venue] : undefined,
      holdSeconds: req.holdSeconds,
    });
    const venue = route.legs[0].venue;
    const adapter = this.adapters[venue];
    const built = await buildOrderTx({
      req,
      route,
      adapter,
      transport: this.transport,
      defaultSlippageBps: this.config.slippageBps,
    });
    return { payload: built.payload, route: built.route, venue };
  }

  /** Simulate an order: route + check fillability + size against caps. */
  async simulate(req: OrderRequest): Promise<SimulateResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      this.validateOrder(req);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    let route: RoutePlan;
    try {
      route = await this.route({
        symbol: req.symbol,
        side: req.side,
        action: req.action,
        sizeUsd: req.sizeUsd,
        slippageBps: req.slippageBps,
        venues: req.venue ? [req.venue] : undefined,
        holdSeconds: req.holdSeconds,
      });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      return {
        route: {
          symbol: req.symbol.toUpperCase(),
          side: req.side,
          action: req.action,
          totalSizeUsd: req.sizeUsd,
          legs: [],
          totalCostUsd: 0,
          effectivePrice: 0,
          candidates: [],
          rationale: "simulate failed before routing",
          score: 0,
          generatedAtUnixMs: Date.now(),
        },
        ok: false,
        warnings,
        errors,
        fills: [],
      };
    }

    const top = route.candidates[0];
    if (!top?.fillable) {
      errors.push(`top venue ${top?.venue} cannot fill: ${top?.reason ?? "unknown"}`);
    }
    if (req.sizeUsd > this.config.maxSizeUsd) {
      warnings.push(`size ${req.sizeUsd} exceeds max cap ${this.config.maxSizeUsd}`);
    }
    if (!this.config.allowedSymbols.includes(req.symbol.toUpperCase())) {
      warnings.push(`${req.symbol} not in allowlist`);
    }
    return {
      route,
      ok: errors.length === 0,
      warnings,
      errors,
      fills: route.legs,
    };
  }

  /**
   * Execute the order. Paper-first by default — submits a real on-chain order
   * only when `config.live === true` AND `config.paperMode === false`. Returns
   * an `ExecutionRecord` either way (audit trail).
   */
  async execute(req: OrderRequest): Promise<ExecutionRecord> {
    const sim = await this.simulate(req);
    const route = sim.route;
    const venue = route.legs[0]?.venue ?? "phoenix";
    const id = makeExecId();
    const baseRecord: ExecutionRecord = {
      id,
      ts: Date.now(),
      wallet: req.wallet,
      profileIndex: req.profileIndex ?? 0,
      venue,
      symbol: req.symbol.toUpperCase(),
      side: req.side,
      action: req.action,
      orderType: req.orderType ?? "market",
      sizeUsd: req.sizeUsd,
      paperMode: this.config.paperMode,
      liveMode: this.config.live,
      request: req,
      route,
      response: null,
      status: "preview",
    };

    if (!sim.ok) {
      return { ...baseRecord, status: "blocked", error: sim.errors.join("; "), response: sim };
    }

    if (this.config.paperMode || !this.config.live) {
      return { ...baseRecord, status: "paper", response: { paper: true, route } };
    }

    if (!this.config.jwt) {
      return { ...baseRecord, status: "blocked", error: "IMPERIAL_JWT required for live execution" };
    }

    const { payload } = await this.buildOrder(req);
    try {
      const resp = await this.transport.placeOrder(payload);
      return {
        ...baseRecord,
        status: resp.success ? "submitted" : "failed",
        response: resp,
        error: resp.error ?? undefined,
        txSignature: resp.signature ?? undefined,
        orderPda: resp.orderPda ?? undefined,
      };
    } catch (err) {
      return {
        ...baseRecord,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Build a deposit/withdraw transaction (build-only, caller signs). */
  async buildDeposit(amountUsd: number, mode: "deposit" | "withdraw" = "deposit"): Promise<string> {
    if (!this.config.wallet) throw new Error("IMPERIAL_WALLET required for deposit");
    return buildDepositTx(this.transport, this.config.wallet, this.config.profileIndex, amountUsd, mode);
  }

  // ─── Realtime ─────────────────────────────────────────────────────────────

  /** Lazily start (or return) the market stream. */
  stream(symbols?: string[]): MarketStream {
    if (this._stream) return this._stream;
    this._stream = createMarketStream(this.config.imperialBase, symbols);
    void this._stream.connect();
    return this._stream;
  }

  /** Stop the market stream if running. */
  stopStream(): void {
    this._stream?.disconnect();
    this._stream = null;
  }

  scoreMarket(symbol: string, venue: VenueId) {
    if (!this._stream) return null;
    return scoreMarket(this._stream, symbol, venue);
  }

  scoreAllVenues(symbol: string) {
    if (!this._stream) return [];
    return scoreSymbolAllVenues(this._stream, symbol);
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private validateOrder(req: OrderRequest): void {
    if (!req.wallet) throw new Error("order.wallet required");
    if (!req.symbol) throw new Error("order.symbol required");
    if (req.sizeUsd <= 0) throw new Error("order.sizeUsd must be > 0");
    if (req.sizeUsd > this.config.maxSizeUsd) {
      throw new Error(`order.sizeUsd ${req.sizeUsd} exceeds cap ${this.config.maxSizeUsd}`);
    }
    if (!this.config.allowedSymbols.includes(req.symbol.toUpperCase())) {
      throw new Error(`${req.symbol} not in allowlist (${this.config.allowedSymbols.join(",")})`);
    }
    if (req.venue && !this.adapters[req.venue]) {
      throw new Error(`venue ${req.venue} not enabled`);
    }
  }
}

export { usdToFixed, fixedToUsd };
