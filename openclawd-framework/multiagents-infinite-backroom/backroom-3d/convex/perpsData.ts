import { mutation, query, internalAction } from './_generated/server'
import { v } from 'convex/values'


/**
 * Phoenix DEX perpetuals data pipeline.
 * Polls the Phoenix API for real-time perps market data
 * (mark prices, funding rates, open interest, orderbook).
 *
 * API base: https://perp-api.phoenix.trade
 * Reference: vulcan-cli-master uses this same API.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface PhoenixTicker {
  symbol: string
  markPrice: number
  midPrice: number
  oraclePrice: number
  prevDayPrice: number
  change24hPct: number
  volume24hUsd: number
  openInterest: number
  fundingRate: number
  timestamp: number
}

export interface PhoenixOrderbook {
  symbol: string
  midPrice: number | null
  spread: number | null
  bids: Array<{ price: number; quantity: number }>
  asks: Array<{ price: number; quantity: number }>
  timestamp: number
}

// ── Convex schema types ───────────────────────────────────────────────────

export const insertPerpsSnapshot = mutation({
  args: {
    symbol: v.string(),
    markPrice: v.optional(v.number()),
    midPrice: v.optional(v.number()),
    oraclePrice: v.optional(v.number()),
    prevDayPrice: v.optional(v.number()),
    change24hPct: v.optional(v.number()),
    volume24hUsd: v.optional(v.number()),
    openInterest: v.optional(v.number()),
    fundingRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('perpsMarkets', {
      ...args,
      timestamp: Date.now(),
    })
  },
})

export const getLatestPerps = query({
  args: {
    symbol: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { symbol, limit = 20 } = args
    let q = ctx.db.query('perpsMarkets').withIndex('by_timestamp').order('desc')
    if (symbol) {
      q = q.filter((row) => row.eq(row.field('symbol'), symbol))
    }
    return q.take(limit)
  },
})

export const getLatestPerpsBySymbol = query({
  args: {},
  handler: async (ctx) => {
    // Get one latest snapshot per symbol
    const all = await ctx.db.query('perpsMarkets').withIndex('by_timestamp').order('desc').take(500)
    const latest: Record<string, typeof all[0]> = {}
    for (const row of all) {
      if (!latest[row.symbol]) {
        latest[row.symbol] = row
      }
    }
    return Object.values(latest).sort((a, b) => a.symbol.localeCompare(b.symbol))
  },
})

// ── Phoenix API fetcher ──────────────────────────────────────────────────

const PHOENIX_API_BASE = 'https://perp-api.phoenix.trade'

interface PhoenixMarketStatsResponse {
  market: {
    symbol: string
    marketStatus: string
    markPrice: { price: number; slot: number } | null
    spotPrice: { price: number; slot: number } | null
    openInterest: { value: number; decimals: number; ui: string }
    currentFundingRatePercentage: number
    annualizedFundingRatePercentage: number
    l2Orderbook: {
      mid: number | null
      bids: Array<[number, number]>
      asks: Array<[number, number]>
    }
  }
}

async function fetchPhoenixStats(symbol: string): Promise<PhoenixTicker | null> {
  try {
    const url = `${PHOENIX_API_BASE}/market/${symbol.toUpperCase()}/stats`
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) {
      console.error(`Phoenix API ${symbol}: HTTP ${resp.status}`)
      return null
    }
    const data: PhoenixMarketStatsResponse = await resp.json()
    const m = data.market

    const markPrice = m.markPrice?.price ?? m.l2Orderbook?.mid ?? 0
    const midPrice = m.l2Orderbook?.mid ?? markPrice
    const oraclePrice = m.spotPrice?.price ?? markPrice

    // Parse openInterest decimal
    let oi = 0
    try {
      oi = parseFloat(m.openInterest.ui)
    } catch {
      oi = m.openInterest.value / Math.pow(10, m.openInterest.decimals)
    }

    const fundingRate = m.currentFundingRatePercentage / 100.0

    return {
      symbol: m.symbol,
      markPrice,
      midPrice,
      oraclePrice,
      prevDayPrice: markPrice, // will be overwritten by candle-derived value
      change24hPct: 0,
      volume24hUsd: 0,
      openInterest: oi,
      fundingRate,
      timestamp: Date.now(),
    }
  } catch (e) {
    console.error(`Error fetching Phoenix ${symbol}:`, e)
    return null
  }
}

async function fetchPhoenixOrderbook(symbol: string, depth: number = 10): Promise<PhoenixOrderbook | null> {
  try {
    const url = `${PHOENIX_API_BASE}/market/${symbol.toUpperCase()}/stats`
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) return null
    const data: PhoenixMarketStatsResponse = await resp.json()
    const book = data.market.l2Orderbook

    const bids = book.bids.slice(0, depth).map(([price, qty]) => ({ price, quantity: qty }))
    const asks = book.asks.slice(0, depth).map(([price, qty]) => ({ price, quantity: qty }))
    const spread = bids.length > 0 && asks.length > 0
      ? asks[0].price - bids[0].price
      : null

    return {
      symbol: data.market.symbol,
      midPrice: book.mid,
      spread,
      bids,
      asks,
      timestamp: Date.now(),
    }
  } catch (e) {
    console.error(`Error fetching Phoenix orderbook ${symbol}:`, e)
    return null
  }
}

// ── Polling action ────────────────────────────────────────────────────────

const DEFAULT_SYMBOLS = ['SOL', 'BTC', 'ETH', 'DOGE', 'SUI', 'XRP', 'BNB', 'AAVE', 'HYPE', 'SKR']

/**
 * Polls Phoenix DEX perps API for all tracked symbols.
 * Called as a scheduled Convex action.
 */
export const pollPhoenixPerps = internalAction({
  args: {
    symbols: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const symbols = args.symbols ?? DEFAULT_SYMBOLS

    // Fetch all markets concurrently
    const results = await Promise.allSettled(
      symbols.map((sym) => fetchPhoenixStats(sym))
    )

    // Insert each successfully fetched snapshot
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const t = result.value
        try {
          await ctx.runMutation("perpsData:insertPerpsSnapshot" as any, {

            symbol: t.symbol,
            markPrice: t.markPrice,
            midPrice: t.midPrice,
            oraclePrice: t.oraclePrice,
            prevDayPrice: t.prevDayPrice,
            change24hPct: t.change24hPct,
            volume24hUsd: t.volume24hUsd,
            openInterest: t.openInterest,
            fundingRate: t.fundingRate,
          })
        } catch (e) {
          console.error(`Error inserting perps snapshot for ${t.symbol}:`, e)
        }
      }
    }

    return { polled: symbols.length, succeeded: results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value !== null).length }
  },
})

// ── Agent-facing queries ─────────────────────────────────────────────────

export const getPerpsSummary = query({
  args: {},
  handler: async (ctx) => {
    const markets = await ctx.db.query('perpsMarkets').withIndex('by_timestamp').order('desc').take(200)
    const latest: Record<string, typeof markets[0]> = {}
    for (const m of markets) {
      if (!latest[m.symbol]) latest[m.symbol] = m
    }
    return Object.values(latest).map(m => ({
      symbol: m.symbol,
      markPrice: m.markPrice,
      midPrice: m.midPrice,
      oraclePrice: m.oraclePrice,
      prevDayPrice: m.prevDayPrice,
      fundingRate: m.fundingRate,
      openInterest: m.openInterest,
      change24hPct: m.change24hPct,
      volume24hUsd: m.volume24hUsd,
      timestamp: m.timestamp,
    }))
  },
})
