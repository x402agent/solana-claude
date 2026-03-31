/**
 * src/services/extract-memories.ts
 *
 * Memory extraction service — adapted from Claude Code's extractMemories.ts.
 *
 * At the end of each OODA cycle (or after a significant tool chain), this
 * service scans the session messages and extracts durable facts to persist
 * in the 3-tier memory store (KNOWN/LEARNED/INFERRED).
 *
 * Claude Code uses a forked haiku agent to extract memories from transcripts.
 * solana-claude uses a rule-based extractor tuned for Solana trading context,
 * keeping it free-to-run without extra LLM API calls.
 *
 * What gets extracted:
 *   KNOWN   — Prices, balances, token info (expires in 60s-5min)
 *   INFERRED — Trading signals, pattern observations, smart money moves
 *   LEARNED  — Only written by autoDream consolidation, not extraction
 */

import {
  writeMemory,
  recallMemory,
  type MemoryEntry,
} from "../state/app-state.js";
import type { SessionMessage } from "./session-memory.js";

// ─── Extraction rules (Solana-domain) ────────────────────────────────────────

type ExtractionRule = {
  id: string;
  /** Match condition */
  matches: (msg: SessionMessage) => boolean;
  /** Extract memory entries from the message */
  extract: (msg: SessionMessage) => Array<Omit<MemoryEntry, "id" | "createdAt">>;
};

const RULES: ExtractionRule[] = [
  // Rule: price data from assistant messages
  {
    id: "price",
    matches: (m) => m.role === "assistant" && /\$[\d,]+\.?\d*.*SOL|SOL.*\$[\d,]+\.?\d*/i.test(m.content),
    extract: (m) => {
      const match = m.content.match(/SOL.*?\$([\d,]+\.?\d*)|\\$([\d,]+\.?\d*).*SOL/);
      if (!match) return [];
      const price = match[1] || match[2];
      return [{
        tier: "KNOWN",
        content: `SOL price: $${price}`,
        source: "extraction:price",
        expiresAt: Date.now() + 60_000,
      }];
    },
  },

  // Rule: token security scores
  {
    id: "security",
    matches: (m) => m.role === "tool" && m.toolName === "solana_token_info",
    extract: (m) => {
      const scoreMatch = m.content.match(/"score":\s*(\d+)/);
      const symbolMatch = m.content.match(/"symbol":\s*"([^"]+)"/);
      if (!scoreMatch || !symbolMatch) return [];
      return [{
        tier: "INFERRED",
        content: `${symbolMatch[1]} security score: ${scoreMatch[1]}/100`,
        source: "extraction:security",
      }];
    },
  },

  // Rule: top traders / smart money activity
  {
    id: "smart-money",
    matches: (m) => m.role === "tool" && m.toolName === "solana_top_traders",
    extract: (m) => {
      const symbolMatch = m.content.match(/"symbol":\s*"([^"]+)"/);
      if (!symbolMatch) return [];
      return [{
        tier: "INFERRED",
        content: `Smart money activity detected on ${symbolMatch[1]}`,
        source: "extraction:smart-money",
      }];
    },
  },

  // Rule: OODA signals from assistant analysis
  {
    id: "ooda-signal",
    matches: (m) =>
      m.role === "assistant" &&
      /score[d\s]*:?\s*([5-9]\d|100)\/100/i.test(m.content),
    extract: (m) => {
      const scoreMatch = m.content.match(/([A-Z]{2,8}).*?score[d\s]*:?\s*(\d+)\/100/i);
      if (!scoreMatch) return [];
      return [{
        tier: "INFERRED",
        content: `OODA signal: ${scoreMatch[1]} scored ${scoreMatch[2]}/100`,
        source: "extraction:ooda",
      }];
    },
  },

  // Rule: wallet balance changes from Helius
  {
    id: "balance",
    matches: (m) => m.role === "tool" && m.toolName === "helius_balance",
    extract: (m) => {
      const solMatch = m.content.match(/([\d.]+)\s*SOL/);
      if (!solMatch) return [];
      return [{
        tier: "KNOWN",
        content: `Balance: ${solMatch[1]} SOL`,
        source: "extraction:balance",
        expiresAt: Date.now() + 5 * 60_000,
      }];
    },
  },

  // Rule: priority fee readings
  {
    id: "priority-fee",
    matches: (m) => m.role === "tool" && m.toolName === "helius_priority_fee",
    extract: (m) => {
      const feeMatch = m.content.match(/"recommended":\s*(\d+)/);
      if (!feeMatch) return [];
      return [{
        tier: "KNOWN",
        content: `Priority fee recommended: ${feeMatch[1]} µLamports`,
        source: "extraction:priority-fee",
        expiresAt: Date.now() + 30_000,
      }];
    },
  },

  // Rule: trending token mentions in assistant content
  {
    id: "trending",
    matches: (m) => m.role === "tool" && m.toolName === "solana_trending",
    extract: (m) => {
      const symbols = m.content.match(/"symbol":\s*"([^"]+)"/g)?.slice(0, 5) ?? [];
      if (symbols.length === 0) return [];
      const list = symbols.map(s => s.replace(/"symbol":\s*"([^"]+)"/, "$1")).join(", ");
      return [{
        tier: "INFERRED",
        content: `Trending tokens at ${new Date().toLocaleTimeString()}: ${list}`,
        source: "extraction:trending",
        expiresAt: Date.now() + 10 * 60_000,
      }];
    },
  },

  // Rule: x402 payment made
  {
    id: "x402",
    matches: (m) => m.role === "system" && m.content.includes("[x402] Paying"),
    extract: (m) => {
      const amtMatch = m.content.match(/Paying \$([\d.]+)/);
      const descMatch = m.content.match(/for: (.+)/);
      if (!amtMatch) return [];
      return [{
        tier: "KNOWN",
        content: `x402 payment: $${amtMatch[1]} for ${descMatch?.[1] ?? "API access"}`,
        source: "extraction:x402",
        expiresAt: Date.now() + 60 * 60_000,
      }];
    },
  },
];

