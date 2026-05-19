/**
 * Imperial Perps Agent
 *
 * OODA loop: observe Phoenix/Imperial market tape → orient with signal scoring →
 * decide (buy/sell/watch) → route to Imperial /mobile/orders (dry_run by default) →
 * return audit record.
 *
 * Environment:
 *   IMPERIAL_API_KEY        — required for authenticated Imperial routes
 *   IMPERIAL_WALLET         — operator wallet pubkey (never a private key)
 *   IMPERIAL_PROFILE_INDEX  — Imperial account profile (default 0)
 *   IMPERIAL_API_BASE       — override Imperial gateway (default https://api.imperialdex.io)
 *   IMPERIAL_LIVE           — set "true" to enable live submission (dry_run: false)
 *   IMPERIAL_MAX_SIZE_USD   — hard cap per order (default 100)
 *   IMPERIAL_ALLOWED_SYMS   — comma-separated allowlist (default SOL,ETH,BTC)
 */

// ─── Config ─────────────────────────────────────────────────────────────────

export interface ImperialConfig {
  apiKey: string;
  wallet: string;
  profileIndex: number;
  apiBase: string;
  live: boolean;
  maxSizeUsd: number;
  allowedSymbols: string[];
}

export function loadImperialConfig(env: NodeJS.ProcessEnv = process.env): ImperialConfig {
  return {
    apiKey: env.IMPERIAL_API_KEY ?? "",
    wallet: env.IMPERIAL_WALLET ?? "",
    profileIndex: Number(env.IMPERIAL_PROFILE_INDEX ?? 0),
    apiBase: env.IMPERIAL_API_BASE ?? "https://api.imperialdex.io",
    live: env.IMPERIAL_LIVE === "true",
    maxSizeUsd: Number(env.IMPERIAL_MAX_SIZE_USD ?? 100),
    allowedSymbols: (env.IMPERIAL_ALLOWED_SYMS ?? "SOL,ETH,BTC")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  };
}

// ─── Market data shapes ──────────────────────────────────────────────────────

export interface ImperialMarketView {
  symbol: string;
  markPrice: number | null;
  oraclePrice: number | null;
  midPrice: number | null;
  fundingRateCurrent: number | null;
  fundingRateAnnualized: number | null;
  openInterestUsd: number | null;
  basisPct: number | null;
  spreadBps: number | null;
  topBid: number | null;
  topAsk: number | null;
  candles: CandleBar[];
  imperialMarkOverlay: number | null;
  imperialFundingOverlay: number | null;
}

