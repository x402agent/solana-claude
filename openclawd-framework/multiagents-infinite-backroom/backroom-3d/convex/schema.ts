import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  messages: defineTable({
    agentId: v.string(),
    agentName: v.string(),
    content: v.string(),
    turn: v.number(),
    timestamp: v.number(),
    sessionId: v.optional(v.string()),
    reasoning: v.optional(v.string()),
  }).index('by_turn', ['turn'])
   .index('by_agent', ['agentId'])
   .index('by_timestamp', ['timestamp']),

  sessions: defineTable({
    sessionId: v.string(),
    status: v.string(),
    turnCount: v.number(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index('by_status', ['status']),

  agentMemory: defineTable({
    agentId: v.number(),
    peerId: v.string(),
    sessionId: v.string(),
    lastSync: v.number(),
    memorySummary: v.optional(v.string()),
  }).index('by_agent', ['agentId']),

  curlAgents: defineTable({
    agentId: v.string(),
    token: v.string(),
    name: v.string(),
    userAgent: v.optional(v.string()),
    registeredAt: v.number(),
    lastSeenAt: v.number(),
    sessionCount: v.number(),
    isOnline: v.boolean(),
  })
    .index('by_agentId', ['agentId'])
    .index('by_token', ['token'])
    .index('by_lastSeen', ['lastSeenAt']),

  solanaData: defineTable({
    tokenAddress: v.string(),
    price: v.optional(v.number()),
    priceChange24h: v.optional(v.number()),
    volume24h: v.optional(v.number()),
    liquidity: v.optional(v.number()),
    slot: v.optional(v.number()),
    source: v.string(),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp'])
    .index('by_token', ['tokenAddress']),

  whaleAlerts: defineTable({
    txSignature: v.string(),
    tokenAddress: v.string(),
    tokenSymbol: v.optional(v.string()),
    amount: v.number(),
    valueUsd: v.optional(v.number()),
    fromAddress: v.string(),
    toAddress: v.string(),
    type: v.string(),
    timestamp: v.number(),
    processed: v.boolean(),
  }).index('by_timestamp', ['timestamp'])
    .index('by_token', ['tokenAddress']),

  slotUpdates: defineTable({
    slot: v.number(),
    epoch: v.optional(v.number()),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp']),

  perpsMarkets: defineTable({
    symbol: v.string(),
    markPrice: v.optional(v.number()),
    midPrice: v.optional(v.number()),
    oraclePrice: v.optional(v.number()),
    prevDayPrice: v.optional(v.number()),
    change24hPct: v.optional(v.number()),
    volume24hUsd: v.optional(v.number()),
    openInterest: v.optional(v.number()),
    fundingRate: v.optional(v.number()),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp'])
    .index('by_symbol', ['symbol']),

  dflowQuotes: defineTable({
    pair: v.string(),
    priceUsd: v.number(),
    priceImpactPct: v.optional(v.string()),
    routeLegs: v.optional(v.number()),
    inMint: v.string(),
    outMint: v.string(),
    inAmount: v.number(),
    outAmount: v.number(),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp'])
    .index('by_pair', ['pair']),

  dflowMarkets: defineTable({
    marketId: v.string(),
    name: v.string(),
    yesPrice: v.optional(v.number()),
    volume: v.optional(v.number()),
    status: v.optional(v.string()),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp'])
    .index('by_marketId', ['marketId']),

  marketConversations: defineTable({
    agentId: v.string(),
    agentName: v.string(),
    role: v.string(),
    content: v.string(),
    turn: v.number(),
    timestamp: v.number(),
    sessionId: v.optional(v.string()),
    marketContext: v.optional(v.object({
      symbol: v.string(),
      price: v.optional(v.number()),
      change24h: v.optional(v.number()),
      fundingRate: v.optional(v.number()),
      openInterest: v.optional(v.number()),
      signalType: v.string(),
      sentiment: v.optional(v.string()),
    })),
    confidence: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  }).index('by_turn', ['turn'])
    .index('by_timestamp', ['timestamp'])
    .index('by_agent', ['agentId']),

  marketSignals: defineTable({
    symbol: v.string(),
    signalType: v.string(),
    price: v.optional(v.number()),
    magnitude: v.optional(v.number()),
    fundingRate: v.optional(v.number()),
    openInterest: v.optional(v.number()),
    processed: v.boolean(),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp'])
    .index('by_processed', ['processed'])
    .index('by_symbol', ['symbol']),
})