// ─── Extractor state (closure-scoped, adapted from Claude Code) ───────────────

let _lastExtractedMessageId: string | undefined;
let _extractInProgress = false;

/**
 * Run memory extraction on new session messages.
 * Call after each completed OODA cycle step.
 * Adapted from Claude Code's executeExtractMemories() + runExtraction().
 */
export async function extractMemories(
  messages: SessionMessage[],
): Promise<{ extracted: number; skipped: number }> {
  if (_extractInProgress) return { extracted: 0, skipped: -1 }; // coalesce

  _extractInProgress = true;
  let extracted = 0;
  let skipped = 0;

  try {
    // Find messages since last extraction (adapted from Claude Code cursor pattern)
    const startIdx = _lastExtractedMessageId
      ? messages.findIndex(m => m.id === _lastExtractedMessageId) + 1
      : 0;

    const newMessages = messages.slice(startIdx);
    if (newMessages.length === 0) return { extracted: 0, skipped: 0 };

    for (const msg of newMessages) {
      let matched = false;
      for (const rule of RULES) {
        if (rule.matches(msg)) {
          const entries = rule.extract(msg);
          for (const entry of entries) {
            // Dedup: don't write duplicate INFERRED signals
            if (entry.tier === "INFERRED") {
              const existing = recallMemory(entry.content.slice(0, 30), "INFERRED");
              if (existing.length > 0) { skipped++; continue; }
            }
            writeMemory(entry);
            extracted++;
          }
          matched = true;
        }
      }
      if (!matched) skipped++;
    }

    // Advance cursor (adapted from Claude Code's lastMemoryMessageUuid)
    const lastMsg = newMessages.at(-1);
    if (lastMsg) _lastExtractedMessageId = lastMsg.id;

    if (extracted > 0) {
      process.stderr.write(`[extractMemories] Extracted ${extracted} memories from ${newMessages.length} messages\n`);
    }

  } catch (err) {
    process.stderr.write(`[extractMemories] Error: ${err}\n`);
  } finally {
    _extractInProgress = false;
  }

  return { extracted, skipped };
}

/** Reset cursor (call on session reset) */
export function resetExtractionCursor(): void {
  _lastExtractedMessageId = undefined;
}
