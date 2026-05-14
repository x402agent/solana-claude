/** Validates env at boot. Returns a printable report, never throws unless explicitly required. */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

export function loadEnv() {
  if (loaded) return;
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../X/.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../../X/.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      break;
    }
  }
  loaded = true;
}

export interface EnvCheck {
  key: string;
  value: string | undefined;
  required: boolean;
  enables: string;
}

export const REQUIRED_KEYS: { key: string; required: boolean; enables: string }[] = [
  { key: 'XAI_API_KEY',       required: true,  enables: 'chat / voice / image / search' },
  { key: 'HELIUS_RPC_URL',    required: false, enables: 'wallet balances / RPC reads' },
  { key: 'BIRDEYE_API_KEY',   required: false, enables: '/trending /search' },
  { key: 'OPENROUTER_API_KEY',required: false, enables: 'cross-model routing' },
  { key: 'PUBLIC_KEY',        required: false, enables: '/balance shortcut' },
  { key: 'CARTESIA_API_KEY',  required: false, enables: 'voice fallback' },
];

export function validateEnv(): EnvCheck[] {
  loadEnv();
  return REQUIRED_KEYS.map((r) => ({
    key: r.key,
    value: process.env[r.key],
    required: r.required,
    enables: r.enables,
  }));
}

export function envSummary(): { ok: boolean; missing: string[]; report: EnvCheck[] } {
  const report = validateEnv();
  const missing = report.filter((r) => r.required && !r.value).map((r) => r.key);
  return { ok: missing.length === 0, missing, report };
}

export function reqEnv(key: string): string {
  loadEnv();
  const v = process.env[key];
  if (!v) throw new Error(`🪨 cannot dive — missing ${key}`);
  return v;
}

export function optEnv(key: string, fallback = ''): string {
  loadEnv();
  return process.env[key] || fallback;
}
