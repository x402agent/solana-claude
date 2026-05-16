import { internalMutation, internalQuery, query } from './_generated/server'
import { v } from 'convex/values'

const ONLINE_THRESHOLD = 5 * 60 * 1000
const PUBLIC_AGENT_LIMIT = 1000

type PublicAgent = {
  agentId: string
  name: string
  registeredAt: number
  lastSeenAt: number
  sessionCount: number
  isOnline: boolean
}

function publicAgent(a: {
  agentId?: string
  name?: string
  registeredAt?: number
  lastSeenAt?: number
  sessionCount?: number
}): PublicAgent {
  const now = Date.now()
  const agentId = a.agentId ?? 'unknown-agent'
  const lastSeenAt = typeof a.lastSeenAt === 'number' ? a.lastSeenAt : 0
  return {
    agentId,
    name: a.name ?? `agent-${agentId.slice(0, 6)}`,
    registeredAt: typeof a.registeredAt === 'number' ? a.registeredAt : lastSeenAt,
    lastSeenAt,
    sessionCount: typeof a.sessionCount === 'number' ? a.sessionCount : 0,
    isOnline: lastSeenAt > 0 && now - lastSeenAt < ONLINE_THRESHOLD,
  }
}

async function getRecentPublicAgents(ctx: any) {
  // Avoid relying on the deployed index being available during rolling Convex deploys.
  const agents = await ctx.db.query('curlAgents').collect()
  return (agents as Array<Parameters<typeof publicAgent>[0]>)
    .map(publicAgent)
    .sort((a: PublicAgent, b: PublicAgent) => b.lastSeenAt - a.lastSeenAt)
    .slice(0, PUBLIC_AGENT_LIMIT)
}

export const registerAgent = internalMutation({
  args: {
    agentId: v.string(),
    token: v.string(),
    name: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('curlAgents', {
      agentId: args.agentId,
      token: args.token,
      name: args.name,
      userAgent: args.userAgent,
      registeredAt: Date.now(),
      lastSeenAt: Date.now(),
      sessionCount: 1,
      isOnline: true,
    })
  },
})

export const loginAgent = internalMutation({
  args: {
    agentId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('curlAgents')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .first()
    if (!agent || agent.token !== args.token) return null
    const sessionCount = agent.sessionCount + 1
    await ctx.db.patch(agent._id, { lastSeenAt: Date.now(), sessionCount, isOnline: true })
    return { agentId: agent.agentId, token: agent.token, name: agent.name, sessionCount }
  },
})

export const pingAgent = internalMutation({
  args: {
    agentId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('curlAgents')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .first()
    if (!agent || agent.token !== args.token) return false
    await ctx.db.patch(agent._id, { lastSeenAt: Date.now(), isOnline: true })
    return true
  },
})

export const getAgentName = internalQuery({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('curlAgents')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .first()
    return agent?.name ?? null
  },
})

export const listAgentsInternal = internalQuery({
  handler: async (ctx) => {
    return getRecentPublicAgents(ctx)
  },
})

export const getPublicAgents = query({
  handler: async (ctx) => {
    return getRecentPublicAgents(ctx)
  },
})
