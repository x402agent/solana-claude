/**
 * HERMES OODA Loop — Dark Ralph pattern in TypeScript.
 *
 * Observe → Orient → Decide → Act → Journal → (repeat)
 *
 * Paper trading only. Devnet only. No signing path.
 * Mirrors the safety contract from dark-ralph/loop.py exactly:
 *   - mode must be "paper"
 *   - network must be "devnet"
 *   - mainnet RPC hostnames rejected at startup
 *   - one position at a time
 *   - kill-switch on N consecutive losses
 *   - every decision journalled
 *   - state lives in git (journal/ticks.jsonl)
 */

import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { claudeDecision, openaiDecision, ruleBasedDecision } from "./decide.ts";
import type { BookSnapshot, Decision, JournalEntry, Outcome } from "./journal.ts";
import { gitCommitJournal, journalAppend } from "./journal.ts";
import type { Candle } from "./observe.ts";
import { initRng, observe, rejectMainnet } from "./observe.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RALPH_MD = join(ROOT, "ooda", "ralph.md");

// ── Types ───────────────────────────────────────────────────────────────────

export interface Position {
  id: string;
  side: "long" | "short";
  size_lamports: number;
  entry: number;
  opened_tick: number;
}

export interface Book {
  positions: Position[];
  cash_lamports: number;
  realized_pnl_lamports: number;
}

export interface LoopState {
  tick: number;
  candles: Candle[];
  book: Book;
  consecutiveLosses: number;
  lastDecisions: JournalEntry[];
}

export interface LoopOptions {
  ticks: number;
  sleepMs: number;
  seed: number;
  commitEvery: number;
  tui: boolean;
  useLlm: boolean;
  decisionEngine?: "claude" | "openai";
  goblinMode?: boolean;
  background?: boolean;
  computerUse?: boolean;
  extras?: () => Promise<Record<string, unknown>>;
}

// ── Frontmatter parsing ─────────────────────────────────────────────────────

function parseFrontmatter(): Record<string, unknown> {
  const text = readFileSync(RALPH_MD, "utf8");
  if (!text.startsWith("---\n")) throw new Error("ralph.md missing frontmatter");
  const end = text.indexOf("\n---", 4);
  if (end < 0) throw new Error("ralph.md frontmatter unterminated");
  const out: Record<string, unknown> = {};
  for (const line of text.slice(4, end).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx < 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    out[k] = /^-?\d+$/.test(v) ? parseInt(v, 10) : v;
  }
  return out;
}

// ── Decision validation ─────────────────────────────────────────────────────

function validateDecision(decision: Decision, caps: Record<string, unknown>): string | null {
  if (!["hold", "open", "close"].includes(decision.action)) {
    return `unknown action: ${decision.action}`;
  }
  if (decision.action === "open") {
    if (!["long", "short"].includes(decision.side ?? "")) {
      return `open requires side in long/short, got: ${decision.side}`;
    }
    const size = decision.size_lamports;
    if (typeof size !== "number" || size <= 0 || !Number.isInteger(size)) {
      return "open requires positive integer size_lamports";
    }
    const cap = Number(caps.max_position_size_lamports ?? 0);
    if (size > cap) return `size ${size} exceeds cap ${cap}`;
  }
  if (decision.action === "close") {
    if (!decision.position_id) return "close requires position_id";
  }
  return null;
}

// ── Act phase ───────────────────────────────────────────────────────────────

function act(decision: Decision, state: LoopState, lastClose: number): Outcome {
  switch (decision.action) {
    case "hold":
      return { applied: true, kind: "hold" };

    case "open": {
      if (state.book.positions.length > 0) {
        return { applied: false, kind: "open", reason: "position already open" };
      }
      const pos: Position = {
        id: `p-${Math.random().toString(36).slice(2, 10)}`,
        side: decision.side!,
        size_lamports: decision.size_lamports!,
        entry: lastClose,
        opened_tick: state.tick,
      };
      state.book.positions.push(pos);
      return { applied: true, kind: "open", position: pos as unknown as Record<string, unknown> };
    }

    case "close": {
      const idx = state.book.positions.findIndex((p) => p.id === decision.position_id);
      if (idx < 0) {
        return { applied: false, kind: "close", reason: `position ${decision.position_id} not found` };
      }
      const [pos] = state.book.positions.splice(idx, 1);
      let priceDelta = lastClose - pos.entry;
      if (pos.side === "short") priceDelta = -priceDelta;
      const pnl = Math.trunc((priceDelta * pos.size_lamports) / Math.max(pos.entry, 1));
      state.book.realized_pnl_lamports += pnl;
      if (pnl < 0) {
        state.consecutiveLosses++;
      } else {
        state.consecutiveLosses = 0;
      }
      return {
        applied: true,
        kind: "close",
        position_id: decision.position_id,
        exit: lastClose,
        pnl_lamports: pnl,
        consecutive_losses: state.consecutiveLosses,
      };
    }
  }
}

