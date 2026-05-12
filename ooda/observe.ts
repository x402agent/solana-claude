/**
 * OBSERVE phase — Helius devnet price feed with synth fallback.
 *
 * Real feed: Helius getAsset on devnet SOL/USDC pool.
 * Synth fallback: deterministic random walk (same as dark-ralph loop.py).
 *
 * Hard rule: mainnet RPC hostnames are rejected at startup unless
 * MAINNET_OK=1 is set — but v0 has no signing path regardless.
 */

import type { LoopState } from "./loop.js";

export interface Candle {
  t: number;  // unix epoch seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const DISALLOWED_RPC_HOSTS = [
  "api.mainnet-beta.solana.com",
  "solana-mainnet",
  "rpc.helius.xyz",
  "rpc.ankr.com/solana",
];

export function rejectMainnet(rpcUrl: string | undefined): void {
  if (!rpcUrl) return;
  const lowered = rpcUrl.toLowerCase();
  const isMainnet = DISALLOWED_RPC_HOSTS.some((h) => lowered.includes(h));
  if (isMainnet && process.env.MAINNET_OK !== "1") {
    throw new Error(
      `refusing to start: RPC ${rpcUrl} looks like mainnet. ` +
        "v0 is paper-only, devnet-only. Set MAINNET_OK=1 to override " +
        "(but there is still no signing path in v0)."
    );
  }
}

// Simple mulberry32 PRNG so the synth feed is deterministic per seed
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _rng: (() => number) | null = null;

export function initRng(seed: number): void {
  _rng = mulberry32(seed);
}

function rng(): number {
  if (!_rng) _rng = mulberry32(42);
  return _rng();
}

function uniform(lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

function synthCandle(state: LoopState): Candle {
  const lastC = state.candles.length > 0 ? state.candles[state.candles.length - 1].c : 100.0;
  const drift = uniform(-0.6, 0.6);
  const o = lastC;
  const c = Math.max(1.0, lastC + drift);
  const high = Math.max(o, c) + Math.abs(uniform(0, 0.25));
  const low = Math.max(0.5, Math.min(o, c) - Math.abs(uniform(0, 0.25)));
  const vol = uniform(100, 1000);
  return { t: Date.now() / 1000, o, h: high, l: low, c, v: vol };
}

interface HeliusCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchHeliusCandle(apiKey: string): Promise<Candle | null> {
  // Helius devnet DAS API — token price via getAsset for devnet SOL mint
  // Falls back if the call fails or the asset has no price data
  try {
    const url = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
    const body = {
      jsonrpc: "2.0",
      id: "hermes-ooda",
      method: "getAsset",
      params: { id: "So11111111111111111111111111111111111111112" },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { token_info?: { price_info?: { price_per_token?: number } } } };
    const price = data?.result?.token_info?.price_info?.price_per_token;
    if (typeof price !== "number" || price <= 0) return null;
    // Single-tick candle: OHLC all at current price
    return { t: Date.now() / 1000, o: price, h: price, l: price, c: price, v: 0 };
  } catch {
    return null;
  }
}

export async function observe(state: LoopState): Promise<Candle> {
  const heliusKey = process.env.HELIUS_API_KEY;
  if (heliusKey) {
    const candle = await fetchHeliusCandle(heliusKey);
    if (candle) return candle;
  }
  // Devnet feed unavailable — use deterministic synth
  return synthCandle(state);
}
