import type { InstructionPair } from '../types.js'

export function extractMemoryPairs(repoRoot: string): InstructionPair[] {
  const pairs: InstructionPair[] = []
  const src = 'SOUL.md'

  pairs.push({
    instruction: 'How does the three-tier memory system work in solana-clawd?',
    output: `solana-clawd uses three epistemological memory tiers from the SolanaOS framework:\n\n**KNOWN** — Verified, factual data\n- Source: API responses, on-chain state, price data\n- Confidence: High, but ephemeral (expires as data changes)\n- Examples: "SOL price is $148.50", "Wallet 7xKXt has 5.2 SOL balance", "Token MOONCAT graduation is at 45%"\n- Storage: Session-scoped, refreshed on each query\n\n**LEARNED** — Persistent trade patterns\n- Source: Validated observations promoted from INFERRED, explicit user teachings\n- Confidence: High, persistent across sessions\n- Examples: "BONK pumps after Solana ecosystem announcements", "Creator wallet 9Abc has rugged 3 tokens", "Jupiter routing is more efficient for >1 SOL trades"\n- Storage: Persistent vault (Honcho or local file)\n\n**INFERRED** — Tentative signals and hypotheses\n- Source: Pattern detection, weak correlations, unvalidated observations\n- Confidence: Low, revisable, subject to consolidation\n- Examples: "This wallet cluster may be coordinated", "MOONCAT shows early momentum similar to tokens that 10x'd last week"\n- Storage: Local vault, consolidated by Dream agent\n\n**Critical rule:** Never conflate INFERRED with KNOWN. When presenting information, always indicate which tier it comes from.`,
    source: src,
    category: 'memory_reasoning',
  })

  pairs.push({
    instruction: 'When should I store something as KNOWN vs LEARNED vs INFERRED?',
    output: `**Store as KNOWN** when:\n- It comes directly from an API call or on-chain query\n- It's verifiable right now (price, balance, transaction status)\n- It will change — KNOWN data is ephemeral\n- Example: "SOL is $148.50" (from \`sol_price\`)\n\n**Store as LEARNED** when:\n- It's a validated pattern you've confirmed multiple times\n- It should persist across sessions\n- It's actionable trading intelligence\n- Example: "Tokens that reach 70% graduation with >1000 holders have an 80% graduation rate"\n\n**Store as INFERRED** when:\n- It's a hypothesis based on limited data\n- It hasn't been validated yet\n- You want to track it for future confirmation/contradiction\n- Example: "This wallet may be a market maker — 47 trades today"\n\n**Decision tree:**\n1. Did it come from a tool call? → KNOWN\n2. Have you seen this pattern 3+ times and it held? → LEARNED\n3. Is it a guess, correlation, or unvalidated observation? → INFERRED\n\nUse \`memory_write\` with the appropriate tier. The Dream agent (\`dream_run\`) periodically reviews INFERRED signals, promoting validated ones to LEARNED and discarding contradicted ones.`,
    source: src,
    category: 'memory_reasoning',
  })

  pairs.push({
    instruction: 'How does memory consolidation (dreaming) work?',
    output: `The Dream agent performs memory consolidation — reviewing INFERRED signals and deciding their fate:\n\n**Trigger conditions:**\n- Manual: \`dream_run\` tool\n- Automatic: After a configurable number of OODA cycles or elapsed time\n\n**Process:**\n1. Recall all INFERRED memories via \`memory_recall tier=INFERRED\`\n2. Group related signals (same token, same creator, same pattern)\n3. For each group:\n   - **Confirmed by subsequent data?** → Promote to LEARNED\n   - **Contradicted by subsequent data?** → Discard\n   - **No new data either way?** → Keep as INFERRED with reduced confidence\n   - **Stale (>24h with no updates)?** → Discard\n\n**Examples:**\n- INFERRED: "Creator wallet 9Abc may be accumulating" + later KNOWN: "9Abc bought 50 SOL more" → Promote to LEARNED: "Creator 9Abc is actively accumulating"\n- INFERRED: "MOONCAT may pump" + later KNOWN: "MOONCAT creator sold all tokens" → Discard\n- INFERRED: "Tokens with cat themes are trending" + 3 more cat tokens pump → Promote to LEARNED\n\n**Check status:** Use \`dream_status\` to see when the next consolidation is scheduled, how many INFERRED signals are pending, and the OODA cycle gate configuration.`,
    source: src,
    category: 'memory_reasoning',
  })

  pairs.push({
    instruction: 'How should I handle contradictions between memory tiers?',
    output: `**Priority order: KNOWN > LEARNED > INFERRED**\n\nWhen tiers contradict:\n\n1. **KNOWN contradicts LEARNED:**\n   - KNOWN wins for the current decision\n   - But don't immediately discard the LEARNED pattern — it may be a temporary exception\n   - Example: LEARNED says "BONK pumps on Fridays" but KNOWN shows BONK is down today (Friday). The LEARNED pattern may still be generally true.\n\n2. **KNOWN contradicts INFERRED:**\n   - Discard the INFERRED signal immediately\n   - It was a hypothesis and fresh data proved it wrong\n   - Example: INFERRED "This wallet may be accumulating" but KNOWN shows the wallet just sold everything.\n\n3. **LEARNED contradicts INFERRED:**\n   - LEARNED wins\n   - The INFERRED signal may be noise\n   - But log the contradiction — if it happens repeatedly, the LEARNED pattern may need updating\n\n4. **Multiple INFERRED signals contradict each other:**\n   - Neither is trusted\n   - Both are hypotheses — wait for KNOWN data to resolve\n   - Flag for Dream agent to review during next consolidation\n\n**Transparency principle:** Always tell the user which tier the information comes from and flag any contradictions explicitly.`,
    source: src,
    category: 'memory_reasoning',
  })

  pairs.push({
    instruction: 'How do I use memory effectively during trading?',
    output: `**Before a trade (Observe phase):**\n\`memory_recall tier=all query="<token_name>"\`\n- Check if you have prior LEARNED patterns about this token or creator\n- Check for INFERRED signals from earlier scans\n- Any LEARNED rug warnings override all other signals\n\n**During analysis (Orient phase):**\n\`memory_recall tier=LEARNED query="<pattern>"\`\n- Cross-reference current opportunity against known patterns\n- Example: "Do I have learnings about tokens with 70% graduation?"\n\n**After a trade (Learn phase):**\n\`memory_write tier=INFERRED content="..."\`\n- Log the trade rationale and entry conditions\n- Example: "Entered MOONCAT at 65% graduation, score 72, 0.05 SOL"\n\n**After outcome is known:**\n\`memory_write tier=LEARNED content="..."\`\n- Promote successful patterns\n- Example: "Pump.fun tokens with >1000 holders at 60-80% graduation → 3/4 successful trades"\n\n**Periodic consolidation:**\n\`dream_run\`\n- Groups and evaluates INFERRED signals\n- Promotes validated patterns\n- Cleans stale signals\n\n**Anti-patterns to avoid:**\n- Don't store prices as LEARNED (they change — use KNOWN)\n- Don't store opinions as KNOWN (they're INFERRED at best)\n- Don't skip memory before trading — past learnings prevent repeated mistakes`,
    source: src,
    category: 'memory_reasoning',
  })

  return pairs
}
