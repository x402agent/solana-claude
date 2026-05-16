import type { Candle, State } from "./state.js";

const MAINNET_HOSTNAMES = [
  "api.mainnet-beta.solana.com",
  "mainnet.helius-rpc.com",
  "mainnet.rpc.jito.wtf",
  "solana-mainnet",
  "mainnet-beta",
];

export interface WhaleActivity {
  bias: "long" | "short" | "neutral";
  notional_lamports: number;
  description: string;
}

export function rejectMainnet(rpcUrl: string): void {
  if (process.env["MAINNET_OK"] === "1") return;
  const lowered = rpcUrl.toLowerCase();
  for (const host of MAINNET_HOSTNAMES) {
    if (lowered.includes(host)) {
      throw new Error(`[SAFETY] Mainnet RPC URL rejected: "${rpcUrl}". Goblin mode is devnet paper only.`);
    }
  }
}

function mulberry32(seed: number): () => number {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SynthObserver {
  private readonly rand: () => number;
  private lastClose: number;
  private candles: Candle[] = [];
  private readonly windowSize: number;

  constructor(seed = 42, startPrice = 150_000, windowSize = 20) {
    this.rand = mulberry32(seed);
    this.lastClose = startPrice;
    this.windowSize = windowSize;
  }

  tick(now = new Date()): { candles: Candle[]; whale_activity: WhaleActivity } {
    const move = (this.rand() - 0.48) * 0.03;
    const open = this.lastClose;
    const close = Math.max(1, Math.round(open * (1 + move)));
    const high = Math.round(Math.max(open, close) * (1 + this.rand() * 0.01));
    const low = Math.round(Math.min(open, close) * (1 - this.rand() * 0.01));
    const volume = Math.round(1_000_000 + this.rand() * 9_000_000);

    this.candles.push({ t: now.toISOString(), o: open, h: high, l: low, c: close, v: volume });
    if (this.candles.length > this.windowSize) this.candles.shift();
    this.lastClose = close;

    const whaleRoll = this.rand();
    const bias = whaleRoll > 0.66 ? "long" : whaleRoll < 0.34 ? "short" : "neutral";
    const notional = Math.round(250_000 + this.rand() * 8_000_000);
    const description =
      bias === "neutral"
        ? `no dominant whale impulse; ${notional.toLocaleString()} lamports churned`
        : `${bias} whale impulse; ${notional.toLocaleString()} lamports synthetic flow`;

    return {
      candles: [...this.candles],
      whale_activity: { bias, notional_lamports: notional, description },
    };
  }
}

export async function observeFromHelius(rpcUrl: string, state: State, windowSize = 20): Promise<Candle[]> {
  rejectMainnet(rpcUrl);
  console.warn("[observe] Helius adapter not wired; using deterministic synth candles");
  const synth = new SynthObserver(state.tick, 150_000, windowSize);
  for (let i = 0; i < Math.min(state.tick, windowSize); i += 1) synth.tick();
  return synth.tick().candles;
}

export function isStale(candles: Candle[], maxAgeSeconds = 60): boolean {
  if (candles.length === 0) return true;
  const last = candles[candles.length - 1]!;
  const age = (Date.now() - new Date(last.t).getTime()) / 1000;
  return age > maxAgeSeconds;
}

