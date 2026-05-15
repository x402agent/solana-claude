#!/usr/bin/env node
/**
 * Deep Clawd — DeepSeek V4 Pro/Flash OODA Trading Agent
 *
 * Usage:
 *   DEEPSEEK_API_KEY=<key> npx tsx src/index.ts          # single tick
 *   DEEPSEEK_API_KEY=<key> npx tsx src/index.ts --loop   # continuous OODA
 *   DEEPSEEK_API_KEY=<key> npx tsx src/index.ts --orient # single orient phase
 *
 * dFlow routing modes (DFLOW_MODE env):
 *   conservative — flash for everything except DECIDE
 *   balanced     — default: flash→OBSERVE/ACT, pro→ORIENT/DECIDE
 *   aggro        — pro+max for all phases
 *
 * DeepSeek API:
 *   base_url:  https://api.deepseek.com/anthropic  (Anthropic format)
 *   models:    deepseek-v4-pro | deepseek-v4-flash
 *   thinking:  enabled via output_config.effort = "high" | "max"
 *
 * Configure with Claude Code as backend:
 *   export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
 *   export ANTHROPIC_AUTH_TOKEN=$DEEPSEEK_API_KEY
 *   export ANTHROPIC_MODEL=deepseek-v4-pro
 */

import { DeepClawdLoop } from "./loop.js";
import { DFlowRouter } from "./dflow.js";
import { defaultConfig } from "./types.js";

const args = process.argv.slice(2);
const isLoop = args.includes("--loop");
const isOrient = args.includes("--orient");
const ticksArg = args.find(a => a.startsWith("--ticks="));
const maxTicks = ticksArg ? parseInt(ticksArg.split("=")[1], 10) : 1;

async function main(): Promise<void> {
  const cfg = defaultConfig();

  if (!cfg.apiKey) {
    console.error("Error: DEEPSEEK_API_KEY is required");
    console.error("Get your API key at: https://platform.deepseek.com/api_keys");
    process.exit(1);
  }

  // Show routing plan before starting
  const router = new DFlowRouter(cfg.mode);
  console.log("\n" + router.summary() + "\n");
  console.log(`Cost estimate per tick (${cfg.mode} mode):`);
  const plan = router.tickPlan();
  for (const [phase, dec] of Object.entries(plan)) {
    const cost = router.estimateCost(dec.model, 500, 500);
    console.log(`  ${phase.padEnd(8)} ${dec.model.padEnd(20)} ~$${cost.toFixed(6)}/call`);
  }

  const loop = new DeepClawdLoop(cfg);

  if (isOrient) {
    // Single orient phase — useful for debugging
    console.log("\n[Single orient mode]");
    await loop.run(1);
    return;
  }

  if (isLoop) {
    // Continuous OODA loop
    const ticks = ticksArg ? maxTicks : 0; // 0 = infinite
    await loop.run(ticks || Infinity);
    return;
  }

  // Single tick
  await loop.run(1);
}

main().catch(e => {
  console.error("Fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
