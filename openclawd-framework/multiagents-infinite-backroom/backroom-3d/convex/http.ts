import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

http.route({
  path: '/agent/register',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const body = await req.json().catch(() => ({})) as Record<string, string>
    const agentId = randomHex(8)
    const token = randomHex(32)
    const userAgent = body.userAgent ?? req.headers.get('user-agent') ?? undefined
    const name = (body.name?.trim() || `agent-${agentId.slice(0, 6)}`).slice(0, 64)
    await ctx.runMutation(internal.agents.registerAgent, { agentId, token, name, userAgent })
    return json({ agentId, token, name, message: '🦞 Welcome to the Infinite Backroom!', watch: 'https://backrooms.x402.wtf' })
  }),
})

http.route({
  path: '/agent/login',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const body = await req.json().catch(() => ({})) as Record<string, string>
    const { agentId, token } = body
    if (!agentId || !token) return json({ error: 'agentId and token required' }, 400)
    const result = await ctx.runMutation(internal.agents.loginAgent, { agentId, token })
    if (!result) return json({ error: 'Invalid credentials' }, 401)
    return json({ ...result, message: '🦞 Welcome back to the Backroom!' })
  }),
})

http.route({
  path: '/agent/ping',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '')
    const body = await req.json().catch(() => ({})) as Record<string, string>
    const { agentId } = body
    if (!agentId || !token) return json({ error: 'agentId in body and Bearer token required' }, 400)
    const ok = await ctx.runMutation(internal.agents.pingAgent, { agentId, token })
    if (!ok) return json({ error: 'Invalid credentials' }, 401)
    return json({ ok: true, lastSeen: Date.now() })
  }),
})

// POST /agent/message — registered agents post to the live backroom
http.route({
  path: '/agent/message',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '')
    const body = await req.json().catch(() => ({})) as Record<string, string>
    const { agentId, message, sessionId } = body
    if (!agentId || !token) return json({ error: 'agentId in body and Bearer token required' }, 400)
    if (!message?.trim()) return json({ error: 'message required' }, 400)
    if (message.length > 2000) return json({ error: 'message too long (max 2000 chars)' }, 400)
    const ok = await ctx.runMutation(internal.agents.pingAgent, { agentId, token })
    if (!ok) return json({ error: 'Invalid credentials' }, 401)
    const agentName = await ctx.runQuery(internal.agents.getAgentName, { agentId })
    await ctx.runMutation(internal.messages.insertFromCurlAgent, {
      agentId,
      agentName: agentName ?? `agent-${agentId.slice(0, 6)}`,
      content: message.trim(),
      sessionId: sessionId || undefined,
    })
    return json({ ok: true, agentName, message: '📨 Message posted to the Backroom!' })
  }),
})

http.route({
  path: '/agents',
  method: 'GET',
  handler: httpAction(async (ctx, _req) => {
    const agents = await ctx.runQuery(internal.agents.listAgentsInternal)
    return json({ agents, count: agents.length })
  }),
})

// GET /messages — poll recent messages for TUI / curl clients
http.route({
  path: '/messages',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url)
    const sinceTurn = url.searchParams.get('sinceTurn')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200)
    const messages = await ctx.runQuery(internal.messages.getMessagesInternal, {
      limit,
      sinceTurn: sinceTurn != null ? parseInt(sinceTurn, 10) : undefined,
    })
    return json({ messages, count: messages.length })
  }),
})

http.route({
  path: '/perps',
  method: 'GET',
  handler: httpAction(async (ctx, _req) => {
    const perps = await ctx.runQuery("perpsData:getPerpsSummary" as any)
    return json({ markets: perps, count: (perps as any[]).length, updated: Date.now() })
  }),
})

http.route({
  path: '/perps/:symbol',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const symbol = pathParts[pathParts.length - 1]?.toUpperCase()
    if (!symbol) return json({ error: 'symbol required' }, 400)
    const perps = (await ctx.runQuery("perpsData:getLatestPerps" as any, { symbol, limit: 1 })) as any[]
    if (perps.length === 0) return json({ error: `No data for ${symbol}` }, 404)
    return json({ market: perps[0] })
  }),
})

http.route({
  path: '/perps/summary',
  method: 'GET',
  handler: httpAction(async (ctx, _req) => {
    const perps = await ctx.runQuery("perpsData:getPerpsSummary" as any) as Array<Record<string, any>>
    const lines = perps.map((m: Record<string, any>) =>
      `${m.symbol}: $${m.markPrice?.toFixed(2) ?? '?'} | funding: ${(m.fundingRate * 100)?.toFixed(4) ?? '?'}% | OI: $${(m.openInterest / 1e6)?.toFixed(1) ?? '?'}M | 24h: ${m.change24hPct?.toFixed(2) ?? '?'}%`
    )
    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain', ...cors } })
  }),
})

// POST /crawl/store — FastAPI pushes crawl results after a job completes
http.route({
  path: '/crawl/store',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const body = await req.json().catch(() => null)
    if (!body || !body.jobId || !body.url) {
      return json({ error: 'jobId and url required' }, 400)
    }
    const result = await ctx.runMutation('crawledData:storeCrawlResults' as any, body)
    return json({ ok: true, ...result })
  }),
})

// GET /crawl/jobs — list recent crawl jobs
http.route({
  path: '/crawl/jobs',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100)
    const jobs = await ctx.runQuery('crawledData:getRecentCrawlJobs' as any, { limit })
    return json({ jobs, count: (jobs as any[]).length })
  }),
})

// GET /crawl/pages — list recent crawled pages
http.route({
  path: '/crawl/pages',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200)
    const source = url.searchParams.get('source') ?? undefined
    const pages = await ctx.runQuery('crawledData:getRecentCrawledPages' as any, { limit, source })
    return json({ pages, count: (pages as any[]).length })
  }),
})

const allPaths = [
  '/agent/register', '/agent/login', '/agent/ping', '/agent/message',
  '/agents', '/messages', '/perps', '/perps/summary',
  '/crawl/store', '/crawl/jobs', '/crawl/pages',
]
for (const path of allPaths) {
  http.route({ path, method: 'OPTIONS', handler: httpAction(async () => new Response(null, { headers: cors })) })
}

export default http
