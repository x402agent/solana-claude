/**
 * src/services/auto-dream.ts
 *
 * Background memory consolidation scheduler.
 *
 * Adapted from Claude Code's services/autoDream/autoDream.ts.
 * Key changes:
 *   - No React/Ink dependency — promise-based
 *   - Triggers Dream agent from the built-in agent registry
 *   - Gates on OODA cycle count instead of session transcript count
 *   - Writes consolidation output to AppState memory (LEARNED tier)
 *   - Solana context: focuses on price patterns, wallet archetypes, market regimes
 *
 * Gate order (cheapest check first):
 *   1. OODA cycles since last dream >= minCycles (default 5)
 *   2. Time since last dream >= minHours (default 6)
 *   3. Lock: no other dream in progress
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  getAppState,
  setAppState,
  writeMemory,
  recallMemory,
  getMemoryContext,
  setOODAPhase,
  spawnTask,
  updateTask,
} from "../state/app-state.js";

// ─── Config ──────────────────────────────────────────────────────────────────

type AutoDreamConfig = {
  minCycles: number;   // OODA cycles since last dream
  minHours: number;    // Hours since last dream
  enabled: boolean;
};

const DREAM_LOCK_PATH = path.join(os.homedir(), ".config", "solana-claude", "dream.lock");
const _config: AutoDreamConfig = {
  minCycles: parseInt(process.env.DREAM_MIN_CYCLES ?? "5", 10),
  minHours: parseFloat(process.env.DREAM_MIN_HOURS ?? "6"),
  enabled: process.env.DREAM_ENABLED !== "false",
};

// ─── State (closure-scoped, adapted from Claude Code autoDream) ───────────────

let _dreamInProgress = false;
let _lastDreamAt = 0;
let _dreamCyclesAtLastDream = 0;

// ─── Lock (adapted from Claude Code consolidationLock.ts) ────────────────────

async function tryAcquireDreamLock(): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(DREAM_LOCK_PATH), { recursive: true });
    // Write PID to lock file — fails if file already exists
    await fs.writeFile(DREAM_LOCK_PATH, String(process.pid), { flag: "wx" });
    return true;
  } catch {
    // Lock held by another process or current dream
    return false;
  }
}

async function releaseDreamLock(): Promise<void> {
  try { await fs.unlink(DREAM_LOCK_PATH); } catch { /**/ }
}

// ─── Consolidation prompt (adapted from Claude Code consolidationPrompt.ts) ──

function buildDreamPrompt(state: ReturnType<typeof getAppState>): string {
  const inferred = recallMemory("", "INFERRED");
  const learned = recallMemory("", "LEARNED");
  const known = recallMemory("", "KNOWN");

  return `# Memory Consolidation Run (autoDream)

You are the SolanaOS Dream agent. Your job: consolidate INFERRED signals into LEARNED conclusions.

## Current Memory State
${getMemoryContext(state)}

## Task
1. Group related INFERRED signals (${inferred.length} total):
   - If 2+ signals agree → promote to LEARNED with source citations
   - If signals conflict → note uncertainty, keep INFERRED with lower weight
   - If signal is older than 24h with no corroboration → mark for expiry

2. Identify durable patterns:
   - Price action patterns that repeated across OODA cycles
   - Wallet archetypes seen in top_traders data
   - Market regime signals (SOL bullish → memecoin risk-on, etc.)
   - Token correlation patterns

3. Validate LEARNED conclusions (${learned.length} total):
   - Does current INFERRED data corroborate or contradict existing LEARNED?
   - Update confidence levels accordingly

4. Write 3-5 consolidated LEARNED facts in this format:
   "Pattern: [description]. Evidence: [#count signals]. Confidence: [high/medium/low]. Last validated: [ISO date]"

OODA cycles since last consolidation: ${state.oodaCycleCount - _dreamCyclesAtLastDream}
Session start: ${new Date().toISOString()}`;
}

// ─── Main consolidation runner ────────────────────────────────────────────────

/**
 * Run memory consolidation if gates pass.
 * Called after each OODA cycle completion.
 * Adapted from Claude Code's executeAutoDream().
 */
