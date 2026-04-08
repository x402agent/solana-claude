/**
 * src/services/solanaTrackerAPI.ts
 *
 * Unified Solana data API client.
 * Consolidates: Solana Tracker Data API, Helius RPC/DAS/Wallet API,
 * Birdeye, CoinGecko, and PumpPortal into a single typed interface.
 *
 * Used by: Telegram bot, Solana Claude agent, Express server
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  marketCapUSD: number;
  holderCount: number;
  top10HolderPercent: number;
  bondingCurveProgress: number;
  isGraduated: boolean;
  poolAddress?: string;
  isCashbackCoin: boolean;
  isMayhemMode: boolean;
  creatorSold: boolean;
  liquidity: number;
  imageUrl?: string;
  description?: string;
  createdAt?: string;
}

export interface TokenPrice {
  mint: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

export interface OHLCVBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

export interface TokenTrade {
  signature: string;
  type: "buy" | "sell";
  tokenAmount: number;
  solAmount: number;
  priceUsd: number;
  wallet: string;
  timestamp: number;
  program?: string;
}

export interface WalletPnL {
  address: string;
  realizedPnl: number;
  unrealizedPnl: number;
  winRate: number;
  totalTrades: number;
  tokens: WalletTokenPnL[];
}

export interface WalletTokenPnL {
  mint: string;
  symbol: string;
  pnl: number;
  buys: number;
  sells: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  currentValue: number;
}

export interface WalletBalance {
  address: string;
  solBalance: number;
  tokens: Array<{
    mint: string;
    symbol?: string;
    name?: string;
    amount: number;
    decimals: number;
    usdValue?: number;
  }>;
}

export interface TopTrader {
  wallet: string;
  pnl: number;
  trades: number;
  volume: number;
}

export interface PoolInfo {
  poolAddress: string;
  tokenMint: string;
  quoteMint: string;
  liquidity: number;
  volume24h: number;
  price: number;
  dex: string;
}

export interface SearchResult {
  mint: string;
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  marketCap: number;
  imageUrl?: string;
  verified?: boolean;
}

export interface WalletIdentity {
  address: string;
  name?: string;
  tags?: string[];
  knownAs?: string;
}

export interface HeliusAsset {
  id: string;
  name?: string;
  symbol?: string;
  imageUrl?: string;
  collection?: string;
  compressed: boolean;
}

export interface TradingSignalScore {
  score: number;
  strength: "STRONG" | "MODERATE" | "WEAK" | "AVOID";
  reasons: string[];
  risks: string[];
}

export interface HolderData {
  count: number;
  history: Array<{ time: number; count: number }>;
}

// ─── Client Configuration ───────────────────────────────────────────────────

export interface SolanaTrackerConfig {
  solanaTrackerApiKey?: string;
  heliusApiKey?: string;
  heliusRpcUrl?: string;
  birdeyeApiKey?: string;
  /** Base URL for local Express server (default: http://localhost:3001) */
  serverUrl?: string;
}

// ─── Main Client ────────────────────────────────────────────────────────────

export class SolanaTrackerAPI {
  private trackerKey: string;
  private heliusKey: string;
  private heliusRpc: string;
  private birdeyeKey: string;
  private serverUrl: string;

  private static TRACKER_BASE = "https://data.solanatracker.io";
  private static HELIUS_BASE = "https://api.helius.xyz";
  private static BIRDEYE_BASE = "https://public-api.birdeye.so";
  private static COINGECKO_BASE = "https://api.coingecko.com/api/v3";

