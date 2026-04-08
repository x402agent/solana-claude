/**
 * CLAWD Wiki — Domain types for Solana trading intelligence.
 *
 * Categories map to OODA loop phases and SolanaOS knowledge tiers:
 *   OBSERVE  → tokens, wallets, protocols (market data)
 *   ORIENT   → strategies, signals, patterns (analysis)
 *   DECIDE   → trade plans, risk models (decision)
 *   ACT/LEARN → trade logs, post-mortems, evolved strategies
 */

export type WikiCategory =
  | "token"         // Token profiles (SOL, BONK, JUP, etc.)
  | "wallet"        // Tracked wallets (smart money, whales)
  | "protocol"      // DeFi protocols (Jupiter, Raydium, Marinade)
  | "strategy"      // Trading strategies (OODA, scalping, arb)
  | "signal"        // Market signals and patterns
  | "agent"         // AI agent configurations and behaviors
  | "trade-log"     // Executed trade records + PnL
  | "research"      // Deep-dive analysis and reports
  | "glossary";     // Term definitions

export type MemoryTier = "KNOWN" | "LEARNED" | "INFERRED";

export type RiskLevel = "low" | "medium" | "high" | "degen";

export interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  category: WikiCategory;
  content: string;           // Markdown
  summary: string;           // 1-2 sentence summary for search
  tags: string[];
  memoryTier: MemoryTier;
  riskLevel?: RiskLevel;
  metadata: ArticleMetadata;
  sources: ArticleSource[];
  createdAt: string;         // ISO date
  updatedAt: string;
  version: number;
  archived: boolean;
}

export interface ArticleMetadata {
  // Token-specific
  mint?: string;
  symbol?: string;
  price?: number;
  marketCap?: number;
  liquidity?: number;
  holders?: number;
  securityScore?: number;     // 0-100
  graduated?: boolean;

  // Wallet-specific
  walletAddress?: string;
  pnlUsd?: number;
  winRate?: number;
  totalTrades?: number;

  // Strategy-specific
  entryRules?: string[];
  exitRules?: string[];
  stopLossPct?: number;
  takeProfitPct?: number;
  sharpeRatio?: number;
  backtestResult?: string;

  // Agent-specific
  agentType?: string;        // Explore, Scanner, OODA, Dream, etc.
  turnLimit?: number;
  permissionMode?: string;

  // Signal-specific
  signalStrength?: "STRONG" | "MODERATE" | "WEAK" | "AVOID";
  signalScore?: number;
  expiresAt?: string;

  // Generic
  heliusLink?: string;
  solscanLink?: string;
  birdeyeLink?: string;
  pumpfunLink?: string;
}

export interface ArticleSource {
  label: string;
  url?: string;
  type: "api" | "manual" | "agent" | "onchain" | "x-search";
  fetchedAt?: string;
}

export interface WikiTree {
  category: WikiCategory;
  label: string;
  icon: string;
  articles: Array<{ id: string; slug: string; title: string; memoryTier: MemoryTier }>;
}

export interface WikiSearchResult {
  article: WikiArticle;
  matchScore: number;
  matchField: string;
}

// OODA context injected into agent prompts
export interface OODAContext {
  known: WikiArticle[];    // Fresh market data (expires)
  learned: WikiArticle[];  // Validated patterns (persistent)
  inferred: WikiArticle[]; // Tentative signals (promoted by Dream)
}
