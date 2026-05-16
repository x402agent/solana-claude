import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/**
 * Poll Phoenix DEX perps data every 60 seconds.
 * This keeps funding rates, mark prices, and open interest
 * updated in the perpsMarkets table for both agents and the 3D site.
 */
crons.interval('poll-phoenix-perps', { seconds: 60 }, internal.perpsData.pollPhoenixPerps, {
  symbols: ['SOL', 'BTC', 'ETH', 'DOGE', 'SUI', 'XRP', 'BNB', 'AAVE', 'HYPE', 'SKR'],
})

/**
 * Also poll Helius/on-chain Solana data every 60 seconds.
 */
crons.interval('poll-helius-data', { seconds: 60 }, internal.solanaData.pollHeliusData, {
  heliusApiKey: '${HELIUS_API_KEY}',
  trackedTokens: [],
})

/**
 * Poll DFlow DEX quotes and prediction markets every 30 seconds.
 * Feeds SOL/USDC, ETH/USDC, BTC/USDC live prices + active prediction markets
 * to both the AI agents and the 3D frontend.
 */
crons.interval('poll-dflow-data', { seconds: 30 }, internal.dflowData.pollDflowData, {})


export default crons