  constructor(config: SolanaTrackerConfig = {}) {
    this.trackerKey = config.solanaTrackerApiKey ?? process.env.SOLANA_TRACKER_API_KEY ?? "";
    this.heliusKey = config.heliusApiKey ?? process.env.HELIUS_API_KEY ?? "";
    this.heliusRpc = config.heliusRpcUrl ?? process.env.HELIUS_RPC_URL ?? process.env.GATEKEEPER_RPC_URL ?? "";
    this.birdeyeKey = config.birdeyeApiKey ?? process.env.BIRDEYE_API_KEY ?? "";
    this.serverUrl = config.serverUrl ?? "http://localhost:3001";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLANA TRACKER DATA API
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get full token info by mint address */
  async getTokenInfo(mint: string): Promise<TokenInfo> {
    const data = await this.trackerGet(`/tokens/${mint}`);
    return this.normalizeTokenInfo(data);
  }

  /** Search tokens by name, symbol, or mint */
  async searchTokens(query: string, limit = 10): Promise<SearchResult[]> {
    const data = await this.trackerGet(`/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    const items = Array.isArray(data) ? data : (data as any).tokens ?? (data as any).results ?? [];
    return items.map((t: any) => ({
      mint: t.mint ?? t.address ?? "",
      symbol: t.symbol ?? "???",
      name: t.name ?? "",
      price: Number(t.price ?? 0),
      volume24h: Number(t.volume24h ?? t.v24hUSD ?? 0),
      marketCap: Number(t.marketCap ?? t.mc ?? 0),
      imageUrl: t.image ?? t.imageUrl ?? t.logoURI,
      verified: t.verified ?? false,
    }));
  }

  /** Get trending tokens */
  async getTrending(limit = 20): Promise<SearchResult[]> {
    const data = await this.trackerGet(`/tokens/trending?limit=${limit}`);
    const items = Array.isArray(data) ? data : (data as any).tokens ?? [];
    return items.map((t: any) => ({
      mint: t.mint ?? t.address ?? "",
      symbol: t.symbol ?? "???",
      name: t.name ?? "",
      price: Number(t.price ?? 0),
      volume24h: Number(t.volume24h ?? 0),
      marketCap: Number(t.marketCap ?? 0),
      imageUrl: t.image ?? t.imageUrl,
      priceChange24h: Number(t.priceChange24h ?? 0),
    }));
  }

  /** Get latest tokens */
  async getLatestTokens(limit = 20): Promise<SearchResult[]> {
    const data = await this.trackerGet(`/tokens/latest?limit=${limit}`);
    const items = Array.isArray(data) ? data : (data as any).tokens ?? [];
    return items.map((t: any) => ({
      mint: t.mint ?? t.address ?? "",
      symbol: t.symbol ?? "???",
      name: t.name ?? "",
      price: Number(t.price ?? 0),
      volume24h: Number(t.volume24h ?? 0),
      marketCap: Number(t.marketCap ?? 0),
      imageUrl: t.image ?? t.imageUrl,
    }));
  }

  /** Get multi-token prices */
  async getMultiPrice(mints: string[]): Promise<Map<string, TokenPrice>> {
    const data = await this.trackerPost(`/tokens/multi-price`, { tokens: mints });
    const result = new Map<string, TokenPrice>();
    const items = Array.isArray(data) ? data : Object.entries(data as Record<string, any>);
    for (const entry of items) {
      const [mint, info] = Array.isArray(entry) ? entry : [entry.mint, entry];
      result.set(String(mint), {
        mint: String(mint),
        price: Number(info.price ?? 0),
        priceChange1h: Number(info.priceChange1h ?? 0),
        priceChange24h: Number(info.priceChange24h ?? 0),
        volume24h: Number(info.volume24h ?? 0),
        marketCap: Number(info.marketCap ?? 0),
      });
    }
    return result;
  }

  /** Get OHLCV chart data */
  async getChartData(
    mint: string,
    type: string = "1m",
    opts: { marketCap?: boolean; removeOutliers?: boolean; timeTo?: number } = {},
  ): Promise<OHLCVBar[]> {
    const params = new URLSearchParams({ type });
    if (opts.marketCap) params.set("marketCap", "true");
    if (opts.removeOutliers !== false) params.set("removeOutliers", "true");
    if (opts.timeTo) params.set("timeTo", String(opts.timeTo));
    const data = await this.trackerGet(`/chart/${mint}?${params}`);
    const bars = Array.isArray(data) ? data : (data as any).bars ?? (data as any).data ?? [];
    return bars.map((b: any) => ({
      open: Number(b.open ?? b.o ?? 0),
      high: Number(b.high ?? b.h ?? 0),
      low: Number(b.low ?? b.l ?? 0),
      close: Number(b.close ?? b.c ?? 0),
      volume: Number(b.volume ?? b.v ?? 0),
      time: Number(b.time ?? b.t ?? b.timestamp ?? 0),
    }));
  }

  /** Get token trades */
  async getTokenTrades(mint: string, cursor?: string): Promise<{ trades: TokenTrade[]; cursor?: string }> {
    const url = cursor ? `/trades/${mint}?cursor=${cursor}` : `/trades/${mint}`;
    const data = await this.trackerGet(url);
    const items = Array.isArray(data) ? data : (data as any).trades ?? (data as any).items ?? [];
    return {
      trades: items.map((t: any) => this.normalizeTrade(t)),
      cursor: (data as any)?.cursor ?? (data as any)?.nextCursor,
    };
  }

  /** Get trades for a specific wallet on a token */
  async getWalletTokenTrades(mint: string, wallet: string): Promise<TokenTrade[]> {
    const data = await this.trackerGet(`/trades/${mint}/${wallet}`);
    const items = Array.isArray(data) ? data : (data as any).trades ?? [];
    return items.map((t: any) => this.normalizeTrade(t));
  }

  /** Get wallet PnL */
  async getWalletPnL(address: string): Promise<WalletPnL> {
    const data = await this.trackerGet(`/pnl/${address}`);
    return {
      address,
      realizedPnl: Number((data as any).realizedPnl ?? (data as any).pnl ?? 0),
      unrealizedPnl: Number((data as any).unrealizedPnl ?? 0),
      winRate: Number((data as any).winRate ?? 0),
      totalTrades: Number((data as any).totalTrades ?? 0),
      tokens: ((data as any).tokens ?? []).map((t: any) => ({
        mint: t.mint ?? "",
        symbol: t.symbol ?? "",
        pnl: Number(t.pnl ?? 0),
        buys: Number(t.buys ?? 0),
        sells: Number(t.sells ?? 0),
        avgBuyPrice: Number(t.avgBuyPrice ?? 0),
        avgSellPrice: Number(t.avgSellPrice ?? 0),
        currentValue: Number(t.currentValue ?? 0),
      })),
    };
  }

  /** Get top traders for a token */
  async getTopTraders(mint: string, limit = 20): Promise<TopTrader[]> {
    const data = await this.trackerGet(`/top-traders/${mint}?limit=${limit}`);
    const items = Array.isArray(data) ? data : (data as any).traders ?? [];
    return items.map((t: any) => ({
      wallet: t.wallet ?? t.address ?? "",
      pnl: Number(t.pnl ?? 0),
      trades: Number(t.trades ?? 0),
      volume: Number(t.volume ?? 0),
    }));
  }

  /** Get token pool/LP info */
  async getTokenPools(mint: string): Promise<PoolInfo[]> {
    const data = await this.trackerGet(`/pools/${mint}`);
    const items = Array.isArray(data) ? data : (data as any).pools ?? [];
    return items.map((p: any) => ({
      poolAddress: p.poolAddress ?? p.address ?? "",
      tokenMint: p.tokenMint ?? mint,
      quoteMint: p.quoteMint ?? "",
      liquidity: Number(p.liquidity ?? 0),
      volume24h: Number(p.volume24h ?? 0),
      price: Number(p.price ?? 0),
      dex: p.dex ?? p.source ?? "",
    }));
  }

  /** Get holder count and history */
  async getHolderData(mint: string): Promise<HolderData> {
    const data = await this.trackerGet(`/holders/${mint}`);
    return {
      count: Number((data as any).count ?? (data as any).total ?? 0),
      history: ((data as any).history ?? []).map((h: any) => ({
        time: Number(h.time ?? h.timestamp ?? 0),
        count: Number(h.count ?? h.total ?? 0),
      })),
    };
  }

  /** Get graduated tokens (migrated to PumpSwap / Raydium) */
  async getGraduatedTokens(limit = 20): Promise<SearchResult[]> {
    const data = await this.trackerGet(`/tokens/graduated?limit=${limit}`);
    const items = Array.isArray(data) ? data : (data as any).tokens ?? [];
    return items.map((t: any) => ({
      mint: t.mint ?? t.address ?? "",
      symbol: t.symbol ?? "???",
      name: t.name ?? "",
      price: Number(t.price ?? 0),
      volume24h: Number(t.volume24h ?? 0),
      marketCap: Number(t.marketCap ?? 0),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COINGECKO (SOL price, free)
  // ═══════════════════════════════════════════════════════════════════════════

  async getSOLPrice(): Promise<number> {
    try {
      const res = await fetch(
        `${SolanaTrackerAPI.COINGECKO_BASE}/simple/price?ids=solana&vs_currencies=usd`,
        { headers: { Accept: "application/json" } },
      );
      const data = (await res.json()) as { solana: { usd: number } };
      return data.solana.usd;
    } catch {
      return 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELIUS RPC + WALLET + DAS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Raw Solana JSON-RPC call via Helius */
  async rpcCall<T = unknown>(method: string, params: unknown[]): Promise<T> {
    if (!this.heliusRpc) throw new Error("No Helius RPC URL configured");
    const res = await fetch(this.heliusRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: `req-${Date.now()}`, method, params }),
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result as T;
  }

  /** Get SOL balance for an address */
  async getBalance(address: string): Promise<number> {
    const result = await this.rpcCall<{ value: number }>("getBalance", [address, { commitment: "confirmed" }]);
    const lamports = typeof result === "number" ? result : result.value;
    return lamports / 1e9;
  }

  /** Get wallet token balances */
  async getWalletBalances(address: string): Promise<WalletBalance> {
    const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const [solResult, tokensResult] = await Promise.all([
      this.rpcCall<{ value: number }>("getBalance", [address, { commitment: "confirmed" }]),
      this.rpcCall<{
        value: Array<{
          account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number; decimals: number } } } } };
        }>;
      }>("getTokenAccountsByOwner", [address, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed" }]),
    ]);

    const solBalance = (typeof solResult === "number" ? solResult : solResult.value) / 1e9;
    const tokens = tokensResult.value
      .map((a) => ({
        mint: a.account.data.parsed.info.mint,
        amount: a.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: a.account.data.parsed.info.tokenAmount.decimals,
      }))
      .filter((t) => t.amount > 0);

    return { address, solBalance, tokens };
  }

  /** Get recent transaction signatures */
  async getRecentTransactions(
    address: string,
    limit = 10,
  ): Promise<Array<{ signature: string; blockTime: number | null; err: unknown }>> {
    return this.rpcCall("getSignaturesForAddress", [address, { limit }]);
  }

  /** Get current slot and block height */
  async getSlotInfo(): Promise<{ slot: number; blockHeight: number }> {
    const [slot, blockHeight] = await Promise.all([
      this.rpcCall<number>("getSlot", []),
      this.rpcCall<number>("getBlockHeight", []),
    ]);
    return { slot, blockHeight };
  }

  /** Get parsed transaction details */
  async getTransaction(signature: string): Promise<unknown> {
    return this.rpcCall("getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
  }

  // ─── Helius Wallet API ────────────────────────────────────────────────────

  /** Get wallet identity (Helius Wallet API) */
  async getWalletIdentity(address: string): Promise<WalletIdentity | null> {
    if (!this.heliusKey) return null;
    try {
      const res = await fetch(
        `${SolanaTrackerAPI.HELIUS_BASE}/v1/wallet/${address}/identity?api-key=${this.heliusKey}`,
      );
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      return {
        address,
        name: data.name ?? data.displayName,
        tags: data.tags ?? [],
        knownAs: data.knownAs,
      };
    } catch {
      return null;
    }
  }

  /** Get wallet history (Helius Wallet API) */
  async getWalletHistory(address: string, opts: { before?: string; limit?: number } = {}): Promise<unknown[]> {
    if (!this.heliusKey) return [];
    const params = new URLSearchParams({ "api-key": this.heliusKey });
    if (opts.before) params.set("before", opts.before);
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await fetch(`${SolanaTrackerAPI.HELIUS_BASE}/v1/wallet/${address}/history?${params}`);
    if (!res.ok) return [];
    return (await res.json()) as unknown[];
  }

  /** Get wallet transfers (Helius Wallet API) */
  async getWalletTransfers(address: string, opts: { before?: string; limit?: number } = {}): Promise<unknown[]> {
    if (!this.heliusKey) return [];
    const params = new URLSearchParams({ "api-key": this.heliusKey });
    if (opts.before) params.set("before", opts.before);
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await fetch(`${SolanaTrackerAPI.HELIUS_BASE}/v1/wallet/${address}/transfers?${params}`);
    if (!res.ok) return [];
    return (await res.json()) as unknown[];
  }

  /** Get wallet funding source (Helius Wallet API) */
  async getWalletFundedBy(address: string): Promise<unknown | null> {
    if (!this.heliusKey) return null;
    const res = await fetch(
      `${SolanaTrackerAPI.HELIUS_BASE}/v1/wallet/${address}/funded-by?api-key=${this.heliusKey}`,
    );
    if (!res.ok) return null;
    return res.json();
  }

  // ─── Helius DAS API ───────────────────────────────────────────────────────

  /** Get assets by owner (Helius DAS) */
  async getAssetsByOwner(owner: string, page = 1, limit = 50): Promise<HeliusAsset[]> {
    const result = await this.rpcCall<{ items: any[] }>("getAssetsByOwner", {
      ownerAddress: owner,
      page,
      limit,
      displayOptions: { showFungible: true, showNativeBalance: true },
    } as any);
    return (result?.items ?? []).map((a: any) => ({
      id: a.id ?? "",
      name: a.content?.metadata?.name,
      symbol: a.content?.metadata?.symbol,
      imageUrl: a.content?.links?.image ?? a.content?.files?.[0]?.uri,
      collection: a.grouping?.[0]?.group_value,
      compressed: Boolean(a.compression?.compressed),
    }));
  }

  /** Get single asset by ID (Helius DAS) */
  async getAsset(id: string): Promise<unknown> {
    return this.rpcCall("getAsset", { id } as any);
  }

  /** Search assets (Helius DAS) */
  async searchAssets(params: Record<string, unknown>): Promise<unknown> {
    return this.rpcCall("searchAssets", params as any);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BIRDEYE
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get Birdeye token price */
  async getBirdeyePrice(mint: string): Promise<{ price: number; priceChange24h: number } | null> {
    if (!this.birdeyeKey) return null;
    try {
      const data = await this.birdeyeGet(`/defi/price?address=${mint}`);
      const inner = (data as any).data;
      return inner ? { price: Number(inner.value ?? 0), priceChange24h: Number(inner.priceChange24h ?? 0) } : null;
    } catch {
      return null;
    }
  }

  /** Search tokens on Birdeye */
  async birdeyeSearch(query: string, limit = 10): Promise<SearchResult[]> {
    if (!this.birdeyeKey) return [];
    const data = await this.birdeyeGet(
      `/defi/v3/search?keyword=${encodeURIComponent(query)}&chain=solana&target=token&limit=${limit}`,
    );
    const items = ((data as any).data?.items ?? []) as any[];
    return items.map((t) => ({
      mint: t.address ?? "",
      symbol: t.symbol ?? "",
      name: t.name ?? "",
      price: Number(t.price ?? 0),
      volume24h: Number(t.v24hUSD ?? 0),
      marketCap: Number(t.mc ?? 0),
      imageUrl: t.logoURI,
      verified: t.verified ?? false,
    }));
  }

  /** Get Birdeye token overview */
  async getBirdeyeOverview(mint: string): Promise<Record<string, unknown> | null> {
    if (!this.birdeyeKey) return null;
    try {
      const data = await this.birdeyeGet(`/defi/token_overview?address=${mint}`);
      return (data as any).data ?? null;
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITE / ANALYSIS METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Full wallet profile: identity + balances + PnL + recent txs */
  async getWalletProfile(address: string): Promise<{
    identity: WalletIdentity | null;
    balances: WalletBalance;
    pnl: WalletPnL;
    recentTxs: Array<{ signature: string; blockTime: number | null; err: unknown }>;
  }> {
    const [identity, balances, pnl, recentTxs] = await Promise.all([
      this.getWalletIdentity(address).catch(() => null),
      this.getWalletBalances(address),
      this.getWalletPnL(address).catch(() => ({
        address,
        realizedPnl: 0,
        unrealizedPnl: 0,
        winRate: 0,
        totalTrades: 0,
        tokens: [],
      })),
      this.getRecentTransactions(address, 5).catch(() => []),
    ]);
    return { identity, balances, pnl, recentTxs };
  }

  /** Deep token research: info + holders + top traders + pools + chart */
  async deepTokenResearch(mint: string): Promise<{
    token: TokenInfo;
    holders: HolderData;
    topTraders: TopTrader[];
    pools: PoolInfo[];
    chart1h: OHLCVBar[];
    signal: TradingSignalScore;
    solPrice: number;
  }> {
    const [token, holders, topTraders, pools, chart1h, solPrice] = await Promise.all([
      this.getTokenInfo(mint),
      this.getHolderData(mint).catch(() => ({ count: 0, history: [] })),
      this.getTopTraders(mint, 10).catch(() => []),
      this.getTokenPools(mint).catch(() => []),
      this.getChartData(mint, "5m", { removeOutliers: true }).catch(() => []),
      this.getSOLPrice(),
    ]);
    const signal = this.scoreToken(token);
    return { token, holders, topTraders, pools, chart1h, signal, solPrice };
  }

  /** Score a token for trading signals */
  scoreToken(info: TokenInfo): TradingSignalScore {
    let score = 50;
    const reasons: string[] = [];
    const risks: string[] = [];

    if (info.isGraduated) {
      score += 10;
      reasons.push("LP locked (graduated)");
    }
    if (info.creatorSold) {
      score -= 20;
      risks.push("Creator sold");
    }
    if (info.top10HolderPercent > 50) {
      score -= 15;
      risks.push(`Whale risk (top10=${info.top10HolderPercent.toFixed(0)}%)`);
    }
    if (info.top10HolderPercent > 30 && info.top10HolderPercent <= 50) {
      score -= 5;
      risks.push(`Moderate concentration (top10=${info.top10HolderPercent.toFixed(0)}%)`);
    }
    if (info.bondingCurveProgress >= 60 && info.bondingCurveProgress <= 90) {
      score += 15;
      reasons.push("Pre-grad sweet spot");
    }
    if (info.volume24h > 1_000_000) {
      score += 10;
      reasons.push(`Vol $${(info.volume24h / 1e6).toFixed(1)}M`);
    } else if (info.volume24h > 100_000) {
      score += 5;
      reasons.push(`Vol $${(info.volume24h / 1e3).toFixed(0)}K`);
    }
    if (info.holderCount > 1000) {
      score += 5;
      reasons.push(`${info.holderCount.toLocaleString()} holders`);
    }
    if (info.isCashbackCoin) {
      score += 3;
      reasons.push("Cashback");
    }
    if (info.liquidity > 50_000) {
      score += 5;
      reasons.push(`Liq $${(info.liquidity / 1e3).toFixed(0)}K`);
    }
    if (info.liquidity < 5_000 && !info.isGraduated) {
      score -= 10;
      risks.push("Low liquidity");
    }

    score = Math.min(100, Math.max(0, score));
    const strength =
      score >= 75 ? "STRONG" : score >= 55 ? "MODERATE" : score >= 35 ? "WEAK" : "AVOID";

    return { score, strength, reasons, risks };
  }

  /** Market overview: SOL price + trending + latest */
  async getMarketOverview(): Promise<{
    solPrice: number;
    trending: SearchResult[];
    latest: SearchResult[];
    graduated: SearchResult[];
  }> {
    const [solPrice, trending, latest, graduated] = await Promise.all([
      this.getSOLPrice(),
      this.getTrending(10).catch(() => []),
      this.getLatestTokens(10).catch(() => []),
      this.getGraduatedTokens(10).catch(() => []),
    ]);
    return { solPrice, trending, latest, graduated };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async trackerGet(path: string): Promise<unknown> {
    const res = await fetch(`${SolanaTrackerAPI.TRACKER_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "x-api-key": this.trackerKey,
      },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`Solana Tracker ${res.status}: ${msg}`);
    }
    return res.json();
  }