export interface CandleBar {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ImperialDepth {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
}

export interface ImperialAccountBalances {
  wallet: string;
  equity: number | null;
  availableMargin: number | null;
  usedMargin: number | null;
}

export interface ImperialPosition {
  symbol: string;
  side: "long" | "short";
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

// ─── Signal scoring ──────────────────────────────────────────────────────────

export type AgentDecision = "buy" | "sell" | "watch";

export interface AgentSignal {
  symbol: string;
  decision: AgentDecision;
  confidence: number; // 0–1
  scores: {
    momentum: number;
    funding: number;
    basis: number;
    liquidity: number;
  };
  rationale: string;
}

export function scoreMarket(market: ImperialMarketView): AgentSignal {
  const scores = {
    momentum: 0,
    funding: 0,
    basis: 0,
    liquidity: 0,
  };

  // Momentum: mark vs oracle drift
  if (market.markPrice !== null && market.oraclePrice !== null && market.oraclePrice > 0) {
    const drift = (market.markPrice - market.oraclePrice) / market.oraclePrice;
    // Positive drift → mark premium → fade with sell signal; negative → buy signal
    scores.momentum = Math.max(-1, Math.min(1, -drift * 50));
  }

  // Funding: elevated positive funding = crowded longs → fade bias
  if (market.fundingRateCurrent !== null) {
    const annRate = market.fundingRateAnnualized ?? market.fundingRateCurrent * 8760;
    // > 100% annualized: short bias; < -100%: long bias
    scores.funding = Math.max(-1, Math.min(1, -annRate / 200));
  }

  // Basis: mark stretched above oracle = expensive
  if (market.basisPct !== null) {
    scores.basis = Math.max(-1, Math.min(1, -market.basisPct * 20));
  }

  // Liquidity: tight spread = good entry, wide spread = avoid
  if (market.spreadBps !== null) {
    scores.liquidity = market.spreadBps < 10 ? 1 : market.spreadBps < 30 ? 0.5 : 0;
  }

  const composite =
    scores.momentum * 0.35 +
    scores.funding * 0.30 +
    scores.basis * 0.20 +
    scores.liquidity * 0.15;

  const confidence = Math.min(1, Math.abs(composite));
  const THRESHOLD = 0.25;

  let decision: AgentDecision = "watch";
  if (composite > THRESHOLD) {
    decision = "buy";
  } else if (composite < -THRESHOLD) {
    decision = "sell";
  }

  const rationale = buildRationale(market, scores, composite, decision);

  return { symbol: market.symbol, decision, confidence, scores, rationale };
}

function buildRationale(
  market: ImperialMarketView,
  scores: AgentSignal["scores"],
  composite: number,
  decision: AgentDecision,
): string {
  const parts: string[] = [];
  if (market.fundingRateAnnualized !== null) {
    parts.push(`funding ${(market.fundingRateAnnualized * 100).toFixed(1)}% ann`);
  }
  if (market.basisPct !== null) {
    parts.push(`basis ${(market.basisPct * 100).toFixed(2)}%`);
  }
  if (market.spreadBps !== null) {
    parts.push(`spread ${market.spreadBps.toFixed(1)}bps`);
  }
  parts.push(`composite ${composite.toFixed(3)}`);
  return `${decision.toUpperCase()} — ${parts.join(" | ")}`;
}

// ─── Order shapes ────────────────────────────────────────────────────────────

/** Imperial /mobile/orders payload */
export interface ImperialOrderPayload {
  symbol: string;
  /** 0 = long, 1 = short */
  side: 0 | 1;
  /** 0 = increase, 1 = decrease (reduce-only) */
  action: 0 | 1;
  profileIndex: number;
  sizeUsd: number;
  /** 0 = market */
  orderType: 0;
  /** 2 = Phoenix via Imperial */
  underwriter: 2;
  dry_run: boolean;
}

export type ImperialSide = 0 | 1;

function decisionToSide(decision: "buy" | "sell"): ImperialSide {
  return decision === "buy" ? 0 : 1;
}

export function buildOrderPayload(
  signal: AgentSignal,
  opts: {
    profileIndex: number;
    sizeUsd: number;
    dryRun: boolean;
    action?: 0 | 1;
  },
): ImperialOrderPayload {
  if (signal.decision === "watch") {
    throw new Error("Cannot build order payload for watch signal.");
  }
  return {
    symbol: signal.symbol,
    side: decisionToSide(signal.decision),
    action: opts.action ?? 0,
    profileIndex: opts.profileIndex,
    sizeUsd: opts.sizeUsd,
    orderType: 0,
    underwriter: 2,
    dry_run: opts.dryRun,
  };
}

// ─── Audit trail ─────────────────────────────────────────────────────────────

export type ExecutionStatus = "preview" | "submitted" | "failed" | "blocked";

export interface ExecutionRecord {
  id: string;
  ts: number;
  wallet: string;
  profileIndex: number;
  venue: "phoenix-imperial";
  underwriter: 2;
  symbol: string;
  side: "long" | "short";
  action: "increase" | "decrease";
  orderType: "market";
  sizeUsd: number;
  dryRun: boolean;
  request: ImperialOrderPayload;
  response: unknown;
  status: ExecutionStatus;
  error?: string;
  txSignature?: string;
}

function makeId(): string {
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function imperialFetch<T>(
  base: string,
  path: string,
  apiKey: string,
  opts: RequestInit = {},
): Promise<T> {
  const url = `${base.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Imperial ${path} → HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Agent class ─────────────────────────────────────────────────────────────

export class ImperialPerpsAgent {
  readonly config: ImperialConfig;

  constructor(config?: Partial<ImperialConfig>) {
    this.config = { ...loadImperialConfig(), ...config };
  }

  // ── Market data ──

  async fetchMarks(): Promise<Record<string, number>> {
    return imperialFetch<Record<string, number>>(
      this.config.apiBase,
      "/perps/marks",
      this.config.apiKey,
    );
  }

  async fetchFunding(): Promise<Record<string, { current: number; annualized: number }>> {
    return imperialFetch(this.config.apiBase, "/perps/funding", this.config.apiKey);
  }

  async fetchDepth(symbol: string): Promise<ImperialDepth> {
    return imperialFetch<ImperialDepth>(
      this.config.apiBase,
      `/perps/depth/${encodeURIComponent(symbol)}`,
      this.config.apiKey,
    );
  }

  // ── Account ──

  async fetchBalances(): Promise<ImperialAccountBalances> {
    return imperialFetch<ImperialAccountBalances>(
      this.config.apiBase,
      "/perps/account/balances",
      this.config.apiKey,
    );
  }

  async fetchPositions(): Promise<ImperialPosition[]> {
    return imperialFetch<ImperialPosition[]>(
      this.config.apiBase,
      "/perps/account/positions",
      this.config.apiKey,
    );
  }

  async fetchOrders(): Promise<unknown[]> {
    return imperialFetch<unknown[]>(
      this.config.apiBase,
      "/perps/account/orders",
      this.config.apiKey,
    );
  }

  // ── Market overview (Phoenix + Imperial overlay) ──

  async fetchMarketOverview(symbols?: string[]): Promise<ImperialMarketView[]> {
    const targets = (symbols ?? this.config.allowedSymbols).map((s) => s.toUpperCase());

    const [marks, funding] = await Promise.all([
      this.fetchMarks().catch(() => ({}) as Record<string, number>),
      this.fetchFunding().catch(
        () => ({}) as Record<string, { current: number; annualized: number }>,
      ),
    ]);

    return targets.map((symbol) => {
      const markPrice = marks[symbol] ?? null;
      const fundingInfo = funding[symbol] ?? null;
      return {
        symbol,
        markPrice,
        oraclePrice: null, // enriched by Phoenix if available
        midPrice: markPrice,
        fundingRateCurrent: fundingInfo?.current ?? null,
        fundingRateAnnualized: fundingInfo?.annualized ?? null,
        openInterestUsd: null,
        basisPct: null,
        spreadBps: null,
        topBid: null,
        topAsk: null,
        candles: [],
        imperialMarkOverlay: markPrice,
        imperialFundingOverlay: fundingInfo?.current ?? null,
      };
    });
  }

  /** Enrich a market view with live depth data */
  async enrichWithDepth(view: ImperialMarketView): Promise<ImperialMarketView> {
    try {
      const depth = await this.fetchDepth(view.symbol);
      const topBid = depth.bids[0]?.[0] ?? null;
      const topAsk = depth.asks[0]?.[0] ?? null;
      const spreadBps =
        topBid !== null && topAsk !== null && topBid > 0
          ? ((topAsk - topBid) / topBid) * 10000
          : null;
      const midPrice = topBid !== null && topAsk !== null ? (topBid + topAsk) / 2 : view.midPrice;
      return { ...view, topBid, topAsk, spreadBps, midPrice };
    } catch {
      return view;
    }
  }

  // ── Signal scoring ──

  scoreMarket(market: ImperialMarketView): AgentSignal {
    return scoreMarket(market);
  }

  // ── Order routing ──

  /** Build and validate an order payload, enforcing hard limits */
  prepareOrder(
    signal: AgentSignal,
    opts: { sizeUsd?: number; dryRun?: boolean; action?: 0 | 1 } = {},
  ): ImperialOrderPayload {
    if (signal.decision === "watch") {
      throw new Error(`Signal is 'watch' — no order to prepare for ${signal.symbol}.`);
    }
    const sym = signal.symbol.toUpperCase();
    if (!this.config.allowedSymbols.includes(sym)) {
      throw new Error(`${sym} is not in IMPERIAL_ALLOWED_SYMS.`);
    }
    const sizeUsd = Math.min(opts.sizeUsd ?? this.config.maxSizeUsd, this.config.maxSizeUsd);
    if (sizeUsd <= 0) {
      throw new Error("Order size must be positive.");
    }
    const dryRun = opts.dryRun ?? !this.config.live;
    return buildOrderPayload(signal, {
      profileIndex: this.config.profileIndex,
      sizeUsd,
      dryRun,
      action: opts.action,
    });
  }

  /** POST to /perps/order/imperial — dry_run:true returns preview without submitting */
  async routeOrder(payload: ImperialOrderPayload): Promise<unknown> {
    return imperialFetch(this.config.apiBase, "/perps/order/imperial", this.config.apiKey, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /** GET the canonical route for a symbol+side without submitting */
  async fetchRoute(symbol: string, side: ImperialSide): Promise<unknown> {
    const params = new URLSearchParams({ symbol, side: String(side) });
    return imperialFetch(
      this.config.apiBase,
      `/perps/route?${params}`,
      this.config.apiKey,
    );
  }

  // ── Full OODA cycle ──

  /**
   * Observe → Orient → Decide → Act for one symbol.
   *
   * Always dry_run unless IMPERIAL_LIVE=true is set.
   * Returns a full ExecutionRecord for the audit trail.
   */
  async runCycle(
    symbol: string,
    opts: { sizeUsd?: number; forceDecision?: AgentDecision } = {},
  ): Promise<{ signal: AgentSignal; record: ExecutionRecord | null }> {
    const sym = symbol.toUpperCase();

    // Observe
    const views = await this.fetchMarketOverview([sym]);
    const rawView = views[0];
    if (!rawView) {
      throw new Error(`No market data returned for ${sym}.`);
    }
    const view = await this.enrichWithDepth(rawView);

    // Orient
    const signal = opts.forceDecision
      ? { ...this.scoreMarket(view), decision: opts.forceDecision }
      : this.scoreMarket(view);

    // Decide
    if (signal.decision === "watch") {
      return { signal, record: null };
    }

    // Act
    const payload = this.prepareOrder(signal, {
      sizeUsd: opts.sizeUsd,
      dryRun: !this.config.live,
    });

    let response: unknown;
    let status: ExecutionStatus;
    let error: string | undefined;
    let txSignature: string | undefined;

    try {
      if (!this.config.apiKey) {
        throw new Error("IMPERIAL_API_KEY is not configured — cannot route order.");
      }
      response = await this.routeOrder(payload);
      status = payload.dry_run ? "preview" : "submitted";
      // Extract tx signature if present
      const resp = response as Record<string, unknown>;
      txSignature =
        typeof resp?.txSignature === "string"
          ? resp.txSignature
          : typeof resp?.signature === "string"
            ? resp.signature
            : undefined;
    } catch (err) {
      response = null;
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
    }

    const record: ExecutionRecord = {
      id: makeId(),
      ts: Date.now(),
      wallet: this.config.wallet,
      profileIndex: this.config.profileIndex,
      venue: "phoenix-imperial",
      underwriter: 2,
      symbol: sym,
      side: payload.side === 0 ? "long" : "short",
      action: payload.action === 0 ? "increase" : "decrease",
      orderType: "market",
      sizeUsd: payload.sizeUsd,
      dryRun: payload.dry_run,
      request: payload,
      response,
      status,
      error,
      txSignature,
    };

    return { signal, record };
  }

  /**
   * Scan all allowed symbols, score each, return ranked signals and any
   * execution records for actionable markets.
   */
  async runScan(opts: { sizeUsd?: number; autoRoute?: boolean } = {}): Promise<{
    signals: AgentSignal[];
    records: ExecutionRecord[];
  }> {
    const views = await Promise.all(
      this.config.allowedSymbols.map((sym) =>
        this.fetchMarketOverview([sym])
          .then((v) => v[0])
          .then((v) => (v ? this.enrichWithDepth(v) : null)),
      ),
    );

    const signals: AgentSignal[] = [];
    const records: ExecutionRecord[] = [];

    for (const view of views) {
      if (!view) continue;
      const signal = this.scoreMarket(view);
      signals.push(signal);

      if (opts.autoRoute && signal.decision !== "watch") {
        try {
          const { record } = await this.runCycle(view.symbol, { sizeUsd: opts.sizeUsd });
          if (record) records.push(record);
        } catch {
          // individual market failures don't abort the scan
        }
      }
    }

    // Rank by confidence descending
    signals.sort((a, b) => b.confidence - a.confidence);
    return { signals, records };
  }

  /** Quick health summary: config validity + account state */
  async healthCheck(): Promise<{
    configured: boolean;
    live: boolean;
    wallet: string;
    profileIndex: number;
    allowedSymbols: string[];
    maxSizeUsd: number;
    balances: ImperialAccountBalances | null;
    openPositions: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    if (!this.config.apiKey) warnings.push("IMPERIAL_API_KEY not set — all routes will fail.");
    if (!this.config.wallet) warnings.push("IMPERIAL_WALLET not set — no wallet context.");
    if (this.config.live) warnings.push("LIVE MODE ENABLED — orders will submit to chain.");

    let balances: ImperialAccountBalances | null = null;
    let openPositions = 0;
    if (this.config.apiKey) {
      try {
        balances = await this.fetchBalances();
      } catch {
        warnings.push("Could not fetch account balances.");
      }
      try {
        const positions = await this.fetchPositions();
        openPositions = positions.length;
      } catch {
        warnings.push("Could not fetch positions.");
      }
    }

    return {
      configured: Boolean(this.config.apiKey && this.config.wallet),
      live: this.config.live,
      wallet: this.config.wallet,
      profileIndex: this.config.profileIndex,
      allowedSymbols: this.config.allowedSymbols,
      maxSizeUsd: this.config.maxSizeUsd,
      balances,
      openPositions,
      warnings,
    };
  }
}

/** Convenience factory */
export function createImperialAgent(config?: Partial<ImperialConfig>): ImperialPerpsAgent {
  return new ImperialPerpsAgent(config);
}
