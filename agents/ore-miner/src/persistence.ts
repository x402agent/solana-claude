import { randomUUID } from 'node:crypto';

import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

import type { OodaTick } from './agent.js';
import type { DashboardState } from './server.js';

export interface ConvexRecorderStartArgs {
  agentSlug: string;
  walletPubkey: string;
  rpcUrl: string;
  wsEndpoint?: string;
  dashboardUrl?: string;
  model: string;
  provider: string;
  dryRun: boolean;
  maxDeployPerRound: number;
  minReserve: number;
  tickIntervalMs: number;
  systemPrompt: string;
}

export interface ConvexRecorderTickArgs {
  tick: OodaTick;
  loopPhase: DashboardState['loop'];
  userMessage: string;
  dashboardState: DashboardState;
  summary: string;
}

interface RunHandles {
  runId: string;
  threadId: string;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({ serializationError: String(error) });
  }
}

function buildAssistantMessage(tick: OodaTick): string {
  if (tick.tool) {
    return [
      `Action: ${tick.action}`,
      `Tool: ${tick.tool}`,
      `Input: ${safeStringify(tick.input)}`,
      tick.reasoning ? `Reasoning: ${tick.reasoning}` : null,
    ].filter(Boolean).join('\n');
  }

  return [
    `Action: ${tick.action}`,
    `Output: ${typeof tick.output === 'string' ? tick.output : safeStringify(tick.output)}`,
    tick.reasoning ? `Reasoning: ${tick.reasoning}` : null,
  ].filter(Boolean).join('\n');
}

export class ConvexOreRecorder {
  private readonly client: ConvexHttpClient | null;
  private readonly sessionKey: string;
  private handles: RunHandles | null = null;
  private disabled = false;

  constructor(private readonly convexUrl: string | null) {
    this.client = convexUrl ? new ConvexHttpClient(convexUrl, { logger: false }) : null;
    this.sessionKey = `ore-miner-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  get enabled(): boolean {
    return !!this.client && !this.disabled;
  }

  get currentSessionKey(): string {
    return this.sessionKey;
  }

  async start(args: ConvexRecorderStartArgs): Promise<void> {
    if (!this.client || this.disabled) return;

    try {
      await this.client.mutation(anyApi.oreMining.upsertAutomationConfig, {
        agentSlug: args.agentSlug,
        name: 'CLAWD ORE Mining Agent',
        walletPubkey: args.walletPubkey,
        rpcUrl: args.rpcUrl,
        wsEndpoint: args.wsEndpoint,
        dashboardUrl: args.dashboardUrl,
        convexUrl: this.convexUrl ?? undefined,
        model: args.model,
        provider: args.provider,
        dryRunDefault: args.dryRun,
        maxDeployPerRound: args.maxDeployPerRound,
        minReserve: args.minReserve,
        tickIntervalMs: args.tickIntervalMs,
        enabled: true,
        autoStart: true,
        notes: 'Managed by agents/ore-miner runtime',
      });

      this.handles = await this.client.mutation(anyApi.oreMining.startRun, {
        agentSlug: args.agentSlug,
        sessionKey: this.sessionKey,
        walletPubkey: args.walletPubkey,
        rpcUrl: args.rpcUrl,
        wsEndpoint: args.wsEndpoint,
        dashboardUrl: args.dashboardUrl,
        model: args.model,
        provider: args.provider,
        dryRun: args.dryRun,
        systemPrompt: args.systemPrompt,
        configSnapshotJson: safeStringify({
          agentSlug: args.agentSlug,
          model: args.model,
          provider: args.provider,
          dryRun: args.dryRun,
          rpcUrl: args.rpcUrl,
          wsEndpoint: args.wsEndpoint ?? null,
          dashboardUrl: args.dashboardUrl ?? null,
          maxDeployPerRound: args.maxDeployPerRound,
          minReserve: args.minReserve,
          tickIntervalMs: args.tickIntervalMs,
        }),
      });
    } catch (error) {
      this.disable(error);
    }
  }

  async recordTick(args: ConvexRecorderTickArgs): Promise<void> {
    if (!this.client || this.disabled || !this.handles) return;

    try {
      const wallet = args.dashboardState.wallet;
      await this.client.mutation(anyApi.oreMining.recordTick, {
        runId: this.handles.runId,
        threadId: this.handles.threadId,
        agentSlug: 'ore-miner',
        sessionKey: this.sessionKey,
        tick: args.tick.tick,
        isoTimestamp: args.tick.timestamp,
        loopPhase: args.loopPhase,
        round: args.dashboardState.round,
        miningOpen: args.dashboardState.miningOpen,
        miningSecondsRemaining: args.dashboardState.miningSecondsRemaining,
        claimHoursRemaining: args.dashboardState.claimHoursRemaining,
        totalDeployed: args.dashboardState.totalDeployed,
        totalMiners: args.dashboardState.totalMiners,
        motherlode: args.dashboardState.motherlode,
        settled: args.dashboardState.settled,
        winningSquare: args.dashboardState.winningSquare ?? undefined,
        walletBalanceSol: wallet?.balanceSol ?? '0',
        rewardsSol: wallet?.rewardsSol ?? '0',
        rewardsOre: wallet?.rewardsOre ?? '0',
        checkpointNeeded: wallet?.checkpointNeeded ?? false,
        agentAction: args.tick.action,
        tool: args.tick.tool ?? undefined,
        success: args.tick.success,
        reasoning: args.tick.reasoning,
        inputJson: safeStringify(args.tick.input),
        outputJson: safeStringify(args.tick.output),
        summary: args.summary,
        userMessage: args.userMessage,
        assistantMessage: buildAssistantMessage(args.tick),
        toolMessage: args.tick.tool ? safeStringify(args.tick.output) : undefined,
        dashboardStateJson: safeStringify(args.dashboardState),
        squaresJson: safeStringify(args.dashboardState.squares),
      });
    } catch (error) {
      this.disable(error);
    }
  }

  async finish(status: 'stopped' | 'error', lastError?: string): Promise<void> {
    if (!this.client || this.disabled || !this.handles) return;

    try {
      await this.client.mutation(anyApi.oreMining.finishRun, {
        runId: this.handles.runId,
        threadId: this.handles.threadId,
        status,
        lastError,
      });
    } catch (error) {
      this.disable(error);
    }
  }

  private disable(error: unknown): void {
    this.disabled = true;
    console.warn(`[convex] disabled after error: ${String(error)}`);
  }
}

export function createConvexOreRecorder(): ConvexOreRecorder {
  return new ConvexOreRecorder(process.env.CONVEX_URL ?? null);
}
