/**
 * src/services/session-memory.ts
 *
 * Session Memory Service — adapted from Claude Code's SessionMemory service.
 *
 * Manages in-session (ephemeral) memory separate from the persistent 3-tier store.
 * Session memory holds:
 *   - Message history (compressed when large)
 *   - Active tool call chain
 *   - Current OODA cycle context
 *   - x402 payment session state
 *   - Helius subscription registry
 *
 * On session end, the most valuable session memory is promoted to AppState
 * KNOWN/INFERRED tiers by the extractMemories service.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomBytes } from "node:crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  timestamp: number;
};

export type SessionContext = {
  sessionId: string;
  startedAt: number;
  lastActiveAt: number;
  messages: SessionMessage[];
  /** Current tool chain for the active query */
  activeToolChain: string[];
  /** Running summary of the session so far (replaces old messages on compaction) */
  summary?: string;
  /** Whether session has been compacted */
  isCompacted: boolean;
  /** OODA cycle count at session start */
  oodaCycleAtStart: number;
  /** Total tool calls in session */
  toolCallCount: number;
  /** Total x402 spend in session */
  x402SpendUSD: number;
  /** Active Helius subscription IDs */
  heliusSubscriptions: number[];
};

// ─── Session store ────────────────────────────────────────────────────────────

const SESSION_DIR = path.join(os.homedir(), ".config", "solana-claude", "sessions");

let _currentSession: SessionContext | null = null;

export function startSession(opts: { oodaCycleAtStart?: number } = {}): SessionContext {
  _currentSession = {
    sessionId: randomBytes(8).toString("hex"),
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
    messages: [],
    activeToolChain: [],
    isCompacted: false,
    oodaCycleAtStart: opts.oodaCycleAtStart ?? 0,
    toolCallCount: 0,
    x402SpendUSD: 0,
    heliusSubscriptions: [],
  };
  return _currentSession;
}

export function getCurrentSession(): SessionContext {
  if (!_currentSession) return startSession();
  return _currentSession;
}

export function addSessionMessage(msg: Omit<SessionMessage, "id" | "timestamp">): SessionMessage {
  const session = getCurrentSession();
  const full: SessionMessage = {
    ...msg,
    id: randomBytes(4).toString("hex"),
    timestamp: Date.now(),
  };
  session.messages.push(full);
  session.lastActiveAt = Date.now();
  return full;
}

export function addToToolChain(toolName: string): void {
  const session = getCurrentSession();
  session.activeToolChain.push(toolName);
  session.toolCallCount++;
}

export function clearToolChain(): string[] {
  const session = getCurrentSession();
  const chain = [...session.activeToolChain];
  session.activeToolChain = [];
  return chain;
}

// ─── Compact (adapted from Claude Code's compact service) ────────────────────

const MAX_MESSAGES_BEFORE_COMPACT = parseInt(process.env.SESSION_MAX_MESSAGES ?? "100", 10);

/**
 * Compact session messages when they grow large.
 * Adapted from Claude Code's compact service — replaces old messages with summary.
 *
 * In production, run a compact agent (like Claude Code's /compact command)
 * to produce a high-quality summary. Here we produce a structured summary.
 */
export function compactSessionIfNeeded(): boolean {
  const session = getCurrentSession();
  if (session.messages.length < MAX_MESSAGES_BEFORE_COMPACT) return false;
  if (session.isCompacted) return false;

  const toolMessages = session.messages.filter(m => m.role === "tool");
  const userMessages = session.messages.filter(m => m.role === "user");
  const assistantMessages = session.messages.filter(m => m.role === "assistant");

  // Generate structured summary
  const uniqueTools = [...new Set(toolMessages.map(m => m.toolName).filter(Boolean))];
  const lastUserMsg = userMessages.at(-1)?.content.slice(0, 200);
  const lastAssistantMsg = assistantMessages.at(-1)?.content.slice(0, 200);

  session.summary = [
    `Session compacted at ${new Date().toISOString()}`,
    `Messages: ${session.messages.length} (${userMessages.length} user, ${assistantMessages.length} assistant, ${toolMessages.length} tool)`,
    `Tools used: ${uniqueTools.join(", ")}`,
    `Tool calls: ${session.toolCallCount}`,
    `x402 spend: $${session.x402SpendUSD.toFixed(4)}`,
    lastUserMsg ? `Last user: ${lastUserMsg}` : "",
    lastAssistantMsg ? `Last assistant: ${lastAssistantMsg}` : "",
  ].filter(Boolean).join("\n");

  // Keep only last 20 messages
  session.messages = session.messages.slice(-20);
  session.isCompacted = true;

  process.stderr.write(`[session] Compacted — ${session.summary.slice(0, 100)}\n`);
  return true;
}

