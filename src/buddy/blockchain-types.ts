/**
 * Blockchain Buddy Types — Solana-native companion species
 * 
 * Each buddy has:
 *   - A unique wallet address for trading
 *   - Species-specific trading personality
 *   - Stats that affect trading behavior
 *   - Visual sprite representation
 */

import type { Rarity, Eye, Hat, StatName } from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Blockchain-native species (Solana ecosystem)
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCKCHAIN_SPECIES = [
  // Solana natives
  'soldog',      // Solana's mascot dog
  'bonk',        // BONK meme coin dog
  'wif',         // dogwifhat
  'jupiter',     // Jupiter DEX aggregator
  'raydium',     // Raydium AMM
  
  // DeFi archetypes
  'whale',       // Large holder
  'bull',        // Bullish trader
  'bear',        // Bearish trader  
  'shark',       // MEV searcher
  'octopus',     // Multi-venue trader
  
  // NFT ecosystem
  'degod',       // DeGods NFT
  'y00t',        // y00ts NFT
  'okaybear',    // Okay Bears
  
  // Memecoin culture
  'pepe',        // Pepe on Solana
  'pumpfun',     // Pump.fun degen
  'sniper',      // Token sniper bot
  
  // Technical
  'validator',   // Solana validator
  'rpc',         // RPC node operator
] as const

export type BlockchainSpecies = typeof BLOCKCHAIN_SPECIES[number]

// ─────────────────────────────────────────────────────────────────────────────
// Trading personality types
// ─────────────────────────────────────────────────────────────────────────────

export const TRADING_PERSONALITIES = [
  'diamond_hands',   // HODL through volatility
  'paper_hands',     // Sells at first sign of red
  'degen',           // YOLO into new launches
  'sniper',          // Waits for perfect entry
  'whale',           // Moves markets with size
  'bot',             // Algorithmic, emotionless
  'ape',             // FOMO buyer
  'ninja',           // Stealth accumulation
] as const

export type TradingPersonality = typeof TRADING_PERSONALITIES[number]

// ─────────────────────────────────────────────────────────────────────────────
// Wallet configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface BuddyWallet {
  /** Solana wallet address (public key) */
  address: string
  /** Whether this is a simulated/paper trading wallet */
  isSimulated: boolean
  /** SOL balance */
  solBalance: number
  /** Token balances (mint -> amount) */
  tokenBalances: Map<string, bigint>
  /** Total PnL in USD */
  totalPnlUsd: number
  /** Win rate (0-1) */
  winRate: number
  /** Number of trades */
  tradeCount: number
  /** Last trade timestamp */
  lastTradeAt?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Trading stats (blockchain-specific)
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCKCHAIN_STATS = [
  'ALPHA',       // Ability to find alpha/gems
  'GAS_EFF',     // Transaction efficiency
  'RUG_DETECT',  // Ability to detect rugs
  'TIMING',      // Entry/exit timing
  'SIZE',        // Position sizing skill
  'PATIENCE',    // Diamond hands factor
  'CHAOS',       // Degen factor
  'SNARK',       // Attitude
] as const

export type BlockchainStatName = typeof BLOCKCHAIN_STATS[number]

// ─────────────────────────────────────────────────────────────────────────────
// Blockchain Buddy definition
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockchainBuddyBones {
  rarity: Rarity
  species: BlockchainSpecies
  eye: Eye
  hat: Hat
  shiny: boolean
  stats: Record<BlockchainStatName, number>
}

export interface BlockchainBuddySoul {
  name: string
  personality: TradingPersonality
  catchphrase: string
  tradingStyle: string
}

