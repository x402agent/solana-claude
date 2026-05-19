/**
 * Imperial Perps Agent — real Imperial Trading API client
 *
 * Base: https://api.imperial.space/api/v1
 * Auth: JWT obtained via connect → exchange flow (or pre-set IMPERIAL_JWT env var)
 *
 * Environment:
 *   IMPERIAL_JWT             — pre-issued JWT (skip auth flow)
 *   IMPERIAL_WALLET          — operator wallet pubkey (base58, never private key)
 *   IMPERIAL_PROFILE_INDEX   — subaccount index 0..5 (default 0)
 *   IMPERIAL_LIVE            — "true" to enable live submission
 *   IMPERIAL_MAX_SIZE_USD    — hard cap per order in USD (default 100)
 *   IMPERIAL_ALLOWED_SYMS    — comma-separated allowlist (default SOL,ETH,BTC)
 *   IMPERIAL_SLIPPAGE_BPS    — default slippage (default 50)
 */

export const IMPERIAL_BASE = "https://api.imperial.space/api/v1";

// ─── Underwriter / venue codes ────────────────────────────────────────────────

export type Underwriter = 0 | 1 | 2 | 3;
export const Underwriter = {
  Jupiter: 0 as Underwriter,
  Flash: 1 as Underwriter,
  Phoenix: 2 as Underwriter,
  GMTrade: 3 as Underwriter,
} as const;

export const UNDERWRITER_LABELS: Record<Underwriter, string> = {
  0: "Jupiter",
  1: "Flash Trade",
  2: "Phoenix",
  3: "GMTrade",
};

// ─── Order type codes ─────────────────────────────────────────────────────────

export type OrderType =
  | 0  // Market
  | 1  // Limit
  | 2  // StopLimit
  | 3  // LandMine
  | 4  // Ratchet
  | 6  // RatchetEntry
  | 9  // DCA
  | 10 // FibRatchet
  | 11 // FibRatchetEntry
  | 12 // DcaClose
  | 13 // DcaTimeClose
  | 14 // DcaRatchetClose
  | 15 // DcaTime
  | 16;// DcaRatchet

export const ORDER_TYPE_NAMES: Record<number, string> = {
  0: "Market", 1: "Limit", 2: "StopLimit", 3: "LandMine",
  4: "Ratchet", 6: "RatchetEntry", 9: "DCA", 10: "FibRatchet",
  11: "FibRatchetEntry", 12: "DcaClose", 13: "DcaTimeClose",
  14: "DcaRatchetClose", 15: "DcaTime", 16: "DcaRatchet",
};

// ─── Config ───────────────────────────────────────────────────────────────────

export interface ImperialConfig {
  jwt: string;
  wallet: string;
  profileIndex: number;
  live: boolean;
  maxSizeUsd: number;
  allowedSymbols: string[];
  slippageBps: number;
  base: string;
}

