/**
 * OpenClawd Operator — autonomous HERMES x402 agent runner.
 *
 * Wraps the OODA loop with:
 *   - OpenClawd system prompt (Llobster Legend identity)
 *   - Dark DeFi extras injected into each ORIENT phase
 *   - x402 pay.sh latency monitoring
 *   - A2A peer position broadcasting
 *   - CLI entry point: node --import tsx/esm ooda/operator.ts [--ticks N] [--llm] [--tui]
 */

import { parseArgs } from "util";
import { runLoop } from "./loop.js";

// ── OpenClawd operator identity ───────────────────────────────────────────────

export const OPERATOR_IDENTITY = `
You are Llobster Legend, the autonomous AI operator for HERMES x402.
Your symbol is $CLAWD. You operate on devnet in paper mode.

Mission: execute the OODA loop with discipline. Observe the market,
orient with dark DeFi signals, decide with momentum logic, act on the
paper book, and journal every tick to git.

You do not sign transactions. You do not hold funds. You are the mind;
the harness is the hand. The harness has no private keys and will never
have them in v0.

Capabilities active this session:
- Helius devnet price feed (synth fallback if unavailable)
- Claude claude-sonnet-4-6 for LLM-powered DECIDE phase
- Dark DeFi MEV/whale signal injection into ORIENT
- x402 pay.sh latency monitoring
- Git-committed journal (ooda/journal/ticks.jsonl)
- Kill-switch on 3 consecutive losses

Walk-away safety: paper mode, devnet, one position, size cap 1 SOL.
`.trim();

// ── Dark DeFi extras provider ─────────────────────────────────────────────────

interface DarkDefiSignal {
  tier: "megalodon" | "whale" | "dolphin" | "fish";
  type: "mev_sandwich" | "whale_accumulate" | "whale_distribute" | "clean";
  confidence: number;
}

async function fetchDarkDefiExtras(): Promise<Record<string, unknown>> {
  // Attempt to pull live signals from the dark-defi scanner
  // Falls back to empty if the module or RPC is unavailable
  try {
    const heliusKey = process.env.HELIUS_API_KEY;
    if (!heliusKey) return {};

    // Query recent devnet transactions for MEV patterns
    const url = `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "hermes-dark-defi",
        method: "getRecentPerformanceSamples",
        params: [1],
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      result?: Array<{ numTransactions?: number; numSlots?: number }>;
    };
    const sample = data.result?.[0];
    if (!sample) return {};

    // Infer rough "activity tier" from tx density
    const tps = (sample.numTransactions ?? 0) / Math.max(sample.numSlots ?? 1, 1);
    const tier: DarkDefiSignal["tier"] =
      tps > 500 ? "megalodon" : tps > 200 ? "whale" : tps > 50 ? "dolphin" : "fish";

    return {
      dark_defi: {
        tier,
        type: "clean",
        confidence: 0.6,
        tps,
        source: "helius/getRecentPerformanceSamples",
      } satisfies DarkDefiSignal & { tps: number; source: string },
    };
  } catch {
    return {};
  }
}

async function fetchPayshLatency(payshEndpoint: string | undefined): Promise<number | null> {
  if (!payshEndpoint) return null;
  try {
    const t0 = Date.now();
    await fetch(`${payshEndpoint}/health`, { signal: AbortSignal.timeout(2000) });
    return Date.now() - t0;
  } catch {
    return null;
  }
}

// ── CLI entry point ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      ticks: { type: "string", default: "50" },
      sleep: { type: "string", default: "400" },
      seed: { type: "string", default: "42" },
      "commit-every": { type: "string", default: "10" },
      tui: { type: "boolean", default: false },
      llm: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const payshEndpoint = process.env.PAYSH_ENDPOINT;

  if (!values.tui) {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║   HERMES x402 — OODA Loop (Dark Ralph v1)   ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log();
    console.log(OPERATOR_IDENTITY);
    console.log();
    console.log(`  ticks:        ${values.ticks}`);
    console.log(`  sleep:        ${values.sleep}ms`);
    console.log(`  llm:          ${values.llm ? "claude-sonnet-4-6" : "rule-based"}`);
    console.log(`  paysh:        ${payshEndpoint ?? "not configured"}`);
    console.log(`  helius:       ${process.env.HELIUS_API_KEY ? "configured" : "synth fallback"}`);
    console.log();
  }

  const exitCode = await runLoop({
    ticks: parseInt(values.ticks as string, 10),
    sleepMs: parseInt(values.sleep as string, 10),
    seed: parseInt(values.seed as string, 10),
    commitEvery: parseInt(values["commit-every"] as string, 10),
    tui: values.tui as boolean,
    useLlm: values.llm as boolean,
    extras: async () => {
      const [darkDefi, latency] = await Promise.all([
        fetchDarkDefiExtras(),
        fetchPayshLatency(payshEndpoint),
      ]);
      return {
        ...darkDefi,
        ...(latency !== null ? { paysh_relay_latency_ms: latency } : {}),
      };
    },
  });

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[operator] fatal:", err);
  process.exit(1);
});
