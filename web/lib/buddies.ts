/**
 * Blockchain Buddies - Web-compatible version
 * 
 * Standalone implementation for the web app
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCKCHAIN_SPECIES = [
  'soldog', 'bonk', 'wif', 'jupiter', 'raydium', 'whale',
  'bull', 'bear', 'shark', 'octopus', 'degod', 'y00t',
  'okaybear', 'pepe', 'pumpfun', 'sniper', 'validator', 'rpc',
] as const

export type BlockchainSpecies = typeof BLOCKCHAIN_SPECIES[number]

export const TRADING_PERSONALITIES = [
  'diamond_hands', 'paper_hands', 'degen', 'sniper',
  'whale', 'bot', 'ape', 'ninja',
] as const

export type TradingPersonality = typeof TRADING_PERSONALITIES[number]

export const BLOCKCHAIN_STATS = [
  'ALPHA', 'GAS_EFF', 'RUG_DETECT', 'TIMING',
  'SIZE', 'PATIENCE', 'CHAOS', 'SNARK',
] as const

export type BlockchainStatName = typeof BLOCKCHAIN_STATS[number]

export interface BuddyWallet {
  address: string
  isSimulated: boolean
  solBalance: number
  tokenBalances: Map<string, bigint>
  totalPnlUsd: number
  winRate: number
  tradeCount: number
  lastTradeAt?: number
}

export interface BlockchainBuddy {
  id: string
  hatchedAt: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  species: BlockchainSpecies
  eye: string
  hat: string
  shiny: boolean
  stats: Record<BlockchainStatName, number>
  name: string
  personality: TradingPersonality
  catchphrase: string
  tradingStyle: string
  wallet: BuddyWallet
  experience: number
  level: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SPECIES_DISPLAY_NAMES: Record<BlockchainSpecies, string> = {
  soldog: 'SolDog', bonk: 'BONK Dog', wif: 'dogwifhat',
  jupiter: 'Jupiter Agg', raydium: 'Raydium LP', whale: 'Whale',
  bull: 'Bull', bear: 'Bear', shark: 'MEV Shark', octopus: 'Octopus',
  degod: 'DeGod', y00t: 'y00t', okaybear: 'Okay Bear', pepe: 'Pepe',
  pumpfun: 'Pump.fun', sniper: 'Sniper Bot', validator: 'Validator', rpc: 'RPC Node',
}

export const SPECIES_CATCHPHRASES: Record<BlockchainSpecies, string[]> = {
  soldog: ['WOOF! Alpha detected!', 'HODLing till Valhalla!', 'LFG to the moon!'],
  bonk: ['BONK goes the chart!', 'Let it rip!', 'Degen hours activated!'],
  wif: ['WIF hat, WIF gains!', 'Hat stays on, gains go up!', 'Fr fr ong!'],
  jupiter: ['Optimal route found.', 'Slippage minimized.', 'Aggregating best price...'],
  raydium: ['LP fees accumulating...', 'AMM liquidity optimal.', 'Yield farming engaged.'],
  whale: ['Moving markets...', 'Size matters.', 'Accumulation phase.'],
  bull: ['Bullish bias confirmed.', 'Diamond hands engaged.', 'Up only from here!'],
  bear: ['Shorting the top.', 'Bear market survival mode.', 'Cash is a position.'],
  shark: ['MEV opportunity detected.', 'Front-running enabled.', 'Arbitrage found.'],
  octopus: ['Multi-venue execution...', 'Diversifying across DEXs.', '8 legs, 8 strategies.'],
  degod: ['DeGods forever.', 'Yield incoming.', 'NFT alpha secured.'],
  y00t: ['y00t season.', 'Stealth accumulation.', 'Blue chip energy.'],
  okaybear: ['Okay is good enough.', 'Bear market survivor.', 'Chill trading vibes.'],
  pepe: ['Feels good man.', 'Rare Pepe energy.', 'Meme magic activated.'],
  pumpfun: ['Pump it!', 'Bonding curve go brrr.', 'Graduation imminent!'],
  sniper: ['Target locked.', 'Entry point confirmed.', 'Sniper shot fired.'],
  validator: ['Validating blocks...', 'Network security engaged.', 'Staking rewards incoming.'],
  rpc: ['Request processed.', 'Latency optimized.', 'Node sync complete.'],
}

const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }

const EYES = ['○', '●', '◎', '◉', '⊙', '×', '♦', '♠']

const HATS = ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'solana']

// ─────────────────────────────────────────────────────────────────────────────
// Sprite Rendering
// ─────────────────────────────────────────────────────────────────────────────

const BLOCKCHAIN_BODIES: Record<BlockchainSpecies, string[][]> = {
  soldog: [
    ['            ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   (ωωω)    ', '  /|    |\\  '],
    ['            ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   (ωωω)~   ', '  /|    |\\  '],
    ['   ★    ★   ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   (ωωω)    ', '  /|SOL |\\  '],
  ],
  bonk: [
    ['            ', '  /\\___/\\   ', ' (  {E} {E}  ) ', '  \\  ▼  /   ', '   `---´    '],
    ['            ', '  /\\___/\\   ', ' (  {E} {E}  ) ', '  \\  ▼  /~  ', '   `---´    '],
    ['   💫       ', '  /\\___/\\   ', ' (  {E} {E}  ) ', '  \\BONK/   ', '   `---´    '],
  ],
  wif: [
    ['   [___]    ', '  /\\___/\\   ', ' (  {E} {E}  ) ', '  (  ω  )   ', '  /|    |\\  '],
    ['   [___]    ', '  /\\___/\\   ', ' (  {E} {E}  ) ', '  (  ω  )~  ', '  /|    |\\  '],
    ['   [WIF]    ', '  /\\___/\\   ', ' (  {E} {E}  ) ', '  (  ω  )   ', '  /|HAT |\\  '],
  ],
  jupiter: [
    ['            ', '   .--.     ', '  / {E}  {E} \\   ', ' |  ~~  |   ', '  \\_🪐_/    '],
    ['            ', '   .--.     ', '  / {E}  {E} \\   ', ' |  ==  |   ', '  \\_🪐_/    '],
    ['    ⚡      ', '   .--.     ', '  / {E}  {E} \\   ', ' |JUP AGG|  ', '  \\_🪐_/    '],
  ],
  raydium: [
    ['            ', '   \\  /     ', '   ( {E}{E} )   ', '  /|~~~~|\\  ', '   ^^^^^    '],
    ['            ', '   \\  /     ', '   ( {E}{E} )   ', '  /|~~~~|\\  ', '   ^^^^^~   '],
    ['   💧💧     ', '   \\  /     ', '   ( {E}{E} )   ', '  /|RAY  |\\ ', '   ^^^^^    '],
  ],
  whale: [
    ['            ', '   ~~~~~    ', '  ( {E}  {E} )  ', ' (________) ', '  WHALE 🐳  '],
    ['            ', '   ~~~~~    ', '  ( {E}  {E} )  ', ' (________)~', '  WHALE 🐳  '],
    ['   💰💰💰   ', '   ~~~~~    ', '  ( {E}  {E} )  ', ' (________) ', '  WHALE 🐳  '],
  ],
  bull: [
    ['            ', '  /\\  /\\    ', ' ( {E}  {E} )  ', '  (    )    ', '   ^^^^     '],
    ['            ', '  /\\  /\\    ', ' ( {E}  {E} )  ', '  (    )~   ', '   ^^^^     '],
    ['   📈📈     ', '  /\\  /\\    ', ' ( {E}  {E} )  ', '  (BULL)    ', '   ^^^^     '],
  ],
  bear: [
    ['            ', '  .---.     ', ' ( {E}  {E} )  ', '  (    )    ', '   `--´     '],
    ['            ', '  .---.     ', ' ( {E}  {E} )  ', '  (    )~   ', '   `--´     '],
    ['   📉📉     ', '  .---.     ', ' ( {E}  {E} )  ', '  (BEAR)    ', '   `--´     '],
  ],
  shark: [
    ['            ', '  >({E})>   ', '     /|     ', '    / |     ', '   ~~~~~    '],
    ['            ', '  >({E})>   ', '     /|     ', '    / |~    ', '   ~~~~~    '],
    ['   ⚡⚡⚡    ', '  >({E})>   ', '     /|     ', '   MEV|     ', '   ~~~~~    '],
  ],
  octopus: [
    ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  (______)  ', '  /\\/\\/\\/\\  '],
    ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  (______)  ', '  \\/\\/\\/\\/  '],
    ['     o      ', '   .----.   ', '  ( {E}  {E} )  ', '  (______)  ', '  /\\/\\/\\/\\  '],
  ],
  degod: [
    ['            ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   \\~~~/    ', '   DEGOD    '],
    ['            ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   \\~~~/~   ', '   DEGOD    '],
    ['   👑       ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   \\~~~/    ', '   DEGOD    '],
  ],
  y00t: [
    ['            ', '  .------.  ', ' |  {E}  {E}  | ', ' |  ====  | ', '  `y00ts´   '],
    ['            ', '  .------.  ', ' |  {E}  {E}  | ', ' |  ====  | ', '  `y00ts´~  '],
    ['   ✨✨     ', '  .------.  ', ' |  {E}  {E}  | ', ' |  ====  | ', '  `y00ts´   '],
  ],
  okaybear: [
    ['            ', '  .--.      ', ' ( {E}  {E} )  ', '  (    )    ', '   OKAY     '],
    ['            ', '  .--.      ', ' ( {E}  {E} )  ', '  (    )~   ', '   OKAY     '],
    ['   🐻      ', '  .--.      ', ' ( {E}  {E} )  ', '  (BEAR)    ', '   OKAY     '],
  ],
  pepe: [
    ['            ', '   ____     ', '  / {E}  {E} \\   ', ' (  ~~  )   ', '   FROG     '],
    ['            ', '   ____     ', '  / {E}  {E} \\   ', ' (  ~~  )~  ', '   FROG     '],
    ['   💚💚     ', '   ____     ', '  / {E}  {E} \\   ', ' (PEPE )   ', '   FROG     '],
  ],
  pumpfun: [
    ['            ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   \\~~~/    ', '   PUMP!    '],
    ['            ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   \\~~~/~   ', '   PUMP!    '],
    ['   🚀🚀     ', '   /\\__/\\   ', '  ( {E}  {E} )  ', '   \\~~~/    ', '   PUMP!    '],
  ],
  sniper: [
    ['            ', '   .--.     ', '  [ {E}  {E} ]  ', '  [====]    ', '   `--´     '],
    ['            ', '   .--.     ', '  [ {E}  {E} ]  ', '  [====]~   ', '   `--´     '],
    ['   🎯       ', '   .--.     ', '  [ {E}  {E} ]  ', '  [LOCK]    ', '   `--´     '],
  ],
  validator: [
    ['            ', '   [====]   ', '  [ {E}  {E} ]  ', '  [====]    ', '   NODE     '],
    ['            ', '   [====]   ', '  [ {E}  {E} ]  ', '  [====]~   ', '   NODE     '],
    ['   ⚡⚡⚡    ', '   [====]   ', '  [ {E}  {E} ]  ', '  [SYNC]    ', '   NODE     '],
  ],
  rpc: [
    ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  |~~~~|    ', '   RPC      '],
    ['            ', '   .----.   ', '  ( {E}  {E} )  ', '  |~~~~|~   ', '   RPC      '],
    ['   📡       ', '   .----.   ', '  ( {E}  {E} )  ', '  |CONN|    ', '   RPC      '],
  ],
}

export function renderBlockchainSprite(
  species: BlockchainSpecies,
  eye: string,
  hat: string = 'none',
  frame = 0,
): string[] {
  const frames = BLOCKCHAIN_BODIES[species]
  if (!frames) return renderBlockchainSprite('soldog', eye, hat, frame)
  const body = frames[frame % frames.length]!.map((line) => line.replaceAll('{E}', eye))
  return body
}

// ─────────────────────────────────────────────────────────────────────────────
// Buddy Creation
// ─────────────────────────────────────────────────────────────────────────────

let buddyIdCounter = 0

function generateBuddyId(): string {
  return `buddy-${Date.now().toString(36)}-${(buddyIdCounter++).toString(36)}`
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function pickWeighted(weights: Record<string, number>): string {
  const entries = Object.entries(weights)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let rand = Math.random() * total
  for (const [key, weight] of entries) {
    rand -= weight
    if (rand <= 0) return key
  }
  return 'common'
}

function generateBuddyWalletAddress(buddyId: string): string {
  const hash = simpleHash(buddyId + 'wallet')
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = (hash >> ((i % 4) * 8)) & 0xff
  }
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 44; i++) {
    result += chars[bytes[i % 32] % chars.length]!
  }
  return result
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function generateStats(rarity: string): Record<BlockchainStatName, number> {
  const rarityMultiplier: Record<string, number> = {
    common: 1.0, uncommon: 1.1, rare: 1.25, epic: 1.4, legendary: 1.6,
  }
  const mult = rarityMultiplier[rarity] ?? 1.0
  
  const stats: Record<BlockchainStatName, number> = {
    ALPHA: Math.round((40 + Math.random() * 40) * mult),
    GAS_EFF: Math.round((40 + Math.random() * 40) * mult),
    RUG_DETECT: Math.round((40 + Math.random() * 40) * mult),
    TIMING: Math.round((40 + Math.random() * 40) * mult),
    SIZE: Math.round((40 + Math.random() * 40) * mult),
    PATIENCE: Math.round((40 + Math.random() * 40) * mult),
    CHAOS: Math.round((40 + Math.random() * 40) * mult),
    SNARK: Math.round((40 + Math.random() * 40) * mult),
  }
  
  for (const key of Object.keys(stats) as BlockchainStatName[]) {
    stats[key] = Math.min(100, Math.max(1, stats[key]))
  }
  
  return stats
}

function generateBuddyName(species: BlockchainSpecies): string {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Sigma', 'Zeta', 'Nova', 'Quantum', 'Hyper']
  const suffixes = ['Trader', 'Hunter', 'Sniper', 'Whale', 'Shark', 'Bot', 'Agent', 'Operator']
  
  const speciesNames: Partial<Record<BlockchainSpecies, string[]>> = {
    soldog: ['SolPup', 'LamboDog', 'MoonDog'],
    bonk: ['Bonker', 'BONKer', 'DegenBonk'],
    wif: ['Wifey', 'HatDog', 'FrFr'],
    jupiter: ['Aggregator', 'Router', 'SlippageSlayer'],
    raydium: ['LPPro', 'YieldFarmer', 'AmmMaster'],
    whale: ['Mover', 'Accumulator', 'BigFish'],
    bull: ['Mooner', 'DiamondHands', 'UpOnly'],
    bear: ['Shorter', 'RektHunter', 'CashKing'],
    shark: ['MEVLord', 'FrontRunner', 'ArbKing'],
    sniper: ['Headshot', 'Precision', 'EntryKing'],
    pumpfun: ['Degen', 'Pumper', 'Graduate'],
    validator: ['BlockMaker', 'Staker', 'Consensus'],
    rpc: ['NodeRunner', 'LatencyKing', 'Relay'],
  }
  
  const speciesSpecific = speciesNames[species]
  if (speciesSpecific && Math.random() < 0.5) {
    return pickRandom(speciesSpecific)
  }
  
  return `${pickRandom(prefixes)}${pickRandom(suffixes)}`
}

function getTradingStyleDescription(personality: TradingPersonality): string {
  const styles: Record<TradingPersonality, string> = {
    diamond_hands: 'HODLs through volatility. Never sells at a loss.',
    paper_hands: 'Quick to take profits or cut losses. Low risk tolerance.',
    degen: 'YOLOs into new launches. High risk, high reward.',
    sniper: 'Waits for perfect entry points. Patient and precise.',
    whale: 'Moves markets with size. Accumulates slowly.',
    bot: 'Algorithmic, emotionless trading. Follows rules strictly.',
    ape: 'FOMO buyer. Chases pumps. Often buys the top.',
    ninja: 'Stealth accumulation. Never reveals intentions.',
  }
  return styles[personality]
}

export function createBlockchainBuddy(
  species: BlockchainSpecies,
  options?: {
    name?: string
    personality?: TradingPersonality
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
    isSimulated?: boolean
    initialSolBalance?: number
  },
): BlockchainBuddy {
  const rarity = options?.rarity ?? pickWeighted(RARITY_WEIGHTS) as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  const personality = options?.personality ?? pickRandom(TRADING_PERSONALITIES)
  
  const id = generateBuddyId()
  const eye = pickRandom(EYES)
  const hat = rarity === 'common' ? 'none' : pickRandom(HATS)
  const shiny = Math.random() < 0.05
  
  const catchphraseOptions = SPECIES_CATCHPHRASES[species] ?? ['Ready to trade!']
  const catchphrase = pickRandom(catchphraseOptions)
  
  const tradingStyle = getTradingStyleDescription(personality)
  
  const wallet: BuddyWallet = {
    address: generateBuddyWalletAddress(id),
    isSimulated: options?.isSimulated ?? true,
    solBalance: options?.initialSolBalance ?? 1.0,
    tokenBalances: new Map(),
    totalPnlUsd: 0,
    winRate: 0,
    tradeCount: 0,
  }
  
  return {
    id,
    hatchedAt: Date.now(),
    rarity,
    species,
    eye,
    hat,
    shiny,
    stats: generateStats(rarity),
    name: options?.name ?? generateBuddyName(species),
    personality,
    catchphrase,
    tradingStyle,
    wallet,
    experience: 0,
    level: 1,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trading Simulation
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulatedTrade {
  id: string
  buddyId: string
  type: 'buy' | 'sell'
  tokenMint: string
  tokenSymbol?: string
  amountSol: number
  amountTokens: number
  priceUsd: number
  timestamp: number
  success: boolean
  pnlUsd?: number
}

export function simulateTrade(
  buddy: BlockchainBuddy,
  trade: Omit<SimulatedTrade, 'id' | 'buddyId' | 'timestamp' | 'success' | 'pnlUsd'>,
): SimulatedTrade {
  const { wallet, stats, personality } = buddy
  
  const slippageBps = getSlippageBps(personality, stats)
  const slippage = trade.amountSol * (slippageBps / 10000)
  
  const actualSol = trade.type === 'buy' 
    ? trade.amountSol + slippage 
    : trade.amountSol - slippage
  
  const success = trade.type === 'buy' 
    ? wallet.solBalance >= actualSol 
    : (wallet.tokenBalances.get(trade.tokenMint) ?? 0n) >= BigInt(Math.floor(trade.amountTokens))
  
  const result: SimulatedTrade = {
    id: `trade-${Date.now().toString(36)}`,
    buddyId: buddy.id,
    ...trade,
    timestamp: Date.now(),
    success,
    pnlUsd: success ? calculatePnl(buddy, trade) : undefined,
  }
  
  if (success) {
    if (trade.type === 'buy') {
      wallet.solBalance -= actualSol
      const currentTokens = wallet.tokenBalances.get(trade.tokenMint) ?? 0n
      wallet.tokenBalances.set(trade.tokenMint, currentTokens + BigInt(Math.floor(trade.amountTokens)))
    } else {
      wallet.solBalance += actualSol
      const currentTokens = wallet.tokenBalances.get(trade.tokenMint) ?? 0n
      wallet.tokenBalances.set(trade.tokenMint, currentTokens - BigInt(Math.floor(trade.amountTokens)))
    }
    
    wallet.tradeCount++
    wallet.lastTradeAt = Date.now()
    
    if (result.pnlUsd) {
      wallet.totalPnlUsd += result.pnlUsd
      const wins = wallet.winRate * (wallet.tradeCount - 1) + (result.pnlUsd > 0 ? 1 : 0)
      wallet.winRate = wins / wallet.tradeCount
    }
  }
  
  return result
}

function getSlippageBps(personality: TradingPersonality, stats: Record<BlockchainStatName, number>): number {
  const baseSlippage: Record<TradingPersonality, number> = {
    diamond_hands: 50, paper_hands: 100, degen: 200, sniper: 20,
    whale: 30, bot: 10, ape: 300, ninja: 40,
  }
  
  const statBonus = (stats.TIMING + stats.GAS_EFF) / 200
  return Math.max(5, baseSlippage[personality] * (1 - statBonus * 0.5))
}

function calculatePnl(
  buddy: BlockchainBuddy,
  trade: { type: 'buy' | 'sell'; amountSol: number; priceUsd: number },
): number {
  const { stats } = buddy
  
  const skillFactor = (stats.ALPHA + stats.TIMING) / 200
  const chaosFactor = stats.CHAOS / 100
  
  const random = Math.random()
  const winProbability = 0.4 + skillFactor * 0.3 - chaosFactor * 0.1
  
  if (random < winProbability) {
    const gainPct = 0.05 + (skillFactor * 0.45)
    return trade.amountSol * trade.priceUsd * gainPct
  } else {
    const lossPct = 0.05 + (chaosFactor * 0.25)
    return -trade.amountSol * trade.priceUsd * lossPct
  }
}