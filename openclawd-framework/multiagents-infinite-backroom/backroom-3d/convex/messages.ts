import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const insertMessage = mutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    content: v.string(),
    turn: v.number(),
    sessionId: v.optional(v.string()),
    reasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now()
    return ctx.db.insert('messages', { ...args, timestamp })
  },
})

// Called by HTTP actions after auth is verified upstream
export const insertFromCurlAgent = internalMutation({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    content: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lastMsg = await ctx.db
      .query('messages')
      .withIndex('by_turn')
      .order('desc')
      .first()
    const turn = (lastMsg?.turn ?? 0) + 1
    return ctx.db.insert('messages', { ...args, turn, timestamp: Date.now() })
  },
})

export const getMessages = query({
  args: {
    limit: v.optional(v.number()),
    sinceTurn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { limit = 50, sinceTurn } = args

    if (sinceTurn !== undefined) {
      return ctx.db
        .query('messages')
        .withIndex('by_turn', (q) => q.gt('turn', sinceTurn))
        .order('asc')
        .take(limit)
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_turn')
      .order('desc')
      .take(limit)
    return messages.reverse()
  },
})

export const getMessagesInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
    sinceTurn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { limit = 50, sinceTurn } = args

    if (sinceTurn !== undefined) {
      return ctx.db
        .query('messages')
        .withIndex('by_turn', (q) => q.gt('turn', sinceTurn))
        .order('asc')
        .take(limit)
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_turn')
      .order('desc')
      .take(limit)
    return messages.reverse()
  },
})

export const getLatestTurn = query({
  handler: async (ctx) => {
    const lastMsg = await ctx.db
      .query('messages')
      .withIndex('by_turn')
      .order('desc')
      .first()
    return lastMsg?.turn ?? 0
  },
})
