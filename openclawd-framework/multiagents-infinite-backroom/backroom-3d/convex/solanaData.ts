import { mutation, query, internalAction } from './_generated/server'
import { v } from 'convex/values'


/**
 * Real-time Solana perpetual data pipeline.
 * Stores token prices, whale alerts, and slot updates
 * from Helius RPC / Birdeye.
 */

export const insertSolanaDataPoint = mutation({
  args: {
    tokenAddress: v.string(),
    price: v.optional(v.number()),
    priceChange24h: v.optional(v.number()),
    volume24h: v.optional(v.number()),
    liquidity: v.optional(v.number()),
    slot: v.optional(v.number()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('solanaData', {
      ...args,
      timestamp: Date.now(),
    })
  },
})

export const insertWhaleAlert = mutation({
  args: {
    txSignature: v.string(),
    tokenAddress: v.string(),
    tokenSymbol: v.optional(v.string()),
    amount: v.number(),
    valueUsd: v.optional(v.number()),
    fromAddress: v.string(),
    toAddress: v.string(),
    type: v.string(), // 'buy', 'sell', 'transfer'
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('whaleAlerts', {
      ...args,
      timestamp: Date.now(),
      processed: false,
    })
  },
})

export const insertSlotUpdate = mutation({
  args: {
    slot: v.number(),
    epoch: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('slotUpdates', {
      ...args,
      timestamp: Date.now(),
    })
  },
})

export const getLatestData = query({
  args: {
    tokenAddress: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { tokenAddress, limit = 20 } = args
    let q = ctx.db.query('solanaData').withIndex('by_timestamp').order('desc')
    if (tokenAddress) {
      q = q.filter((row) => row.eq(row.field('tokenAddress'), tokenAddress))
    }
    return q.take(limit)
  },
})

export const getRecentWhaleAlerts = query({
  args: {
    limit: v.optional(v.number()),
    unprocessedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { limit = 10, unprocessedOnly } = args
    let q = ctx.db.query('whaleAlerts').order('desc')
    if (unprocessedOnly) {
      q = q.filter((row) => row.eq(row.field('processed'), false))
    }
    return q.take(limit)
  },
})

export const getLatestSlot = query({
  handler: async (ctx) => {
    return ctx.db
      .query('slotUpdates')
      .order('desc')
      .first()
  },
})

export const markWhaleProcessed = mutation({
  args: { id: v.id('whaleAlerts') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { processed: true })
  },
})

/**
 * Polls Helius RPC for latest slot and token data.
 * Called as a scheduled job.
 */
export const pollHeliusData = internalAction({
  args: {
    heliusApiKey: v.string(),
    trackedTokens: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { heliusApiKey, trackedTokens } = args
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`

    // Get latest slot
    try {
      const slotResp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSlot',
        }),
      })
      const slotData = await slotResp.json() as any
      if (slotData.result) {
        await ctx.runMutation("solanaData:insertSlotUpdate" as any, {
          slot: slotData.result,
        })
      }
    } catch (e) {
      console.error('Error polling slot:', e)
    }

    // Get token prices from Birdeye (free tier)
    for (const token of trackedTokens) {
      try {
        const priceResp = await fetch(
          `https://public-api.birdeye.so/public/price?address=${token}`,
          {
            headers: {
              'Accept': 'application/json',
              'x-chain': 'solana',
            },
          }
        )
        const priceData = await priceResp.json() as any
        if (priceData?.success && priceData.data?.value) {
          await ctx.runMutation("solanaData:insertSolanaDataPoint" as any, {
            tokenAddress: token,
            price: priceData.data.value,
            source: 'birdeye',
          })
        }
      } catch (e) {
        console.error(`Error polling price for ${token}:`, e)
      }
    }

  },
})
