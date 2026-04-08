/**
 * src/services/solanaAgent.ts
 *
 * Solana Claude Agent — born with complete trading + data capability.
 * Provides the autonomous agent layer on top of SolanaTrackerAPI.
 *
 * Used by: Telegram bot, CLI, MCP server
 */

import { SolanaTrackerAPI, getSolanaTracker } from "./solanaTrackerAPI.js";
import type {
  TokenInfo,
  TradingSignalScore,
  WalletPnL,
  SearchResult,
  OHLCVBar,
  TopTrader,
  PoolInfo,
  HolderData,
} from "./solanaTrackerAPI.js";

// ─── Agent Types ────────────────────────────────────────────────────────────

export type AgentMode = "idle" | "research" | "scanner" | "sniper" | "analyst" | "monitor";

export interface AgentMemory {
  tier: "INFERRED" | "LEARNED" | "CORE";
  content: string;
  timestamp: string;
  source?: string;
}

export interface AgentSignal {
  mint: string;
  symbol: string;
  score: number;
  strength: "STRONG" | "MODERATE" | "WEAK" | "AVOID";
  reasons: string[];
  risks: string[];
  detectedAt: number;
  action?: "BUY" | "SELL" | "HOLD" | "AVOID";
  confidence: number;
}

export interface ResearchReport {
  token: TokenInfo;
  signal: TradingSignalScore;
  holders: HolderData;
  topTraders: TopTrader[];
  pools: PoolInfo[];
  chart: OHLCVBar[];
  solPrice: number;
  narrative: string;
  recommendation: string;
}

export interface MarketSnapshot {
  solPrice: number;
  trending: SearchResult[];
  topMovers: Array<SearchResult & { priceChange24h: number }>;
  signals: AgentSignal[];
  timestamp: number;
}

export interface WalletReport {
  address: string;
  solBalance: number;
  tokenCount: number;
  pnl: WalletPnL;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
}

// ─── Agent Class ────────────────────────────────────────────────────────────

export class SolanaAgent {
  private api: SolanaTrackerAPI;
  private mode: AgentMode = "idle";
  private memories: AgentMemory[] = [];
  private signals: AgentSignal[] = [];
  private watchlist: Set<string> = new Set();

