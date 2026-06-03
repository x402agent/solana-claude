import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Record a new install event from the install script. */
export const track = mutation({
  args: {
    source: v.string(),
    os: v.string(),
    arch: v.string(),
    nodeVersion: v.optional(v.string()),
    status: v.string(),
    sessionId: v.string(),
    message: v.optional(v.string()),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("installs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        message: args.message,
        ts: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("installs", {
      source: args.source,
      os: args.os,
      arch: args.arch,
      nodeVersion: args.nodeVersion,
      status: args.status,
      sessionId: args.sessionId,
      message: args.message,
      ip: args.ip,
      ts: Date.now(),
    });
  },
});

/** Link a wallet address to an install session (called from hub after login). */
export const linkWallet = mutation({
  args: {
    sessionId: v.string(),
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const install = await ctx.db
      .query("installs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (install) {
      await ctx.db.patch(install._id, { walletAddress: args.walletAddress });
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (session) {
      await ctx.db.patch(session._id, {
        walletAddress: args.walletAddress,
        lastSeen: Date.now(),
        installId: install?._id,
      });
    } else {
      await ctx.db.insert("sessions", {
        sessionId: args.sessionId,
        walletAddress: args.walletAddress,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        installId: install?._id,
      });
    }
  },
});

/** List the N most recent installs (for the operator hub). */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("installs")
      .withIndex("by_ts")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/** Aggregate counts by status and source. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("installs").collect();
    const total = all.length;
    const complete = all.filter((i) => i.status === "complete").length;
    const started = all.filter((i) => i.status === "started").length;
    const failed = all.filter((i) => i.status === "failed").length;
    const byOs: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const i of all) {
      byOs[i.os] = (byOs[i.os] ?? 0) + 1;
      bySource[i.source] = (bySource[i.source] ?? 0) + 1;
    }
    return { total, complete, started, failed, byOs, bySource };
  },
});

/** Get installs for a specific wallet address. */
export const byWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("installs")
      .filter((q) => q.eq(q.field("walletAddress"), args.walletAddress))
      .order("desc")
      .take(20);
  },
});
