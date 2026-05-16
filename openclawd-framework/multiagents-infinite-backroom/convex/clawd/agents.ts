/**
 * CLAWD Agent Registration & Management
 *
 * Functions for registering agents (automaton installs), querying
 * agent status, and managing agent lifecycle.
 */
import { v } from 'convex/values';
import { mutation, query, internalMutation } from '../_generated/server';

// ─── Register / Install an Agent ──────────────────────────────────

export const registerAgent = mutation({
  args: {
    agentId: v.string(),
    name: v.string(),
    installMethod: v.string(),
    source: v.optional(v.string()),
    metadata: v.optional(v.string()),
    address: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('clawdAgents')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: now,
        active: true,
        metadata: args.metadata ?? existing.metadata,
        name: args.name ?? existing.name,
        tags: args.tags ?? existing.tags,
      });
      await ctx.db.insert('clawdActivityLog', {
        agentId: args.agentId,
        action: 'install',
        details: `Agent re-registered (${args.installMethod})`,
        timestamp: now,
      });
      return { registered: false, agentId: args.agentId, firstSeen: existing.firstSeen };
    }

    await ctx.db.insert('clawdAgents', {
      agentId: args.agentId,
      name: args.name,
      installMethod: args.installMethod,
      source: args.source,
      metadata: args.metadata,
      address: args.address,
      firstSeen: now,
      lastSeen: now,
      active: true,
      tags: args.tags,
    });
    await ctx.db.insert('clawdActivityLog', {
      agentId: args.agentId,
      action: 'install',
      details: `Agent installed via ${args.installMethod}`,
      payload: JSON.stringify({ name: args.name, source: args.source }),
      timestamp: now,
    });
    return { registered: true, agentId: args.agentId, firstSeen: now };
  },
});

// ─── Get Agent Details ────────────────────────────────────────────

export const getAgent = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('clawdAgents')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId))
      .first();
    if (!agent) return null;

    const latestHeartbeat = await ctx.db
      .query('clawdHeartbeats')
      .withIndex('agentId_timestamp', (q) => q.eq('agentId', args.agentId))
      .order('desc')
      .first();

    return { ...agent, latestHeartbeat };
  },
});

// ─── List Active Agents ───────────────────────────────────────────

export const listActiveAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('clawdAgents')
      .withIndex('active', (q) => q.eq('active', true))
      .order('desc')
      .collect();
  },
});

// ─── List All Agents ──────────────────────────────────────────────

export const listAllAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('clawdAgents').order('desc').collect();
  },
});

// ─── Deactivate Agent ─────────────────────────────────────────────

export const deactivateAgent = mutation({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('clawdAgents')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId))
      .first();
    if (!agent) throw new Error(`Agent ${args.agentId} not found`);
    await ctx.db.patch(agent._id, { active: false });
    await ctx.db.insert('clawdActivityLog', {
      agentId: args.agentId,
      action: 'state_change',
      details: 'Agent deactivated',
      timestamp: Date.now(),
    });
  },
});

// ─── Internal: Mark Stale Agents Inactive ────────────────────────

export const markStaleAgentsInactive = internalMutation({
  args: { staleThreshold: v.number() },
  handler: async (ctx, args) => {
    const threshold = Date.now() - args.staleThreshold;
    const staleAgents = await ctx.db
      .query('clawdAgents')
      .withIndex('lastSeen', (q) => q.lt('lastSeen', threshold))
      .filter((q) => q.eq(q.field('active'), true))
      .collect();

    for (const agent of staleAgents) {
      await ctx.db.patch(agent._id, { active: false });
      await ctx.db.insert('clawdActivityLog', {
        agentId: agent.agentId,
        action: 'state_change',
        details: `Auto-deactivated (no heartbeat)`,
        timestamp: Date.now(),
      });
    }
    return staleAgents.length;
  },
});
