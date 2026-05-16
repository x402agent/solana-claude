import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Candle } from "./state.js";
import type { Decision } from "./validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOURNAL_PATH = join(__dirname, "journal", "ticks.jsonl");

export interface TickEntry {
  tick: number;
  now: string;
  candles_last3: Candle[];
  whale_activity?: unknown;
  book_snapshot: unknown;
  decision: Decision;
  outcome: "applied" | "rejected" | "killswitch";
  violation?: string;
  pnl_lamports?: number;
  total_pnl_lamports?: number;
  consecutive_losses?: number;
  event?: string;
  molt_note?: string;
}

export function appendTick(entry: TickEntry): void {
  mkdirSync(dirname(JOURNAL_PATH), { recursive: true });
  appendFileSync(JOURNAL_PATH, `${JSON.stringify(entry)}\n`, "utf8");
}

export function readLastEntries(n = 3): TickEntry[] {
  if (!existsSync(JOURNAL_PATH)) return [];
  return readFileSync(JOURNAL_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-n)
    .map((line) => JSON.parse(line) as TickEntry);
}

export function clearJournal(): void {
  mkdirSync(dirname(JOURNAL_PATH), { recursive: true });
  writeFileSync(JOURNAL_PATH, "", "utf8");
}

export function journalPath(): string {
  return JOURNAL_PATH;
}

