/**
 * Blockchain Buddy System — Solana-native trading companions
 * 
 * Each buddy has:
 *   - A unique wallet address for trading
 *   - Species-specific trading personality
 *   - Stats that affect trading behavior
 *   - Visual sprite representation
 */

// Types
export type {
  BlockchainSpecies,
  TradingPersonality,
  BuddyWallet,
  BlockchainStatName,
  BlockchainBuddyBones,
  BlockchainBuddySoul,
  BlockchainBuddy,
} from './blockchain-types.js'

export {
  BLOCKCHAIN_SPECIES,
  TRADING_PERSONALITIES,
  BLOCKCHAIN_STATS,
  SPECIES_TRADING_CONFIG,
  SPECIES_CATCHPHRASES,
} from './blockchain-types.js'

// Sprites
export {
  BLOCKCHAIN_BODIES,
  BLOCKCHAIN_HAT_LINES,
  renderBlockchainSprite,
  blockchainSpriteFrameCount,
  renderBlockchainFace,
  SPECIES_DISPLAY_NAMES,
} from './blockchain-sprites.js'

// Wallet management
export type { SimulatedTrade } from './blockchain-wallet.js'

export {
  generateBuddyWalletAddress,
  createBlockchainBuddy,
  simulateTrade,
  addExperience,
  formatBuddyCard,
  formatBuddyCompact,
  BuddyCollection,
} from './blockchain-wallet.js'

// Re-export original buddy system for compatibility
export * from './types.js'
export * from './sprites.js'