import { internalAction, internalMutation, mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Hedge fund agent definitions
const AGENTS = {
  quant: { id: 'quant', name: 'The Quant', role: 'Quantitative Analyst', convexId: 1 as const },
  risk: { id: 'risk', name: 'Risk Desk', role: 'Chief Risk Officer', convexId: 2 as const },
  clawd: { id: 'clawd', name: 'Clawd', role: 'Alpha Seeker', convexId: 3 as const },
}

interface MarketCtx {
  symbol: string
  price?: number
  change24h?: number
  fundingRate?: number
  openInterest?: number
  signalType: string
  sentiment?: string
}

// Template-based hedge fund dialogue generation using real market data
function buildConversation(markets: Array<{
  symbol: string
  markPrice?: number
  change24hPct?: number
  fundingRate?: number
  openInterest?: number
  volume24hUsd?: number
}>): Array<{ agentId: string; agentName: string; role: string; content: string; marketContext: MarketCtx; tags: string[] }> {
  if (!markets.length) return []

  // Find the most signal-rich market
  const ranked = [...markets].sort((a, b) => {
    const scoreA = Math.abs(a.change24hPct ?? 0) * 2 + Math.abs(a.fundingRate ?? 0) * 10000
    const scoreB = Math.abs(b.change24hPct ?? 0) * 2 + Math.abs(b.fundingRate ?? 0) * 10000
    return scoreB - scoreA
  })

  const top = ranked[0]
  const secondary = ranked[1]

  const isUp = (top.change24hPct ?? 0) >= 0
  const chg = Math.abs(top.change24hPct ?? 0).toFixed(2)
  const px = top.markPrice?.toFixed(2) ?? '?'
  const fr = top.fundingRate ? (top.fundingRate * 100).toFixed(4) : '0.0000'
  const frNum = parseFloat(fr)
  const oiM = top.openInterest ? (top.openInterest / 1e6).toFixed(1) : '?'
  const vol = top.volume24hUsd ? (top.volume24hUsd / 1e6).toFixed(0) : '?'
  const signalType = Math.abs(top.change24hPct ?? 0) > 5 ? 'price_spike'
    : Math.abs(frNum) > 0.01 ? 'funding_alert'
    : 'general'

  const ctx: MarketCtx = {
    symbol: top.symbol,
    price: top.markPrice,
    change24h: top.change24hPct,
    fundingRate: top.fundingRate,
    openInterest: top.openInterest,
    signalType,
    sentiment: isUp ? 'bullish' : 'bearish',
  }

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const quantLines = [
    `${top.symbol} flagged on vol screen — ${isUp ? '+' : ''}${chg}% with $${oiM}M OI. Funding at ${fr}% suggests ${frNum > 0.01 ? 'long crowding, fade candidate' : frNum < -0.01 ? 'short squeeze setup' : 'balanced positioning'}. Running correlation against BTC.`,
    `Model output: ${top.symbol} @ $${px}, ${chg}% 24h. Realized vol expanding. ${frNum > 0 ? `Longs paying ${fr}% — mean-reversion edge on shorts.` : `Shorts paying ${Math.abs(frNum).toFixed(4)}% — momentum signal for longs.`} $${vol}M volume confirms conviction.`,
    `Quant desk alert: ${top.symbol} OI $${oiM}M, price ${isUp ? 'up' : 'down'} ${chg}%. ${secondary ? `Watching ${secondary.symbol} as correlated pair.` : ''} Funding drift at ${fr}% — ${Math.abs(frNum) > 0.02 ? 'extreme, expect snap-back' : 'within normal range'}.`,
    `Stat-arb model triggering on ${top.symbol}. ${chg}% move with funding at ${fr}% and OI $${oiM}M. ${isUp && frNum > 0 ? 'Longs overleveraged — liquidation cascade risk above.' : !isUp && frNum < 0 ? 'Shorts overleveraged — short squeeze risk below.' : 'Positioning neutral, vol trade opportunity.'}`,
  ]

  const riskLines = [
    `Risk: ${top.symbol} ${isUp ? 'ripping' : 'dumping'} ${chg}%. Funding ${frNum > 0 ? 'longs paying' : 'shorts paying'} at ${Math.abs(frNum).toFixed(4)}%. Reducing gross exposure by 15% until we see stabilization. VaR limit flagged.`,
    `${top.symbol} at $${px} with ${chg}% move stresses our perps book. OI at $${oiM}M — if liquidations cascade we lose our delta hedge. Tightening stops, pulling bids on ${secondary?.symbol ?? 'correlated names'}.`,
    `Book risk update: ${top.symbol} ${isUp ? 'long' : 'short'} bias showing P&L swing. Funding at ${fr}% ${frNum > 0 ? 'draining long positions' : 'benefiting our longs'}. Recommend cutting tail risk — buy options hedge.`,
    `CRO override: ${top.symbol} volatility exceeds risk budget. ${chg}% in 24h with $${oiM}M OI is a 2-sigma event. Suspending new entries until funding normalizes from ${fr}%.`,
  ]

  const clawdLines = [
    `${top.symbol} at $${px} is the play — ${isUp ? 'bulls in control' : 'bears pressing'}. Funding at ${fr}% means ${frNum > 0 ? 'retail longs are exit liquidity, I\'m shorting into strength' : 'shorts getting squeezed, ride the wave long'}. Size up.`,
    `Watching ${top.symbol} — ${chg}% ${isUp ? 'pump' : 'dump'} and funding still ${frNum > 0 ? 'positive' : 'negative'}. ${frNum > 0.015 ? 'This overextension is a gift for shorts.' : frNum < -0.015 ? 'Shorts are bleeding, squeeze incoming.' : 'Looks like continuation to me.'}`,
    `${top.symbol} thesis: OI $${oiM}M, price ${isUp ? 'up' : 'down'} ${chg}%. ${secondary ? `${secondary.symbol} diverging — rotation happening.` : ''} Funding at ${fr}% — I'm ${frNum > 0 ? 'fading' : 'adding'} here. The trench never lies.`,
    `Alpha signal on ${top.symbol}: $${px}, ${chg}% with $${vol}M volume. Funding ${fr}% ${frNum > 0 ? 'screams overleveraged longs' : 'screams scared shorts'}. Position accordingly. Market structure says ${isUp ? 'higher highs incoming' : 'lower lows incoming'}.`,
  ]

  const turn = Date.now()
  return [
    {
      agentId: AGENTS.quant.id,
      agentName: AGENTS.quant.name,
      role: AGENTS.quant.role,
      content: pick(quantLines),
      marketContext: ctx,
      tags: [signalType, isUp ? 'bullish' : 'bearish', frNum > 0.01 ? 'mean-reversion' : frNum < -0.01 ? 'momentum' : 'neutral'],
    },
    {
      agentId: AGENTS.risk.id,
      agentName: AGENTS.risk.name,
      role: AGENTS.risk.role,
      content: pick(riskLines),
      marketContext: ctx,
      tags: ['risk-management', signalType],
    },
    {
      agentId: AGENTS.clawd.id,
      agentName: AGENTS.clawd.name,
      role: AGENTS.clawd.role,
      content: pick(clawdLines),
      marketContext: ctx,
      tags: ['alpha', isUp ? 'bullish' : 'bearish', 'momentum'],
    },
  ]
}

// ── Mutations ──────────────────────────────────────────────────────────────

export const insertMarketConversation = internalMutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    role: v.string(),
    content: v.string(),
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
  },
  handler: async (ctx, args) => {
    const lastMsg = await ctx.db
      .query('marketConversations')
      .withIndex('by_turn')
      .order('desc')
      .first()
    const turn = (lastMsg?.turn ?? 0) + 1
    return ctx.db.insert('marketConversations', { ...args, turn, timestamp: Date.now() })
  },
})