// ── Emit ─────────────────────────────────────────────────────────────────────

function emit(payload: Record<string, unknown>, _tui: boolean): void {
  process.stdout.write(JSON.stringify(payload) + "\n");
}

// ── Sleep ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function bookSnapshot(book: Book): BookSnapshot {
  return {
    positions: book.positions.map((p) => ({ ...p })),
    cash_lamports: book.cash_lamports,
    realized_pnl_lamports: book.realized_pnl_lamports,
  };
}

// ── Main loop ────────────────────────────────────────────────────────────────

export async function runLoop(opts: LoopOptions): Promise<number> {
  const caps = parseFrontmatter();

  if (caps.mode !== "paper") {
    throw new Error("v0 only supports mode: paper in ralph.md");
  }
  if (caps.network !== "devnet") {
    throw new Error("v0 only supports network: devnet in ralph.md");
  }
  rejectMainnet(process.env.SOLANA_RPC_URL);
  initRng(opts.seed);

  const state: LoopState = {
    tick: 0,
    candles: [],
    book: {
      positions: [],
      cash_lamports: 10_000_000,
      realized_pnl_lamports: 0,
    },
    consecutiveLosses: 0,
    lastDecisions: [],
  };

  const killThreshold = Number(caps.loss_killswitch_consecutive ?? 3);

  emit({ event: "start", frontmatter: caps, seed: opts.seed, ticks: opts.ticks }, opts.tui);

  for (let n = 1; n <= opts.ticks; n++) {
    state.tick = n;

    // ── OBSERVE ──────────────────────────────────────────────────────────────
    const candle = await observe(state);
    state.candles.push(candle);
    if (state.candles.length > 64) state.candles = state.candles.slice(-64);

    // ── ORIENT (extras: dark DeFi, x402 signals) ─────────────────────────────
    const extras = opts.extras ? await opts.extras() : {};

    // ── DECIDE ───────────────────────────────────────────────────────────────
    let decision: Decision;
    if (opts.useLlm) {
      decision = opts.decisionEngine === "openai"
        ? await openaiDecision(state, {
            caps,
            extras,
            goblinMode: opts.goblinMode,
            background: opts.background,
            computerUse: opts.computerUse,
          })
        : await claudeDecision(state, { caps, extras });
    } else {
      decision = ruleBasedDecision(state, caps);
    }

    // Validate + override if invalid
    const validationErr = validateDecision(decision, caps);
    if (validationErr) {
      decision = { action: "hold", reason: `rejected by harness: ${validationErr}` };
    }

    // ── ACT ──────────────────────────────────────────────────────────────────
    const outcome = act(decision, state, candle.c);

    // ── JOURNAL ──────────────────────────────────────────────────────────────
    const entry: JournalEntry = {
      tick: n,
      now: new Date().toISOString(),
      candle,
      decision,
      outcome,
      book: bookSnapshot(state.book),
      consecutive_losses: state.consecutiveLosses,
      model: opts.useLlm ? (opts.decisionEngine === "openai" ? "openai-responses" : "claude-sonnet-4-6") : "rule-based",
    };
    journalAppend(entry);
    state.lastDecisions = [...state.lastDecisions, entry].slice(-3);
    emit({ event: "tick", ...entry, ...extras }, opts.tui);

    // ── KILL-SWITCH ───────────────────────────────────────────────────────────
    if (state.consecutiveLosses >= killThreshold) {
      emit(
        {
          event: "killswitch",
          tick: n,
          reason: `${state.consecutiveLosses} consecutive losses >= threshold ${killThreshold}`,
        },
        opts.tui
      );
      return 2;
    }

    if (opts.commitEvery > 0 && n % opts.commitEvery === 0) {
      gitCommitJournal(n);
    }

    if (opts.sleepMs > 0) await sleep(opts.sleepMs);
  }

  if (opts.commitEvery > 0) gitCommitJournal(state.tick);

  emit({ event: "done", tick: state.tick, book: bookSnapshot(state.book) }, opts.tui);
  return 0;
}
