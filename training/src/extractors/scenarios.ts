import type { InstructionPair } from '../types.js'

export function extractScenarios(repoRoot: string): InstructionPair[] {
  const pairs: InstructionPair[] = []
  const src = 'training/scenarios'

  // Scenario 1: Token evaluation workflow
  pairs.push({
    instruction: 'I found a new token called SOLCAT on Pump.fun. Should I buy it?',
    input: 'Mint: 8xYz... Launched 15 minutes ago. Seeing some chatter on Twitter.',
    output: `Let me run a full OODA evaluation.\n\n**OBSERVE:**\nI'll check the current state:\n- \`sol_price\` → Need current SOL/USD for market cap calculation\n- \`pump_token_scan mint=8xYz...\` → Get bonding curve state, graduation, security flags\n- \`memory_recall tier=all query="SOLCAT"\` → Check for prior signals\n\n**ORIENT:**\nBased on the scan results, I'd evaluate:\n- **Security**: Is the creator wallet clean? Has the creator sold? Is LP locked?\n- **Graduation**: What's the current progress? Sweet spot is 60-90%\n- **Volume**: Is there genuine trading volume or wash trading?\n- **Signal score**: The composite score needs to be ≥60 to proceed\n\n**DECIDE:**\nIf the score is STRONG (75+):\n- Entry size: 0.05-0.1 SOL (small for a 15-min-old token)\n- Stop-loss: 15%\n- Take-profit: 50%\n\nIf MODERATE (55-74): Wait and monitor. Set up a scanner agent.\nIf WEAK/AVOID: Skip entirely.\n\n**Key concern:** At only 15 minutes old, the token is very early. The first 60 seconds are bot-heavy, so we're past that, but holder count and graduation progress are likely still very low. I'd recommend waiting until graduation reaches at least 30-40% before considering entry.\n\nWant me to run the scan now?`,
    source: src,
    category: 'scenario',
  })

  // Scenario 2: Portfolio review
  pairs.push({
    instruction: 'Can you analyze my wallet and tell me how I\'m doing?',
    input: 'Wallet address: 5vTp...',
    output: `I'll run a comprehensive wallet analysis:\n\n**Step 1 — Holdings:**\n\`solana_wallet_tokens wallet=5vTp...\`\nThis shows all token balances in your wallet.\n\n**Step 2 — Performance:**\n\`solana_wallet_pnl wallet=5vTp...\`\nThis gives your overall PnL, trade count, win rate, and trade history.\n\n**Step 3 — Recent activity:**\n\`helius_transactions address=5vTp... limit=20\`\nEnhanced transaction history showing swaps, transfers, and NFT events with human-readable descriptions.\n\n**Step 4 — Balance:**\n\`helius_balance address=5vTp...\`\nCurrent SOL balance.\n\n**What I'll analyze:**\n- Overall PnL and win rate\n- Best and worst trades\n- Position concentration (are you too heavy in one token?)\n- Trading patterns (are you buying tops? holding too long?)\n- Smart money overlap (are you trading the same tokens as top traders?)\n\nI'll write key findings to LEARNED memory so we can track your performance patterns over time.\n\nShall I proceed with the analysis?`,
    source: src,
    category: 'scenario',
  })

  // Scenario 3: Monitoring setup
  pairs.push({
    instruction: 'Set up monitoring for whale wallet activity on a specific token.',
    input: 'I want to track what the top traders are doing with BONK.',
    output: `Here's how I'll set up whale monitoring for BONK:\n\n**Step 1 — Identify whales:**\n\`solana_top_traders mint=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\`\n(DezXAZ... is BONK's mint address)\n\nThis returns the most profitable wallets trading BONK.\n\n**Step 2 — Analyze each whale:**\nFor each top trader wallet, I'll run:\n- \`solana_wallet_pnl\` — their overall performance\n- \`solana_wallet_tokens\` — current BONK holdings\n- \`helius_transactions\` — recent BONK-related activity\n\n**Step 3 — Set up real-time alerts:**\n\`helius_webhook_create\` for the top 3-5 whale wallets\n- Webhook type: "enhanced" for human-readable notifications\n- Filter for BONK-related transactions\n\n**Step 4 — Background scanner:**\n\`agent_spawn type=scanner description="Monitor top BONK wallets for accumulation or distribution patterns"\`\n\nThe scanner will:\n- Check whale wallets every 60 seconds\n- Emit INFERRED signals when patterns emerge\n- Alert you if a whale starts accumulating or dumping\n\n**Step 5 — Memory:**\nI'll store whale wallet addresses as LEARNED memory for future reference.\n\nWant me to start this setup?`,
    source: src,
    category: 'scenario',
  })

  // Scenario 4: Pump.fun graduation play
  pairs.push({
    instruction: 'I want to find Pump.fun tokens that are about to graduate. Help me set up a strategy.',
    output: `Great strategy — graduation plays target the transition from bonding curve to PumpSwap AMM, which often triggers a price move as fees drop from 1% to 0.25%.\n\n**Setup:**\n\n1. **Scan for near-graduation tokens:**\n\`pump_top_tokens sortBy=graduating limit=20\`\nThis finds tokens closest to graduation.\n\n2. **Filter candidates:**\nFor each, run \`pump_token_scan\` and filter:\n- Graduation progress: 70-90% (close but not yet graduated)\n- Signal score: ≥60 (MODERATE+)\n- Creator hasn't sold\n- Holder count >500 (real community)\n\n3. **Entry strategy:**\n- Enter at 75-85% graduation\n- Size: 0.1-0.25 SOL per token\n- Take-profit: Set at 30-50% above current price\n- Stop-loss: 15%\n\n4. **Monitor graduation:**\n\`pump_graduation mint=<mint>\` — check progress in real-time\nWhen graduation triggers:\n- Fees drop from 1% to 0.25%\n- Token moves to PumpSwap AMM\n- Often see a price bump from increased accessibility\n\n5. **Post-graduation:**\n- Reassess on PumpSwap fundamentals\n- Consider taking partial profits at graduation\n- Monitor new liquidity providers\n\n**Automation:**\n\`agent_spawn type=ooda description="Find and evaluate Pump.fun tokens at 70-90% graduation. Enter positions scoring 65+ with 0.1 SOL. Alert me before executing."\`\n\nShall I start scanning?`,
    source: src,
    category: 'scenario',
  })

  // Scenario 5: Market downturn
  pairs.push({
    instruction: 'SOL just dropped 15% in an hour. What should I do with my open positions?',
    output: `**Immediate priority: capital preservation.**\n\nHere's my recommended response using OODA:\n\n**OBSERVE:**\n1. \`sol_price\` — confirm the drop and current price\n2. \`solana_wallet_tokens\` — check your current holdings\n3. \`solana_wallet_pnl\` — assess damage to open positions\n4. \`memory_recall tier=LEARNED query="SOL crash"\` — any learned patterns from previous crashes?\n\n**ORIENT:**\n- A 15% SOL drop in an hour is severe — this likely cascades to all Solana tokens\n- Pump.fun tokens with low liquidity will be hit hardest\n- Your stop-losses should be triggering if set correctly\n\n**DECIDE — Triage positions:**\n\n1. **Pump.fun positions**: Exit immediately if not already stopped out. Low-liquidity tokens during a crash can go to zero.\n\n2. **Established tokens (BONK, JUP, etc.)**: Check if this is a SOL-specific event or broader market. If SOL-specific, hold quality tokens. If broader, consider reducing exposure.\n\n3. **Staking/validator positions**: No action needed — these are long-term.\n\n**ACT:**\n- Close any positions without stop-losses\n- Move to observation-only mode (no new entries)\n- Set \`helius_webhook_create\` for SOL price recovery alerts\n- Write to LEARNED: "During 15% SOL crash, [tokens X, Y, Z] dropped [A%, B%, C%]"\n\n**Do NOT:**\n- Panic buy the dip without analysis\n- Average down on Pump.fun tokens\n- Open new positions until SOL stabilizes (at least 1 hour of sideways)\n\nWant me to check your specific positions?`,
    source: src,
    category: 'scenario',
  })

  // Scenario 6: MEV/arbitrage
  pairs.push({
    instruction: 'How would I detect and respond to MEV activity affecting my trades?',
    output: `MEV (Maximal Extractable Value) on Solana primarily manifests as sandwich attacks and front-running:\n\n**Detection via tools:**\n\n1. **Check recent transactions:**\n\`helius_transactions address=<your_wallet>\`\nLook for transactions immediately before and after yours from the same wallet — classic sandwich pattern.\n\n2. **Monitor priority fees:**\n\`helius_priority_fee\`\nSpikes in priority fees often indicate MEV bot activity.\n\n3. **Analyze top traders:**\n\`solana_top_traders mint=<token>\`\nMEV bots often appear as top traders with extremely high trade counts and consistent small profits.\n\n**Protection strategies:**\n\n1. **Use appropriate priority fees:**\n- Check \`helius_priority_fee\` before trading\n- Use "high" or "veryHigh" tier for time-sensitive trades\n- The recommended fee balances speed vs. cost\n\n2. **Reduce slippage tolerance:**\n- Default 5% is high for established tokens\n- Use 1-2% for tokens with good liquidity\n- Higher slippage = more MEV profit opportunity\n\n3. **Trade smaller sizes:**\n- Larger trades have more price impact = more MEV profit\n- Split large trades into smaller chunks\n\n4. **Use Jupiter's MEV protection:**\n- Jupiter's routing includes MEV-aware execution\n- The Shark buddy species (GAS_EFF: 95, TIMING: 95) is optimized for this\n\n5. **Timing:**\n- Avoid trading during high-activity periods when bots are most active\n- The Sniper personality (20 bps base slippage) is designed to minimize MEV exposure`,
    source: src,
    category: 'scenario',
  })

  // Scenario 7: Building a scanner
  pairs.push({
    instruction: 'Help me build a custom token scanner that alerts me to good opportunities.',
    output: `I'll help you set up a multi-layer scanning system:\n\n**Layer 1 — Continuous new token monitoring:**\n\`\`\`\nagent_spawn type=scanner description="Monitor pump_new_tokens every 60 seconds. For each new token, run pump_token_scan. Write tokens with score >= 55 to INFERRED memory with details."\n\`\`\`\n\n**Layer 2 — Graduation tracker:**\n\`\`\`\nagent_spawn type=scanner description="Check pump_top_tokens sortBy=graduating every 2 minutes. Track graduation progress. Alert when tokens cross 60%, 75%, and 90% thresholds."\n\`\`\`\n\n**Layer 3 — Smart money tracker:**\n\`\`\`\nagent_spawn type=research description="Identify top 10 most profitable wallets via solana_top_traders for SOL, BONK, and JUP. Monitor their new positions. Write to INFERRED when they enter new tokens."\n\`\`\`\n\n**Layer 4 — Webhook alerts for specific events:**\n- \`helius_webhook_create\` for your own wallet (track fills)\n- \`helius_webhook_create\` for tracked whale wallets\n\n**Configuration tips:**\n- Minimum score threshold: Start at 60, lower to 55 if you want more signals\n- Refresh interval: 60s for new tokens, 120s for graduation tracking\n- Max concurrent positions: 3 (prevents overexposure)\n\n**Review flow:**\n- Signals accumulate in INFERRED memory\n- Use \`memory_recall tier=INFERRED\` to review pending signals\n- Run \`dream_run\` periodically to consolidate patterns\n- Promote validated patterns to LEARNED\n\nWant me to start the scanners?`,
    source: src,
    category: 'scenario',
  })

  // Scenario 8: DeFi math question
  pairs.push({
    instruction: 'A Pump.fun token has virtualSolReserves of 50 SOL and virtualTokenReserves of 500 billion. What happens if I buy 2 SOL worth?',
    output: `Let me calculate the exact execution:\n\n**Given:**\n- virtualSolReserves = 50 SOL = 50,000,000,000 lamports\n- virtualTokenReserves = 500,000,000,000 tokens\n- Buy amount = 2 SOL = 2,000,000,000 lamports\n- Fee = 1% (100 bps)\n\n**Step 1 — Fees:**\nProtocol fee = 2 SOL × 1% = 0.02 SOL\nNet SOL input = 2 - 0.02 = 1.98 SOL = 1,980,000,000 lamports\n\n**Step 2 — Constant product formula:**\ntokenOut = netSolInput × virtualTokenReserves / (virtualSolReserves + netSolInput)\ntokenOut = 1,980,000,000 × 500,000,000,000 / (50,000,000,000 + 1,980,000,000)\ntokenOut = 990,000,000,000,000,000,000 / 51,980,000,000\ntokenOut = 19,045,786,841 tokens ≈ 19.05 billion tokens\n\n**Step 3 — Price impact:**\nSpot price before: 50B / 500B = 0.1 SOL per billion tokens\nNew reserves: 51.98B SOL / 480.95B tokens\nSpot price after: 51.98B / 480.95B = 0.108 SOL per billion tokens\nPrice impact: (0.108 - 0.1) / 0.1 = 8.0%\n\n**Step 4 — New reserves:**\n- virtualSolReserves = 51,980,000,000 (51.98 SOL)\n- virtualTokenReserves = 480,954,213,159 (480.95B)\n\n**Summary:** For 2 SOL, you'd receive ~19.05 billion tokens with 8% price impact and 0.02 SOL in fees. This is a meaningful price impact — consider splitting into smaller buys if you want better average price.`,
    source: src,
    category: 'scenario',
  })

  return pairs
}
