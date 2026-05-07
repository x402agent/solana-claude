import type { InstructionPair } from '../types.js'

export function extractOodaPairs(repoRoot: string): InstructionPair[] {
  const pairs: InstructionPair[] = []
  const src = 'src/coordinator/coordinator.ts'

  pairs.push({
    instruction: 'What is the OODA loop trading methodology used by solana-clawd?',
    output: `OODA stands for **Observe → Orient → Decide → Act**, a decision-making framework adapted from military strategy to Solana trading:\n\n**1. Observe** — Gather raw market data:\n- Check SOL price via \`sol_price\`\n- Scan trending tokens via \`solana_trending\`\n- Check new Pump.fun launches via \`pump_new_tokens\`\n- Recall KNOWN and INFERRED memories\n- Monitor wallet activity via \`helius_transactions\`\n\n**2. Orient** — Analyze and score opportunities:\n- Run \`pump_token_scan\` or \`solana_token_info\` for each candidate\n- Score on 5 dimensions (0-100 total):\n  - Trend structure: 0-25 pts\n  - Momentum: 0-20 pts\n  - Liquidity depth: 0-20 pts\n  - Participation quality: 0-15 pts\n  - Execution risk: 0-20 pts (subtractive)\n- Minimum threshold: 60/100 to proceed\n\n**3. Decide** — Size the position based on score:\n- 60-69: Half-size position\n- 70-79: Base size\n- 80-89: 1.25x base\n- 90+: 1.5x base\n\n**4. Act** — Execute with human approval:\n- All trades require explicit permission\n- Set take-profit and stop-loss levels\n- Log the decision rationale to LEARNED memory\n\nAfter each cycle, consolidate learnings: promote INFERRED signals to LEARNED if validated, discard if contradicted.`,
    source: src,
    category: 'trading_strategy',
  })

  pairs.push({
    instruction: 'How should I implement the Observe phase of the OODA loop?',
    output: `The Observe phase gathers raw data without analysis. Run these tools:\n\n1. **Price context**: \`sol_price\` for current SOL/USD\n2. **Market scan**: \`solana_trending\` with limit=20 to see what's moving\n3. **New launches**: \`pump_new_tokens\` for fresh Pump.fun entries\n4. **Memory check**: \`memory_recall\` at tier=all to see prior signals and learnings\n5. **Watchlist**: Check any specific tokens or wallets you're tracking\n\n**Key principle:** Don't make judgments during Observe. Just collect data. The Orient phase is where analysis happens.\n\n**Timing:** Run a full Observe cycle every 5-15 minutes during active trading. For passive monitoring, use \`agent_spawn\` with type "scanner" to run continuous observation in the background.`,
    source: src,
    category: 'trading_strategy',
  })

  pairs.push({
    instruction: 'How should I implement the Orient phase of the OODA loop?',
    output: `Orient is where raw observations become scored opportunities. For each candidate from Observe:\n\n**1. Deep scan** — Run \`pump_token_scan\` or \`solana_token_info\`\n\n**2. Score on 5 dimensions:**\n\n- **Trend structure (0-25)**: Is there a clear narrative? Is the chart forming higher lows? Is volume increasing?\n- **Momentum (0-20)**: Buy/sell ratio, price velocity, social mentions\n- **Liquidity (0-20)**: Can you enter/exit at size? What's the depth? For Pump.fun: how far is graduation?\n- **Participation (0-15)**: Holder count, top trader activity (\`solana_top_traders\`), smart money flow\n- **Execution risk (0-20, subtractive)**: Slippage, MEV exposure, rug indicators, creator sold\n\n**3. Filter:**\n- Score ≥ 60: Proceed to Decide\n- Score < 60: Log as INFERRED signal and move on\n\n**4. Cross-reference:** Check \`memory_recall\` for any prior signals about this token or creator. LEARNED memories about rug patterns override positive signals.`,
    source: src,
    category: 'trading_strategy',
  })

  pairs.push({
    instruction: 'How should I size positions in the Decide phase?',
    output: `Position sizing is score-dependent:\n\n| Score Range | Size Multiple | Risk Level |\n|-------------|---------------|------------|\n| 60-69       | 0.5x base     | Cautious   |\n| 70-79       | 1.0x base     | Standard   |\n| 80-89       | 1.25x base    | Confident  |\n| 90+         | 1.5x base     | High conviction |\n\n**Base size** depends on portfolio allocation rules:\n- Never risk more than 5% of portfolio on a single trade\n- For Pump.fun degens: base = 0.05-0.1 SOL\n- For established tokens: base = 1-5% of portfolio\n\n**Stop-loss and take-profit:**\n- Pump.fun: Stop-loss 15-25%, take-profit 50-100%\n- Established tokens: Stop-loss 5-10%, take-profit 20-50%\n- High CHAOS buddies may use wider stops\n\n**Risk rules:**\n- Maximum 3 concurrent open positions (default)\n- If total open risk > 15% of portfolio, no new entries\n- LEARNED rug patterns override score — if the creator has a history, skip regardless of score`,
    source: src,
    category: 'trading_strategy',
  })

  pairs.push({
    instruction: 'How does the Act phase work and why is human approval required?',
    output: `The Act phase executes the decided trade with strict safety gates:\n\n**Permission model:**\n- All trade executions require **explicit human approval** — the system is deny-first\n- The agent presents: token, direction, size, entry price, stop-loss, take-profit, and conviction score\n- The human approves, modifies, or rejects\n- No silent buys, no surprise executions\n\n**Execution steps:**\n1. Present the trade plan with full rationale\n2. Wait for human approval\n3. Get a fresh buy/sell quote (prices may have moved since Orient phase)\n4. Execute with appropriate priority fee (\`helius_priority_fee\`)\n5. Confirm transaction on-chain\n6. Log the trade to LEARNED memory with entry rationale\n\n**Post-trade:**\n- Set up monitoring via \`helius_webhook_create\` for price changes\n- Log the trade decision to memory for OODA learning\n- Schedule re-evaluation in 15-30 minutes\n\n**Simulation mode:** For paper trading, the buddy's simulated wallet is updated without any on-chain transaction.`,
    source: src,
    category: 'trading_strategy',
  })

  // Multi-agent OODA
  pairs.push({
    instruction: 'How do multiple agents coordinate during an OODA cycle?',
    output: `The coordinator routes work across agent types:\n\n**Agent types and their OODA roles:**\n- **research** — Deep Observe: researches a specific token or narrative\n- **scanner** — Continuous Observe: streams new launches, monitors wallets\n- **analysis** — Orient: scores opportunities, runs quantitative analysis\n- **ooda** — Full loop: runs complete OODA cycle autonomously\n- **dream** — Learn: consolidates INFERRED → LEARNED memories\n\n**Coordination rules:**\n- Research agents run freely in parallel (read-only, no state risk)\n- Trade execution runs ONE AT A TIME (no parallel trades)\n- Trade agents require KNOWN price/liquidity data before acting\n- Scanner agents emit signals to INFERRED memory tier\n- OODA agents consume INFERRED signals during Orient\n\n**Workflow example:**\n1. Scanner agent monitors \`pump_new_tokens\` every 60 seconds\n2. When it finds a candidate, it writes to INFERRED memory\n3. OODA agent picks up the signal during its Observe phase\n4. OODA agent runs Orient/Decide, then presents to human for Act approval\n5. Dream agent periodically consolidates: promotes validated signals to LEARNED, discards stale ones`,
    source: src,
    category: 'trading_strategy',
  })

  // Practical scenarios
  pairs.push({
    instruction: 'Walk me through a complete OODA cycle for evaluating a new Pump.fun token.',
    input: 'A new token called MOONCAT just launched on Pump.fun with mint address 7xKXt...',
    output: `**OBSERVE:**\n1. \`sol_price\` → SOL is $148.50\n2. \`pump_new_tokens\` → MOONCAT appeared 3 minutes ago\n3. \`memory_recall tier=all\` → No prior data on MOONCAT or its creator\n\n**ORIENT:**\n4. \`pump_token_scan mint=7xKXt...\` →\n   - Graduation: 12% (early stage)\n   - Creator sold: No ✓\n   - LP locked: No\n   - Whale concentration: 35% (moderate)\n   - Signal score: 58 (MODERATE)\n\n5. Scoring:\n   - Trend structure: 10/25 (too early to judge)\n   - Momentum: 12/20 (decent buy pressure)\n   - Liquidity: 8/20 (only 12% graduated)\n   - Participation: 8/15 (150 holders, growing)\n   - Execution risk: -8/20 (no LP lock, moderate whales)\n   - Total: 30/100 — Below 60 threshold\n\n**DECIDE:**\n6. Score 30 < 60 → DO NOT ENTER\n7. Write to INFERRED: "MOONCAT — moderate signal at 12% graduation. Revisit at 40%+"\n\n**ACT:**\n8. No trade executed. Set mental reminder to re-scan later.\n9. Optionally: \`agent_spawn type=scanner\` to monitor MOONCAT's graduation progress\n\n**LEARN:**\n10. If MOONCAT later graduates successfully, promote the INFERRED signal to LEARNED: "Tokens with early moderate scores can improve — worth re-evaluating at 50%+ graduation."`,
    source: src,
    category: 'trading_strategy',
  })

  pairs.push({
    instruction: 'What are the key risk management rules during OODA trading?',
    output: `**Capital preservation rules:**\n\n1. **Preserve capital first** — Drawdown cascades override all conviction. If portfolio is down >10% in a session, stop trading and switch to observation only.\n\n2. **KNOWN before INFERRED** — Never trade on speculation. Verify all data with on-chain tools before acting. An INFERRED signal is a hypothesis, not a fact.\n\n3. **Position limits:**\n   - Max 3 concurrent open positions\n   - Max 5% portfolio on any single trade\n   - Max 15% total portfolio at risk\n\n4. **Rug detection gates:**\n   - Creator sold → automatic AVOID\n   - Whale concentration >50% → automatic AVOID\n   - No LP lock on high-value positions → reduce size by 50%\n\n5. **Time gates:**\n   - Don't enter Pump.fun tokens in first 60 seconds (bot-heavy)\n   - Don't enter above 90% graduation (buying the top of bonding curve)\n   - Set hard timeout on all positions\n\n6. **Deny-first permissions:**\n   - All writes blocked at engine level by default\n   - Trade workers run sequentially, never in parallel\n   - Human approval required for every execution`,
    source: src,
    category: 'trading_strategy',
  })

  return pairs
}
