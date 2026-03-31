/**
 * SolanaOS Memory Extraction
 *
 * Adapted from Claude Code's src/services/extractMemories/ + src/memdir/ hierarchy.
 *
 * Auto-extracts KNOWN / LEARNED / INFERRED facts from conversation turns
 * and routes them to the correct memory tier in the SolanaOS dual-memory stack:
 *
 *   KNOWN  → ephemeral session state (expires ~60s, live API data)
 *   LEARNED → Honcho peer conclusions (durable, cross-session)
 *   INFERRED → local vault (markdown files, searchable)
 *
 * This mirrors SolanaOS's SOUL.md epistemological model exactly.
 *
 * Integration:
 *  - Call extractFromTurn() after each LLM response
 *  - Routes LEARNED facts to Honcho via the existing pkg/honcho/ Go client
 *    (via gateway REST) or directly to the Honcho API
 *  - Routes INFERRED facts to vault (local markdown files)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Memory Tiers (SOUL.md epistemological model)
// ─────────────────────────────────────────────────────────────────────────────

export type MemoryTier = "KNOWN" | "LEARNED" | "INFERRED";

export interface ExtractedMemory {
  tier: MemoryTier;
  content: string;
  /** Source context (turn ID, timestamp) */
  sourceId: string;
  /** Confidence: 0–1 */
  confidence: number;
  /** Solana-specific tags: token mint, wallet, strategy, etc. */
  tags: string[];
  /** Whether this contradicts an existing LEARNED fact */
  contradicts?: string;
  extractedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction patterns (rule-based for speed, LLM-backed for depth)
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_PATTERNS: RegExp[] = [
  /price of .+ is \$?[\d,.]+/i,
  /current (price|volume|liquidity|market cap) .+ [\d,.]+/i,
  /\d+ (holders|wallets)/i,
  /bonding curve .+ \d+%/i,
  /funded .* on-chain/i,
];

const LEARNED_PATTERNS: RegExp[] = [
  /win rate .+ \d+%/i,
  /(always|never) (buy|sell|enter|exit)/i,
  /pattern .+ works /i,
  /(risk|position size|sizing) .+ (strategy|preference|setting)/i,
  /user prefer[s]? .+/i,
  /remember that .+/i,
];

const INFERRED_PATTERNS: RegExp[] = [
  /seems like .+/i,
  /appears to (correlate|follow|lead)/i,
  /when .+ tends to .+/i,
  /(SOL|BTC|ETH) dominance .+ correlat/i,
  /funding rate .+ suggest/i,
];

function detectTier(content: string): { tier: MemoryTier; confidence: number } {
  for (const pattern of KNOWN_PATTERNS) {
    if (pattern.test(content)) return { tier: "KNOWN", confidence: 0.9 };
  }
  for (const pattern of LEARNED_PATTERNS) {
    if (pattern.test(content)) return { tier: "LEARNED", confidence: 0.85 };
  }
  for (const pattern of INFERRED_PATTERNS) {
    if (pattern.test(content)) return { tier: "INFERRED", confidence: 0.7 };
  }
  return { tier: "INFERRED", confidence: 0.5 };
}

