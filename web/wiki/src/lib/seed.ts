#!/usr/bin/env tsx
/**
 * Seed the CLAWD Wiki with foundational Solana trading knowledge.
 * Run: cd web/wiki && npx tsx src/lib/seed.ts
 */
import { createArticle, getAllArticles } from "./store.js";

if (getAllArticles().length > 0) {
  console.log("Wiki already has articles — skipping seed.");
  process.exit(0);
}

const articles = [
  {
    slug: "ooda-loop",
    title: "OODA Trading Loop",
    category: "strategy" as const,
    summary: "The Observe-Orient-Decide-Act cycle adapted for Solana DeFi trading with multi-venue signal scoring.",
    tags: ["ooda", "strategy", "core"],
    memoryTier: "LEARNED" as const,
    metadata: {},
    sources: [{ label: "SolanaOS strategy.md", type: "manual" as const }],
    content: `# OODA Trading Loop

## Overview
The OODA loop (Observe, Orient, Decide, Act) is the core decision-making framework for CLAWD agents. Adapted from military strategy for the speed and chaos of Solana DeFi markets.

## Phases

### OBSERVE
Gather real-time market data:
- \`sol_price\` — Current SOL/USD
- \`solana_trending\` — Top movers by volume/momentum
- \`helius_priority_fee\` — Network congestion indicator
- \`memory_recall(KNOWN)\` — Fresh cached signals

### ORIENT
Score each candidate using weighted factors:
| Factor | Weight | Source |
|--------|--------|--------|
| Trend alignment | 25% | 24h price change |
| Momentum | 20% | Volume acceleration |
| Liquidity depth | 20% | DEX pool sizes |
| Smart money participation | 15% | Top trader wallets |
| Execution risk | -20% | Slippage + priority fee |

### DECIDE
- Confidence >= 60 → Size band selection
  - 60-69: 0.5x base size
  - 70-79: 1.0x
  - 80-89: 1.25x
  - 90+: 1.5x (max conviction)
- Below 60 → SKIP, write INFERRED signal for Dream agent

### ACT
Execute via Jupiter/Raydium with:
- Priority fee from helius estimate
- Slippage protection (adaptive)
- Permission gate: \`ask\` mode requires human approval

### LEARN
Post-trade:
- Write result to INFERRED memory
- Dream agent consolidates INFERRED → LEARNED
- Failed trades write risk patterns to LEARNED
`,
  },
  {
    slug: "solana-sol",
    title: "SOL (Solana)",
    category: "token" as const,
    summary: "Solana's native token — L1 gas, staking, and the base pair for all Solana DeFi.",
    tags: ["sol", "l1", "base-pair"],
    memoryTier: "LEARNED" as const,
    metadata: {
      mint: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      solscanLink: "https://solscan.io/token/So11111111111111111111111111111111111111112",
    },
    sources: [{ label: "Helius RPC", type: "api" as const }],
    content: `# SOL (Solana)

## Token Info
- **Mint:** \`So11111111111111111111111111111111111111112\`
- **Type:** Native L1 token
- **Use:** Gas fees, staking, base pair for all DEX trading

## Trading Notes
- SOL is the denominator for most Solana trades
- Monitor SOL price before any memecoin entry (correlation risk)
- Priority fees are paid in SOL — high network activity = higher execution cost
- Staking yield: ~7% APY via liquid staking (Marinade, Jito)

## Key Signals
- SOL dominance rising = risk-off (memes dump)
- SOL flat + memecoin volume rising = rotation opportunity
- SOL + ETH correlation breakdown = Solana-specific catalyst
`,
  },
  {
    slug: "pump-fun-mechanics",
    title: "Pump.fun Bonding Curve",
    category: "protocol" as const,
    summary: "How Pump.fun bonding curves work — launch mechanics, graduation, and cashback.",
    tags: ["pumpfun", "bonding-curve", "memecoin", "launch"],
    memoryTier: "LEARNED" as const,
    metadata: {
      birdeyeLink: "https://birdeye.so",
      pumpfunLink: "https://pump.fun",
    },
    sources: [{ label: "pump-sdk-core SKILL.md", type: "manual" as const }],
    content: `# Pump.fun Bonding Curve

## How It Works
1. Creator launches token on pump.fun (no code needed)
2. Token starts on a **bonding curve** — price increases with buys
3. At ~$69k market cap, token **graduates** to PumpSwap AMM
4. Post-graduation: normal DEX trading on Raydium/Jupiter

## Key Metrics
- **Bonding curve progress:** 0-100% (use \`/grad <mint>\`)
- **Sweet spot:** 60-90% progress — pre-graduation momentum
- **Risk zone:** <20% progress — high chance of abandonment

## Graduation
- Triggered automatically at market cap threshold
- Liquidity migrates from bonding curve → PumpSwap AMM pool
- LP tokens are burned (locked forever)

## Cashback
- Creator fee redirected back to traders
- Auto on buys during bonding curve
- Requires UserVolumeAccumulator PDA for sells
- Claim via \`claim_cashback\` instruction

## Mayhem Mode
- 2B supply variant (vs standard 1B)
- Higher volatility, faster graduation
- Use \`/snipe mayhem\` to filter for these only
`,
  },
  {
    slug: "memory-system",
    title: "Three-Tier Memory System",
    category: "agent" as const,
    summary: "KNOWN/LEARNED/INFERRED memory tiers — how agents accumulate and validate trading knowledge.",
    tags: ["memory", "agent", "ooda", "dream"],
    memoryTier: "LEARNED" as const,
    metadata: { agentType: "Dream" },
    sources: [{ label: "SolanaOS epistemology", type: "manual" as const }],
    content: `# Three-Tier Memory System

## KNOWN (Ephemeral)
- **Source:** API calls, price feeds, scanner signals
- **Lifetime:** Expires after set duration (default 60s for prices)
- **Example:** "SOL: $142.30, +3.2% 24h"
- **Use:** OODA OBSERVE phase — fresh market context

## LEARNED (Persistent)
- **Source:** Validated patterns, confirmed by Dream agent
- **Lifetime:** Permanent until explicitly revoked
- **Example:** "BONK typically leads meme rallies by 2-4h"
- **Use:** OODA ORIENT phase — pattern matching

## INFERRED (Tentative)
- **Source:** Scanner signals, single-observation correlations
- **Lifetime:** Expires in 24h unless promoted
- **Example:** "WIF showing accumulation pattern similar to March 2025"
- **Use:** Candidate for promotion → LEARNED via Dream consolidation

## Dream Agent
The Dream agent runs periodically to:
1. Review all INFERRED signals
2. Find recurring themes (token, pattern, wallet)
3. Promote high-confidence signals to LEARNED
4. Expire stale or contradicted signals
5. Write consolidated insights

Run manually: \`/dream\` in Telegram
`,
  },
  {
    slug: "jupiter-routing",
    title: "Jupiter Aggregator",
    category: "protocol" as const,
    summary: "Jupiter — Solana's leading DEX aggregator. Best-price routing across all venues.",
    tags: ["jupiter", "dex", "swap", "routing"],
    memoryTier: "LEARNED" as const,
    metadata: {
      mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      symbol: "JUP",
    },
    sources: [{ label: "Jupiter API docs", type: "manual" as const }],
    content: `# Jupiter Aggregator

## Overview
Jupiter is Solana's #1 DEX aggregator — routes swaps across Raydium, Orca, Meteora, and 20+ venues for best price.

## Key Endpoints
- **Quote:** \`GET /v6/quote?inputMint=X&outputMint=Y&amount=Z\`
- **Swap:** \`POST /v6/swap\` — returns serialized transaction
- **Ultra:** \`POST /ultra/v1/order\` — intent-based, MEV-protected

## Integration Notes
- Always use \`slippageBps\` (basis points, not percent)
- Set \`prioritizationFeeLamports\` from Helius fee estimate
- For large swaps: use Ultra API (MEV protection, better fills)

## Referral
- Referral account earns fee share on swaps
- CLAWD referral: \`2mE1EbETC8e8XyJomMkvQ3jXzoGBZAqRRSRFJv9AHRD9\`
`,
  },
  {
    slug: "rug-detection",
    title: "Rug Pull Detection Patterns",
    category: "signal" as const,
    summary: "Common rug pull indicators and how to detect them before entry.",
    tags: ["rug", "security", "risk", "detection"],
    memoryTier: "LEARNED" as const,
    riskLevel: "high",
    metadata: { signalStrength: "STRONG", signalScore: 90 },
    sources: [{ label: "OODA trade history", type: "agent" as const }],
    content: `# Rug Pull Detection Patterns

## Red Flags (Auto-AVOID)
1. **Creator sold >50%** — check \`creatorSold\` field
2. **Top 10 holders >60%** — extreme whale concentration
3. **No social links** — zero Twitter/Telegram/website
4. **Mint authority not revoked** — can inflate supply
5. **Freeze authority active** — can freeze your tokens

## Yellow Flags (Proceed with caution)
1. Top 10 holders 30-50%
2. <100 holders after 1 hour
3. Bonding curve progress <10% after 30 minutes
4. No dev buy (creator didn't buy their own token)
5. Name/symbol cloning a popular token

## Green Signals
1. LP burned or locked (graduated tokens)
2. Dev holding <5%
3. Organic holder growth (not botted)
4. Cashback enabled (creator aligned with traders)
5. Community verified on Pump.fun

## Automated Scoring
The Scanner agent scores 0-100:
- >= 75: STRONG (auto-snipe eligible)
- 55-74: MODERATE (research first)
- 35-54: WEAK (high risk)
- < 35: AVOID
`,
  },
];

for (const a of articles) {
  createArticle(a);
  console.log(`  Created: ${a.title} [${a.category}]`);
}

console.log(`\nSeeded ${articles.length} wiki articles.`);