  private async trackerPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${SolanaTrackerAPI.TRACKER_BASE}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": this.trackerKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`Solana Tracker ${res.status}: ${msg}`);
    }
    return res.json();
  }

  private async birdeyeGet(path: string): Promise<unknown> {
    if (!this.birdeyeKey) throw new Error("No BIRDEYE_API_KEY configured");
    const res = await fetch(`${SolanaTrackerAPI.BIRDEYE_BASE}${path}`, {
      headers: { "X-API-KEY": this.birdeyeKey, "x-chain": "solana" },
    });
    if (!res.ok) throw new Error(`Birdeye ${res.status}`);
    return res.json();
  }

  private normalizeTokenInfo(data: any): TokenInfo {
    const solPrice = 0; // Caller should multiply if needed
    return {
      mint: data.mint ?? data.address ?? "",
      symbol: data.symbol ?? "???",
      name: data.name ?? "Unknown",
      price: Number(data.price ?? 0),
      priceChange24h: Number(data.priceChange24h ?? 0),
      volume24h: Number(data.volume24h ?? 0),
      marketCap: Number(data.marketCap ?? 0),
      marketCapUSD: Number(data.marketCapUSD ?? data.marketCap ?? 0),
      holderCount: Number(data.holderCount ?? data.holders ?? 0),
      top10HolderPercent: Number(data.top10HolderPercent ?? 0),
      bondingCurveProgress: Number(data.bondingCurveProgress ?? 0),
      isGraduated: Boolean(data.poolAddress || data.migratedToAMM || data.isGraduated),
      poolAddress: data.poolAddress,
      isCashbackCoin: Boolean(data.isCashbackCoin),
      isMayhemMode: Boolean(data.isMayhemMode),
      creatorSold: Boolean(data.creatorSold),
      liquidity: Number(data.liquidity ?? 0),
      imageUrl: data.image ?? data.imageUrl ?? data.logoURI,
      description: data.description,
      createdAt: data.createdAt,
    };
  }

  private normalizeTrade(t: any): TokenTrade {
    return {
      signature: t.signature ?? t.tx ?? t.txHash ?? "",
      type: (t.type ?? t.side ?? "buy").toLowerCase() as "buy" | "sell",
      tokenAmount: Number(t.tokenAmount ?? t.amount ?? 0),
      solAmount: Number(t.solAmount ?? t.sol ?? 0),
      priceUsd: Number(t.priceUsd ?? t.price ?? 0),
      wallet: t.wallet ?? t.owner ?? t.maker ?? "",
      timestamp: Number(t.timestamp ?? t.blockTime ?? t.time ?? 0),
      program: t.program ?? t.source,
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: SolanaTrackerAPI | null = null;

export function getSolanaTracker(config?: SolanaTrackerConfig): SolanaTrackerAPI {
  if (!_instance) {
    _instance = new SolanaTrackerAPI(config);
  }
  return _instance;
}

export default SolanaTrackerAPI;
