import { mutation, query, internalAction } from './_generated/server'
import { v } from 'convex/values'

// These values are set as Convex environment variables on the deployment.
// At runtime `process.env` is available in Convex actions; using string access to satisfy the build tsconfig.
const DFLOW_API_KEY: string = (globalThis as any).process?.env?.DFLOW_API_KEY ?? 'gR6QuMENJJxMy3O2nrcc'
const DFLOW_QUOTE_API: string = (globalThis as any).process?.env?.DFLOW_QUOTE_API_URL ?? 'https://d.quote-api.dflow.net'
const DFLOW_MARKETS_API: string = (globalThis as any).process?.env?.DFLOW_MARKETS_API_URL ?? 'https://d.prediction-markets-api.dflow.net'

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const ETH_MINT = '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'
const BTC_MINT = '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh'

const QUOTE_PAIRS = [
  { pair: 'SOL/USDC', inMint: SOL_MINT, outMint: USDC_MINT, inAmount: 1_000_000_000, outDec: 6 },
  { pair: 'ETH/USDC', inMint: ETH_MINT, outMint: USDC_MINT, inAmount: 100_000_000, outDec: 6 },
  { pair: 'BTC/USDC', inMint: BTC_MINT, outMint: USDC_MINT, inAmount: 100_000_000, outDec: 6 },
]

export const insertDflowQuote = mutation({
  args: {
    pair: v.string(),
    priceUsd: v.number(),
    priceImpactPct: v.optional(v.string()),
    routeLegs: v.optional(v.number()),
    inMint: v.string(),
    outMint: v.string(),
    inAmount: v.number(),
    outAmount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('dflowQuotes', { ...args, timestamp: Date.now() })
  },
})

export const insertDflowMarket = mutation({
  args: {
    marketId: v.string(),
    name: v.string(),
    yesPrice: v.optional(v.number()),
    volume: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('dflowMarkets', { ...args, timestamp: Date.now() })
  },
})

export const getLatestQuotes = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('dflowQuotes').withIndex('by_timestamp').order('desc').take(200)
    const latest: Record<string, typeof all[0]> = {}
    for (const q of all) {
      if (!latest[q.pair]) latest[q.pair] = q
    }
    return Object.values(latest).sort((a, b) => a.pair.localeCompare(b.pair))
  },
})

export const getLatestMarkets = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('dflowMarkets').withIndex('by_timestamp').order('desc').take(500)
    const latest: Record<string, typeof all[0]> = {}
    for (const m of all) {
      if (!latest[m.marketId]) latest[m.marketId] = m
    }
    return Object.values(latest).slice(0, 20)
  },
})

export const pollDflowData = internalAction({
  args: {},
  handler: async (ctx) => {
    const headers = { 'Accept': 'application/json', 'x-api-key': DFLOW_API_KEY }

    // ── Fetch quotes ──────────────────────────────────────────────────
    for (const { pair, inMint, outMint, inAmount, outDec } of QUOTE_PAIRS) {
      try {
        const params = new URLSearchParams({
          inputMint: inMint,
          outputMint: outMint,
          amount: String(inAmount),
          slippageBps: '50',
        })
        const resp = await fetch(`${DFLOW_QUOTE_API}/quote?${params}`, { headers, signal: AbortSignal.timeout(8000) })
        if (!resp.ok) { console.error(`DFlow quote ${pair}: HTTP ${resp.status}`); continue }
        const data = await resp.json() as any
        const outAmount = parseInt(data.outAmount ?? '0', 10)
        const priceUsd = outAmount / Math.pow(10, outDec)
        await ctx.runMutation('dflowData:insertDflowQuote' as any, {
          pair,
          priceUsd,
          priceImpactPct: data.priceImpactPct ?? undefined,
          routeLegs: Array.isArray(data.routePlan) ? data.routePlan.length : undefined,
          inMint,
          outMint,
          inAmount,
          outAmount,
        })
      } catch (e) {
        console.error(`DFlow quote fetch error for ${pair}:`, e)
      }
    }

    // ── Fetch prediction markets ──────────────────────────────────────
    try {
      const resp = await fetch(`${DFLOW_MARKETS_API}/markets`, { headers, signal: AbortSignal.timeout(8000) })
      if (resp.ok) {
        const data = await resp.json() as any
        const markets: any[] = Array.isArray(data) ? data : (data.markets ?? data.data ?? [])
        for (const m of markets.slice(0, 20)) {
          const marketId = String(m.id ?? m.marketId ?? m.address ?? m.name ?? '')
          if (!marketId) continue
          await ctx.runMutation('dflowData:insertDflowMarket' as any, {
            marketId,
            name: m.name ?? m.title ?? m.question ?? marketId,
            yesPrice: typeof m.yesPrice === 'number' ? m.yesPrice : (typeof m.yes_price === 'number' ? m.yes_price : undefined),
            volume: typeof m.volume === 'number' ? m.volume : undefined,
            status: m.status ?? undefined,
          })
        }
      }
    } catch (e) {
      console.error('DFlow markets fetch error:', e)
    }
  },
})
