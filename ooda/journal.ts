/**
 * ooda/journal.ts — Append-only tick journal
 *
 * Every tick is written as a single JSON line to journal/ticks.jsonl.
 * This is the authoritative external record — the harness's memory.
 * State on restart is reconstructed by replaying this file.
 *
 * Ralph rule: "State lives in git."
 */

import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Decision } from './validate.js';
import type { Candle } from './state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOURNAL_PATH = join(__dirname, 'journal', 'ticks.jsonl');

export interface TickEntry {
  tick: number;
  now: string;
  candles_last3: Candle[];
  book_snapshot: unknown;
  decision: Decision;
  outcome: 'applied' | 'rejected' | 'killswitch';
  violation?: string;
  pnl_lamports?: number;
  total_pnl_lamports?: number;
  consecutive_losses?: number;
  event?: string;
}

export function appendTick(entry: TickEntry): void {
  mkdirSync(dirname(JOURNAL_PATH), { recursive: true });
  appendFileSync(JOURNAL_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

/** Read the last N entries from the journal (for observations injection) */
export function readLastEntries(n = 3): TickEntry[] {
  if (!existsSync(JOURNAL_PATH)) return [];
  const lines = readFileSync(JOURNAL_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .slice(-n);
  return lines.map(l => JSON.parse(l) as TickEntry);
}

/** Truncate journal (for fresh run) */
export function clearJournal(): void {
  if (existsSync(JOURNAL_PATH)) {
    appendFileSync(JOURNAL_PATH, '', 'utf8'); // keep file, mark empty-ish
  }
}

/** Format the journal path for display */
export function journalPath(): string {
  return JOURNAL_PATH;
}