  constructor(api?: SolanaTrackerAPI) {
    this.api = api ?? getSolanaTracker();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Deep research a token — returns full report with narrative */
  async research(mintOrSymbol: string): Promise<ResearchReport> {
    // Resolve symbol to mint if needed
    let mint = mintOrSymbol;
    if (mint.length < 32) {
      const results = await this.api.searchTokens(mint, 1);
      if (!results.length) throw new Error(`Token not found: ${mintOrSymbol}`);
      mint = results[0].mint;
    }

    const { token, holders, topTraders, pools, chart1h, signal, solPrice } =
      await this.api.deepTokenResearch(mint);

    const narrative = this.buildNarrative(token, signal, holders, topTraders, pools);
    const recommendation = this.buildRecommendation(token, signal);

    // Remember this research
    this.remember("INFERRED", `Researched ${token.symbol} (${mint.slice(0, 8)}): ${signal.strength} ${signal.score}/100`);

    return {
      token,
      signal,
      holders,
      topTraders,
      pools,
      chart: chart1h,
      solPrice,
      narrative,
      recommendation,
    };
  }

  /** OODA loop — Observe, Orient, Decide, Act */
  async ooda(): Promise<MarketSnapshot> {
    this.mode = "research";

    // OBSERVE: Get market state
    const { solPrice, trending } = await this.api.getMarketOverview();

    // ORIENT: Score trending tokens, find top movers
    const topMovers = trending
      .filter((t: any) => Math.abs(Number(t.priceChange24h ?? 0)) > 20)
      .slice(0, 5)
      .map((t: any) => ({ ...t, priceChange24h: Number(t.priceChange24h ?? 0) }));

    // DECIDE: Score and generate signals
    const signals: AgentSignal[] = [];
    for (const mover of topMovers.slice(0, 3)) {
      try {
        const info = await this.api.getTokenInfo(mover.mint);
        const score = this.api.scoreToken(info);
        signals.push({
          mint: mover.mint,
          symbol: mover.symbol,
          score: score.score,
          strength: score.strength,
          reasons: score.reasons,
          risks: score.risks,
          detectedAt: Date.now(),
          action: score.strength === "STRONG" ? "BUY" : score.strength === "AVOID" ? "AVOID" : "HOLD",
          confidence: score.score / 100,
        });
      } catch {
        // Skip tokens we can't score
      }
    }

    // Store signals
    this.signals.push(...signals);
    if (this.signals.length > 200) this.signals.splice(0, this.signals.length - 200);

    this.remember("INFERRED", `OODA: SOL $${solPrice.toFixed(2)}, ${signals.length} signals, ${topMovers.length} movers`);

    this.mode = "idle";
    return { solPrice, trending, topMovers, signals, timestamp: Date.now() };
  }

  /** Analyze a wallet */
  async analyzeWallet(address: string): Promise<WalletReport> {
    const [balances, pnl] = await Promise.all([
      this.api.getWalletBalances(address),
      this.api.getWalletPnL(address).catch(() => ({
        address,
        realizedPnl: 0,
        unrealizedPnl: 0,
        winRate: 0,
        totalTrades: 0,
        tokens: [],
      })),
    ]);

    const riskLevel =
      pnl.winRate < 0.3 ? "HIGH" : pnl.winRate < 0.5 ? "MEDIUM" : "LOW";

    const summary = [
      `SOL: ${balances.solBalance.toFixed(4)}`,
      `Tokens: ${balances.tokens.length}`,
      `PnL: ${pnl.realizedPnl > 0 ? "+" : ""}$${pnl.realizedPnl.toFixed(2)}`,
      `Win Rate: ${(pnl.winRate * 100).toFixed(1)}%`,
      `Trades: ${pnl.totalTrades}`,
    ].join(" | ");

    return {
      address,
      solBalance: balances.solBalance,
      tokenCount: balances.tokens.length,
      pnl,
      riskLevel,
      summary,
    };
  }

  /** Get market overview with signals */
  async marketBrief(): Promise<string> {
    const overview = await this.api.getMarketOverview();
    const lines = [
      `SOL: $${overview.solPrice.toFixed(2)}`,
      ``,
      `Trending:`,
      ...overview.trending.slice(0, 5).map((t, i) =>
        `  ${i + 1}. ${t.symbol} — $${t.price.toFixed(6)} (${(t as any).priceChange24h > 0 ? "+" : ""}${Number((t as any).priceChange24h ?? 0).toFixed(1)}%)`
      ),
      ``,
      `Latest Graduated:`,
      ...overview.graduated.slice(0, 3).map((t) => `  ${t.symbol} — MCap $${t.marketCap.toLocaleString()}`),
    ];
    return lines.join("\n");
  }

  /** Quick token lookup — price + signal */
  async quickLookup(mintOrSymbol: string): Promise<{ info: TokenInfo; signal: TradingSignalScore; solPrice: number }> {
    let mint = mintOrSymbol;
    if (mint.length < 32) {
      const results = await this.api.searchTokens(mint, 1);
      if (!results.length) throw new Error(`Token not found: ${mintOrSymbol}`);
      mint = results[0].mint;
    }
    const [info, solPrice] = await Promise.all([
      this.api.getTokenInfo(mint),
      this.api.getSOLPrice(),
    ]);
    const signal = this.api.scoreToken(info);
    return { info, signal, solPrice };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY
  // ═══════════════════════════════════════════════════════════════════════════

  remember(tier: AgentMemory["tier"], content: string, source?: string): void {
    this.memories.push({
      tier,
      content,
      timestamp: new Date().toISOString(),
      source,
    });
    if (this.memories.length > 500) this.memories.splice(0, this.memories.length - 500);
  }

  recall(query?: string, limit = 10): AgentMemory[] {
    if (!query) return this.memories.slice(-limit);
    const q = query.toLowerCase();
    return this.memories.filter((m) => m.content.toLowerCase().includes(q)).slice(-limit);
  }

  getSignals(limit = 20): AgentSignal[] {
    return this.signals.slice(-limit);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WATCHLIST
  // ═══════════════════════════════════════════════════════════════════════════

  addToWatchlist(mint: string): void {
    this.watchlist.add(mint);
  }

  removeFromWatchlist(mint: string): void {
    this.watchlist.delete(mint);
  }

  getWatchlist(): string[] {
    return [...this.watchlist];
  }

  /** Check watchlist tokens and return any with significant moves */
  async checkWatchlist(): Promise<AgentSignal[]> {
    if (!this.watchlist.size) return [];
    const mints = [...this.watchlist];
    const prices = await this.api.getMultiPrice(mints);
    const alerts: AgentSignal[] = [];

    for (const [mint, price] of prices) {
      if (Math.abs(price.priceChange24h) > 20) {
        try {
          const info = await this.api.getTokenInfo(mint);
          const score = this.api.scoreToken(info);
          alerts.push({
            mint,
            symbol: info.symbol,
            score: score.score,
            strength: score.strength,
            reasons: [...score.reasons, `24h: ${price.priceChange24h > 0 ? "+" : ""}${price.priceChange24h.toFixed(1)}%`],
            risks: score.risks,
            detectedAt: Date.now(),
            action: price.priceChange24h > 30 && score.strength !== "AVOID" ? "BUY" : price.priceChange24h < -30 ? "SELL" : "HOLD",
            confidence: score.score / 100,
          });
        } catch {}
      }
    }
    return alerts;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  getMode(): AgentMode {
    return this.mode;
  }

  setMode(mode: AgentMode): void {
    this.mode = mode;
  }

  getState(): {
    mode: AgentMode;
    memoriesCount: number;
    signalsCount: number;
    watchlistCount: number;
  } {
    return {
      mode: this.mode,
      memoriesCount: this.memories.length,
      signalsCount: this.signals.length,
      watchlistCount: this.watchlist.size,
    };
  }

  /** Direct access to the underlying API client */
  getAPI(): SolanaTrackerAPI {
    return this.api;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ═══════════════════════════════════════════════════════════════════════════

  private buildNarrative(
    token: TokenInfo,
    signal: TradingSignalScore,
    holders: HolderData,
    topTraders: TopTrader[],
    pools: PoolInfo[],
  ): string {
    const parts: string[] = [];

    parts.push(`${token.symbol} (${token.name}) is ${token.isGraduated ? "a graduated token on PumpSwap" : `on the bonding curve at ${token.bondingCurveProgress.toFixed(1)}%`}.`);
    parts.push(`Price: $${token.price.toFixed(8)}, MCap: $${token.marketCapUSD.toLocaleString()}, Vol 24h: $${(token.volume24h / 1e6).toFixed(2)}M.`);

    if (holders.count > 0) {
      parts.push(`Holders: ${holders.count.toLocaleString()}, Top 10 hold ${token.top10HolderPercent.toFixed(1)}%.`);
    }

    if (topTraders.length > 0) {
      const topPnl = topTraders[0];
      parts.push(`Top trader PnL: $${topPnl.pnl.toFixed(2)} across ${topPnl.trades} trades.`);
    }

    if (pools.length > 0) {
      parts.push(`Active on ${pools.length} pool(s): ${pools.map((p) => p.dex).join(", ")}.`);
    }

    if (signal.reasons.length) parts.push(`Bullish: ${signal.reasons.join(", ")}.`);
    if (signal.risks.length) parts.push(`Risks: ${signal.risks.join(", ")}.`);

    return parts.join(" ");
  }

  private buildRecommendation(token: TokenInfo, signal: TradingSignalScore): string {
    if (signal.strength === "STRONG") {
      return `STRONG signal (${signal.score}/100). ${token.symbol} shows good fundamentals. Consider entry if risk/reward aligns with your strategy.`;
    }
    if (signal.strength === "MODERATE") {
      return `MODERATE signal (${signal.score}/100). ${token.symbol} has potential but watch for: ${signal.risks.join(", ") || "general market risk"}.`;
    }
    if (signal.strength === "WEAK") {
      return `WEAK signal (${signal.score}/100). ${token.symbol} carries elevated risk. Proceed with caution.`;
    }
    return `AVOID (${signal.score}/100). ${token.symbol} has too many red flags: ${signal.risks.join(", ")}.`;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _agent: SolanaAgent | null = null;

export function getSolanaAgent(): SolanaAgent {
  if (!_agent) {
    _agent = new SolanaAgent();
  }
  return _agent;
}

export default SolanaAgent;
