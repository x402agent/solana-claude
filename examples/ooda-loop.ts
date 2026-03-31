/**
 * examples/ooda-loop.ts
 *
 * Run one complete OODA trading cycle using the solana-claude agent state.
 *
 * OBSERVE → ORIENT → DECIDE → ACT → LEARN
 *
 * This is a standalone demo. No private key required — all data is public.
 * Run: npx tsx examples/ooda-loop.ts
 */

import "dotenv/config";
import {
  getAppState,
  setOODAPhase,
  writeMemory,
  recallMemory,
  spawnTask,
  updateTask,
  getMemoryContext,
} from "../src/state/app-state.js";
import { HeliusClient } from "../src/helius/index.js";

const helius = process.env.HELIUS_API_KEY
  ? new HeliusClient({ apiKey: process.env.HELIUS_API_KEY })
  : null;

const SOLANA_TRACKER_KEY = process.env.SOLANA_TRACKER_API_KEY ?? "";

async function solanaTracker(path: string): Promise<unknown> {
  const res = await fetch(`https://data.solanatracker.io${path}`, {
    headers: { Accept: "application/json", "x-api-key": SOLANA_TRACKER_KEY },
  });
  if (!res.ok) throw new Error(`SolanaTracker ${path} → ${res.status}`);
  return res.json();
}

const log = (phase: string, msg: string) => {
  const color = { OBSERVE: "\x1b[34m", ORIENT: "\x1b[33m", DECIDE: "\x1b[35m", ACT: "\x1b[31m", LEARN: "\x1b[32m" }[phase] ?? "\x1b[0m";
  console.log(`${color}[${phase}]\x1b[0m ${msg}`);
};

console.log("\n\x1b[1m🤖 solana-claude OODA Loop Demo\x1b[0m");
console.log("Architecture: Claude Code agentic engine × SolanaOS strategy\n");