// ─── Persistence (adapted from Claude Code session storage) ──────────────────

export async function saveSession(session?: SessionContext): Promise<void> {
  const s = session ?? _currentSession;
  if (!s) return;
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    const filePath = path.join(SESSION_DIR, `${s.sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(s, null, 2), "utf-8");
  } catch (err) {
    process.stderr.write(`[session] Failed to save: ${err}\n`);
  }
}

export async function loadSession(sessionId: string): Promise<SessionContext | null> {
  try {
    const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as SessionContext;
  } catch {
    return null;
  }
}

export async function listSessions(limit = 20): Promise<Array<{
  sessionId: string;
  startedAt: number;
  lastActiveAt: number;
  toolCallCount: number;
}>> {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    const files = await fs.readdir(SESSION_DIR);
    const sessions = await Promise.all(
      files
        .filter(f => f.endsWith(".json"))
        .slice(-limit)
        .map(async f => {
          try {
            const raw = await fs.readFile(path.join(SESSION_DIR, f), "utf-8");
            const s = JSON.parse(raw) as SessionContext;
            return {
              sessionId: s.sessionId,
              startedAt: s.startedAt,
              lastActiveAt: s.lastActiveAt,
              toolCallCount: s.toolCallCount,
            };
          } catch { return null; }
        }),
    );
    return sessions.filter(Boolean).sort((a, b) => b!.lastActiveAt - a!.lastActiveAt) as Array<{
      sessionId: string; startedAt: number; lastActiveAt: number; toolCallCount: number;
    }>;
  } catch {
    return [];
  }
}

// ─── Tool use summary (adapted from Claude Code toolUseSummaryGenerator.ts) ──

/**
 * Generate a short summary label for a completed tool chain.
 * Adapted from Claude Code's toolUseSummaryGenerator.ts (which uses claude-haiku).
 * Here we use a rule-based approach to avoid LLM cost for summaries.
 */
export function generateToolChainSummary(toolChain: string[]): string {
  if (toolChain.length === 0) return "";
  if (toolChain.length === 1) return formatSingleTool(toolChain[0]);

  // Pattern-based labelling (adapted from Claude Code's haiku prompt examples)
  const unique = [...new Set(toolChain)];
  const hasHelius = unique.some(t => t.startsWith("helius_"));
  const hasSolana = unique.some(t => t.startsWith("solana_"));
  const hasMemory = unique.some(t => t.startsWith("memory_"));
  const hasAgent = unique.some(t => t.startsWith("agent_"));

  if (hasHelius && hasSolana) return "Fetched onchain + market data";
  if (hasHelius) return `Queried ${unique.filter(t => t.startsWith("helius_")).length} Helius endpoints`;
  if (hasSolana) return `Fetched ${unique.filter(t => t.startsWith("solana_")).length} market data points`;
  if (hasMemory && hasAgent) return "Agent spawned with memory context";
  if (hasMemory) return "Read/wrote memory";
  if (hasAgent) return "Spawned sub-agent";
  return `Ran ${toolChain.length} tools (${unique.slice(0, 2).join(", ")}${unique.length > 2 ? "..." : ""})`;
}

function formatSingleTool(tool: string): string {
  const labels: Record<string, string> = {
    solana_price:     "Fetched price",
    solana_trending:  "Scanned trending tokens",
    solana_token_info: "Fetched token info",
    solana_wallet_pnl: "Checked wallet P&L",
    helius_account_info: "Fetched account",
    helius_transactions: "Read tx history",
    helius_priority_fee: "Checked priority fee",
    agentSpawn: "Spawned agent",
    memory_recall: "Recalled memory",
    memory_write: "Wrote memory",
  };
  return labels[tool] ?? `Called ${tool}`;
}
