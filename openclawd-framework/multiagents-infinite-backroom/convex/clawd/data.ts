/**
 * CLAWD Agent Data Store
 *
 * Simple key-value store for agents (especially curl-installed agents)
 * to save and recall their data across restarts.
 *
 * Each agent has its own namespace identified by agentId.
 * Data can be stored with optional content-type hints and tags for categorization.
 */
import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';

// ─── Store Data ───────────────────────────────────────────────────

export const setData = mutation({
  args: {
    agentId: v.string(),
    key: v.string(),
    value: v.string(),
    contentType: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('clawdAgentData')
      .withIndex('agentId_key', (q) =>
        q.eq('agentId', args.agentId).eq('key', args.key),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        contentType: args.contentType ?? existing.contentType,
        tags: args.tags ?? existing.tags,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('clawdAgentData', {
        agentId: args.agentId,
        key: args.key,
        value: args.value,
        contentType: args.contentType,
        tags: args.tags,
        updatedAt: now,
      });
    }

    // Log the write
    await ctx.db.insert('clawdActivityLog', {
      agentId: args.agentId,
      action: 'data_write',
      details: `key=${args.key}, contentType=${args.contentType ?? 'text/plain'}`,
      timestamp: now,
    });

    return { stored: true, key: args.key, updatedAt: now };
  },
});

// ─── Get Data ─────────────────────────────────────────────────────

export const getData = query({
  args: {
    agentId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('clawdAgentData')
      .withIndex('agentId_key', (q) =>
        q.eq('agentId', args.agentId).eq('key', args.key),
      )
      .first();

    return entry ?? null;
  },
});

// ─── List All Keys for an Agent ───────────────────────────────────

export const listData = query({
  args: {
    agentId: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('clawdAgentData')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId));

    if (args.tag) {
      query = query.filter((q) =>
        q.eq(q.field('tags'), [args.tag!]),
      );
    }

    const entries = await query.collect();
    return entries.map((e) => ({
      key: e.key,
      contentType: e.contentType,
      tags: e.tags,
      updatedAt: e.updatedAt,
      // Only include value preview (first 200 chars) in list view
      valuePreview: e.value.length > 200
        ? e.value.slice(0, 200) + '...'
        : e.value,
    }));
  },
});

// ─── Delete Data ──────────────────────────────────────────────────

export const deleteData = mutation({
  args: {
    agentId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query('clawdAgentData')
      .withIndex('agentId_key', (q) =>
        q.eq('agentId', args.agentId).eq('key', args.key),
      )
      .first();

    if (!entry) {
      return { deleted: false, key: args.key };
    }

    await ctx.db.delete(entry._id);

    await ctx.db.insert('clawdActivityLog', {
      agentId: args.agentId,
      action: 'data_write',
      details: `key=${args.key} (deleted)`,
      timestamp: Date.now(),
    });

    return { deleted: true, key: args.key };
  },
});

// ─── Get All Data for an Agent (full values) ──────────────────────

export const exportAllData = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('clawdAgentData')
      .withIndex('agentId', (q) => q.eq('agentId', args.agentId))
      .collect();

    return entries.map((e) => ({
      key: e.key,
      value: e.value,
      contentType: e.contentType,
      tags: e.tags,
      updatedAt: e.updatedAt,
    }));
  },
});

