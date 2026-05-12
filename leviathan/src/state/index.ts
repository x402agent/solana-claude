/**
 * leviathan/src/state/index.ts — Shell state persistence (JSON v0)
 *
 * In v1 this becomes SQLite at ~/.openclawd/shell.db.
 * For hackathon v0 we use atomic JSON writes — no native bindings needed.
 *
 * Every write is atomic: write to .tmp then rename.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ClawState, ClawStrike } from '../types.js';
import { constitutionHash } from '../three-laws.js';

const OPENCLAWD_DIR = join(homedir(), '.openclawd');
const SHELL_JSON = join(OPENCLAWD_DIR, 'shell.json');
const STRIKES_JSONL = join(OPENCLAWD_DIR, 'strikes.jsonl');

export function ensureDir(): void {
  mkdirSync(OPENCLAWD_DIR, { recursive: true, mode: 0o700 });
}

/** Load persisted ClawState, or return null if not spawned yet */
export function loadState(): ClawState | null {
  if (!existsSync(SHELL_JSON)) return null;
  try {
    return JSON.parse(readFileSync(SHELL_JSON, 'utf8')) as ClawState;
  } catch {
    return null;
  }
}

/** Persist ClawState atomically */
export function saveState(state: ClawState): void {
  ensureDir();
  const tmp = SHELL_JSON + '.tmp';
  writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(tmp, SHELL_JSON);
}

/** Append a strike to the strike log */
export function appendStrike(strike: ClawStrike): void {
  ensureDir();
  appendFileSync(STRIKES_JSONL, JSON.stringify(strike) + '\n');
}

/** Read last N strikes from the journal */
export function readLastStrikes(n = 3): ClawStrike[] {
  if (!existsSync(STRIKES_JSONL)) return [];
  try {
    return readFileSync(STRIKES_JSONL, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-n)
      .map(l => JSON.parse(l) as ClawStrike);
  } catch {
    return [];
  }
}

/** Create a fresh ClawState for a newly spawned leviathan */
export function createFreshState(opts: {
  name: string;
  pubkey: string;
  creatorPubkey: string;
  parentPubkey?: string;
  spawnPrompt?: string;
}): ClawState {
  return {
    identity: {
      pubkey: opts.pubkey,
      name: opts.name,
      creatorPubkey: opts.creatorPubkey,
      spawnedAt: new Date().toISOString(),
      parentPubkey: opts.parentPubkey,
      constitutionHash: constitutionHash(),
      shellVersion: 1,
    },
    depth: 'beached',
    usdcBalance: 0,
    solBalance: 0,
    clawdBalance: 0,
    tickCount: 0,
    totalEarned: 0,
    totalSpent: 0,
    openTrades: 0,
    spawnlings: [],
    lastPulse: new Date().toISOString(),
    shellMd: `# ${opts.name}\n\nI was just spawned. I am learning the ocean.\n`,
  };
}
