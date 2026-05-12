/**
 * OODA Journal — append-only JSONL tick log with optional git commit.
 * State lives in git, never in memory across runs (Ralph pattern).
 */

import { execSync } from "child_process";
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const ROOT = new URL("..", import.meta.url);
const JOURNAL_DIR = join(fileURLToPath(ROOT), "ooda", "journal");
const JOURNAL_FILE = join(JOURNAL_DIR, "ticks.jsonl");

export interface JournalEntry {
  tick: number;
  now: string;
  candle: { t: number; o: number; h: number; l: number; c: number; v: number };
  decision: Decision;
  outcome: Outcome;
  book: BookSnapshot;
  consecutive_losses: number;
  model?: string;
  x402_payment_id?: string;
}

export interface Decision {
  action: "hold" | "open" | "close";
  side?: "long" | "short";
  size_lamports?: number;
  position_id?: string;
  reason: string;
  confidence?: number;
  aggression?: "low" | "medium" | "high" | "goblin";
  goblin_mode?: boolean;
  thesis?: string;
  computer_use_plan?: string[];
}

export interface Outcome {
  applied: boolean;
  kind: string;
  reason?: string;
  position?: Record<string, unknown>;
  position_id?: string;
  exit?: number;
  pnl_lamports?: number;
  consecutive_losses?: number;
}

export interface BookSnapshot {
  positions: Array<{
    id: string;
    side: string;
    size_lamports: number;
    entry: number;
    opened_tick: number;
  }>;
  cash_lamports: number;
  realized_pnl_lamports: number;
}

export function journalAppend(entry: JournalEntry): void {
  mkdirSync(JOURNAL_DIR, { recursive: true });
  appendFileSync(JOURNAL_FILE, JSON.stringify(entry) + "\n", "utf8");
}

export function gitCommitJournal(tick: number): void {
  // Best-effort — don't fail the loop if git is unhappy (CI, detached HEAD)
  try {
    execSync(`git add -- ooda/journal/ticks.jsonl`, {
      stdio: "pipe",
      cwd: fileURLToPath(ROOT),
    });
    execSync(
      `git commit --only --allow-empty -m "ooda: tick ${tick}" -- ooda/journal/ticks.jsonl`,
      { stdio: "pipe", cwd: fileURLToPath(ROOT) }
    );
  } catch {
    // git unavailable or nothing to commit — carry on
  }
}
