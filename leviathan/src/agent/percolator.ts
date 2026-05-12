/**
 * leviathan/src/agent/percolator.ts — Typed wrapper for @openclawdsolana/percolator CLI
 *
 * Devnet-only enforcement is baked in. Every command injects --cluster=devnet
 * unless the PERCOLATOR_MAINNET env var is explicitly set to '1' (requires human).
 *
 * Commands map to the percolator CLI: `percolator <command> [options]`
 */

import { execa } from 'execa';

const PERCOLATOR_TIMEOUT = 15_000;

export function resolveCluster(): string {
  if (process.env['PERCOLATOR_MAINNET'] === '1') return 'mainnet-beta';
  return process.env['PERCOLATOR_CLUSTER'] ?? 'devnet';
}

export interface PercolatorMarket {
  pubkey: string;
  name: string;
  baseSymbol: string;
  quoteSymbol: string;
  openInterest: string;
  fundingRate: string;
}

export interface PercolatorSlab {
  pubkey: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: string;
}

export interface PercolatorTradeResult {
  signature: string;
  side: 'long' | 'short';
  size: string;
  price: string;
  fee: string;
}

async function runCmd(args: string[], timeoutMs = PERCOLATOR_TIMEOUT): Promise<{ stdout: string; success: boolean; error?: string }> {
  const cluster = resolveCluster();
  const fullArgs = [...args, `--cluster=${cluster}`, '--output=json'];
  try {
    const result = await execa('percolator', fullArgs, { timeout: timeoutMs });
    return { stdout: result.stdout, success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { stdout: '', success: false, error: msg.slice(0, 200) };
  }
}

export const Percolator = {
  async listMarkets(): Promise<PercolatorMarket[] | string> {
    const r = await runCmd(['list-markets']);
    if (!r.success) return `percolator list-markets failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as PercolatorMarket[]; }
    catch { return r.stdout.slice(0, 500); }
  },

  async slabGet(pubkey: string): Promise<PercolatorSlab | string> {
    const r = await runCmd(['slab:get', pubkey]);
    if (!r.success) return `percolator slab:get failed: ${r.error}`;
    try { return JSON.parse(r.stdout) as PercolatorSlab; }
    catch { return r.stdout.slice(0, 500); }
  },

  async getPosition(wallet: string): Promise<unknown> {
    const r = await runCmd(['position:get', '--wallet', wallet]);
    if (!r.success) return `percolator position:get failed: ${r.error}`;
    try { return JSON.parse(r.stdout); }
    catch { return r.stdout.slice(0, 500); }
  },

  async quoteMarket(market: string, side: 'long' | 'short', size: string): Promise<unknown> {
    const r = await runCmd(['trade-quote', '--market', market, `--side=${side}`, `--size=${size}`]);
    if (!r.success) return `percolator trade-quote failed: ${r.error}`;
    try { return JSON.parse(r.stdout); }
    catch { return r.stdout.slice(0, 500); }
  },

  async checkLiquidation(positionPubkey: string): Promise<unknown> {
    const r = await runCmd(['liquidate-at-oracle', '--position', positionPubkey, '--dry-run']);
    if (!r.success) return `percolator liquidate check failed: ${r.error}`;
    try { return JSON.parse(r.stdout); }
    catch { return r.stdout.slice(0, 500); }
  },

  async fundingRate(market: string): Promise<unknown> {
    const r = await runCmd(['funding-rate', '--market', market]);
    if (!r.success) return `percolator funding-rate failed: ${r.error}`;
    try { return JSON.parse(r.stdout); }
    catch { return r.stdout.slice(0, 500); }
  },
};