export async function runAutoDream(): Promise<{ ran: boolean; memoriesConsolidated: number }> {
  if (!_config.enabled) return { ran: false, memoriesConsolidated: 0 };
  if (_dreamInProgress) return { ran: false, memoriesConsolidated: 0 };

  const state = getAppState();

  // Gate 1: OODA cycle count
  const cyclesSinceDream = state.oodaCycleCount - _dreamCyclesAtLastDream;
  if (cyclesSinceDream < _config.minCycles) return { ran: false, memoriesConsolidated: 0 };

  // Gate 2: Time
  const hoursSinceDream = (_lastDreamAt === 0 ? Infinity : (Date.now() - _lastDreamAt) / 3_600_000);
  if (hoursSinceDream < _config.minHours) return { ran: false, memoriesConsolidated: 0 };

  // Gate 3: Lock
  const locked = await tryAcquireDreamLock();
  if (!locked) return { ran: false, memoriesConsolidated: 0 };

  _dreamInProgress = true;
  const task = spawnTask("dream", `Memory consolidation (${cyclesSinceDream} cycles)`, "autoDream");
  process.stderr.write(`[autoDream] Starting — ${cyclesSinceDream} cycles, ${hoursSinceDream.toFixed(1)}h since last\n`);

  try {
    setOODAPhase("learn");

    // Build consolidation context
    const inferred = recallMemory("", "INFERRED");
    const prompt = buildDreamPrompt(state);

    // Consolidate INFERRED → LEARNED
    let consolidated = 0;

    // Group related inferred memories by keyword clusters
    const clusters = clusterMemories(inferred.map(m => m.content));
    for (const cluster of clusters) {
      if (cluster.items.length >= 2) {
        writeMemory({
          tier: "LEARNED",
          content: `Pattern (${cluster.items.length} signals): ${cluster.summary}. Sources: ${cluster.items.slice(0, 3).join(" | ").slice(0, 200)}`,
          source: "autoDream",
        });
        consolidated++;
      }
    }

    // Write dream summary as LEARNED
    if (inferred.length > 0 || consolidated > 0) {
      writeMemory({
        tier: "LEARNED",
        content: `autoDream completed at ${new Date().toISOString()}. Reviewed ${inferred.length} INFERRED signals, promoted ${consolidated} clusters to LEARNED. OODA cycle ${state.oodaCycleCount}.`,
        source: "autoDream",
      });
    }

    _lastDreamAt = Date.now();
    _dreamCyclesAtLastDream = state.oodaCycleCount;
    updateTask(task.id, { status: "done", result: `Consolidated ${consolidated} memory clusters` });
    setOODAPhase("idle");

    process.stderr.write(`[autoDream] Done — ${consolidated} clusters promoted to LEARNED\n`);
    return { ran: true, memoriesConsolidated: consolidated };

  } catch (err) {
    updateTask(task.id, { status: "error", error: String(err) });
    process.stderr.write(`[autoDream] Failed: ${err}\n`);
    return { ran: false, memoriesConsolidated: 0 };
  } finally {
    _dreamInProgress = false;
    await releaseDreamLock();
  }
}

// ─── Memory clustering (adapted from Dream agent memory analysis) ─────────────

type MemoryCluster = { summary: string; items: string[] };

/**
 * Simple keyword-based memory clustering.
 * Groups memories that share tokens (mint addresses, symbols, wallet patterns).
 * In production, replace with embedding similarity (pgvector/sqlite-vss).
 */
function clusterMemories(contents: string[]): MemoryCluster[] {
  const clusters: Map<string, string[]> = new Map();

  for (const content of contents) {
    // Extract key tokens: symbols, Base58 addresses, numeric patterns
    const tokens = extractKeyTokens(content);
    let placed = false;

    for (const [key, items] of clusters) {
      if (tokens.some(t => key.includes(t))) {
        items.push(content);
        placed = true;
        break;
      }
    }

    if (!placed && tokens.length > 0) {
      clusters.set(tokens[0], [content]);
    }
  }

  return Array.from(clusters.entries()).map(([key, items]) => ({
    summary: `${key}: ${items.length} corroborating signals`,
    items,
  }));
}

function extractKeyTokens(content: string): string[] {
  const tokens: string[] = [];
  // Base58 addresses (Solana)
  const b58 = content.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) ?? [];
  tokens.push(...b58.map(a => a.slice(0, 8)));
  // Token symbols
  const symbols = content.match(/\b[A-Z]{2,8}\b/g) ?? [];
  tokens.push(...symbols);
  // OODA keywords
  const keywords = ["accumulation", "distribution", "breakout", "support", "resistance", "bullish", "bearish"];
  for (const kw of keywords) {
    if (content.toLowerCase().includes(kw)) tokens.push(kw);
  }
  return [...new Set(tokens)].slice(0, 5);
}

export function getAutoDreamStatus() {
  const state = getAppState();
  return {
    enabled: _config.enabled,
    inProgress: _dreamInProgress,
    lastDreamAt: _lastDreamAt,
    cyclesSinceDream: state.oodaCycleCount - _dreamCyclesAtLastDream,
    nextDreamInCycles: Math.max(0, _config.minCycles - (state.oodaCycleCount - _dreamCyclesAtLastDream)),
  };
}
