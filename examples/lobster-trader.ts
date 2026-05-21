#!/usr/bin/env npx tsx
/**
 * Lobster Trader — pump.fun Bonding Curve Trading Example
 *
 * Demonstrates how a Metaplex Lobster Agent would:
 * - Scan pump.fun for new token launches
 * - Analyze bonding curve state
 * - Calculate graduation probability
 * - Execute buy/sell via the pump.fun program
 *
 * Run: npx tsx examples/lobster-trader.ts
 *
 * Programs:
 *   Pump:    6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
 *   Mayhem:  MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e
 *   $CLAWD:  8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
 */

// ── pump.fun Program Constants ─────────────────────────────────────

const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const PUMP_GLOBAL = "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf";
const PUMP_FEE = "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbCJ2AWKyYJRMW";
const SOL_DECIMALS = 1_000_000_000; // lamports
const TOKEN_DECIMALS = 1_000_000;

// ── Bonding Curve Math ─────────────────────────────────────────────

interface BondingCurveState {
  virtualTokenReserves: number;
  virtualSolReserves: number;
  realTokenReserves: number;
  realSolReserves: number;
  tokenTotalSupply: number;
  complete: boolean;
}

/**
 * Calculate the amount of tokens received for a given SOL amount
 * using the constant product AMM formula: x * y = k
 *
 * tokens_out = virtualTokenReserves - (virtualTokenReserves * virtualSolReserves) /
 *              (virtualSolReserves + sol_in)
 */
function calculateBuyAmount(
  solInLamports: number,
  curve: BondingCurveState
): number {
  if (curve.complete) {
    throw new Error("Bonding curve complete — token has graduated to PumpSwap");
  }

  const { virtualTokenReserves, virtualSolReserves } = curve;

  // Constant product: tokens_out = reserves_token - (reserves_token * reserves_sol) / (reserves_sol + sol_in)
  const tokensOut =
    virtualTokenReserves -
    (virtualTokenReserves * virtualSolReserves) / (virtualSolReserves + solInLamports);

  return Math.floor(tokensOut);
}

/**
 * Calculate the amount of SOL received for selling tokens
 * sol_out = virtualSolReserves - (virtualSolReserves * virtualTokenReserves) /
 *           (virtualTokenReserves + tokens_in)
 */
function calculateSellAmount(
  tokensIn: number,
  curve: BondingCurveState
): number {
  if (curve.complete) {
    throw new Error("Bonding curve complete — token has graduated to PumpSwap");
  }

  const { virtualTokenReserves, virtualSolReserves } = curve;

  const solOut =
    virtualSolReserves -
    (virtualSolReserves * virtualTokenReserves) / (virtualTokenReserves + tokensIn);

  return Math.floor(solOut);
}

/**
 * Calculate bonding curve progress as a percentage.
 * Graduation happens when realSolReserves reaches the threshold (~69 SOL).
 */
function calculateGraduationProgress(curve: BondingCurveState): number {
  const GRADUATION_THRESHOLD = 69 * SOL_DECIMALS; // ~69 SOL
  return Math.min(100, (curve.realSolReserves / GRADUATION_THRESHOLD) * 100);
}

/**
 * Estimate time to graduation based on current progress and fill rate.
 */
function estimateTimeToGraduation(
  curve: BondingCurveState,
  solPerHourRate: number
): string {
  const GRADUATION_THRESHOLD = 69 * SOL_DECIMALS;
  const remaining = GRADUATION_THRESHOLD - curve.realSolReserves;

  if (remaining <= 0) return "Graduated!";
  if (solPerHourRate <= 0) return "Unknown (no rate data)";

  const hoursRemaining = remaining / (solPerHourRate * SOL_DECIMALS);

  if (hoursRemaining < 1) return `~${Math.ceil(hoursRemaining * 60)} minutes`;
  if (hoursRemaining < 24) return `~${hoursRemaining.toFixed(1)} hours`;
  return `~${(hoursRemaining / 24).toFixed(1)} days`;
}

