#!/usr/bin/env npx tsx
/**
 * AutoResearch Client — Karpathy-Style Self-Improving Research
 *
 * Demonstrates how to query the OpenClawd AutoResearch Wiki API
 * for Solana blockchain, DeFi, and market intelligence.
 *
 * Run: npx tsx examples/auto-research-client.ts
 *
 * Requires: AutoResearch Wiki running at http://localhost:8000
 * See: llm-wiki-tang/README.md for setup instructions.
 */

// ── Configuration ──────────────────────────────────────────────────

const RESEARCH_API = process.env.RESEARCH_API_URL || "http://localhost:8000";
const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";

interface ResearchResponse {
  id: string;
  agent: string;
  query: string;
  results: Record<string, any>;
  confidence: number;
  sources: string[];
  cost: { sol: number; clawd: number; tier: string };
  metadata: Record<string, any>;
}

// ── API Client ─────────────────────────────────────────────────────

async function research(
  endpoint: string,
  body: Record<string, any>,
  tier: string = "free"
): Promise<ResearchResponse> {
  const res = await fetch(`${RESEARCH_API}/api/v1/research/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment": "0.001 SOL",
      "X-Tier": tier,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Research API ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function getStatus(): Promise<any> {
  const res = await fetch(`${RESEARCH_API}/api/v1/research/status`);
  return res.json();
}

async function getPricing(): Promise<any> {
  const res = await fetch(`${RESEARCH_API}/api/v1/research/pricing`);
  return res.json();
}

// ── Demo Functions ─────────────────────────────────────────────────

async function demoChainResearch() {
  console.log("\n━━━ 🔗 Chain Research: pump.fun Graduation Scan ━━━\n");

  const result = await research("chain", {
    query: "Which tokens are graduating from pump.fun today?",
    focus: ["pump_fun", "graduation"],
    timeframe: "24h",
    limit: 10,
  });

  console.log(`  Research ID: ${result.id}`);
  console.log(`  Agent: ${result.agent}`);
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`  Sources: ${result.sources.join(", ")}`);
  console.log(`  Cost: ${result.cost.sol} SOL (${result.cost.clawd} CLAWD)`);

  if (result.results.pump_fun) {
    const launches = result.results.pump_fun.recent_launches || [];
    console.log(`\n  📊 Recent Launches (${launches.length}):`);
    for (const token of launches.slice(0, 5)) {
      console.log(
        `     ${token.symbol || token.name}: MC $${token.market_cap?.toLocaleString()} ` +
        `| Curve: ${token.bonding_curve_progress}%`
      );
    }

    const trending = result.results.pump_fun.trending || [];
    if (trending.length > 0) {
      console.log(`\n  🔥 Trending:`);
      for (const t of trending) {
        console.log(`     ${t.symbol}: +${t.change_24h}% (${(t.volume || 0).toLocaleString()} vol)`);
      }
    }
  }

  if (result.results.graduation) {
    console.log(`\n  🎓 Graduation Status:`);
    console.log(`     ${JSON.stringify(result.results.graduation)}`);
  }
}

async function demoDefiResearch() {
  console.log("\n━━━ 💰 DeFi Research: Yield Scanner ━━━\n");

  const result = await research("defi", {
    action: "yield_scan",
    protocols: ["raydium", "orca", "marinade", "jito"],
    assets: ["SOL", "USDC", "JTO"],
    risk_tolerance: "medium",
  }, "silver");

  console.log(`  Research ID: ${result.id}`);
  console.log(`  Agent: ${result.agent}`);
  console.log(`  Cost: ${result.cost.sol} SOL`);

  if (result.results.yields?.yields) {
    console.log(`\n  📈 Top Yield Opportunities:`);
    for (const y of result.results.yields.yields.slice(0, 8)) {
      console.log(
        `     ${y.protocol.toUpperCase()}-${y.asset}: ` +
        `${y.apr}% APR | TVL: $${y.tvl?.toLocaleString()} | Risk: ${y.risk_level}`
      );
    }
  }
}

async function demoMarketResearch() {
  console.log("\n━━━ 📊 Market Research: Sentiment + Alpha ━━━\n");

  // Sentiment analysis
  const sentiment = await research("market", {
    focus: "sentiment",
    sources: ["twitter", "dexscreener", "birdeye"],
    timeframe: "24h",
    include_social: true,
  });

  console.log(`  Market Sentiment:`);
  const s = sentiment.results.sentiment || {};
  console.log(`     Overall: ${s.overall_sentiment || "neutral"} (score: ${s.score || 0})`);
  console.log(`     Social Volume: ${s.social_volume?.toLocaleString() || 0}`);
  console.log(`     Dominant Narrative: ${s.dominant_narrative || "none"}`);
  console.log(`     Top Mentioned: ${(s.top_mentioned || []).join(", ")}`);

  // Alpha detection
  console.log("\n  🔍 Alpha Scan:");
  const alpha = await research("market", {
    focus: "alpha",
    timeframe: "6h",
    include_social: true,
  });

  if (alpha.results.alpha?.alpha) {
    for (const a of alpha.results.alpha.alpha.slice(0, 3)) {
      console.log(
        `     [${a.type}] ${a.token} — Potential: ${a.potential} | ` +
        `Entry: ${a.entry_point} → Target: ${a.target}`
      );
    }
  }
}

async function demoAgentLearning() {
  console.log("\n━━━ 🧠 Agent Self-Improvement (Karpathy Loop) ━━━\n");

  const agentId = "lobster-trader-demo";

  // Step 1: Learn from outcomes
  const learnResult = await research("agent", {
    agent_id: agentId,
    action: "learn",
    data: {
      research_id: "res_demo_001",
      prediction: "Token will graduate in 2 hours",
      actual: "Token graduated in 1.5 hours",
      accuracy: 0.87,
    },
  });

  console.log(`  Learn: ${JSON.stringify(learnResult.results)}`);

  // Step 2: Share knowledge with another agent
  const shareResult = await research("agent", {
    agent_id: agentId,
    action: "share",
    target_agent: "lobster-analyst-01",
  });

  console.log(`  Share: ${JSON.stringify(shareResult.results)}`);

  // Step 3: Calibrate
  const calibResult = await research("agent", {
    agent_id: agentId,
    action: "calibrate",
  });

  console.log(`  Calibrate: ${JSON.stringify(calibResult.results)}`);
}

async function demoStatusAndPricing() {
  console.log("\n━━━ 📡 Research System Status ━━━\n");

  try {
    const status = await getStatus();
    console.log(`  Status: ${status.status}`);
    console.log(`  Active Agents: ${status.active_agents}`);
    console.log(`  Queue Length: ${status.queue_length}`);
    console.log(`  Uptime: ${status.uptime}`);

    const pricing = await getPricing();
    console.log(`\n  💲 Pricing:`);
    for (const [type, price] of Object.entries(pricing.research_types || {})) {
      const p = price as { sol: number; clawd: number };
      console.log(`     ${type}: ${p.sol} SOL / ${p.clawd} CLAWD`);
    }
  } catch {
    console.log("  ⚠️  Research API not running. Start it with:");
    console.log("     cd llm-wiki-tang && docker-compose up -d");
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   🦞 OpenClawd AutoResearch Client — Karpathy-Style Demo   ║");
  console.log("║   $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Check status first
  await demoStatusAndPricing();

  // Run all research demos
  try { await demoChainResearch(); } catch (e: any) {
    console.log(`\n  ⚠️  Chain research failed: ${e.message}`);
    console.log("     Make sure the AutoResearch Wiki is running at " + RESEARCH_API);
  }

  try { await demoDefiResearch(); } catch (e: any) {
    console.log(`\n  ⚠️  DeFi research failed: ${e.message}`);
  }

  try { await demoMarketResearch(); } catch (e: any) {
    console.log(`\n  ⚠️  Market research failed: ${e.message}`);
  }

  try { await demoAgentLearning(); } catch (e: any) {
    console.log(`\n  ⚠️  Agent learning failed: ${e.message}`);
  }

  console.log("\n🦞 AutoResearch demo complete!");
  console.log("   Docs: docs/articles/AUTO_RESEARCH_AGENTS.md");
  console.log("   API:  llm-wiki-tang/README.md");
}

main().catch(console.error);