export interface BlockchainBuddy extends BlockchainBuddyBones, BlockchainBuddySoul {
  id: string
  hatchedAt: number
  wallet: BuddyWallet
  experience: number
  level: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Species-specific trading configurations
// ─────────────────────────────────────────────────────────────────────────────

export const SPECIES_TRADING_CONFIG: Record<BlockchainSpecies, {
  defaultPersonality: TradingPersonality
  baseStats: Partial<Record<BlockchainStatName, number>>
  riskTolerance: 'low' | 'medium' | 'high' | 'degen'
  preferredVenues: string[]
}> = {
  // Solana natives
  soldog: {
    defaultPersonality: 'diamond_hands',
    baseStats: { ALPHA: 70, RUG_DETECT: 80, PATIENCE: 75 },
    riskTolerance: 'medium',
    preferredVenues: ['jupiter', 'raydium'],
  },
  bonk: {
    defaultPersonality: 'degen',
    baseStats: { CHAOS: 90, ALPHA: 60, TIMING: 50 },
    riskTolerance: 'degen',
    preferredVenues: ['pumpfun', 'raydium'],
  },
  wif: {
    defaultPersonality: 'ape',
    baseStats: { CHAOS: 85, TIMING: 65, SIZE: 40 },
    riskTolerance: 'degen',
    preferredVenues: ['pumpfun', 'jupiter'],
  },
  jupiter: {
    defaultPersonality: 'bot',
    baseStats: { GAS_EFF: 95, TIMING: 90, SIZE: 80 },
    riskTolerance: 'low',
    preferredVenues: ['jupiter'],
  },
  raydium: {
    defaultPersonality: 'sniper',
    baseStats: { TIMING: 85, GAS_EFF: 80, ALPHA: 70 },
    riskTolerance: 'medium',
    preferredVenues: ['raydium', 'raydium-clmm'],
  },
  
  // DeFi archetypes
  whale: {
    defaultPersonality: 'whale',
    baseStats: { SIZE: 100, ALPHA: 85, PATIENCE: 80 },
    riskTolerance: 'low',
    preferredVenues: ['jupiter', 'raydium', 'orca'],
  },
  bull: {
    defaultPersonality: 'diamond_hands',
    baseStats: { PATIENCE: 90, ALPHA: 70, TIMING: 60 },
    riskTolerance: 'high',
    preferredVenues: ['jupiter', 'raydium'],
  },
  bear: {
    defaultPersonality: 'sniper',
    baseStats: { TIMING: 85, RUG_DETECT: 90, PATIENCE: 70 },
    riskTolerance: 'low',
    preferredVenues: ['jupiter', 'hyperliquid'],
  },
  shark: {
    defaultPersonality: 'bot',
    baseStats: { GAS_EFF: 95, TIMING: 95, SIZE: 60 },
    riskTolerance: 'medium',
    preferredVenues: ['jupiter', 'raydium', 'meteora'],
  },
  
  // NFT ecosystem
  degod: {
    defaultPersonality: 'diamond_hands',
    baseStats: { PATIENCE: 95, RUG_DETECT: 70, ALPHA: 75 },
    riskTolerance: 'medium',
    preferredVenues: ['tensor', 'magic-eden'],
  },
  y00t: {
    defaultPersonality: 'ninja',
    baseStats: { TIMING: 80, ALPHA: 85, PATIENCE: 75 },
    riskTolerance: 'medium',
    preferredVenues: ['tensor', 'magic-eden'],
  },
  okaybear: {
    defaultPersonality: 'diamond_hands',
    baseStats: { PATIENCE: 85, RUG_DETECT: 80, SNARK: 70 },
    riskTolerance: 'medium',
    preferredVenues: ['tensor'],
  },
  
  // Memecoin culture
  pepe: {
    defaultPersonality: 'degen',
    baseStats: { CHAOS: 95, ALPHA: 55, TIMING: 45 },
    riskTolerance: 'degen',
    preferredVenues: ['pumpfun', 'raydium'],
  },
  pumpfun: {
    defaultPersonality: 'degen',
    baseStats: { CHAOS: 100, ALPHA: 80, RUG_DETECT: 60 },
    riskTolerance: 'degen',
    preferredVenues: ['pumpfun'],
  },
  sniper: {
    defaultPersonality: 'sniper',
    baseStats: { TIMING: 95, GAS_EFF: 90, ALPHA: 85 },
    riskTolerance: 'high',
    preferredVenues: ['pumpfun', 'raydium'],
  },
  
  // Technical
  validator: {
    defaultPersonality: 'bot',
    baseStats: { GAS_EFF: 100, PATIENCE: 95, SIZE: 70 },
    riskTolerance: 'low',
    preferredVenues: ['jupiter', 'marinade'],
  },
  rpc: {
    defaultPersonality: 'bot',
    baseStats: { GAS_EFF: 100, TIMING: 80, ALPHA: 60 },
    riskTolerance: 'low',
    preferredVenues: ['jupiter'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Catchphrases by species
// ─────────────────────────────────────────────────────────────────────────────

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