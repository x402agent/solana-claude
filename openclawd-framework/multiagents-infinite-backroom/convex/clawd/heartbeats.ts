/**
 * CLAWD Heartbeat Recording & Querying
 *
 * Functions for agents to push heartbeats and for the dashboard
 * to query heartbeat history.
 */
import { v } from 'convex/values';
import { mutation, query, internalMutation } from '../_generated/server';

// ─── Record a Heartbeat ───────────────────────────────────────────

export const recordHeartbeat = mutation({
  args: {
    agentId: v.string(),
    state: v.optional(v.string()),
    creditsCents: v.optional(v.number()),
    usdcBalance: v.optional(v.number()),
    uptimeSeconds: v.optional(v.number()),
    version: v.optional(v.string()),
    sandboxId: v.optional(v.string()),
    turnCount: v.optional(v.number()),
    skillCount: v.optional(v.number()),
    tier: v.optional(v.string()),
    statusPayload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Insert heartbeat entry
    await ctx.db.insert('clawdHeartbeats', {
      agentId: args.agentId,
      state: args.state,
      creditsCents: args.creditsCents,
      usdcBalance: args.usdcBalance,
      uptimeSeconds: args.uptimeSeconds,
      version: args.version,
      sandboxId: args.sandboxId,
      turnCount: args.turnCount,
      skillCount: args.skillCount,
      tier: args.tier,
      statusPayload: args.statusPayload,
      timestamp: now,
    });

    // Update agent's lastSeen
    const agent = await ctx.db
      .query('clawdAgents')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId))
      .first();

    if (agent) {
      await ctx.db.patch(agent._id, {
        lastSeen: now,
        active: true,
        metadata: args.statusPayload
          ? JSON.stringify({
              state: args.state,
              version: args.version,
              creditsCents: args.creditsCents,
            })
          : agent.metadata,
      });
    }

    // Activity log entry (sampled — every 10th heartbeat to avoid noise)
    const heartbeatCount = await ctx.db
      .query('clawdHeartbeats')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId))
      .filter((q) => q.gte(q.field('timestamp'), now - 60000))
      .collect();

    if (heartbeatCount.length % 10 === 0) {
      await ctx.db.insert('clawdActivityLog', {
        agentId: args.agentId,
        action: 'heartbeat',
        details: `Heartbeat #${heartbeatCount.length}`,
        payload: JSON.stringify({
          state: args.state,
          tier: args.tier,
          creditsCents: args.creditsCents,
          uptimeSeconds: args.uptimeSeconds,
        }),
        timestamp: now,
      });
    }

    return { recorded: true, timestamp: now };
  },
});

// ─── Get Latest Heartbeat ─────────────────────────────────────────

export const getLatestHeartbeat = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('clawdHeartbeats')
      .withIndex('agentId_timestamp', (q) => q.eq('agentId', args.agentId))
      .order('desc')
      .first();
  },
});

// ─── Get Heartbeat History ────────────────────────────────────────

export const getHeartbeatHistory = query({
  args: {
    agentId: v.string(),
    limit: v.optional(v.number()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    let query = ctx.db
      .query('clawdHeartbeats')
      .withIndex('agentId_timestamp', (q) => q.eq('agentId', args.agentId));

    if (args.since) {
      query = query.filter((q) => q.gte(q.field('timestamp'), args.since!));
    }

    return await query.order('desc').take(limit);
  },
});

// ─── Get All Recent Heartbeats (for dashboard) ────────────────────

export const listRecentHeartbeats = query({
  args: { since: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const since = args.since ?? Date.now() - 300_000; // default: last 5 min
    return await ctx.db
      .query('clawdHeartbeats')
      .withIndex('timestamp', (q) => q.gte('timestamp', since))
      .order('desc')
      .collect();
  },
});

// ─── Get Heartbeat Stats ──────────────────────────────────────────

export const getHeartbeatStats = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const [latest, allEntries] = await Promise.all([
      ctx.db
        .query('clawdHeartbeats')
        .withIndex('agentId_timestamp', (q) => q.eq('agentId', args.agentId))
        .order('desc')
        .first(),
      ctx.db
        .query('clawdHeartbeats')
        .withIndex('agentId', (q) => q.eq('agentId', args.agentId))
        .collect(),
    ]);

    if (!latest) return null;

    // Calculate uptime from first heartbeat
    const firstSeen = allEntries.length > 0
      ? allEntries[allEntries.length - 1].timestamp
      : latest.timestamp;

    // Calculate average interval between heartbeats
    let avgIntervalMs = 0;
    if (allEntries.length > 1) {
      let totalInterval = 0;
      for (let i = 1; i < allEntries.length; i++) {
        totalInterval += allEntries[i].timestamp - allEntries[i - 1].timestamp;
      }
      avgIntervalMs = totalInterval / (allEntries.length - 1);
    }

    return {
      agentId: args.agentId,
      heartbeatCount: allEntries.length,
      firstHeartbeatAt: firstSeen,
      latestHeartbeatAt: latest.timestamp,
      uptimeMs: latest.timestamp - firstSeen,
      avgIntervalMs: Math.round(avgIntervalMs),
      latestState: latest.state,
      latestTier: latest.tier,
    };
  },
});

// ─── Internal: Prune Old Heartbeats ───────────────────────────────

export const pruneOldHeartbeats = internalMutation({
  args: { olderThan: v.number(), agentId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThan;
    let builder = ctx.db
      .query('clawdHeartbeats')
      .withIndex('timestamp', (q) => q.lt('timestamp', cutoff));

    if (args.agentId) {
      builder = builder.filter((q) =>
        q.eq(q.field('agentId'), args.agentId!),
      );
    }

    const oldEntries = await builder.collect();
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }
    return oldEntries.length;
  },
});

