/**
 * ooda/observe.ts — Market data adapter
 *
 * v0: synthesises candles from a seeded RNG (no real data needed).
 * Real adapters drop in by replacing `observe()`:
 *   - Pyth Network price feeds (on-chain, devnet-safe)
 *   - Helius RPC + getAccountInfo on a Switchboard oracle
 *   - A DEX REST endpoint (must pass reject_mainnet guard)
 *
 * The adapter contract:
 *   observe(state) → Promise<Candle[]>   (oldest first, last = current)
 */

import type { Candle, State } from './state.js';

// ─── Mainnet guard ────────────────────────────────────────────────────────────

const MAINNET_HOSTNAMES = [
  'api.mainnet-beta.solana.com',
  'mainnet.helius-rpc.com',
  'mainnet.rpc.jito.wtf',
  'solana-mainnet',
  'mainnet-beta',
];

export function rejectMainnet(rpcUrl: string): void {
  if (process.env['MAINNET_OK'] === '1') return; // escape hatch (still no signing path)
  for (const host of MAINNET_HOSTNAMES) {
    if (rpcUrl.toLowerCase().includes(host)) {
      throw new Error(
        `[SAFETY] Mainnet RPC URL rejected: "${rpcUrl}". ` +
        `v0 only supports devnet. Set MAINNET_OK=1 to bypass (no signing path exists anyway).`,
      );
    }
  }
}

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Synthetic candle generator ───────────────────────────────────────────────

export class SynthObserver {
  private rand: () => number;
  private lastClose: number;
  private candles: Candle[] = [];
  private readonly windowSize: number;

  constructor(seed = 42, startPrice = 150_000, windowSize = 20) {
    this.rand = mulberry32(seed);
    this.lastClose = startPrice;
    this.windowSize = windowSize;
  }

  /** Generate one new candle and return the rolling window */
  tick(now = new Date()): Candle[] {
    const move = (this.rand() - 0.48) * 0.03; // slight upward drift
    const open = this.lastClose;
    const close = Math.round(open * (1 + move));
    const high = Math.round(Math.max(open, close) * (1 + this.rand() * 0.01));
    const low = Math.round(Math.min(open, close) * (1 - this.rand() * 0.01));
    const volume = Math.round(1_000_000 + this.rand() * 9_000_000);

    this.candles.push({ t: now.toISOString(), o: open, h: high, l: low, c: close, v: volume });
    if (this.candles.length > this.windowSize) this.candles.shift();
    this.lastClose = close;
    return [...this.candles];
  }
}

// ─── Real Helius/Pyth adapter skeleton ───────────────────────────────────────

export async function observeFromHelius(
  rpcUrl: string,
  state: State,
  windowSize = 20,
): Promise<Candle[]> {
  rejectMainnet(rpcUrl);

  // Stub: in a real implementation, fetch from a Pyth price account via
  // getAccountInfo, decode the PriceData struct, and push a candle.
  // For now, fall back to synth so the harness can still run.
  console.warn('[observe] Helius adapter not yet wired — using synth candles');
  const synth = new SynthObserver(state.tick, 150_000, windowSize);
  for (let i = 0; i < Math.min(state.tick, windowSize); i++) synth.tick();
  return synth.tick();
}

// ─── Staleness check ──────────────────────────────────────────────────────────

/** Returns true if the most recent candle is older than maxAgeSeconds */
export function isStale(candles: Candle[], maxAgeSeconds = 60): boolean {
  if (candles.length === 0) return true;
  const last = candles[candles.length - 1]!;
  const age = (Date.now() - new Date(last.t).getTime()) / 1000;
  return age > maxAgeSeconds;
}