// ── Token Analysis ─────────────────────────────────────────────────

interface TokenAnalysis {
  mint: string;
  name: string;
  symbol: string;
  curve: BondingCurveState;
  graduationProgress: number;
  pricePerToken: number;
  marketCapSol: number;
  recommendation: "BUY" | "HOLD" | "SELL" | "AVOID";
  reasoning: string;
}

function analyzeToken(
  mint: string,
  name: string,
  symbol: string,
  curve: BondingCurveState,
  holderCount: number = 0
): TokenAnalysis {
  const progress = calculateGraduationProgress(curve);
  const pricePerToken = curve.virtualSolReserves / curve.virtualTokenReserves;
  const marketCapSol = curve.virtualSolReserves / SOL_DECIMALS;

  // Simple scoring heuristics
  let score = 50; // baseline

  // Graduation proximity (closer = more degen opportunity)
  if (progress > 80) score += 20;
  else if (progress > 60) score += 10;
  else if (progress < 20) score -= 10;

  // Holder distribution
  if (holderCount > 100) score += 15;
  else if (holderCount > 50) score += 10;
  else if (holderCount > 20) score += 5;

  // Market cap reasonableness
  const mcapSol = marketCapSol;
  if (mcapSol > 20 && mcapSol < 60) score += 10; // sweet spot
  if (mcapSol > 69) score -= 20; // about to graduate, risky

  let recommendation: "BUY" | "HOLD" | "SELL" | "AVOID";
  let reasoning: string;

  if (score >= 70) {
    recommendation = "BUY";
    reasoning = `Strong signal: ${progress.toFixed(0)}% to graduation, ${holderCount} holders, ${mcapSol.toFixed(1)} SOL MC`;
  } else if (score >= 50) {
    recommendation = "HOLD";
    reasoning = `Moderate: ${progress.toFixed(0)}% to graduation, watching for momentum`;
  } else if (score >= 30) {
    recommendation = "SELL";
    reasoning = `Weak signal: Low graduation probability at ${progress.toFixed(0)}%`;
  } else {
    recommendation = "AVOID";
    reasoning = `Red flags: ${progress.toFixed(0)}% progress, ${holderCount} holders, early stage risk`;
  }

  return {
    mint,
    name,
    symbol,
    curve,
    graduationProgress: progress,
    pricePerToken,
    marketCapSol,
    recommendation,
    reasoning,
  };
}

// ── Simulated Trading ──────────────────────────────────────────────