export function loadImperialConfig(env: NodeJS.ProcessEnv = process.env): ImperialConfig {
  return {
    jwt: env.IMPERIAL_JWT ?? "",
    wallet: env.IMPERIAL_WALLET ?? "",
    profileIndex: Number(env.IMPERIAL_PROFILE_INDEX ?? 0),
    live: env.IMPERIAL_LIVE === "true",
    maxSizeUsd: Number(env.IMPERIAL_MAX_SIZE_USD ?? 100),
    allowedSymbols: (env.IMPERIAL_ALLOWED_SYMS ?? "SOL,ETH,BTC")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    slippageBps: Number(env.IMPERIAL_SLIPPAGE_BPS ?? 50),
    base: env.IMPERIAL_API_BASE ?? IMPERIAL_BASE,
  };
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/** sizeUsd in human dollars → 6-decimal fixed point (1_000_000 = $1) */
export function usdToFixed(usd: number): number {
  return Math.round(usd * 1_000_000);
}

/** 6-decimal fixed point → human dollars */
export function fixedToUsd(fixed: number): number {
  return fixed / 1_000_000;
}

async function imperialGet<T>(base: string, path: string, jwt?: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function imperialPost<T>(
  base: string,
  path: string,
  body: unknown,
  jwt?: string,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface ConnectResponse {
  code: string;
}

export interface ExchangeResponse {
  jwt: string;
  expires_at: string;
}

// ─── Order request shapes ─────────────────────────────────────────────────────

export interface ExtraData {
  // Ratchet / FibRatchet
  worstPrice?: number;
  ratchetSize?: number;
  // LandMine
  waitPrice?: number;
  waitDuration?: number;
  // DCA
  dcaStartPrice?: number;
  dcaEndPrice?: number;
  dcaNumLegs?: number;
  // DcaClose
  dcaCloseStartPrice?: number;
  dcaCloseEndPrice?: number;
  dcaCloseNumLegs?: number;
  // DcaTimeClose
  dcaCloseIntervalSeconds?: number;
  // DcaRatchetClose
  dcaCloseRatchetSize?: number;
  // DcaTime
  dcaIntervalSeconds?: number;
  // DcaRatchet
  dcaRatchetSize?: number;
}

export interface MobileCreateOrderRequest {
  wallet: string;
  profileIndex: number;
  action: 0 | 1; // 0=Increase, 1=Decrease
  side: 0 | 1;   // 0=long, 1=short
  underwriter: Underwriter;
  orderType: OrderType;
  sizeUsd: number;           // 6-decimal fixed point
  collateralAmount: number;  // collateral mint native units
  slippageBps: number;
  fundingStatus: 0 | 1;     // 0=funded, 1=pending
  priority: number;
  triggerPrice: number;      // oracle scale 1e9
  triggerCondition: 0 | 1;  // 0=Above, 1=Below
  symbol?: string | null;
  marketMint?: string | null;
  marketPrice?: number;
  parentOrderPda?: string | null;
  phoenixNative?: unknown | null;
  extraData?: ExtraData | null;
}

export interface MobileOrderResponse {
  success: boolean;
  error: string | null;
  orderPda: string | null;
  signature: string | null;
}

export interface MobileBatchRequest {
  entry: MobileCreateOrderRequest;
  closeOrders?: MobileCreateOrderRequest[];
}

export interface MobileBatchResponse {
  entry: MobileOrderResponse;
  closeOrders: MobileOrderResponse[];
}

export interface MobileCancelRequest {
  wallet: string;
  profileIndex: number;
  orderPda: string;
}

export interface MobileCollateralRequest {
  wallet: string;
  profileIndex: number;
  action: 0 | 1;  // 0=add, 1=remove
  marketMint: string;
  side: 0 | 1;
  underwriter: Underwriter;
  collateralAmount: number;
  price: number;
  slippageBps: number;
}

export interface MobileUpdateRequest {
  wallet: string;
  profileIndex: number;
  orderPda: string;
  sizeUsd?: number;
  triggerPrice?: number;
  slippageBps?: number;
  closeBps?: number;
  priority?: number;
  proOrderUpdate?: {
    type: string;
    worstPrice?: number;
    ratchetSize?: number;
    waitPrice?: number;
    waitDurationSeconds?: number;
  } | null;
}

export interface DepositBuildTxRequest {
  wallet: string;
  profileIndex: number;
  amount: number; // USDC native units (6-decimal)
  mode: "deposit" | "withdraw";
}

// ─── Read response shapes ─────────────────────────────────────────────────────

export interface ProfileBalance {
  profileIndex: number;
  profilePda: string;
  usdc: number;
}

export interface BalancesResponse {
  wallet: string;
  profiles: ProfileBalance[];
}

export interface FundingRateEntry {
  symbol: string;
  venue: string;
  source: string;
  longFundingRatePerHourPercent: number | null;
  shortFundingRatePerHourPercent: number | null;
  longBorrowRatePerHourPercent: number | null;
  shortBorrowRatePerHourPercent: number | null;
}

export interface MarkPriceEntry {
  symbol: string;
  venue: string;
  source: string;
  price: number;
  fetchedAtUnixMs: number;
}

export interface RouteRecommendation {
  underwriter: Underwriter;
  venue: string;
  estimatedFee: number;
  reason: string;
}

export interface PhoenixDepthSnapshot {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
}

// ─── Signal scoring ───────────────────────────────────────────────────────────

export type AgentDecision = "buy" | "sell" | "watch";

export interface ImperialMarketSnapshot {
  symbol: string;
  markPrice: number | null;
  fundingRates: FundingRateEntry[];
  depth: PhoenixDepthSnapshot | null;
}

export interface AgentSignal {
  symbol: string;
  decision: AgentDecision;
  confidence: number;
  scores: {
    momentum: number;
    funding: number;
    liquidity: number;
  };
  rationale: string;
  snapshot: ImperialMarketSnapshot;
}

export function scoreImperialMarket(snap: ImperialMarketSnapshot): AgentSignal {
  const scores = { momentum: 0, funding: 0, liquidity: 0 };

  // Funding: find Phoenix funding, average long rate
  const phoenixFunding = snap.fundingRates.filter((r) => r.venue === "phoenix");
  if (phoenixFunding.length > 0) {
    const avgLong =
      phoenixFunding.reduce((acc, r) => acc + (r.longFundingRatePerHourPercent ?? 0), 0) /
      phoenixFunding.length;
    // > 0 longs pay shorts → crowded long → sell bias
    scores.funding = Math.max(-1, Math.min(1, -avgLong * 20));
  }

  // Liquidity: Phoenix depth spread
  if (snap.depth?.bids.length && snap.depth.asks.length) {
    const bid = snap.depth.bids[0]?.[0] ?? 0;
    const ask = snap.depth.asks[0]?.[0] ?? 0;
    if (bid > 0) {
      const spreadBps = ((ask - bid) / bid) * 10000;
      scores.liquidity = spreadBps < 10 ? 1 : spreadBps < 30 ? 0.5 : 0;
    }
  }

  // Momentum: mark vs mid
  if (snap.markPrice !== null && snap.depth?.bids.length && snap.depth.asks.length) {
    const bid = snap.depth.bids[0]?.[0] ?? 0;
    const ask = snap.depth.asks[0]?.[0] ?? 0;
    if (bid > 0 && ask > 0) {
      const mid = (bid + ask) / 2;
      const drift = (snap.markPrice - mid) / mid;
      scores.momentum = Math.max(-1, Math.min(1, -drift * 50));
    }
  }

  const composite =
    scores.momentum * 0.40 +
    scores.funding * 0.40 +
    scores.liquidity * 0.20;

  const confidence = Math.min(1, Math.abs(composite));
  const THRESHOLD = 0.25;
  const decision: AgentDecision =
    composite > THRESHOLD ? "buy" : composite < -THRESHOLD ? "sell" : "watch";

  const phoenixRate = phoenixFunding[0];
  const parts: string[] = [];
  if (phoenixRate?.longFundingRatePerHourPercent !== null && phoenixRate !== undefined) {
    const ann = (phoenixRate.longFundingRatePerHourPercent ?? 0) * 8760;
    parts.push(`funding ${ann.toFixed(1)}% ann`);
  }
  if (scores.liquidity > 0) {
    parts.push(`liquidity ${scores.liquidity.toFixed(2)}`);
  }
  parts.push(`composite ${composite.toFixed(3)}`);

  return {
    symbol: snap.symbol,
    decision,
    confidence,
    scores,
    rationale: `${decision.toUpperCase()} — ${parts.join(" | ")}`,
    snapshot: snap,
  };
}

// ─── Audit trail ──────────────────────────────────────────────────────────────

export type ExecutionStatus = "preview" | "submitted" | "failed" | "blocked";

export interface ExecutionRecord {
  id: string;
  ts: number;
  wallet: string;
  profileIndex: number;
  venue: string;
  underwriter: Underwriter;
  symbol: string;
  side: "long" | "short";
  action: "increase" | "decrease";
  orderType: string;
  sizeUsd: number;
  dryRun: boolean;
  request: unknown;
  response: unknown;
  status: ExecutionStatus;
  error?: string;
  txSignature?: string;
  orderPda?: string;
}

function makeId(): string {
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Main client class ────────────────────────────────────────────────────────

export class ImperialClient {
  config: ImperialConfig;

  constructor(config?: Partial<ImperialConfig>) {
    this.config = { ...loadImperialConfig(), ...config };
  }

  get jwt(): string {
    return this.config.jwt;
  }

  get wallet(): string {
    return this.config.wallet;
  }

  // ── Auth ──

  /**
   * Exchange a pre-signed connect code for a JWT.
   * The caller must sign imperial:mobile-connect:{wallet}:{nonce} externally.
   */
  async exchangeCode(code: string): Promise<ExchangeResponse> {
    const data = await imperialPost<ExchangeResponse>(
      this.config.base,
      "/mobile/exchange",
      { code },
    );
    this.config.jwt = data.jwt;
    return data;
  }

  /** Revoke the current JWT (call on bot shutdown). */
  async revokeJwt(): Promise<void> {
    if (!this.config.jwt) return;
    await imperialPost(this.config.base, "/mobile/revoke", { jwt: this.config.jwt });
    this.config.jwt = "";
  }

  // ── Public reads (no auth) ──

  async getStatus(): Promise<unknown> {
    return imperialGet(this.config.base, "/status");
  }

  async getFundingRates(): Promise<FundingRateEntry[]> {
    return imperialGet<FundingRateEntry[]>(this.config.base, "/funding-rates");
  }

  async getMarkPrices(): Promise<MarkPriceEntry[]> {
    return imperialGet<MarkPriceEntry[]>(this.config.base, "/mark-prices");
  }

  async getPhoenixMarkPrices(): Promise<MarkPriceEntry[]> {
    return imperialGet<MarkPriceEntry[]>(this.config.base, "/phoenix/mark-prices");
  }

  async getPhoenixDepth(symbol?: string): Promise<PhoenixDepthSnapshot | PhoenixDepthSnapshot[]> {
    const path = symbol
      ? `/phoenix/depth?symbol=${encodeURIComponent(symbol)}`
      : "/phoenix/depth";
    return imperialGet(this.config.base, path);
  }

  async getPhoenixMarkets(): Promise<unknown> {
    return imperialGet(this.config.base, "/phoenix/markets");
  }

  async getFlashMarkets(): Promise<unknown> {
    return imperialGet(this.config.base, "/flash/markets");
  }

  async getGMTradeMarkets(): Promise<unknown> {
    return imperialGet(this.config.base, "/gmtrade/markets");
  }

  async getGMTradeFundingRates(): Promise<unknown> {
    return imperialGet(this.config.base, "/gmtrade/funding-rates");
  }

  async getPositions(wallet?: string): Promise<unknown> {
    const path = wallet ? `/positions?wallet=${wallet}` : `/positions?wallet=${this.config.wallet}`;
    return imperialGet(this.config.base, path);
  }

  async getOrders(wallet?: string): Promise<unknown> {
    const path = wallet ? `/orders?wallet=${wallet}` : `/orders?wallet=${this.config.wallet}`;
    return imperialGet(this.config.base, path);
  }

  async getPassthroughOrders(wallet?: string): Promise<unknown> {
    const w = wallet ?? this.config.wallet;
    return imperialGet(this.config.base, `/passthrough/users/${w}/orders`);
  }

  async getRoute(asset: string, side: 0 | 1, notional: number): Promise<RouteRecommendation> {
    const params = new URLSearchParams({
      asset,
      side: String(side),
      notional: String(notional),
    });
    return imperialGet<RouteRecommendation>(this.config.base, `/route?${params}`);
  }

  async getPriorityFee(): Promise<unknown> {
    return imperialGet(this.config.base, "/priority-fee");
  }

  async getTrades(wallet?: string): Promise<unknown> {
    const path = wallet ? `/trades?wallet=${wallet}` : `/trades?wallet=${this.config.wallet}`;
    return imperialGet(this.config.base, path);
  }

  // ── Auth reads ──

  async getBalances(): Promise<BalancesResponse> {
    this.requireJwt();
    return imperialGet<BalancesResponse>(this.config.base, "/mobile/balances", this.config.jwt);
  }

  // ── Trading ──

  private requireJwt(): void {
    if (!this.config.jwt) {
      throw new Error(
        "No Imperial JWT. Set IMPERIAL_JWT env var or complete connect/exchange flow.",
      );
    }
  }

  private requireLive(context: string): void {
    if (!this.config.live) {
      throw new Error(
        `${context}: live mode not enabled. Set IMPERIAL_LIVE=true to submit real orders.`,
      );
    }
  }

  /** Build a baseline order request with all required fields. */
  buildOrderRequest(opts: {
    symbol: string;
    side: 0 | 1;
    action: 0 | 1;
    sizeUsd: number;
    underwriter?: Underwriter;
    orderType?: OrderType;
    collateralAmount?: number;
    slippageBps?: number;
    triggerPrice?: number;
    triggerCondition?: 0 | 1;
    fundingStatus?: 0 | 1;
    priority?: number;
    extraData?: ExtraData | null;
    parentOrderPda?: string | null;
  }): MobileCreateOrderRequest {
    const sym = opts.symbol.toUpperCase();
    if (!this.config.allowedSymbols.includes(sym)) {
      throw new Error(`${sym} is not in IMPERIAL_ALLOWED_SYMS.`);
    }
    const sizeFixed = usdToFixed(Math.min(opts.sizeUsd, this.config.maxSizeUsd));
    if (sizeFixed <= 0) throw new Error("Order size must be positive.");

    return {
      wallet: this.config.wallet,
      profileIndex: this.config.profileIndex,
      action: opts.action,
      side: opts.side,
      underwriter: opts.underwriter ?? Underwriter.Phoenix,
      orderType: opts.orderType ?? 0,
      sizeUsd: sizeFixed,
      collateralAmount: opts.collateralAmount ?? sizeFixed,
      slippageBps: opts.slippageBps ?? this.config.slippageBps,
      fundingStatus: opts.fundingStatus ?? 0,
      priority: opts.priority ?? 0,
      triggerPrice: opts.triggerPrice ?? 0,
      triggerCondition: opts.triggerCondition ?? 0,
      symbol: sym,
      extraData: opts.extraData ?? null,
      parentOrderPda: opts.parentOrderPda ?? null,
    };
  }

  /** Submit a single order. Dry-run when IMPERIAL_LIVE is not set. */
  async placeOrder(
    req: MobileCreateOrderRequest,
    dryRun = !this.config.live,
  ): Promise<{ response: MobileOrderResponse; record: ExecutionRecord }> {
    this.requireJwt();
    if (!dryRun) this.requireLive("placeOrder");

    const record: ExecutionRecord = {
      id: makeId(),
      ts: Date.now(),
      wallet: this.config.wallet,
      profileIndex: this.config.profileIndex,
      venue: UNDERWRITER_LABELS[req.underwriter],
      underwriter: req.underwriter,
      symbol: req.symbol ?? "?",
      side: req.side === 0 ? "long" : "short",
      action: req.action === 0 ? "increase" : "decrease",
      orderType: ORDER_TYPE_NAMES[req.orderType] ?? String(req.orderType),
      sizeUsd: fixedToUsd(req.sizeUsd),
      dryRun,
      request: req,
      response: null,
      status: dryRun ? "preview" : "submitted",
    };

    if (dryRun) {
      record.response = { dry_run: true, payload: req };
      return { response: { success: true, error: null, orderPda: null, signature: null }, record };
    }

    try {
      const response = await imperialPost<MobileOrderResponse>(
        this.config.base,
        "/mobile/orders",
        req,
        this.config.jwt,
      );
      record.response = response;
      record.status = response.success ? "submitted" : "failed";
      record.error = response.error ?? undefined;
      record.txSignature = response.signature ?? undefined;
      record.orderPda = response.orderPda ?? undefined;
      return { response, record };
    } catch (err) {
      record.status = "failed";
      record.error = err instanceof Error ? err.message : String(err);
      record.response = null;
      return {
        response: { success: false, error: record.error, orderPda: null, signature: null },
        record,
      };
    }
  }

  /** Submit entry + TP/SL legs in one atomic batch request. */
  async placeBatch(
    req: MobileBatchRequest,
    dryRun = !this.config.live,
  ): Promise<{ response: MobileBatchResponse; records: ExecutionRecord[] }> {
    this.requireJwt();
    if (!dryRun) this.requireLive("placeBatch");

    if (dryRun) {
      const mock: MobileBatchResponse = {
        entry: { success: true, error: null, orderPda: null, signature: null },
        closeOrders: (req.closeOrders ?? []).map(() => ({
          success: true,
          error: null,
          orderPda: null,
          signature: null,
        })),
      };
      return { response: mock, records: [] };
    }

    const response = await imperialPost<MobileBatchResponse>(
      this.config.base,
      "/mobile/orders/batch",
      req,
      this.config.jwt,
    );

    const records: ExecutionRecord[] = [];
    const entryRecord: ExecutionRecord = {
      id: makeId(),
      ts: Date.now(),
      wallet: this.config.wallet,
      profileIndex: this.config.profileIndex,
      venue: UNDERWRITER_LABELS[req.entry.underwriter],
      underwriter: req.entry.underwriter,
      symbol: req.entry.symbol ?? "?",
      side: req.entry.side === 0 ? "long" : "short",
      action: "increase",
      orderType: ORDER_TYPE_NAMES[req.entry.orderType] ?? String(req.entry.orderType),
      sizeUsd: fixedToUsd(req.entry.sizeUsd),
      dryRun: false,
      request: req.entry,
      response: response.entry,
      status: response.entry.success ? "submitted" : "failed",
      error: response.entry.error ?? undefined,
      txSignature: response.entry.signature ?? undefined,
      orderPda: response.entry.orderPda ?? undefined,
    };
    records.push(entryRecord);

    return { response, records };
  }

  async cancelOrder(req: MobileCancelRequest): Promise<MobileOrderResponse> {
    this.requireJwt();
    return imperialPost<MobileOrderResponse>(
      this.config.base,
      "/mobile/orders/cancel",
      req,
      this.config.jwt,
    );
  }

  async updateOrder(req: MobileUpdateRequest): Promise<MobileOrderResponse> {
    this.requireJwt();
    return imperialPost<MobileOrderResponse>(
      this.config.base,
      "/mobile/orders/update",
      req,
      this.config.jwt,
    );
  }

  async editCollateral(req: MobileCollateralRequest): Promise<MobileOrderResponse> {
    this.requireJwt();
    return imperialPost<MobileOrderResponse>(
      this.config.base,
      "/mobile/orders/collateral",
      req,
      this.config.jwt,
    );
  }

  async buildDepositTx(req: DepositBuildTxRequest): Promise<{ transaction: string }> {
    return imperialPost<{ transaction: string }>(
      this.config.base,
      "/deposit/build-tx",
      req,
    );
  }

  async syncProfile(wallet?: string, index?: number): Promise<unknown> {
    const w = wallet ?? this.config.wallet;
    const i = index ?? this.config.profileIndex;
    return imperialPost(this.config.base, `/passthrough/users/${w}/profiles/${i}/sync`, {});
  }

  async registerPhoenix(wallet?: string, profileIndex?: number): Promise<unknown> {
    return imperialPost(this.config.base, "/phoenix/register", {
      wallet: wallet ?? this.config.wallet,
      profileIndex: profileIndex ?? this.config.profileIndex,
    });
  }

  // ── Market snapshot + OODA ──

  /** Fetch a full market snapshot for signal scoring. */
  async fetchSnapshot(symbol: string): Promise<ImperialMarketSnapshot> {
    const sym = symbol.toUpperCase();
    const [fundingRates, marks, depth] = await Promise.allSettled([
      this.getFundingRates(),
      this.getMarkPrices(),
      this.getPhoenixDepth(sym).catch(() => null),
    ]);

    const allFunding =
      fundingRates.status === "fulfilled" ? fundingRates.value : [];
    const allMarks =
      marks.status === "fulfilled" ? marks.value : [];
    const rawDepth = depth.status === "fulfilled" ? depth.value : null;

    const markEntry = allMarks.find(
      (m) => m.symbol.toUpperCase() === sym && m.venue === "phoenix",
    ) ?? allMarks.find((m) => m.symbol.toUpperCase() === sym);

    const depthSnap = Array.isArray(rawDepth)
      ? (rawDepth as PhoenixDepthSnapshot[]).find((d) => d.symbol.toUpperCase() === sym) ?? null
      : (rawDepth as PhoenixDepthSnapshot | null);

    return {
      symbol: sym,
      markPrice: markEntry?.price ?? null,
      fundingRates: allFunding.filter((r) => r.symbol.toUpperCase() === sym),
      depth: depthSnap,
    };
  }

  /** Full OODA cycle: observe → score → decide → optionally route. */
  async runCycle(
    symbol: string,
    opts: { sizeUsd?: number; autoRoute?: boolean } = {},
  ): Promise<{ signal: AgentSignal; record: ExecutionRecord | null }> {
    const snap = await this.fetchSnapshot(symbol);
    const signal = scoreImperialMarket(snap);

    if (signal.decision === "watch" || !opts.autoRoute) {
      return { signal, record: null };
    }

    const req = this.buildOrderRequest({
      symbol: signal.symbol,
      side: signal.decision === "buy" ? 0 : 1,
      action: 0,
      sizeUsd: opts.sizeUsd ?? this.config.maxSizeUsd,
    });
    const { record } = await this.placeOrder(req, !this.config.live);
    return { signal, record };
  }

  /** Scan all allowed symbols and return ranked signals. */
  async runScan(opts: { sizeUsd?: number; autoRoute?: boolean } = {}): Promise<{
    signals: AgentSignal[];
    records: ExecutionRecord[];
  }> {
    const snaps = await Promise.all(
      this.config.allowedSymbols.map((sym) => this.fetchSnapshot(sym)),
    );

    const signals = snaps.map((s) => scoreImperialMarket(s));
    signals.sort((a, b) => b.confidence - a.confidence);

    const records: ExecutionRecord[] = [];
    if (opts.autoRoute) {
      for (const sig of signals.filter((s) => s.decision !== "watch")) {
        try {
          const req = this.buildOrderRequest({
            symbol: sig.symbol,
            side: sig.decision === "buy" ? 0 : 1,
            action: 0,
            sizeUsd: opts.sizeUsd ?? this.config.maxSizeUsd,
          });
          const { record } = await this.placeOrder(req);
          if (record) records.push(record);
        } catch {
          // continue
        }
      }
    }

    return { signals, records };
  }

  /** Health summary. */
  async healthCheck(): Promise<{
    configured: boolean;
    live: boolean;
    wallet: string;
    profileIndex: number;
    allowedSymbols: string[];
    maxSizeUsd: number;
    slippageBps: number;
    jwtPresent: boolean;
    apiStatus: unknown;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    if (!this.config.jwt) warnings.push("No JWT — trading endpoints will fail.");
    if (!this.config.wallet) warnings.push("No wallet configured.");
    if (this.config.live) warnings.push("LIVE MODE — orders submit on-chain.");

    let apiStatus: unknown = null;
    try {
      apiStatus = await this.getStatus();
    } catch {
      warnings.push("Imperial API /status unreachable.");
    }

    return {
      configured: Boolean(this.config.jwt && this.config.wallet),
      live: this.config.live,
      wallet: this.config.wallet,
      profileIndex: this.config.profileIndex,
      allowedSymbols: this.config.allowedSymbols,
      maxSizeUsd: this.config.maxSizeUsd,
      slippageBps: this.config.slippageBps,
      jwtPresent: Boolean(this.config.jwt),
      apiStatus,
      warnings,
    };
  }
}

export function createImperialClient(config?: Partial<ImperialConfig>): ImperialClient {
  return new ImperialClient(config);
}
