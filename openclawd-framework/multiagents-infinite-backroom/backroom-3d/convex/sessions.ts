import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const createSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.insert('sessions', {
      sessionId: args.sessionId,
      status: 'active',
      turnCount: 0,
      startedAt: Date.now(),
    })
  },
})

export const endSession = mutation({
  args: {
    sessionId: v.string(),
    turnCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('sessionId'), args.sessionId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'completed',
        endedAt: Date.now(),
        ...(args.turnCount !== undefined ? { turnCount: args.turnCount } : {}),
      })
    }
  },
})

export const getActiveSession = query({
  handler: async (ctx) => {
    return ctx.db
      .query('sessions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .order('desc')
      .first()
  },
})
