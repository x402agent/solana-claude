import type { InstructionPair } from '../types.js'

export function extractPumpPairs(repoRoot: string): InstructionPair[] {
  const pairs: InstructionPair[] = []
  const mathSrc = 'src/pump/math.ts'
  const typesSrc = 'src/pump/types.ts'

  // Bonding curve fundamentals
  pairs.push({
    instruction: 'How does the Pump.fun bonding curve work?',
    output: `Pump.fun uses a **constant-product AMM bonding curve** (similar to Uniswap's x×y=k formula) for token pricing before graduation.\n\n**Initial reserves:**\n- Virtual Token Reserves: 1,073,000,000,000,000 (1.073 trillion)\n- Virtual SOL Reserves: 30,000,000,000 lamports (30 SOL)\n- Real Token Reserves: 793,100,000,000,000 (793.1 billion)\n- Total Supply: 1,000,000,000,000,000 (1 quadrillion)\n\n**Buy formula:**\n\`tokenOut = solIn × virtualTokenReserves / (virtualSolReserves + solIn)\`\n\n**Sell formula:**\n\`solOut = tokenIn × virtualSolReserves / (virtualTokenReserves + tokenIn)\`\n\nThe "virtual" reserves include both real liquidity and a virtual component that sets the initial price. As people buy, virtualSolReserves increases and virtualTokenReserves decreases, pushing the price up along the curve.\n\n**Fees:** 1% protocol fee (100 basis points) applied to all trades. Optional creator fees on top.`,
    source: mathSrc,
    category: 'defi_math',
  })

  // Buy quote worked example
  pairs.push({
    instruction: 'How do I calculate how many tokens I get for 1 SOL on a Pump.fun bonding curve?',
    input: 'The bonding curve has virtualSolReserves = 30 SOL, virtualTokenReserves = 1,073,000,000,000,000 tokens, feeBasisPoints = 100.',
    output: `**Step 1 — Calculate fee:**\nProtocol fee = 1 SOL × 100 / 10000 = 0.01 SOL\nNet SOL input = 1 - 0.01 = 0.99 SOL = 990,000,000 lamports\n\n**Step 2 — Apply constant product formula:**\ntokenOut = netSolInput × virtualTokenReserves / (virtualSolReserves + netSolInput)\ntokenOut = 990,000,000 × 1,073,000,000,000,000 / (30,000,000,000 + 990,000,000)\ntokenOut = 990,000,000 × 1,073,000,000,000,000 / 30,990,000,000\ntokenOut ≈ 34,269,764,440,142 tokens (≈34.27 trillion)\n\n**Step 3 — Check real reserves:**\nThe output cannot exceed realTokenReserves (793.1 trillion initially). At 34.27 trillion, we're well within bounds.\n\n**Step 4 — Update reserves:**\nnewVirtualSolReserves = 30,990,000,000\nnewVirtualTokenReserves = 1,073,000,000,000,000 - 34,269,764,440,142 = 1,038,730,235,559,858\nnewRealTokenReserves = 793,100,000,000,000 - 34,269,764,440,142 = 758,830,235,559,858\n\n**Price impact:** The spot price moved from 0.00000002795 SOL/token to 0.00000002983 SOL/token — about 6.7% price impact for a 1 SOL buy on a fresh curve.`,
    source: mathSrc,
    category: 'defi_math',
  })

  // Sell quote
  pairs.push({
    instruction: 'How do I calculate how much SOL I receive when selling tokens on a Pump.fun bonding curve?',
    output: `**Sell formula:**\n\`solOut = tokenIn × virtualSolReserves / (virtualTokenReserves + tokenIn)\`\n\n**Fee application:** The protocol fee (1%) is deducted from the SOL output, not the input.\n\nnetSolOut = grossSolOut - protocolFee - creatorFee\nprotocolFee = ceiling(grossSolOut × 100 / 10000)\ncreatorFee = ceiling(grossSolOut × creatorFeeBps / 10000)\n\n**Example:** Selling 34 trillion tokens when virtualSolReserves = 31 SOL and virtualTokenReserves = 1.039 trillion:\nsolOut = 34,000,000,000,000 × 31,000,000,000 / (1,039,000,000,000,000 + 34,000,000,000,000)\nsolOut ≈ 982,410,423 lamports ≈ 0.982 SOL\nProtocol fee: 0.00982 SOL\nNet: ~0.972 SOL\n\nNote the asymmetry — buy-sell roundtrip loses to fees and price impact. This is expected in AMM design.`,
    source: mathSrc,
    category: 'defi_math',
  })

  // Graduation
  pairs.push({
    instruction: 'What is Pump.fun graduation and how does it work?',
    output: `**Graduation** is when a Pump.fun token transitions from the bonding curve to a real DEX (PumpSwap AMM).\n\n**Trigger:** A token graduates when \`realTokenReserves\` reaches 0 — meaning all purchasable tokens have been bought from the bonding curve.\n\n**Graduation progress:** \`progress = (INITIAL_REAL_TOKENS - realTokenReserves) × 10000 / INITIAL_REAL_TOKENS\` (in basis points)\n\nThe graduation threshold is approximately **85 SOL** accumulated in real reserves. At that point:\n1. Remaining liquidity migrates to PumpSwap AMM\n2. Trading fees drop from 1% to 0.25% (20 bps LP fee + 5 bps protocol fee)\n3. The token gets a proper liquidity pool on-chain\n4. Price discovery continues via standard AMM mechanics\n\n**Sweet spot for entry:** The 60-90% graduation range is considered the best risk/reward. Below 60% the token hasn't proven product-market fit. Above 90% you're buying the top of the bonding curve with less upside.`,
    source: mathSrc,
    category: 'defi_math',
  })

  // Market cap
  pairs.push({
    instruction: 'How is market cap calculated for a Pump.fun token on the bonding curve?',
    output: `**Bonding curve market cap formula:**\n\n\`marketCap = virtualSolReserves × tokenTotalSupply / virtualTokenReserves\`\n\nThis gives market cap in lamports. Convert to SOL by dividing by 1e9.\n\n**Example:** With virtualSolReserves = 35 SOL (35B lamports), virtualTokenReserves = 900T tokens, totalSupply = 1Q tokens:\nmarketCap = 35,000,000,000 × 1,000,000,000,000,000 / 900,000,000,000,000\nmarketCap = 38,888,888,889 lamports ≈ 38.89 SOL\n\nAt SOL = $150: market cap ≈ $5,833 USD\n\n**Spot price:** \`price = virtualSolReserves / virtualTokenReserves\` (in lamports per token)\n\n**Price impact for a trade:** \`priceImpact = (priceAfter - priceBefore) × 10000 / priceBefore\` (basis points)`,
    source: mathSrc,
    category: 'defi_math',
  })

  // PumpSwap vs bonding curve
  pairs.push({
    instruction: 'What is the difference between Pump.fun bonding curve and PumpSwap AMM?',
    output: `**Bonding Curve (Pre-graduation):**\n- Constant-product formula: x × y = k\n- Protocol fee: 100 bps (1%)\n- Optional creator fee (variable bps)\n- One-sided liquidity — only the protocol is the counterparty\n- Price strictly follows the curve — no limit orders\n- Graduation triggers at ~85 SOL real reserves\n\n**PumpSwap AMM (Post-graduation):**\n- Standard constant-product AMM (like Raydium)\n- LP fee: 20 bps (0.2%)\n- Protocol fee: 5 bps (0.05%)\n- Total: 25 bps (0.25%) — 4x cheaper than bonding curve\n- Two-sided liquidity — LPs can provide/remove liquidity\n- Standard AMM trading mechanics\n\n**Key difference:** PumpSwap is dramatically cheaper to trade on. A token that graduates goes from 1% fees to 0.25% fees, which is why graduation is a positive signal — it means cheaper execution and more liquidity.`,
    source: mathSrc,
    category: 'defi_math',
  })

  // Virtual vs real reserves
  pairs.push({
    instruction: 'What is the difference between virtual and real reserves on a Pump.fun bonding curve?',
    output: `**Virtual reserves** set the mathematical curve shape. They include both real liquidity and a virtual component:\n\n- **virtualSolReserves** starts at 30 SOL (30B lamports) — this is entirely virtual at launch. No real SOL exists in the pool yet.\n- **virtualTokenReserves** starts at 1.073 trillion — includes both real purchasable tokens and virtual tokens.\n\n**Real reserves** track actual liquidity:\n\n- **realSolReserves** starts at 0 — increases as people buy tokens with SOL.\n- **realTokenReserves** starts at 793.1 billion — decreases as tokens are purchased.\n\nThe virtual reserves create a "phantom" liquidity pool that gives the initial price. Without virtual reserves, the first buyer would get tokens for nearly free. The 30 virtual SOL means the curve starts at a specific price point.\n\n**Why it matters:** Only realSolReserves can be withdrawn at graduation. virtualSolReserves includes the phantom 30 SOL that was never deposited.`,
    source: typesSrc,
    category: 'defi_math',
  })

  // Fee calculation
  pairs.push({
    instruction: 'How are fees calculated on Pump.fun trades?',
    output: `Pump.fun applies fees differently for buys and sells:\n\n**Buy fees (applied to SOL input):**\n1. Net input = (solInput - 1 lamport) × 10000 / (feeBasisPoints + 10000)\n2. Protocol fee = ceiling(solInput × 100 / 10000)\n3. Creator fee = ceiling(solInput × creatorFeeBps / 10000)\n4. Tokens are calculated from the net amount after fees\n\n**Sell fees (applied to SOL output):**\n1. Gross SOL output calculated from constant-product formula\n2. Protocol fee = ceiling(grossOutput × 100 / 10000)\n3. Creator fee = ceiling(grossOutput × creatorFeeBps / 10000)\n4. User receives: grossOutput - protocolFee - creatorFee\n\n**Typical total cost:**\n- Protocol: 1% (100 bps) — always\n- Creator: 0-5% — set by token creator\n- Price impact: Variable — depends on trade size relative to reserves\n\n**Cashback:** Some tokens have cashback enabled. A UserVolumeAccumulator PDA tracks cumulative volume, and users can claim cashback based on their trading activity.`,
    source: mathSrc,
    category: 'defi_math',
  })

  // Mayhem mode
  pairs.push({
    instruction: 'What is Pump.fun Mayhem Mode?',
    output: `**Mayhem Mode** is a special Pump.fun token variant with different supply mechanics:\n\n- **Total supply:** 2 billion tokens (vs. 1 quadrillion for standard tokens)\n- **Higher volatility:** Same bonding curve math but with drastically fewer tokens, meaning each trade has much larger price impact\n- **Risk factor:** The scanner assigns -5 points for Mayhem Mode tokens due to increased volatility risk\n- **Appeal:** Attracts degen traders who want extreme price action\n\nMayhem Mode tokens are identified by the \`isMayhemMode\` flag in the bonding curve data. The Pump.fun sniper bot has a \`mayhemOnly\` config option to exclusively target these tokens.`,
    source: typesSrc,
    category: 'defi_math',
  })

  // Signal scoring
  pairs.push({
    instruction: 'How does the Pump.fun token signal scoring model work?',
    output: `The signal scoring system evaluates Pump.fun tokens on a 0-100 scale:\n\n**Base:** 50 points\n\n**Security adjustments:**\n- +10: LP locked (liquidity burned/locked)\n- -20: Creator sold their tokens (strong rug signal)\n- -15: Whale concentration >50% among top 10 holders\n\n**Graduation signals:**\n- +15: Graduation progress in sweet spot (60-90%)\n\n**Volume signals:**\n- +10: 24h volume > $1M\n- +5: 24h volume > $100K\n\n**Trade pressure:**\n- +8: Buy pressure 2x higher than sell pressure\n- -10: Sell pressure 2x higher than buy pressure\n\n**Community:**\n- +5: Holder count > 1,000\n- +3: Cashback enabled\n\n**Strength classification:**\n- **STRONG** (75+): High-conviction entry\n- **MODERATE** (55-74): Worth watching\n- **WEAK** (35-54): Proceed with extreme caution\n- **AVOID** (<35): Too many red flags`,
    source: 'src/pump/client.ts',
    category: 'risk_assessment',
  })

  // Sniper configuration
  pairs.push({
    instruction: 'How does the Pump.fun sniper bot work?',
    output: `The sniper bot auto-evaluates new Pump.fun launches with configurable parameters:\n\n**Default config:**\n- SOL per trade: 0.05 SOL\n- Take profit: 50%\n- Stop loss: 15%\n- Min signal score: 55/100\n- Max concurrent positions: 3\n- Timeout: 120 seconds\n- Slippage tolerance: 5%\n\n**Optional filters:**\n- \`mayhemOnly\`: Only target Mayhem Mode tokens (2B supply)\n- \`checkDevBuy\`: Require dev buy signal\n- \`minDevBuySol\`: Minimum dev buy size (default 0.1 SOL)\n\n**Scoring for new launches:**\nBase 50 + Mayhem Mode (+10) + Dev buy signal (+15) + Fresh launch (+5)\n\n**Position management:**\nThe bot tracks open positions by mint address, monitors for take-profit/stop-loss triggers, and maintains a signal history of the last 50 evaluations.`,
    source: 'src/telegram/pump-sniper.ts',
    category: 'trading_strategy',
  })

  // Cashback mechanics
  pairs.push({
    instruction: 'How does Pump.fun cashback work?',
    output: `Pump.fun's cashback system rewards traders based on cumulative volume:\n\n1. **UserVolumeAccumulator PDA**: Each user-token pair has a Program Derived Address that tracks total trading volume\n2. **Accrual**: Cashback accrues as a percentage of trading fees based on volume tiers\n3. **Claiming**: Users can claim accumulated cashback via the Pump.fun program\n4. **Signal value**: Cashback-enabled tokens get +3 points in the signal scoring model because the cashback incentive encourages trading activity and liquidity\n\nThe \`pump_cashback_info\` tool provides details on a token's cashback configuration, unclaimed balances, and claiming instructions.`,
    source: 'src/pump/types.ts',
    category: 'defi_math',
  })

  return pairs
}