function simulateTrade() {
  console.log("━━━ 🦞 Lobster Trader — pump.fun Simulation ━━━\n");

  // Simulate a bonding curve state (mid-progress token)
  const mockCurve: BondingCurveState = {
    virtualTokenReserves: 1_073_000_000_000, // ~1.073B tokens
    virtualSolReserves: 30_000_000_000,       // ~30 SOL
    realTokenReserves: 800_000_000_000,        // 800M tokens
    realSolReserves: 47_000_000_000,           // ~47 SOL raised
    tokenTotalSupply: 1_000_000_000_000,       // 1B total
    complete: false,
  };

  // Analyze the token
  const analysis = analyzeToken(
    "DemoTokenMint123...",
    "Lobster Coin",
    "LOBSTER",
    mockCurve,
    87
  );

  console.log("📊 Token Analysis:");
  console.log(`   Token: ${analysis.name} (${analysis.symbol})`);
  console.log(`   Mint: ${analysis.mint}`);
  console.log(`   Price: ${(analysis.pricePerToken * SOL_DECIMALS).toFixed(6)} SOL/token`);
  console.log(`   Market Cap: ${analysis.marketCapSol.toFixed(2)} SOL`);
  console.log(`   Graduation: ${analysis.graduationProgress.toFixed(1)}%`);
  console.log(`   Virtual Reserves: ${mockCurve.virtualSolReserves / SOL_DECIMALS} SOL / ${mockCurve.virtualTokenReserves / TOKEN_DECIMALS}M tokens`);
  console.log(`   Real Reserves: ${mockCurve.realSolReserves / SOL_DECIMALS} SOL / ${mockCurve.realTokenReserves / TOKEN_DECIMALS}M tokens`);
  console.log(`   Status: ${mockCurve.complete ? "GRADUATED" : "ON CURVE"}`);

  console.log(`\n🎯 Recommendation: ${analysis.recommendation}`);
  console.log(`   ${analysis.reasoning}`);

  // Simulate buying 0.1 SOL worth
  const buyAmount = 0.1 * SOL_DECIMALS; // 0.1 SOL in lamports
  const tokensReceived = calculateBuyAmount(buyAmount, mockCurve);
  const tokenAmount = tokensReceived / TOKEN_DECIMALS;

  console.log(`\n💰 Buy Simulation (0.1 SOL):`);
  console.log(`   Tokens received: ${tokenAmount.toFixed(2)} ${analysis.symbol}`);
  console.log(`   Effective price: ${(buyAmount / tokensReceived).toFixed(8)} SOL/token`);

  // Simulate selling those tokens
  const solReceived = calculateSellAmount(tokensReceived, mockCurve);
  const solAmount = solReceived / SOL_DECIMALS;

  console.log(`\n💸 Sell Simulation (${tokenAmount.toFixed(2)} tokens):`);
  console.log(`   SOL received: ${solAmount.toFixed(6)} SOL`);
  console.log(`   P&L: ${((solAmount - 0.1) * 1000).toFixed(2)} mSOL (${(((solAmount / 0.1) - 1) * 100).toFixed(2)}%)`);

  // Estimate graduation time
  const timeEstimate = estimateTimeToGraduation(mockCurve, 5);
  console.log(`\n⏱️  Graduation Estimate:`);
  console.log(`   SOL remaining: ~${((69 * SOL_DECIMALS - mockCurve.realSolReserves) / SOL_DECIMALS).toFixed(1)} SOL`);
  console.log(`   At 5 SOL/hr rate: ${timeEstimate}`);

  // Show $CLAWD info
  console.log(`\n🦞 Trade with $CLAWD:`);
  console.log(`   CA: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`);
  console.log(`   Pump.fun: https://pump.fun/coin/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`);
  console.log(`   DexScreener: https://dexscreener.com/solana/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`);
}

// ── Mayhem Fee Recipients ──────────────────────────────────────────

function showMayhemConfig() {
  console.log("\n━━━ ⚡ Mayhem Program Fee Recipients ━━━\n");

  const feeRecipients = [
    "GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS",
    "4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6",
    "8SBKzEQU4nLSzcwF4a74F2iaUDQyTfjGndn6qUWBnrpR",
    "4UQeTP1T39KZ9Sfxzo3WR5skgsaP6NZa87BAkuazLEKH",
    "8sNeir4QsLsJdYpc9RZacohhK1Y5FLU3nC5LXgYB4aa6",
    "Fh9HmeLNUMVCvejxCtCL2DbYaRyBFVJ5xrWkLnMH6fdk",
    "463MEnMeGyJekNZFQSTUABBEbLnvMTALbT6ZmsxAbAdq",
    "6AUH3WEHucYZyC61hqpqYUWVto5qA5hjHuNQ32GNnNxA",
  ];

  console.log("  Program: MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e");
  console.log("  Global:  4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf\n");

  for (let i = 0; i < feeRecipients.length; i++) {
    console.log(`  ${i + 1}. ${feeRecipients[i]}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        🦞 Lobster Trader — pump.fun Bonding Curves          ║");
  console.log("║        $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  simulateTrade();
  showMayhemConfig();

  console.log("\n━━━ 📚 Learn More ━━━");
  console.log("   AGENTS/solana-lobster-agents.md — Full Lobster Agent docs");
  console.log("   API/README.md — Solana blockchain integration");
  console.log("   examples/ooda-loop.ts — Full OODA trading loop");
  console.log("   docs/articles/AUTO_RESEARCH_AGENTS.md — Auto-research system");
}

main().catch(console.error);