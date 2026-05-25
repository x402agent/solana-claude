import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const roleValidator = v.union(
  v.literal('system'),
  v.literal('user'),
  v.literal('assistant'),
  v.literal('tool'),
);

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

export default defineSchema({
  automationConfigs: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_agentSlug_updatedAt', ['agentSlug', 'updatedAt']),

  conversationThreads: defineTable({
    agentSlug: v.string(),
    sessionKey: v.string(),
    walletPubkey: v.string(),
    model: v.string(),
    provider: v.string(),
    dryRun: v.boolean(),
    status: runStatusValidator,
    startedAt: v.number(),
    lastTickAt: v.number(),
    endedAt: v.optional(v.number()),
    currentRound: v.optional(v.number()),
    configSnapshotJson: v.optional(v.string()),
  })
    .index('by_sessionKey', ['sessionKey'])
    .index('by_agentSlug_startedAt', ['agentSlug', 'startedAt']),

  conversationMessages: defineTable({
    threadId: v.id('conversationThreads'),
    sessionKey: v.string(),
    tick: v.optional(v.number()),
    role: roleValidator,
    content: v.string(),
    toolName: v.optional(v.string()),
    toolCallId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_threadId_createdAt', ['threadId', 'createdAt'])
    .index('by_sessionKey_createdAt', ['sessionKey', 'createdAt']),

  oreAutomationRuns: defineTable({
    agentSlug: v.string(),
    sessionKey: v.string(),
    threadId: v.id('conversationThreads'),
    walletPubkey: v.string(),
    rpcUrl: v.string(),
    wsEndpoint: v.optional(v.string()),
    dashboardUrl: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    dryRun: v.boolean(),
    status: runStatusValidator,
    startedAt: v.number(),
    lastHeartbeatAt: v.number(),
    endedAt: v.optional(v.number()),
    latestTick: v.optional(v.number()),
    latestRound: v.optional(v.number()),
    lastAction: v.optional(v.string()),
    lastError: v.optional(v.string()),
  })
    .index('by_sessionKey', ['sessionKey'])
    .index('by_agentSlug_startedAt', ['agentSlug', 'startedAt'])
    .index('by_status_startedAt', ['status', 'startedAt']),

  oreTickEvents: defineTable({
    runId: v.id('oreAutomationRuns'),
    threadId: v.id('conversationThreads'),
    sessionKey: v.string(),
    tick: v.number(),
    timestamp: v.number(),
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
  })
    .index('by_runId_tick', ['runId', 'tick'])
    .index('by_sessionKey_tick', ['sessionKey', 'tick']),

  oreBoardSnapshots: defineTable({
    runId: v.id('oreAutomationRuns'),
    threadId: v.id('conversationThreads'),
    sessionKey: v.string(),
    tick: v.number(),
    round: v.number(),
    settled: v.boolean(),
    winningSquare: v.optional(v.number()),
    dashboardStateJson: v.string(),
    squaresJson: v.string(),
    createdAt: v.number(),
  }).index('by_runId_tick', ['runId', 'tick']),
});
