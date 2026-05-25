import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const runStatusValidator = v.union(
  v.literal('starting'),
  v.literal('running'),
  v.literal('stopped'),
  v.literal('error'),
);

const loopPhaseValidator = v.union(
  v.literal('observe'),
  v.literal('orient'),
  v.literal('decide'),
  v.literal('act'),
  v.literal('idle'),
);

function jsonResponse(data: unknown): string {
  return JSON.stringify(data);
}

export const upsertAutomationConfig = mutation({
  args: {
    agentSlug: v.string(),
    name: v.string(),
    walletPubkey: v.optional(v.string()),
    rpcUrl: v.string(),
    wsEndpoint: v.optional(v.string()),
    dashboardUrl: v.optional(v.string()),
    convexUrl: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    dryRunDefault: v.boolean(),
    maxDeployPerRound: v.number(),
    minReserve: v.number(),
    tickIntervalMs: v.number(),
    enabled: v.boolean(),
    autoStart: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('automationConfigs')
      .withIndex('by_agentSlug_updatedAt', q => q.eq('agentSlug', args.agentSlug))
      .order('desc')
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('automationConfigs', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getAutomationConfig = query({
  args: {
    agentSlug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('automationConfigs')
      .withIndex('by_agentSlug_updatedAt', q => q.eq('agentSlug', args.agentSlug))
      .order('desc')
      .first();
  },
});

export const startRun = mutation({
  args: {
    agentSlug: v.string(),
    sessionKey: v.string(),
    walletPubkey: v.string(),
    rpcUrl: v.string(),
    wsEndpoint: v.optional(v.string()),
    dashboardUrl: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    dryRun: v.boolean(),
    systemPrompt: v.string(),
    configSnapshotJson: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const threadId = await ctx.db.insert('conversationThreads', {
      agentSlug: args.agentSlug,
      sessionKey: args.sessionKey,
      walletPubkey: args.walletPubkey,
      model: args.model,
      provider: args.provider,
      dryRun: args.dryRun,
      status: 'starting',
      startedAt: now,
      lastTickAt: now,
      configSnapshotJson: args.configSnapshotJson,
    });

    await ctx.db.insert('conversationMessages', {
      threadId,
      sessionKey: args.sessionKey,
      role: 'system',
      content: args.systemPrompt,
      createdAt: now,
    });

    const runId = await ctx.db.insert('oreAutomationRuns', {
      agentSlug: args.agentSlug,
      sessionKey: args.sessionKey,
      threadId,
      walletPubkey: args.walletPubkey,
      rpcUrl: args.rpcUrl,
      wsEndpoint: args.wsEndpoint,
      dashboardUrl: args.dashboardUrl,
      model: args.model,
      provider: args.provider,
      dryRun: args.dryRun,
      status: 'starting',
      startedAt: now,
      lastHeartbeatAt: now,
    });

    return { runId, threadId };
  },
});

export const recordTick = mutation({
  args: {
    runId: v.id('oreAutomationRuns'),
    threadId: v.id('conversationThreads'),
    agentSlug: v.string(),
    sessionKey: v.string(),
    tick: v.number(),
    isoTimestamp: v.string(),
    loopPhase: loopPhaseValidator,
    round: v.number(),
    miningOpen: v.boolean(),
    miningSecondsRemaining: v.number(),
    claimHoursRemaining: v.number(),
    totalDeployed: v.string(),
    totalMiners: v.number(),
    motherlode: v.string(),
    settled: v.boolean(),
    winningSquare: v.optional(v.number()),
    walletBalanceSol: v.string(),
    rewardsSol: v.string(),
    rewardsOre: v.string(),
    checkpointNeeded: v.boolean(),
    agentAction: v.string(),
    tool: v.optional(v.string()),
    success: v.boolean(),
    reasoning: v.optional(v.string()),
    inputJson: v.string(),
    outputJson: v.string(),
    summary: v.string(),
    userMessage: v.string(),
    assistantMessage: v.string(),
    toolMessage: v.optional(v.string()),
    dashboardStateJson: v.string(),
    squaresJson: v.string(),
  },
  handler: async (ctx, args) => {
    const existingTick = await ctx.db
      .query('oreTickEvents')
      .withIndex('by_sessionKey_tick', q =>
        q.eq('sessionKey', args.sessionKey).eq('tick', args.tick),
      )
      .first();

    if (existingTick) {
      return { tickId: existingTick._id, deduped: true };
    }

    const now = Date.now();

    await ctx.db.patch(args.threadId, {
      status: 'running',
      lastTickAt: now,
      currentRound: args.round,
    });

    await ctx.db.patch(args.runId, {
      status: 'running',
      lastHeartbeatAt: now,
      latestTick: args.tick,
      latestRound: args.round,
      lastAction: args.agentAction,
      lastError: args.success ? undefined : args.outputJson.slice(0, 1024),
    });

    const tickId = await ctx.db.insert('oreTickEvents', {
      runId: args.runId,
      threadId: args.threadId,
      sessionKey: args.sessionKey,
      tick: args.tick,
      timestamp: now,
      isoTimestamp: args.isoTimestamp,
      loopPhase: args.loopPhase,
      round: args.round,
      miningOpen: args.miningOpen,
      miningSecondsRemaining: args.miningSecondsRemaining,
      claimHoursRemaining: args.claimHoursRemaining,
      totalDeployed: args.totalDeployed,
      totalMiners: args.totalMiners,
      motherlode: args.motherlode,
      settled: args.settled,
      winningSquare: args.winningSquare,
      walletBalanceSol: args.walletBalanceSol,
      rewardsSol: args.rewardsSol,
      rewardsOre: args.rewardsOre,
      checkpointNeeded: args.checkpointNeeded,
      agentAction: args.agentAction,
      tool: args.tool,
      success: args.success,
      reasoning: args.reasoning,
      inputJson: args.inputJson,
      outputJson: args.outputJson,
      summary: args.summary,
    });

    await ctx.db.insert('oreBoardSnapshots', {
      runId: args.runId,
      threadId: args.threadId,
      sessionKey: args.sessionKey,
      tick: args.tick,
      round: args.round,
      settled: args.settled,
      winningSquare: args.winningSquare,
      dashboardStateJson: args.dashboardStateJson,
      squaresJson: args.squaresJson,
      createdAt: now,
    });

    await ctx.db.insert('conversationMessages', {
      threadId: args.threadId,
      sessionKey: args.sessionKey,
      tick: args.tick,
      role: 'user',
      content: args.userMessage,
      createdAt: now,
    });

    await ctx.db.insert('conversationMessages', {
      threadId: args.threadId,
      sessionKey: args.sessionKey,
      tick: args.tick,
      role: 'assistant',
      content: args.assistantMessage,
      toolName: args.tool,
      createdAt: now + 1,
    });

    if (args.toolMessage) {
      await ctx.db.insert('conversationMessages', {
        threadId: args.threadId,
        sessionKey: args.sessionKey,
        tick: args.tick,
        role: 'tool',
        content: args.toolMessage,
        toolName: args.tool,
        createdAt: now + 2,
      });
    }

    return { tickId, deduped: false };
  },
});

export const finishRun = mutation({
  args: {
    runId: v.id('oreAutomationRuns'),
    threadId: v.id('conversationThreads'),
    status: runStatusValidator,
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.threadId, {
      status: args.status,
      endedAt: now,
      lastTickAt: now,
    });
    await ctx.db.patch(args.runId, {
      status: args.status,
      endedAt: now,
      lastHeartbeatAt: now,
      lastError: args.lastError,
    });
    return { ok: true };
  },
});

export const getLatestRunSnapshot = query({
  args: {
    agentSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query('oreAutomationRuns')
      .withIndex('by_agentSlug_startedAt', q => q.eq('agentSlug', args.agentSlug))
      .order('desc')
      .first();

    if (!run) return null;

    const latestTick = await ctx.db
      .query('oreTickEvents')
      .withIndex('by_runId_tick', q => q.eq('runId', run._id))
      .order('desc')
      .first();

    const latestBoardSnapshot = await ctx.db
      .query('oreBoardSnapshots')
      .withIndex('by_runId_tick', q => q.eq('runId', run._id))
      .order('desc')
      .first();

    return {
      run,
      latestTick,
      latestBoardSnapshot,
    };
  },
});

export const listRecentRuns = query({
  args: {
    agentSlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
    return await ctx.db
      .query('oreAutomationRuns')
      .withIndex('by_agentSlug_startedAt', q => q.eq('agentSlug', args.agentSlug))
      .order('desc')
      .take(limit);
  },
});

export const getConversationThread = query({
  args: {
    sessionKey: v.optional(v.string()),
    threadId: v.optional(v.id('conversationThreads')),
  },
  handler: async (ctx, args) => {
    const thread = args.threadId
      ? await ctx.db.get(args.threadId)
      : args.sessionKey
      ? await ctx.db
          .query('conversationThreads')
          .withIndex('by_sessionKey', q => q.eq('sessionKey', args.sessionKey!))
          .first()
      : null;

    if (!thread) return null;

    const messages = await ctx.db
      .query('conversationMessages')
      .withIndex('by_threadId_createdAt', q => q.eq('threadId', thread._id))
      .collect();

    return { thread, messages };
  },
});

export const getRunTimeline = query({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query('oreAutomationRuns')
      .withIndex('by_sessionKey', q => q.eq('sessionKey', args.sessionKey))
      .first();

    if (!run) return null;

    const ticks = await ctx.db
      .query('oreTickEvents')
      .withIndex('by_runId_tick', q => q.eq('runId', run._id))
      .collect();

    const snapshots = await ctx.db
      .query('oreBoardSnapshots')
      .withIndex('by_runId_tick', q => q.eq('runId', run._id))
      .collect();

    return {
      run,
      ticks,
      snapshots,
      summaryJson: jsonResponse({
        tickCount: ticks.length,
        latestAction: run.lastAction ?? null,
        latestRound: run.latestRound ?? null,
      }),
    };
  },
});
