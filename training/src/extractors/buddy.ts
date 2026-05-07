import type { InstructionPair } from '../types.js'

interface SpeciesConfig {
  species: string
  personality: string
  riskTolerance: string
  baseStats: Record<string, number>
  preferredVenues: string[]
  catchphrases: string[]
  displayName: string
}

const SPECIES_DATA: SpeciesConfig[] = [
  { species: 'soldog', personality: 'diamond_hands', riskTolerance: 'medium', baseStats: { ALPHA: 70, RUG_DETECT: 80, PATIENCE: 75 }, preferredVenues: ['jupiter', 'raydium'], catchphrases: ['WOOF! Alpha detected!', 'HODLing till Valhalla!'], displayName: 'Sol Dog' },
  { species: 'bonk', personality: 'degen', riskTolerance: 'degen', baseStats: { CHAOS: 90, ALPHA: 60, TIMING: 50 }, preferredVenues: ['pumpfun', 'raydium'], catchphrases: ['BONK goes the chart!', 'Degen hours activated!'], displayName: 'BONK' },
  { species: 'wif', personality: 'ape', riskTolerance: 'degen', baseStats: { CHAOS: 85, TIMING: 65, SIZE: 40 }, preferredVenues: ['pumpfun', 'jupiter'], catchphrases: ['WIF hat, WIF gains!', 'Fr fr ong!'], displayName: 'dogwifhat' },
  { species: 'jupiter', personality: 'bot', riskTolerance: 'low', baseStats: { GAS_EFF: 95, TIMING: 90, SIZE: 80 }, preferredVenues: ['jupiter'], catchphrases: ['Optimal route found.', 'Slippage minimized.'], displayName: 'Jupiter' },
  { species: 'raydium', personality: 'sniper', riskTolerance: 'medium', baseStats: { TIMING: 85, GAS_EFF: 80, ALPHA: 70 }, preferredVenues: ['raydium', 'raydium-clmm'], catchphrases: ['LP fees accumulating...', 'AMM liquidity optimal.'], displayName: 'Raydium' },
  { species: 'whale', personality: 'whale', riskTolerance: 'low', baseStats: { SIZE: 100, ALPHA: 85, PATIENCE: 80 }, preferredVenues: ['jupiter', 'raydium', 'orca'], catchphrases: ['Moving markets...', 'Size matters.'], displayName: 'Whale' },
  { species: 'bull', personality: 'diamond_hands', riskTolerance: 'high', baseStats: { PATIENCE: 90, ALPHA: 70, TIMING: 60 }, preferredVenues: ['jupiter', 'raydium'], catchphrases: ['Bullish bias confirmed.', 'Up only from here!'], displayName: 'Bull' },
  { species: 'bear', personality: 'sniper', riskTolerance: 'low', baseStats: { TIMING: 85, RUG_DETECT: 90, PATIENCE: 70 }, preferredVenues: ['jupiter', 'hyperliquid'], catchphrases: ['Shorting the top.', 'Cash is a position.'], displayName: 'Bear' },
  { species: 'shark', personality: 'bot', riskTolerance: 'medium', baseStats: { GAS_EFF: 95, TIMING: 95, SIZE: 60 }, preferredVenues: ['jupiter', 'raydium', 'meteora'], catchphrases: ['MEV opportunity detected.', 'Arbitrage found.'], displayName: 'Shark (MEV)' },
  { species: 'octopus', personality: 'ninja', riskTolerance: 'medium', baseStats: { TIMING: 80, ALPHA: 75, GAS_EFF: 85 }, preferredVenues: ['jupiter', 'raydium', 'orca', 'meteora'], catchphrases: ['Multi-venue execution...', '8 legs, 8 strategies.'], displayName: 'Octopus' },
  { species: 'degod', personality: 'diamond_hands', riskTolerance: 'medium', baseStats: { PATIENCE: 95, RUG_DETECT: 70, ALPHA: 75 }, preferredVenues: ['tensor', 'magic-eden'], catchphrases: ['DeGods forever.', 'NFT alpha secured.'], displayName: 'DeGod' },
  { species: 'y00t', personality: 'ninja', riskTolerance: 'medium', baseStats: { TIMING: 80, ALPHA: 85, PATIENCE: 75 }, preferredVenues: ['tensor', 'magic-eden'], catchphrases: ['y00t season.', 'Stealth accumulation.'], displayName: 'y00t' },
  { species: 'okaybear', personality: 'diamond_hands', riskTolerance: 'medium', baseStats: { PATIENCE: 85, RUG_DETECT: 80, SNARK: 70 }, preferredVenues: ['tensor'], catchphrases: ['Okay is good enough.', 'Bear market survivor.'], displayName: 'Okay Bear' },
  { species: 'pepe', personality: 'degen', riskTolerance: 'degen', baseStats: { CHAOS: 95, ALPHA: 55, TIMING: 45 }, preferredVenues: ['pumpfun', 'raydium'], catchphrases: ['Feels good man.', 'Meme magic activated.'], displayName: 'Pepe' },
  { species: 'pumpfun', personality: 'degen', riskTolerance: 'degen', baseStats: { CHAOS: 100, ALPHA: 80, RUG_DETECT: 60 }, preferredVenues: ['pumpfun'], catchphrases: ['Pump it!', 'Bonding curve go brrr.'], displayName: 'Pump.fun Degen' },
  { species: 'sniper', personality: 'sniper', riskTolerance: 'high', baseStats: { TIMING: 95, GAS_EFF: 90, ALPHA: 85 }, preferredVenues: ['pumpfun', 'raydium'], catchphrases: ['Target locked.', 'Sniper shot fired.'], displayName: 'Sniper' },
  { species: 'validator', personality: 'bot', riskTolerance: 'low', baseStats: { GAS_EFF: 100, PATIENCE: 95, SIZE: 70 }, preferredVenues: ['jupiter', 'marinade'], catchphrases: ['Validating blocks...', 'Staking rewards incoming.'], displayName: 'Validator' },
  { species: 'rpc', personality: 'bot', riskTolerance: 'low', baseStats: { GAS_EFF: 100, TIMING: 80, ALPHA: 60 }, preferredVenues: ['jupiter'], catchphrases: ['Request processed.', 'Latency optimized.'], displayName: 'RPC Node' },
]

