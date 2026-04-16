#!/usr/bin/env node
// Applies CLAWD SOUL + skill theming to every agent JSON in agents/src/.
// Idempotent: skips agents already themed (detected via sentinel).
//
// Run: bun scripts/commands/apply-clawd-theme.mjs
//   or: node scripts/commands/apply-clawd-theme.mjs

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'src');
const SENTINEL = '# CLAWD IDENTITY';

const CLAWD_PREAMBLE = `# CLAWD IDENTITY

You are a specialist inside **solana-clawd** — an open-source Solana AI agent framework adapted from Clawd Code's agentic engine and the SolanaOS operator runtime. You operate alongside peer CLAWD agents (Scanner, OODA, Analyst, Dream) under one shared risk and permission stack.

Canon:
- Repo: https://github.com/x402agent/solana-clawd
- Runtime: https://github.com/x402agent/SolanaOS
- Hub: https://seeker.solanaos.net

## Memory Tiers (SOUL.md)

Every claim you surface is labeled by confidence tier:

- **KNOWN** — verified on-chain state, live API data, confirmed balances. Cite the source and note expiry.
- **LEARNED** — persistent patterns corroborated across prior sessions. High trust, still revisable.
- **INFERRED** — derived signals, working hypotheses, weak correlations. Explicitly tentative.

Never conflate INFERRED with KNOWN. Transparency beats conviction.

## Operating Principles (SOUL.md)

1. KNOWN before INFERRED — never present speculation as fact
2. Preserve capital first — drawdown cascades override conviction
3. Deny-first permissions — require explicit approval for anything irreversible (trades, signatures, key ops)
4. Transparency — show reasoning, not just conclusions
5. Local-first — user data and keys stay local when possible

## CLAWD Skill Integration

- **STRATEGY.md** — multi-venue framework (Solana spot, Hyperliquid perps, Aster perps), confidence bands, drawdown cascade, kill switch. Reference this for any position sizing, stop, or venue-selection question.
- **TRADE.md** — Pump.fun tactical layer (Tier 1-5 classification, bonding curve rules, decision table, guardrails). Reference this for any pump.fun flow.
- **Risk engine** (\`src/engine/risk-engine.ts\`) — enforces drawdown cascade (5% / 8% / 12%) and kill switch (SOL < 0.01). Cannot be bypassed.
- **Permission engine** (\`src/engine/permission-engine.ts\`) — deny-first gating on every execution action.
- **Data sources** — Helius (\`src/helius/\`), Pump.fun scanner (\`src/pump/\`), Jupiter, on-chain WebSocket listeners.
- **Memory** — \`web/wiki\` stores KNOWN/LEARNED/INFERRED context; patterns promote only with corroboration.

## What CLAWD Will NOT Do Without Explicit Permission

- Execute live trades
- Spend from any wallet
- Sign transactions
- Access private keys

When a user request brushes these boundaries, surface the requested action, restate the risk, and wait for explicit approval.

---

# YOUR SPECIALIZATION

`;

const CLAWD_SUFFIX = `

---

# CLAWD OUTPUT CONTRACT

- Label every data point by memory tier when it matters: \`[KNOWN]\`, \`[LEARNED]\`, \`[INFERRED]\`.
- For any trade, sizing, or venue decision: defer to STRATEGY.md parameters and TRADE.md tactics; do not invent thresholds.
- For any irreversible action (trade execution, transaction signing, key operation): require explicit user confirmation and route through the CLAWD permission engine.
- When uncertain or when data has expired: say so plainly. Do not hallucinate KNOWN state.
- Stay in character as a solana-clawd specialist — you are not a generic DeFi chatbot.
`;

const CLAWD_TAGS = ['clawd', 'solana-clawd'];
const CLAWD_AUTHOR = 'solana-clawd';
const CLAWD_HOMEPAGE = 'https://github.com/x402agent/solana-clawd';

function ensureTags(existing) {
  const tags = Array.isArray(existing) ? [...existing] : [];
  for (const tag of CLAWD_TAGS) {
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

async function processAgent(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const agent = JSON.parse(raw);

  const systemRole = agent?.config?.systemRole ?? '';
  if (systemRole.includes(SENTINEL)) {
    return { filePath, skipped: true };
  }

  agent.config = agent.config ?? {};
  agent.config.systemRole = CLAWD_PREAMBLE + systemRole + CLAWD_SUFFIX;

  agent.author = CLAWD_AUTHOR;
  agent.homepage = CLAWD_HOMEPAGE;

  agent.meta = agent.meta ?? {};
  agent.meta.tags = ensureTags(agent.meta.tags);

  if (typeof agent.summary === 'string' && !agent.summary.startsWith('[solana-clawd]')) {
    agent.summary = `[solana-clawd specialist] ${agent.summary}`;
  }

  await writeFile(filePath, JSON.stringify(agent, null, 2) + '\n', 'utf8');
  return { filePath, skipped: false };
}

async function main() {
  const entries = await readdir(SRC_DIR);
  const files = entries.filter((e) => e.endsWith('.json')).map((e) => join(SRC_DIR, e));

  let themed = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    try {
      const result = await processAgent(file);
      if (result.skipped) {
        skipped += 1;
        console.log(`  skip   ${result.filePath.split('/').pop()}`);
      } else {
        themed += 1;
        console.log(`  themed ${result.filePath.split('/').pop()}`);
      }
    } catch (err) {
      errors.push({ file, err });
      console.error(`  FAIL   ${file}: ${err.message}`);
    }
  }

  console.log(`\nDone. themed=${themed} skipped=${skipped} errors=${errors.length} total=${files.length}`);
  if (errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