function extractTags(content: string): string[] {
  const tags: string[] = [];

  // Solana mint addresses
  const mints = content.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
  if (mints) tags.push(...mints.slice(0, 3).map((m) => `mint:${m}`));

  // Token symbols
  const symbols = content.match(/\b(SOL|BONK|WIF|POPCAT|JUP|PENGU|MEW|TRUMP|USDC|USDT)\b/g);
  if (symbols) tags.push(...[...new Set(symbols)].map((s) => `token:${s}`));

  // Topics
  if (/buy|long|entry/i.test(content)) tags.push("trade:buy");
  if (/sell|short|exit/i.test(content)) tags.push("trade:sell");
  if (/hyperliquid|perp|leverage/i.test(content)) tags.push("venue:hyperliquid");
  if (/aster/i.test(content)) tags.push("venue:aster");
  if (/pump\.?fun|bonding/i.test(content)) tags.push("venue:pumpfun");
  if (/risk|stop|loss/i.test(content)) tags.push("risk-management");

  return [...new Set(tags)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn extraction
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
}

/**
 * Extract memories from a conversation turn.
 * Adapted from Claude Code's extractMemories service.
 *
 * Rule-based extraction runs synchronously. For deeper LLM-backed extraction,
 * call extractFromTurnWithLLM() which sends to the Go daemon's /api/v1/memory/extract.
 */
export function extractFromTurn(turn: ConversationTurn): ExtractedMemory[] {
  const sentences = turn.content
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const memories: ExtractedMemory[] = [];

  for (const sentence of sentences) {
    const { tier, confidence } = detectTier(sentence);

    // Only extract with reasonable confidence
    if (confidence < 0.6) continue;

    // Skip pure questions
    if (sentence.trim().endsWith("?")) continue;

    memories.push({
      tier,
      content: sentence,
      sourceId: turn.id,
      confidence,
      tags: extractTags(sentence),
      extractedAt: new Date(),
    });
  }

  return memories;
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Router — sends to correct backend
// ─────────────────────────────────────────────────────────────────────────────

export interface MemoryRouterConfig {
  /** SolanaOS gateway URL (for relaying to Go daemon) */
  gatewayUrl: string;
  /** Auth token */
  authToken?: string;
  /** Honcho session ID */
  honchoSessionId?: string;
  /** Wallet address for vault scoping */
  walletAddress?: string;
  /** Disable actual writes (for testing) */
  dryRun?: boolean;
}

export class MemoryRouter {
  private config: MemoryRouterConfig;
  private buffer: ExtractedMemory[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: MemoryRouterConfig) {
    this.config = config;
  }

  /** Add memories to the buffer */
  queue(memories: ExtractedMemory[]): void {
    this.buffer.push(...memories);
    this.scheduleFlush();
  }

  /** Immediately process and route all buffered memories */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const toProcess = [...this.buffer];
    this.buffer = [];

    if (toProcess.length === 0 || this.config.dryRun) return;

    // Group by tier
    const known = toProcess.filter((m) => m.tier === "KNOWN");
    const learned = toProcess.filter((m) => m.tier === "LEARNED");
    const inferred = toProcess.filter((m) => m.tier === "INFERRED");

    // KNOWN → ephemeral session state (no persistent write needed)
    // LEARNED → Honcho peer conclusions
    if (learned.length > 0) {
      await this.sendToGateway("/api/v1/memory/honcho/conclusions", learned);
    }

    // INFERRED → local vault
    if (inferred.length > 0) {
      await this.sendToGateway("/api/v1/memory/vault/write", inferred);
    }

    // Suppress unused variable warning
    void known;
  }

  private scheduleFlush(delayMs = 2000): void {
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), delayMs);
    }
  }

  private async sendToGateway(path: string, memories: ExtractedMemory[]): Promise<void> {
    try {
      await fetch(`${this.config.gatewayUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
        },
        body: JSON.stringify({
          memories,
          sessionId: this.config.honchoSessionId,
          walletAddress: this.config.walletAddress,
        }),
      });
    } catch {
      // Non-fatal — memory writes are best-effort
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Hierarchy types (Claude Code memdir → Honcho mapping)
// ─────────────────────────────────────────────────────────────────────────────

export interface MemoryScope {
  /** Project-level: maps to Honcho session (per-workspace) */
  project?: string;
  /** User-level: maps to Honcho peer (per-wallet) */
  user?: string;
  /** Session-level: ephemeral, maps to KNOWN tier */
  session?: string;
}

/**
 * Format memory hierarchy for LLM context injection.
 * Adapted from Claude Code's CLAUDE.md injection pattern.
 *
 * In SolanaOS this is injected at the start of each LLM turn
 * alongside the SOUL.md content.
 */
export function formatMemoryContext(
  memories: ExtractedMemory[],
  maxChars = 2000,
): string {
  const byTier: Record<MemoryTier, string[]> = {
    KNOWN: [],
    LEARNED: [],
    INFERRED: [],
  };

  for (const m of memories.sort((a, b) => b.confidence - a.confidence)) {
    byTier[m.tier].push(`- ${m.content}`);
  }

  const sections: string[] = [];

  if (byTier.KNOWN.length > 0) {
    sections.push(`## KNOWN (fresh, < 60s)\n${byTier.KNOWN.join("\n")}`);
  }
  if (byTier.LEARNED.length > 0) {
    sections.push(`## LEARNED (from trade outcomes)\n${byTier.LEARNED.join("\n")}`);
  }
  if (byTier.INFERRED.length > 0) {
    sections.push(`## INFERRED (cross-asset reasoning)\n${byTier.INFERRED.join("\n")}`);
  }

  const full = sections.join("\n\n");
  return full.length <= maxChars ? full : full.slice(0, maxChars) + "\n...(truncated)";
}
