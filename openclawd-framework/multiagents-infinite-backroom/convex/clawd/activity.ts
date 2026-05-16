/**
 * CLAWD Activity Log
 *
 * Functions to query the activity log for agents.
 */
import { v } from 'convex/values';
import { query } from '../_generated/server';

// ─── Get Activity for an Agent ────────────────────────────────────

export const getActivity = query({
  args: {
    agentId: v.string(),
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let builder = ctx.db
      .query('clawdActivityLog')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId));

    if (args.action) {
      builder = builder.filter((q) =>
        q.eq(q.field('action'), args.action!),
      );
    }

    if (args.since) {
      builder = builder.filter((q) =>
        q.gte(q.field('timestamp'), args.since!),
      );
    }

    return await builder.order('desc').take(limit);
  },
});

// ─── Get Recent Activity (all agents) ─────────────────────────────

export const listRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const entries = await ctx.db
      .query('clawdActivityLog')
      .order('desc')
      .take(limit);

    if (args.since) {
      return entries.filter((e) => e.timestamp >= args.since!);
    }
    return entries;
  },
});