const task = spawnTask("ooda", "Full OODA trading cycle", "Demo OODA run", { canShowPermissions: true });
console.log(`Task spawned: ${task.id}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVE
// ─────────────────────────────────────────────────────────────────────────────
setOODAPhase("observe");
log("OBSERVE", "Fetching live market data...");

const [solPriceRes, trendingRes] = await Promise.allSettled([
  fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true")
    .then(r => r.json()),
  solanaTracker("/tokens/trending?limit=10"),
]);

const solPrice = solPriceRes.status === "fulfilled"
  ? (solPriceRes.value as { solana: { usd: number; usd_24h_change: number } }).solana
  : null;

if (solPrice) {
  log("OBSERVE", `SOL: $${solPrice.usd.toFixed(2)} (${solPrice.usd_24h_change > 0 ? "+" : ""}${solPrice.usd_24h_change?.toFixed(2)}% 24h)`);
  writeMemory({
    tier: "KNOWN",
    content: `SOL price: $${solPrice.usd.toFixed(2)}, 24h: ${solPrice.usd_24h_change?.toFixed(2)}%`,
    source: "coingecko",
    expiresAt: Date.now() + 60_000,
  });
}

const trending = trendingRes.status === "fulfilled"
  ? (trendingRes.value as { tokens?: Array<{ symbol: string; price?: number; volume24h?: number }> }).tokens ?? []
  : [];

log("OBSERVE", `Trending tokens: ${trending.slice(0, 5).map(t => t.symbol).join(", ")}`);

// Check Helius priority fees for network context
if (helius) {
  try {
    const fees = await helius.getPriorityFeeEstimate();
    log("OBSERVE", `Network priority fee: ${fees.recommended} µLamports (recommended) / ${fees.high} (high)`);
    writeMemory({
      tier: "KNOWN",
      content: `Network priority fee: ${fees.recommended} µLamports recommended`,
      source: "helius:getPriorityFeeEstimate",
      expiresAt: Date.now() + 30_000,
    });
  } catch { /* no key or rate limited */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORIENT
// ─────────────────────────────────────────────────────────────────────────────
setOODAPhase("orient");
log("ORIENT", "Scoring opportunities...");

const learnedPrior = recallMemory("pattern", "LEARNED");
if (learnedPrior.length > 0) {
  log("ORIENT", `LEARNED memory: ${learnedPrior.length} matching patterns`);
  learnedPrior.slice(0, 3).forEach(m => log("ORIENT", `  → ${m.content.slice(0, 80)}...`));
} else {
  log("ORIENT", "No LEARNED patterns yet (run more cycles to build memory)");
}

// Score top 3 trending tokens (adapted from SolanaOS confidence model)
const scored: Array<{ symbol: string; score: number; rationale: string }> = [];

for (const token of trending.slice(0, 3)) {
  // Simplified scoring without full on-chain data in this demo
  const baseScore = 50;
  const volumeBonus = (token.volume24h ?? 0) > 500_000 ? 15 : 0;
  const solContext = (solPrice?.usd_24h_change ?? 0) > 0 ? 10 : -10;
  const score = Math.min(100, baseScore + volumeBonus + solContext);

  scored.push({
    symbol: token.symbol,
    score,
    rationale: `base:${baseScore} + volume:${volumeBonus} + sol_context:${solContext}`,
  });
  log("ORIENT", `${token.symbol}: ${score}/100 (${scored[scored.length-1].rationale})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DECIDE
// ─────────────────────────────────────────────────────────────────────────────
setOODAPhase("decide");
log("DECIDE", "Applying confidence model (min score: 60)...");

const viable = scored.filter(t => t.score >= 60);
if (viable.length === 0) {
  log("DECIDE", "PASS — no tokens meet minimum confidence threshold");
  writeMemory({
    tier: "INFERRED",
    content: `OODA PASS: market conditions below threshold (top score: ${scored[0]?.score ?? 0})`,
    source: "ooda-loop",
  });
} else {
  const best = viable[0]!;
  let sizeMultiplier = 0.5;
  if (best.score >= 90) sizeMultiplier = 1.5;
  else if (best.score >= 80) sizeMultiplier = 1.25;
  else if (best.score >= 70) sizeMultiplier = 1.0;
  else if (best.score >= 60) sizeMultiplier = 0.5;

  log("DECIDE", `OPPORTUNITY: ${best.symbol} (score: ${best.score}) — size: ${sizeMultiplier}x base`);
  writeMemory({
    tier: "INFERRED",
    content: `OODA signal: ${best.symbol} score=${best.score} size=${sizeMultiplier}x. Rationale: ${best.rationale}`,
    source: "ooda-loop",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ACT
// ─────────────────────────────────────────────────────────────────────────────
setOODAPhase("act");
log("ACT", "⚠️  Trade execution gated by permission engine");
log("ACT", "   Permission mode: ask (all trades require explicit human approval)");
log("ACT", "   No keys, no wallet — read-only demo mode");
log("ACT", "   → Signal written to INFERRED memory for human review");

// ─────────────────────────────────────────────────────────────────────────────
// LEARN
// ─────────────────────────────────────────────────────────────────────────────
setOODAPhase("learn");
log("LEARN", "Consolidating to memory...");

const state = getAppState();
const memCtx = getMemoryContext(state);
log("LEARN", `Memory state: ${state.memories.length} entries total`);

// Promote a pattern if we have enough data
writeMemory({
  tier: "LEARNED",
  content: `OODA cycle completed at ${new Date().toISOString()}. SOL: $${solPrice?.usd.toFixed(2)} (${solPrice?.usd_24h_change?.toFixed(2)}% 24h). Top signal: ${scored[0]?.symbol ?? "none"} @ ${scored[0]?.score ?? 0}/100.`,
  source: "ooda-loop",
});

setOODAPhase("idle");
updateTask(task.id, { status: "done", result: "OODA cycle complete" });

console.log("\n\x1b[32m✅ OODA cycle complete\x1b[0m");
console.log("\nFinal memory state:");
console.log(memCtx || "(empty — run more cycles)");
console.log(`\nTask: ${task.id} → ${getAppState().tasks[task.id]?.status}`);
