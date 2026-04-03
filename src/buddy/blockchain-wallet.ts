/**
 * Blockchain Buddy Wallet Manager
 * 
 * Manages wallet creation, simulation, and trading for blockchain buddies.
 * Each buddy gets a unique simulated wallet for paper trading.
 * Real wallet integration requires explicit user consent.
 */

import type { 
  BlockchainBuddy, 
  BlockchainSpecies, 
  BuddyWallet,
  TradingPersonality,
  BlockchainStatName,
} from './blockchain-types.js'
import { SPECIES_TRADING_CONFIG, SPECIES_CATCHPHRASES } from './blockchain-types.js'
import { RARITY_WEIGHTS, RARITY_STARS, type Rarity } from './types.js'
import { EYES, HATS, type Eye, type Hat } from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Wallet generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic wallet address from buddy ID.
 * In simulation mode, this is a fake address for display purposes.
 */
export function generateBuddyWalletAddress(buddyId: string): string {
  // Create a deterministic but random-looking address
  const hash = simpleHash(buddyId + 'wallet')
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = (hash >> ((i % 4) * 8)) & 0xff
  }
  // Encode as base58 (simplified)
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

// ─────────────────────────────────────────────────────────────────────────────
// Buddy creation
// ─────────────────────────────────────────────────────────────────────────────

let buddyIdCounter = 0

function generateBuddyId(): string {
  return `buddy-${Date.now().toString(36)}-${(buddyIdCounter++).toString(36)}`
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function pickWeighted(weights: Record<Rarity, number>): Rarity {
  const entries = Object.entries(weights) as [Rarity, number][]
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let rand = Math.random() * total
  for (const [key, weight] of entries) {
    rand -= weight
    if (rand <= 0) return key
  }
  return 'common'
}

function generateStats(
  species: BlockchainSpecies,
  rarity: Rarity,
): Record<BlockchainStatName, number> {
  const config = SPECIES_TRADING_CONFIG[species]
  const baseStats = config?.baseStats ?? {}
  
  const rarityMultiplier: Record<Rarity, number> = {
    common: 1.0,
    uncommon: 1.1,
    rare: 1.25,
    epic: 1.4,
    legendary: 1.6,
  }
  
  const mult = rarityMultiplier[rarity]
  
  const stats: Record<BlockchainStatName, number> = {
    ALPHA: Math.round((baseStats.ALPHA ?? 50) * mult),
    GAS_EFF: Math.round((baseStats.GAS_EFF ?? 50) * mult),
    RUG_DETECT: Math.round((baseStats.RUG_DETECT ?? 50) * mult),
    TIMING: Math.round((baseStats.TIMING ?? 50) * mult),
    SIZE: Math.round((baseStats.SIZE ?? 50) * mult),
    PATIENCE: Math.round((baseStats.PATIENCE ?? 50) * mult),
    CHAOS: Math.round((baseStats.CHAOS ?? 50) * mult),
    SNARK: Math.round((baseStats.SNARK ?? 50) * mult),
  }
  
  // Clamp to 0-100
  for (const key of Object.keys(stats) as BlockchainStatName[]) {
    stats[key] = Math.min(100, Math.max(0, stats[key]))
  }
  
  return stats
}

/**
 * Create a new blockchain buddy with a simulated wallet.
 */
export function createBlockchainBuddy(
  species: BlockchainSpecies,
  options?: {
    name?: string
    personality?: TradingPersonality
    rarity?: Rarity
    isSimulated?: boolean
    initialSolBalance?: number
  },
): BlockchainBuddy {
  const config = SPECIES_TRADING_CONFIG[species]
  const rarity = options?.rarity ?? pickWeighted(RARITY_WEIGHTS)
  const personality = options?.personality ?? config?.defaultPersonality ?? 'diamond_hands'
  
  const id = generateBuddyId()
  const eye = pickRandom(EYES)
  const hat = pickRandom(HATS)
  const shiny = Math.random() < 0.05 // 5% shiny chance
  
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
    stats: generateStats(species, rarity),
    name: options?.name ?? generateBuddyName(species),
    personality,
    catchphrase,
    tradingStyle,
    wallet,
    experience: 0,
    level: 1,
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// Trading simulation
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

/**
 * Simulate a trade for a blockchain buddy.
 * Updates wallet balance and tracks PnL.
 */
export function simulateTrade(
  buddy: BlockchainBuddy,
  trade: Omit<SimulatedTrade, 'id' | 'buddyId' | 'timestamp' | 'success' | 'pnlUsd'>,
): SimulatedTrade {
  const { wallet, stats, personality } = buddy
  
  // Apply personality-based slippage
  const slippageBps = getSlippageBps(personality, stats)
  const slippage = trade.amountSol * (slippageBps / 10000)
  
  // Calculate actual amounts
  const actualSol = trade.type === 'buy' 
    ? trade.amountSol + slippage 
    : trade.amountSol - slippage
  
  // Check if buddy has enough SOL for buy
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
    // Update wallet
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
      // Update win rate
      const wins = wallet.winRate * (wallet.tradeCount - 1) + (result.pnlUsd > 0 ? 1 : 0)
      wallet.winRate = wins / wallet.tradeCount
    }
  }
  
  return result
}

