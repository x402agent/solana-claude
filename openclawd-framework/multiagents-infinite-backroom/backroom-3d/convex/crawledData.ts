import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { v } from 'convex/values'

// ── Write ──────────────────────────────────────────────────────────────────

export const upsertCrawlJob = internalMutation({
  args: {
    jobId: v.string(),
    url: v.string(),
    status: v.string(),
    pagesCompleted: v.number(),
    pagesTotal: v.optional(v.number()),
    creditsUsed: v.optional(v.number()),
    injectedChars: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('crawlJobs')
      .withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        pagesCompleted: args.pagesCompleted,
        pagesTotal: args.pagesTotal,
        creditsUsed: args.creditsUsed,
        injectedChars: args.injectedChars,
        completedAt: args.completedAt,
      })
      return existing._id
    }
    return ctx.db.insert('crawlJobs', {
      ...args,
      startedAt: Date.now(),
    })
  },
})

export const insertCrawledPage = internalMutation({
  args: {
    jobId: v.string(),
    url: v.string(),
    title: v.optional(v.string()),
    markdown: v.string(),
    sourceUrl: v.string(),
    crawlSource: v.string(),
    statusCode: v.optional(v.number()),
    injectedIntoAgents: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('crawledPages', { ...args, timestamp: Date.now() })
  },
})

// Public mutation so the FastAPI server can call it via HTTP action wrapper
export const storeCrawlResults = mutation({
  args: {
    jobId: v.string(),
    url: v.string(),
    crawlSource: v.string(),
    status: v.string(),
    pagesCompleted: v.number(),
    creditsUsed: v.optional(v.number()),
    injectedChars: v.optional(v.number()),
    pages: v.array(v.object({
      sourceUrl: v.string(),
      title: v.optional(v.string()),
      markdown: v.string(),
      statusCode: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('crawlJobs', {
      jobId: args.jobId,
      url: args.url,
      status: args.status,
      pagesCompleted: args.pagesCompleted,
      creditsUsed: args.creditsUsed,
      injectedChars: args.injectedChars,
      startedAt: Date.now(),
      completedAt: Date.now(),
    })
    let stored = 0
    for (const page of args.pages) {
      if (!page.markdown?.trim()) continue
      await ctx.db.insert('crawledPages', {
        jobId: args.jobId,
        url: page.sourceUrl,
        title: page.title,
        markdown: page.markdown.slice(0, 50000),
        sourceUrl: page.sourceUrl,
        crawlSource: args.crawlSource,
        statusCode: page.statusCode,
        injectedIntoAgents: (args.injectedChars ?? 0) > 0,
        timestamp: Date.now(),
      })
      stored++
    }
    return { stored, jobId: args.jobId }
  },
})

// ── Read ───────────────────────────────────────────────────────────────────

export const getRecentCrawlJobs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query('crawlJobs')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit ?? 20)
  },
})

export const getCrawledPagesByJob = query({
  args: { jobId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query('crawledPages')
      .withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
      .order('desc')
      .take(args.limit ?? 100)
  },
})

export const getRecentCrawledPages = query({
  args: {
    limit: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.source) {
      return ctx.db
        .query('crawledPages')
        .withIndex('by_source', (q) => q.eq('crawlSource', args.source!))
        .order('desc')
        .take(args.limit ?? 50)
    }
    return ctx.db
      .query('crawledPages')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit ?? 50)
  },
})

export const getCrawledPagesInternal = internalQuery({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('crawledPages')
      .withIndex('by_jobId', (q) => q.eq('jobId', args.jobId))
      .collect()
  },
})
