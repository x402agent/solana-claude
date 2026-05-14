/**
 * Direct in-process integration with @openclawd/leviathan.
 *
 * Reads keystore + shell.db via the framework's own modules — no shell-out,
 * single source of truth, types flow across.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  hasKeystore,
  loadKeypair,
  readKeystoreMetadata,
} from '@openclawd/leviathan/identity/wallet.js';
import { getLeviathan, listSpawnlings } from '@openclawd/leviathan/state/database.js';
import { readBalances } from '@openclawd/leviathan/identity/balances.js';
import { depthFor, modelFor, pulseIntervalFor } from '@openclawd/leviathan/survival/monitor.js';
import { CLAWD_MINT } from '@openclawd/leviathan/config.js';

const SHELL_DIR = path.join(os.homedir(), '.openclawd');
const SHELL_MD = path.join(SHELL_DIR, 'SHELL.md');

export interface LeviathanLive {
  exists: boolean;
  pubkey?: string;
  spawnedAt?: number;
  name?: string;
  assetAddress?: string | null;
  assetSignerPda?: string | null;
  shellMd?: string;
  shellMdLines?: number;
}

export function readLive(): LeviathanLive {
  if (!hasKeystore()) return { exists: false };
  const meta = readKeystoreMetadata();
  const lev = getLeviathan();
  const shellMd = fs.existsSync(SHELL_MD) ? fs.readFileSync(SHELL_MD, 'utf8') : undefined;
  return {
    exists: true,
    pubkey: meta?.pubkey,
    spawnedAt: meta?.spawnedAt,
    name: lev?.name,
    assetAddress: lev?.asset_address,
    assetSignerPda: lev?.asset_signer_pda,
    shellMd,
    shellMdLines: shellMd ? shellMd.split('\n').length : 0,
  };
}

export async function readDepthSnapshot(rpcUrl: string) {
  const lev = getLeviathan();
  if (!lev?.asset_signer_pda) return null;
  const balances = await readBalances(rpcUrl, lev.asset_signer_pda);
  const depth = depthFor(balances);
  return {
    balances,
    depth,
    pulseIntervalMs: pulseIntervalFor(depth),
    model: modelFor(depth),
  };
}

export function appendShell(line: string): boolean {
  if (!fs.existsSync(SHELL_MD)) return false;
  fs.appendFileSync(SHELL_MD, `\n${line}\n`);
  return true;
}

export function readShellMd(): string | null {
  return fs.existsSync(SHELL_MD) ? fs.readFileSync(SHELL_MD, 'utf8') : null;
}

export function readThreeLaws(): string {
  // The constitution lives at the framework root. Resolve relative to this package.
  const here = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.resolve(here, '../../../scripts/three-laws.txt'),
    path.resolve(here, '../../../../scripts/three-laws.txt'),
    path.resolve(process.cwd(), '../scripts/three-laws.txt'),
    path.resolve(process.cwd(), 'scripts/three-laws.txt'),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return '(three-laws.txt not found — running outside the framework checkout)';
}

/** Loads keypair into memory. The CLI uses this for /balance, /sign, etc. */
export function getLeviathanKeypair() {
  return loadKeypair();
}

export { SHELL_DIR, SHELL_MD, CLAWD_MINT };