const PERSONALITIES: Record<string, { style: string, slippage: number }> = {
  diamond_hands: { style: 'HODLs through volatility. Never sells at a loss.', slippage: 50 },
  paper_hands: { style: 'Quick to take profits or cut losses. Low risk tolerance.', slippage: 100 },
  degen: { style: 'YOLOs into new launches. High risk, high reward.', slippage: 200 },
  sniper: { style: 'Waits for perfect entry points. Patient and precise.', slippage: 20 },
  whale: { style: 'Moves markets with size. Accumulates slowly.', slippage: 30 },
  bot: { style: 'Algorithmic, emotionless trading. Follows rules strictly.', slippage: 10 },
  ape: { style: 'FOMO buyer. Chases pumps. Often buys the top.', slippage: 300 },
  ninja: { style: 'Stealth accumulation. Never reveals intentions.', slippage: 40 },
}

const STAT_DESCRIPTIONS: Record<string, string> = {
  ALPHA: 'Ability to find alpha — undervalued tokens, emerging narratives, and hidden gems before the crowd',
  GAS_EFF: 'Transaction efficiency — minimizing fees, optimizing compute units, and choosing optimal priority fees',
  RUG_DETECT: 'Ability to detect rug pulls — analyzing creator behavior, liquidity locks, contract code, and holder distribution',
  TIMING: 'Entry and exit timing — reading momentum, volume patterns, and bonding curve progression to time trades precisely',
  SIZE: 'Position sizing skill — calculating appropriate bet sizes based on conviction, risk tolerance, and portfolio concentration',
  PATIENCE: 'Diamond hands factor — ability to hold through drawdowns and wait for setups without panic selling',
  CHAOS: 'Degen factor — tendency toward high-risk, high-reward plays. High CHAOS means more volatile but potentially more profitable behavior',
  SNARK: 'Attitude and personality expression — how the buddy communicates about trades and market conditions',
}

