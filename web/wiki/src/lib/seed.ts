#!/usr/bin/env tsx
/**
 * Seed the CLAWD Wiki with Solana blockchain and finance agent knowledge.
 * Run: cd web/wiki && npx tsx src/lib/seed.ts
 */
import { createArticle, getAllArticles } from "./store.js";

if (getAllArticles().length > 0) {
  console.log("Wiki already has articles — skipping seed.");
  process.exit(0);
}

const articles = [
  {
    slug: "ooda-finance-loop",
    title: "OODA Finance Loop",
    category: "strategy" as const,
    summary: "The Observe-Orient-Decide-Act-Learn cycle adapted for Solana blockchain and finance agents, with explicit routing through risk rails and memory tiers.",
    tags: ["ooda", "strategy", "trading", "finance", "solana"],
    memoryTier: "LEARNED" as const,
    metadata: {
      entryRules: ["Score >= 60", "Liquidity and holder quality confirmed", "Execution venue available"],
      exitRules: ["Target or stop hit", "Execution risk expands", "Signal invalidated by fresh KNOWN data"],
      stopLossPct: 12,
      takeProfitPct: 25,
    },
    sources: [
      { label: "src/agents/built-in-agents.ts", type: "manual" as const },
      { label: "src/memory/extract-memories.ts", type: "manual" as const },
    ],
    content: `# OODA Finance Loop

## Purpose
The OODA loop is the core operating model for $CLAWD finance agents. It is not just market analysis. It is the glue between live Solana data, memory, risk gating, and operator approval.

## Observe
- Pull live market context from Helius and Solana data tools
- Check trending tokens, wallet activity, and execution venue state
- Recall \`KNOWN\` memory for active conditions and \`INFERRED\` memory for candidate signals

## Orient
- Score tokens, wallets, and venues on trend, liquidity, participation, and execution risk
- Cross-check with \`LEARNED\` memory for recurring patterns
- Decide whether the signal belongs in research only, watchlist mode, or trade-ready state

## Decide
- Require confidence bands before sizing
- Prefer read-only research when data quality is weak
- Keep trade execution behind explicit approval and permission gates

## Act
- Route research and execution through Jupiter, Pump.fun, wallet, or monitoring workflows
- Emit structured outputs for Telegram, web, or downstream agents
- Record both the action and the reason

## Learn
- Promote corroborated patterns from \`INFERRED\` to \`LEARNED\`
- Expire stale observations
- Keep the wiki, docs, and operator understanding aligned with the runtime

## Connected Modules
- \`src/agents/built-in-agents.ts\`
- \`src/engine/tool-executor.ts\`
- \`src/memory/extract-memories.ts\`
- \`src/tasks/\`
`,
  },
  {
    slug: "clawd-token",
    title: "$CLAWD Token",
    category: "token" as const,
    summary: "$CLAWD is the onchain identity token used across the solana-clawd stack, linking the brand, wiki, operator UX, and Solana-native agent positioning.",
    tags: ["clawd", "token", "solana", "pumpfun", "brand"],
    memoryTier: "LEARNED" as const,
    metadata: {
      mint: "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump",
      symbol: "CLAWD",
      pumpfunLink: "https://pump.fun",
      solscanLink: "https://solscan.io/token/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump",
    },
    sources: [
      { label: "web/app/page.tsx", type: "manual" as const },
      { label: "package.json", type: "manual" as const },
    ],
    content: `# $CLAWD Token

## Role In The Stack
$CLAWD is the Solana-native identity layer for the repo's operator story. It is the token-facing surface that ties together:
- the landing page in \`web/app\`
- the wiki in \`web/wiki\`
- the skills catalog in \`web/skills\`
- the runtime modules in \`src/\`

## Mint
- **Mint:** \`8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump\`
- **Network:** Solana
- **Positioning:** blockchain and finance agent stack identity

## Operator Notes
- Treat the token as part of the onchain brand surface, not as a substitute for runtime capability
- The actual product value lives in the agent fleet, tools, skills, memory, gateway, and risk engine
- Any token-related messaging should stay consistent with the real modules shipped in this repo

## Connected Surfaces
- \`web/app/page.tsx\`
- \`web/wiki/src/app/page.tsx\`
- \`docs/architecture.md\`
`,
  },
  {
    slug: "market-data-and-execution-stack",
    title: "Market Data & Execution Stack",
    category: "protocol" as const,
    summary: "How the $CLAWD stack connects Helius, Jupiter, Pump.fun, Metaplex, and the runtime modules that power Solana blockchain and finance agents.",
    tags: ["helius", "jupiter", "pumpfun", "metaplex", "execution"],
    memoryTier: "LEARNED" as const,
    metadata: {},
    sources: [
      { label: "src/helius/helius-client.ts", type: "manual" as const },
      { label: "src/pump/scanner.ts", type: "manual" as const },
      { label: "src/metaplex/agent-registry.ts", type: "manual" as const },
    ],
    content: `# Market Data & Execution Stack

## Core Providers
- **Helius:** account data, DAS, transactions, priority fees, webhooks, listeners
- **Jupiter:** routing and swap path intelligence
- **Pump.fun:** launch discovery, bonding curve scanning, early-stage signal generation
- **Metaplex:** onchain agent identity and registration flows

## Runtime Path
1. Fetch live Solana context from Helius-backed tools
2. Rank opportunities through Scanner, Analyst, or OODA flows
3. Route execution or reporting through the approved venue
4. Write memory, alerts, or monitor subscriptions back into the system

## Why This Matters
This repo is positioned for blockchain and finance agents, so the surface area must show real venue connectivity instead of generic chatbot framing.

## Connected Modules
- \`src/helius/\`
- \`src/pump/\`
- \`src/metaplex/\`
- \`src/tools.ts\`
`,
  },
  {
    slug: "blockchain-finance-agent-fleet",
    title: "Blockchain & Finance Agent Fleet",
    category: "agent" as const,
    summary: "The built-in $CLAWD fleet covers research, scanning, OODA trading, memory consolidation, deep analysis, monitoring, and Metaplex agent lifecycle operations.",
    tags: ["agents", "explore", "scanner", "ooda", "dream", "analyst", "monitor"],
    memoryTier: "LEARNED" as const,
    metadata: { agentType: "Explore, Scanner, OODA, Dream, Analyst, Monitor, MetaplexAgent" },
    sources: [
      { label: "src/agents/built-in-agents.ts", type: "manual" as const },
      { label: "src/coordinator/coordinator.ts", type: "manual" as const },
    ],
    content: `# Blockchain & Finance Agent Fleet

## Built-In Agents
- **Explore:** read-only Solana research
- **Scanner:** trending and opportunity detection
- **OODA:** full Observe → Orient → Decide → Act → Learn cycle
- **Dream:** memory consolidation and pattern promotion
- **Analyst:** deep token and wallet reports
- **Monitor:** live listener and webhook setup
- **MetaplexAgent:** onchain agent minting and registry operations

## Operating Principle
Every agent is only useful if the surrounding surfaces explain what it connects to. The homepage, docs, skills catalog, and wiki should all point back to this fleet.

## Connected Modules
- \`src/agents/built-in-agents.ts\`
- \`src/coordinator/\`
- \`src/tasks/\`
- \`src/commands/\`
`,
  },
  {
    slug: "connected-surface-map",
    title: "Connected Surface Map",
    category: "research" as const,
    summary: "Map of how web/app, web/wiki, web/skills, docs, and src/ fit together so the $CLAWD stack reads as one connected Solana blockchain and finance system.",
    tags: ["architecture", "web", "wiki", "skills", "docs", "runtime"],
    memoryTier: "KNOWN" as const,
    metadata: { expiresAt: "2027-01-01T00:00:00.000Z" },
    sources: [
      { label: "docs/architecture.md", type: "manual" as const },
      { label: "web/app/page.tsx", type: "manual" as const },
      { label: "scripts/generate-skills-catalog.js", type: "manual" as const },
    ],
    content: `# Connected Surface Map

## User-Facing Surfaces
- **web/app** — landing page, docs browser, buddies terminal, voice UI, API routes
- **web/wiki** — operational wiki for token, agent, strategy, risk, and architecture knowledge
- **web/skills** — lightweight browser for the skill catalog
- **docs/** — long-form architecture and risk specifications

## Runtime Source Of Truth
- **src/agents** — built-in agent fleet
- **src/engine** — query engine, tool executor, permission engine, risk engine
- **src/gateway** and **src/server** — remote control and operator transport
- **src/memory** and **src/memdir** — KNOWN / LEARNED / INFERRED memory behavior
- **src/helius**, **src/pump**, **src/metaplex**, **src/voice**, **src/buddy** — domain integrations

## Skill Catalog Path
1. Skills live in \`skills/\`
2. \`scripts/generate-skills-catalog.js\` generates \`skills/catalog.json\`
3. The catalog is copied into \`web/skills/catalog.json\`
4. \`web/skills/index.html\` renders the browser

## Objective
The repo should read like one connected Solana blockchain and finance agent system, not a set of disconnected experiments.
`,
  },
  {
    slug: "execution-risk-rails",
    title: "Execution Risk Rails",
    category: "signal" as const,
    summary: "Risk rails for $CLAWD combine deny-first permissions, execution gating, memory discipline, and risk-engine checks before any finance action is treated as safe.",
    tags: ["risk", "permissions", "execution", "finance", "safety"],
    memoryTier: "LEARNED" as const,
    riskLevel: "high" as const,
    metadata: { signalStrength: "STRONG" as const, signalScore: 92 },
    sources: [
      { label: "src/engine/risk-engine.ts", type: "manual" as const },
      { label: "src/engine/permission-engine.ts", type: "manual" as const },
      { label: "docs/risk-engine-spec.md", type: "manual" as const },
    ],
    content: `# Execution Risk Rails

## What Must Stay True
- Research can be cheap and fast
- Execution must stay gated
- Memory should not silently become truth without validation
- Wallet, trade, and delegation flows need explicit operator intent

## Main Rails
1. **Permission engine**
   - deny-first
   - explicit allow patterns
   - no silent escalation for finance actions
2. **Risk engine**
   - persistent source of truth for position and vault logic
   - protects against loose accounting and invalid state transitions
3. **Memory discipline**
   - \`KNOWN\` for fresh facts
   - \`LEARNED\` for validated patterns
   - \`INFERRED\` for tentative signals
4. **Surface consistency**
   - the web app, docs, and wiki should present the same risk framing as the runtime

## Practical Rule
If a page markets blockchain or finance agents, it should also make the risk rails visible. Otherwise the positioning is incomplete.
`,
  },
];

for (const a of articles) {
  createArticle(a);
  console.log(`  Created: ${a.title} [${a.category}]`);
}

console.log(`\nSeeded ${articles.length} wiki articles.`);