function getSlippageBps(personality: TradingPersonality, stats: Record<BlockchainStatName, number>): number {
  const baseSlippage: Record<TradingPersonality, number> = {
    diamond_hands: 50,
    paper_hands: 100,
    degen: 200,
    sniper: 20,
    whale: 30,
    bot: 10,
    ape: 300,
    ninja: 40,
  }
  
  // Better stats = lower slippage
  const statBonus = (stats.TIMING + stats.GAS_EFF) / 200
  return Math.max(5, baseSlippage[personality] * (1 - statBonus * 0.5))
}

function calculatePnl(
  buddy: BlockchainBuddy,
  trade: { type: 'buy' | 'sell'; amountSol: number; priceUsd: number },
): number {
  // Simplified PnL calculation
  // In reality, this would track entry price vs exit price
  const { stats, personality } = buddy
  
  // Better traders have better outcomes (on average)
  const skillFactor = (stats.ALPHA + stats.TIMING) / 200
  const chaosFactor = stats.CHAOS / 100
  
  // Random outcome influenced by skill
  const random = Math.random()
  const winProbability = 0.4 + skillFactor * 0.3 - chaosFactor * 0.1
  
  if (random < winProbability) {
    // Win: 5-50% gain based on skill
    const gainPct = 0.05 + (skillFactor * 0.45)
    return trade.amountSol * trade.priceUsd * gainPct
  } else {
    // Loss: 5-30% loss
    const lossPct = 0.05 + (chaosFactor * 0.25)
    return -trade.amountSol * trade.priceUsd * lossPct
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Buddy leveling and experience
// ─────────────────────────────────────────────────────────────────────────────

export function addExperience(buddy: BlockchainBuddy, amount: number): void {
  buddy.experience += amount
  
  // Level up every 1000 XP
  const newLevel = Math.floor(buddy.experience / 1000) + 1
  if (newLevel > buddy.level) {
    buddy.level = newLevel
    // Small stat boost on level up
    for (const stat of Object.keys(buddy.stats) as BlockchainStatName[]) {
      buddy.stats[stat] = Math.min(100, buddy.stats[stat] + 1)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatBuddyCard(buddy: BlockchainBuddy): string {
  const { name, species, rarity, level, wallet, stats, catchphrase } = buddy
  const stars = RARITY_STARS[rarity]
  const pnlStr = wallet.totalPnlUsd >= 0 
    ? `+$${wallet.totalPnlUsd.toFixed(2)}` 
    : `-$${Math.abs(wallet.totalPnlUsd).toFixed(2)}`
  const pnlColor = wallet.totalPnlUsd >= 0 ? '\x1b[32m' : '\x1b[31m'
  
  return `
╔══════════════════════════════════════════╗
║  ${name.padEnd(20)} ${stars.padEnd(5)}   ║
║  Level ${level.toString().padStart(2)} · ${species.toUpperCase().padEnd(12)}        ║
╠══════════════════════════════════════════╣
║  "${catchphrase.slice(0, 32).padEnd(32)}"  ║
╠══════════════════════════════════════════╣
║  💰 ${wallet.solBalance.toFixed(4).padStart(8)} SOL │ ${pnlColor}${pnlStr.padStart(10)}\x1b[0m   ║
║  📊 ${wallet.tradeCount.toString().padStart(4)} trades │ ${(wallet.winRate * 100).toFixed(1)}% WR    ║
╠══════════════════════════════════════════╣
║  ALPHA: ${stats.ALPHA.toString().padStart(3)}  TIMING: ${stats.TIMING.toString().padStart(3)}       ║
║  RUG_DE: ${stats.RUG_DETECT.toString().padStart(3)}  CHAOS: ${stats.CHAOS.toString().padStart(3)}        ║
╚══════════════════════════════════════════╝
`
}

export function formatBuddyCompact(buddy: BlockchainBuddy): string {
  const { name, species, rarity, level, wallet } = buddy
  const stars = RARITY_STARS[rarity]
  const pnlStr = wallet.totalPnlUsd >= 0 
    ? `+$${wallet.totalPnlUsd.toFixed(0)}` 
    : `-$${Math.abs(wallet.totalPnlUsd).toFixed(0)}`
  
  return `${stars} ${name} (${species}) Lv${level} · ${wallet.solBalance.toFixed(2)} SOL · ${pnlStr}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Buddy collection management
// ─────────────────────────────────────────────────────────────────────────────

export class BuddyCollection {
  private buddies: Map<string, BlockchainBuddy> = new Map()
  
  add(buddy: BlockchainBuddy): void {
    this.buddies.set(buddy.id, buddy)
  }
  
  get(id: string): BlockchainBuddy | undefined {
    return this.buddies.get(id)
  }
  
  remove(id: string): boolean {
    return this.buddies.delete(id)
  }
  
  list(): BlockchainBuddy[] {
    return Array.from(this.buddies.values())
  }
  
  findBySpecies(species: BlockchainSpecies): BlockchainBuddy[] {
    return this.list().filter(b => b.species === species)
  }
  
  findByRarity(rarity: Rarity): BlockchainBuddy[] {
    return this.list().filter(b => b.rarity === rarity)
  }
  
  getTopTraders(limit = 5): BlockchainBuddy[] {
    return this.list()
      .sort((a, b) => b.wallet.totalPnlUsd - a.wallet.totalPnlUsd)
      .slice(0, limit)
  }
  
  getTotalPnl(): number {
    return this.list().reduce((sum, b) => sum + b.wallet.totalPnlUsd, 0)
  }
  
  getTotalSol(): number {
    return this.list().reduce((sum, b) => sum + b.wallet.solBalance, 0)
  }
  
  toJSON(): string {
    const data = this.list().map(b => ({
      ...b,
      wallet: {
        ...b.wallet,
        tokenBalances: Array.from(b.wallet.tokenBalances.entries()),
      },
    }))
    return JSON.stringify(data, null, 2)
  }
  
  static fromJSON(json: string): BuddyCollection {
    const collection = new BuddyCollection()
    const data = JSON.parse(json) as Array<BlockchainBuddy & {
      wallet: { tokenBalances: Array<[string, string]> }
    }>
    
    for (const item of data) {
      const buddy: BlockchainBuddy = {
        ...item,
        wallet: {
          ...item.wallet,
          tokenBalances: new Map(
            item.wallet.tokenBalances.map(([mint, amount]) => [mint, BigInt(amount)])
          ),
        },
      }
      collection.add(buddy)
    }
    
    return collection
  }
}