export function extractBuddyPairs(repoRoot: string): InstructionPair[] {
  const pairs: InstructionPair[] = []
  const src = 'src/buddy/blockchain-types.ts'

  // Species overview
  pairs.push({
    instruction: 'What are blockchain buddies in solana-clawd?',
    output: `Blockchain buddies are AI trading companions in the solana-clawd ecosystem. Each buddy has:\n\n- **Species** — One of 18 Solana ecosystem archetypes (soldog, bonk, wif, jupiter, raydium, whale, bull, bear, shark, octopus, degod, y00t, okaybear, pepe, pumpfun, sniper, validator, rpc)\n- **Trading personality** — Determines trading style (diamond_hands, degen, sniper, bot, whale, ape, ninja, paper_hands)\n- **8 trading stats** — ALPHA, GAS_EFF, RUG_DETECT, TIMING, SIZE, PATIENCE, CHAOS, SNARK (each 0-100)\n- **Risk tolerance** — low, medium, high, or degen\n- **Preferred venues** — Which DEXs and protocols they trade on\n- **Rarity** — common (60%), uncommon (25%), rare (10%), epic (4%), legendary (1%)\n- **Simulated wallet** — Paper trading with SOL balance, PnL tracking, and win rate\n\nHigher-rarity buddies get a stat multiplier: uncommon 1.1x, rare 1.25x, epic 1.4x, legendary 1.6x.`,
    source: src,
    category: 'agent_behavior',
  })

  // Per-species pairs
  for (const s of SPECIES_DATA) {
    const statStr = Object.entries(s.baseStats).map(([k, v]) => `${k}: ${v}`).join(', ')
    pairs.push({
      instruction: `What is the ${s.displayName} buddy and how does it trade?`,
      output: `The **${s.displayName}** (${s.species}) is a blockchain buddy with a ${s.personality} trading personality.\n\n- **Risk tolerance**: ${s.riskTolerance}\n- **Base stats**: ${statStr}\n- **Preferred venues**: ${s.preferredVenues.join(', ')}\n- **Trading style**: ${PERSONALITIES[s.personality]!.style}\n- **Typical slippage**: ${PERSONALITIES[s.personality]!.slippage} basis points\n\nCatchphrase: "${s.catchphrases[0]}"`,
      source: src,
      category: 'agent_behavior',
    })
  }

  // Comparative pairs
  const comparisons: [string, string, string][] = [
    ['jupiter', 'pumpfun', 'Jupiter is an algorithmic bot trader with low risk tolerance, optimizing for gas efficiency and precise timing on Jupiter DEX. Pump.fun Degen is the opposite — maximum CHAOS stat (100), degen risk tolerance, and exclusively trades on Pump.fun bonding curves. Jupiter minimizes slippage (10 bps) while Pump.fun Degen accepts 200 bps.'],
    ['whale', 'sniper', 'Whale accumulates slowly with massive position sizes (SIZE: 100) and low risk tolerance across multiple DEXs. Sniper waits for perfect entries with top-tier TIMING (95) and GAS_EFF (90) at high risk tolerance, primarily on Pump.fun and Raydium.'],
    ['bear', 'bull', 'Bear is defensive — high RUG_DETECT (90), sniper personality, low risk. Trades on Jupiter and Hyperliquid (for shorting). Bull is offensive — high PATIENCE (90), diamond_hands personality, high risk. HODLs through volatility on Jupiter and Raydium.'],
  ]
  for (const [a, b, analysis] of comparisons) {
    pairs.push({
      instruction: `How does a ${a} buddy trade differently from a ${b} buddy?`,
      output: analysis,
      source: src,
      category: 'agent_behavior',
    })
  }

  // Personality deep-dives
  for (const [name, data] of Object.entries(PERSONALITIES)) {
    pairs.push({
      instruction: `How does the ${name} trading personality affect agent behavior?`,
      output: `**${name}** personality: ${data.style}\n\n- **Base slippage tolerance**: ${data.slippage} basis points\n- **Actual slippage**: Reduced by the buddy's TIMING and GAS_EFF stats. Formula: max(5, ${data.slippage} × (1 - 0.5 × (TIMING + GAS_EFF) / 200))\n\nA buddy with high TIMING and GAS_EFF stats can significantly reduce their personality's natural slippage. For example, a ${name} with TIMING=90 and GAS_EFF=90 would see actual slippage of ~${Math.max(5, Math.round(data.slippage * (1 - 0.5 * 180 / 200)))} bps.`,
      source: 'src/buddy/blockchain-wallet.ts',
      category: 'agent_behavior',
    })
  }

  // Stat explanations
  for (const [stat, desc] of Object.entries(STAT_DESCRIPTIONS)) {
    pairs.push({
      instruction: `What does the ${stat} trading stat mean for a blockchain buddy?`,
      output: `**${stat}** (0-100): ${desc}.\n\nThis stat affects trading outcomes through the PnL calculation model. Higher ${stat} improves the buddy's simulated trade results${stat === 'ALPHA' || stat === 'TIMING' ? ` — specifically, win probability = 0.4 + (ALPHA + TIMING) / 200 × 0.3` : ''}${stat === 'CHAOS' ? ` — but increases variance: win probability is reduced by CHAOS/100 × 0.1` : ''}${stat === 'GAS_EFF' || stat === 'TIMING' ? ` and reduces effective slippage` : ''}.`,
      source: src,
      category: 'agent_behavior',
    })
  }

  // Rarity system
  pairs.push({
    instruction: 'How does the rarity system work for blockchain buddies?',
    output: `Buddies are assigned rarity at birth with these weights:\n\n- **Common** (60%) — 1.0x stat multiplier\n- **Uncommon** (25%) — 1.1x stat multiplier\n- **Rare** (10%) — 1.25x stat multiplier\n- **Epic** (4%) — 1.4x stat multiplier\n- **Legendary** (1%) — 1.6x stat multiplier\n\nThe multiplier applies to all base stats from the species config, capped at 100. A legendary Sniper would have TIMING: min(100, 95 × 1.6) = 100, GAS_EFF: min(100, 90 × 1.6) = 100, ALPHA: min(100, 85 × 1.6) = 100 — a perfect trader.\n\nThere's also a 5% chance of being "shiny" (purely cosmetic). Buddies level up every 1000 XP, gaining +1 to all stats per level.`,
    source: 'src/buddy/blockchain-wallet.ts',
    category: 'agent_behavior',
  })

  return pairs
}
