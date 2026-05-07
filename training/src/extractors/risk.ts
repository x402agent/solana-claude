import type { InstructionPair } from '../types.js'

export function extractRiskPairs(repoRoot: string): InstructionPair[] {
  const pairs: InstructionPair[] = []

  pairs.push({
    instruction: 'How do I assess if a Solana token is safe to buy?',
    output: `Run a multi-layer security check:\n\n**Layer 1 — On-chain flags** (via \`solana_token_info\` or \`pump_token_scan\`):\n- ✅ Liquidity locked or burned\n- ❌ Creator has sold their tokens → strong rug signal\n- ❌ Top 10 holders own >50% → whale manipulation risk\n- ✅ Mint authority revoked → can't inflate supply\n- ✅ Freeze authority revoked → can't freeze your tokens\n\n**Layer 2 — Trading activity:**\n- ✅ Healthy buy/sell ratio (not 90%+ buys = possible wash trading)\n- ✅ Multiple unique buyers (not just 5 wallets cycling)\n- ✅ Growing holder count\n- ❌ All buys from same wallet cluster → coordinated pump\n\n**Layer 3 — Smart money:**\n- Use \`solana_top_traders\` to check if profitable wallets are accumulating\n- Use \`solana_wallet_pnl\` on the creator's wallet to check their history\n\n**Layer 4 — Pump.fun specific:**\n- Graduation progress in sweet spot (60-90%)\n- No Mayhem Mode unless you want extreme volatility\n- Cashback enabled is a minor positive (+3 signal score)\n\n**Red flags that override everything:**\n- Creator sold = AVOID (no exceptions)\n- Multiple rugs from same creator wallet = AVOID\n- Contract has suspicious instructions = AVOID`,
    source: 'src/pump/client.ts',
    category: 'risk_assessment',
  })

  pairs.push({
    instruction: 'What are the signs of a potential rug pull on Solana?',
    output: `**High-confidence rug indicators:**\n\n1. **Creator sold early** — The deployer wallet dumps tokens before graduation. This is the #1 rug signal (-20 points in scoring).\n\n2. **Whale concentration >50%** — If top 10 wallets hold majority of supply, a coordinated dump is likely (-15 points).\n\n3. **Mint authority active** — Creator can mint unlimited new tokens, diluting your holdings to zero.\n\n4. **Freeze authority active** — Creator can freeze your tokens, preventing you from selling.\n\n5. **No LP lock** — Liquidity can be pulled at any time.\n\n6. **Wash trading patterns** — Same wallets buying and selling to create fake volume. Check via \`solana_top_traders\` for suspicious wallet clusters.\n\n7. **Creator wallet history** — Use \`solana_wallet_pnl\` on the creator. If they have a pattern of launching and dumping, this is a serial rugger.\n\n8. **Sudden liquidity drain** — Large sells from insider wallets right after a marketing push.\n\n**Protection strategies:**\n- Never buy tokens where creator has sold\n- Set tight stop-losses (15-25%) on Pump.fun tokens\n- Start with small positions (0.05 SOL) until signal strengthens\n- Use \`helius_webhook_create\` to monitor creator wallet for sells`,
    source: 'src/pump/client.ts',
    category: 'risk_assessment',
  })

  pairs.push({
    instruction: 'How does the signal strength classification work?',
    output: `Tokens are classified into four tiers based on their composite signal score (0-100):\n\n**STRONG (75-100):**\n- High-conviction entry opportunity\n- All security flags clean\n- Good graduation progress, high volume, healthy buy pressure\n- Recommended action: Enter at base or 1.25x size\n\n**MODERATE (55-74):**\n- Worth watching but not a clear entry\n- May have minor concerns (no LP lock, low holder count)\n- Recommended action: Monitor, set alerts, re-evaluate later\n\n**WEAK (35-54):**\n- Multiple concerns present\n- Might be early (low graduation) or have some red flags\n- Recommended action: Avoid unless you have additional conviction from LEARNED patterns\n\n**AVOID (<35):**\n- Significant red flags (creator sold, whale concentration, etc.)\n- The scoring model has identified this as high-risk for capital loss\n- Recommended action: Do not enter under any circumstances\n\n**Score composition reminder:**\nBase 50 + security (±35) + graduation (+15) + volume (+10) + pressure (±10) + community (+8)`,
    source: 'src/pump/client.ts',
    category: 'risk_assessment',
  })

  pairs.push({
    instruction: 'How should I manage risk when trading on Pump.fun bonding curves?',
    output: `**Entry rules:**\n- Start small: 0.05-0.1 SOL per trade (adjustable in sniper config)\n- Only enter tokens with signal score ≥ 55 (MODERATE or better)\n- Avoid first 60 seconds after launch (bot-heavy, high slippage)\n- Graduation sweet spot: 60-90% — below 60% is unproven, above 90% is buying the top\n\n**Position management:**\n- Set take-profit: 50% default (exit half at 2x)\n- Set stop-loss: 15% default (cut losses early)\n- Maximum 3 concurrent positions\n- Hard timeout: 120 seconds — if no movement, exit\n\n**Slippage management:**\n- Default slippage tolerance: 5%\n- Use \`pump_buy_quote\` to preview actual execution price before buying\n- Large price impact (>10%) = reduce size or skip\n\n**Exit signals:**\n- Creator wallet starts selling → immediate exit\n- Whale concentration spikes → reduce position\n- Buy pressure drops below 1:1 with sell pressure → tighten stop-loss\n- Graduation completes → reassess on PumpSwap AMM (different dynamics)\n\n**Portfolio rules:**\n- Never have >15% of portfolio in active Pump.fun positions\n- Track cumulative PnL — if down >10% in a session, stop and observe only\n- Use \`memory_write\` to log every trade decision for future OODA learning`,
    source: 'src/telegram/pump-sniper.ts',
    category: 'risk_assessment',
  })

  pairs.push({
    instruction: 'What risk checks should I run before entering any trade?',
    output: `**Pre-trade checklist (run in order):**\n\n1. ☐ Check SOL price for context (\`sol_price\`)\n2. ☐ Get token security info (\`solana_token_info\` or \`pump_token_scan\`)\n3. ☐ Verify: creator has NOT sold\n4. ☐ Verify: whale concentration < 50%\n5. ☐ Check: mint authority status (revoked = safe)\n6. ☐ Check: freeze authority status (revoked = safe)\n7. ☐ Review holder distribution and count\n8. ☐ Check smart money activity (\`solana_top_traders\`)\n9. ☐ Get buy/sell quote to estimate slippage\n10. ☐ Recall any LEARNED patterns about this token or creator (\`memory_recall\`)\n11. ☐ Calculate position size based on OODA score\n12. ☐ Define stop-loss and take-profit levels\n13. ☐ Check current priority fees (\`helius_priority_fee\`)\n14. ☐ Confirm portfolio risk limits are not exceeded\n\n**If any of these fail:**\n- Creator sold → ABORT\n- Whale >50% → ABORT\n- LEARNED rug pattern → ABORT\n- Score <60 → ABORT\n- Portfolio risk exceeded → ABORT`,
    source: 'src/pump/client.ts',
    category: 'risk_assessment',
  })

  return pairs
}
