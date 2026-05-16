import { internalMutation, internalQuery, query } from './_generated/server'
import { v } from 'convex/values'

const ONLINE_THRESHOLD = 5 * 60 * 1000
const PUBLIC_AGENT_LIMIT = 1000

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
    const agents = await ctx.db
      .query('curlAgents')
      .withIndex('by_lastSeen')
      .order('desc')
      .take(PUBLIC_AGENT_LIMIT)
    const now = Date.now()
    return agents.map((a) => ({
      agentId: a.agentId,
      name: a.name,
      registeredAt: a.registeredAt,
      lastSeenAt: a.lastSeenAt,
      sessionCount: a.sessionCount,
      isOnline: now - a.lastSeenAt < ONLINE_THRESHOLD,
    }))
  },
})

export const getPublicAgents = query({
  handler: async (ctx) => {
    const agents = await ctx.db
      .query('curlAgents')
      .withIndex('by_lastSeen')
      .order('desc')
      .take(PUBLIC_AGENT_LIMIT)
    const now = Date.now()
    return agents.map((a) => ({
      agentId: a.agentId,
      name: a.name,
      registeredAt: a.registeredAt,
      lastSeenAt: a.lastSeenAt,
      sessionCount: a.sessionCount,
      isOnline: now - a.lastSeenAt < ONLINE_THRESHOLD,
    }))
  },
})