export const insertMarketSignal = internalMutation({
  args: {
    symbol: v.string(),
    signalType: v.string(),
    price: v.optional(v.number()),
    magnitude: v.optional(v.number()),
    fundingRate: v.optional(v.number()),
    openInterest: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('marketSignals', { ...args, processed: false, timestamp: Date.now() })
  },
})

// ── Queries ────────────────────────────────────────────────────────────────

export const getRecentMarketConversations = query({
  args: {
    limit: v.optional(v.number()),
    sinceTurn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { limit = 30, sinceTurn } = args
    if (sinceTurn !== undefined) {
      return ctx.db
        .query('marketConversations')
        .withIndex('by_turn', (q) => q.gt('turn', sinceTurn))
        .order('asc')
        .take(limit)
    }
    const msgs = await ctx.db
      .query('marketConversations')
      .withIndex('by_turn')
      .order('desc')
      .take(limit)
    return msgs.reverse()
  },
})

export const getLatestMarketTurn = query({
  handler: async (ctx) => {
    const last = await ctx.db
      .query('marketConversations')
      .withIndex('by_turn')
      .order('desc')
      .first()
    return last?.turn ?? 0
  },
})

export const getPendingSignals = query({
  handler: async (ctx) => {
    return ctx.db
      .query('marketSignals')
      .withIndex('by_processed', (q) => q.eq('processed', false))
      .order('desc')
      .take(10)
  },
})

// ── Action: generate hedge fund conversation ───────────────────────────────

export const generateHedgeFundConversation = internalAction({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Pull latest perps snapshot
    const markets = await ctx.runQuery('perpsData:getPerpsSummary' as any, {}) as Array<{
      symbol: string
      markPrice?: number
      change24hPct?: number
      fundingRate?: number
      openInterest?: number
      volume24hUsd?: number
    }>

    if (!markets || markets.length === 0) {
      console.log('No perps data available for market conversation')
      return { generated: 0 }
    }

    // Detect notable signals and record them
    for (const m of markets) {
      const change = Math.abs(m.change24hPct ?? 0)
      const fr = Math.abs(m.fundingRate ?? 0)
      if (change > 5 || fr > 0.02) {
        await ctx.runMutation('marketConversations:insertMarketSignal' as any, {
          symbol: m.symbol,
          signalType: change > 5 ? 'price_spike' : 'funding_alert',
          price: m.markPrice,
          magnitude: m.change24hPct,
          fundingRate: m.fundingRate,
          openInterest: m.openInterest,
        })
      }
    }

    const sessionId = args.sessionId ?? `market-session-${Date.now()}`
    const conversation = buildConversation(markets)

    for (const msg of conversation) {
      await ctx.runMutation('marketConversations:insertMarketConversation' as any, {
        agentId: msg.agentId,
        agentName: msg.agentName,
        role: msg.role,
        content: msg.content,
        sessionId,
        marketContext: msg.marketContext,
        confidence: Math.random() * 0.3 + 0.7,
        tags: msg.tags,
      })
    }

    return { generated: conversation.length, sessionId }
  },
})
