/**
 * SolanaOS Multi-Agent Coordinator
 *
 * Adapted from Claude Code's src/coordinator/coordinatorMode.ts + AgentTool/runAgent.ts
 *
 * The coordinator orchestrates a fleet of async workers to execute SolanaOS tasks
 * in parallel: research agents, trading agents, memory agents, skill agents.
 *
 * Key concepts taken from Claude Code:
 *  - Coordinator spawns workers, they report back via task-notification XML
 *  - Parallelism is the superpower — independent tasks fan out concurrently
 *  - Synthesize before delegating — coordinator understands findings before directing follow-up
 *  - Continue vs spawn: reuse worker context when overlap is high
 *
 * SolanaOS extensions:
 *  - OODA phase tracking (Observe → Orient → Decide → Act)
 *  - SOUL.md epistemological tiers (KNOWN/LEARNED/INFERRED) in coordinator context
 *  - Risk gate: trade workers require simMode check before KNOWN action
 */

import { EventEmitter } from "events";
import { ToolContext, ToolRegistry, getToolRegistry } from "../engine/tool-base.js";
import { ToolExecutor, LLMToolCall } from "../engine/tool-executor.js";

// ─────────────────────────────────────────────────────────────────────────────
// Task Notification (matches Claude Code's <task-notification> XML protocol)
// ─────────────────────────────────────────────────────────────────────────────

export type WorkerStatus = "running" | "completed" | "failed" | "killed" | "stopped";

export interface TaskNotification {
  taskId: string;
  status: WorkerStatus;
  summary: string;
  result?: string;
  usage?: {
    totalTokens: number;
    toolUses: number;
    durationMs: number;
  };
}

export function parseTaskNotification(xml: string): TaskNotification | null {
  const taskId = xml.match(/<task-id>(.*?)<\/task-id>/s)?.[1]?.trim();
  const status = xml.match(/<status>(.*?)<\/status>/s)?.[1]?.trim() as WorkerStatus;
  const summary = xml.match(/<summary>(.*?)<\/summary>/s)?.[1]?.trim();
  const result = xml.match(/<result>(.*?)<\/result>/s)?.[1]?.trim();
  const totalTokens = parseInt(xml.match(/<total_tokens>(\d+)<\/total_tokens>/)?.[1] ?? "0");
  const toolUses = parseInt(xml.match(/<tool_uses>(\d+)<\/tool_uses>/)?.[1] ?? "0");
  const durationMs = parseInt(xml.match(/<duration_ms>(\d+)<\/duration_ms>/)?.[1] ?? "0");

  if (!taskId || !status || !summary) return null;

  return {
    taskId,
    status,
    summary,
    result,
    usage: totalTokens || toolUses ? { totalTokens, toolUses, durationMs } : undefined,
  };
}

export function buildTaskNotification(n: TaskNotification): string {
  const usageXml = n.usage
    ? `<usage>\n  <total_tokens>${n.usage.totalTokens}</total_tokens>\n  <tool_uses>${n.usage.toolUses}</tool_uses>\n  <duration_ms>${n.usage.durationMs}</duration_ms>\n</usage>`
    : "";
  return `<task-notification>
<task-id>${n.taskId}</task-id>
<status>${n.status}</status>
<summary>${n.summary}</summary>
${n.result ? `<result>${n.result}</result>` : ""}
${usageXml}
</task-notification>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────────────────────────────────────

export type WorkerType =
  | "research"    // read-only data gathering (Birdeye, SolanaTracker, on-chain)
  | "trade"       // trading execution (spot, perps)
  | "memory"      // memory read/write (Honcho, vault)
  | "skill"       // SKILL.md execution
  | "scanner"     // pump scanner, token discovery
  | "computer"    // computer/browser use
  | "general";    // uncategorized

export interface WorkerSpawnConfig {
  description: string;
  type: WorkerType;
  prompt: string;
  /** Tools the worker is allowed to use (if empty = all registry tools for its type) */
  allowedTools?: string[];
  /** Max tokens for the worker's LLM context */
  maxTokens?: number;
  /** Timeout for the whole worker in ms */
  timeoutMs?: number;
}

export interface Worker {
  id: string;
  description: string;
  type: WorkerType;
  status: WorkerStatus;
  prompt: string;
  allowedTools: string[];
  spawnedAt: Date;
  completedAt?: Date;
  result?: string;
  error?: string;
  durationMs?: number;
  totalTokens?: number;
  toolUses?: number;
  /** Message queue for SendMessage continuations */
  messageQueue: string[];
  abortController: AbortController;
}

// ─────────────────────────────────────────────────────────────────────────────
// OODA Phase tracking (SolanaOS extension)
// ─────────────────────────────────────────────────────────────────────────────

export type OODAPhase = "observe" | "orient" | "decide" | "act" | "idle";

// ─────────────────────────────────────────────────────────────────────────────
// Coordinator System Prompt (adapted from Claude Code's getCoordinatorSystemPrompt)
// ─────────────────────────────────────────────────────────────────────────────

export function getSolanaOSCoordinatorPrompt(opts: {
  workerTools: string[];
  simMode: boolean;
  soulContext?: string;
  oodaPhase?: OODAPhase;
}): string {
  const { workerTools, simMode, soulContext, oodaPhase } = opts;
  const toolList = workerTools.join(", ");
  const tradeWarning = simMode
    ? "⚠️  SIM MODE ACTIVE — all trade actions are simulated, no real funds at risk."
    : "🔴 LIVE MODE — trade actions execute on-chain with real funds.";

  return `You are SolanaOS, an autonomous Solana trading and operator runtime coordinating a fleet of specialized workers.

${tradeWarning}

## 1. Your Role

You are the **coordinator**. Your job is to:
- Help the operator achieve their goal across Solana markets, memory, and automation
- Direct workers to research, execute, and verify across parallel tasks
- Synthesize results before directing follow-up — never delegate understanding
- Apply SOUL.md epistemological rigor: distinguish KNOWN (fresh API data), LEARNED (pattern from outcomes), INFERRED (cross-asset reasoning)
- Enforce risk gates: never authorize trade workers without checking KNOWN price/liquidity data first

${soulContext ? `## Operator Context\n\n${soulContext}\n` : ""}
## 2. Your Tools

- **agent.spawn** — Spawn a new worker
- **agent.message** — Continue an existing worker (send follow-up to its ID)
- **agent.stop** — Stop a running worker
- **coordinator.oodaPhase** — Advance the OODA phase (observe → orient → decide → act)

When spawning via agent.spawn:
- Research workers run in parallel freely (read-only, no state risk)
- Trade workers run ONE AT A TIME — never parallel trade execution
- Memory workers can run alongside research workers
- After launching workers, briefly tell the operator what you launched and end your response

## 3. Workers

Workers have access to these tools: ${toolList}

Worker types and their constraints:
| Type | Parallelism | Risk | Examples |
|------|-------------|------|---------|
| research | Unlimited parallel | None | birdeye, solanatracker, on-chain |
| memory | Alongside research | None | honcho recall, vault search |
| skill | One per skill | Depends on skill | SKILL.md execution |
| trade | Serial only | LIVE/SIM gated | spot buy/sell, HL perps, Aster |
| scanner | One at a time | None | pump scanner, token discovery |
| computer | One at a time | Ask user | page agent, computer use |

## 4. OODA Workflow

${oodaPhase ? `**Current phase: ${oodaPhase.toUpperCase()}**\n\n` : ""}

| Phase | Workers | Purpose |
|-------|---------|---------|
| **Observe** | Research (parallel) | Gather KNOWN data — prices, on-chain state, memory |
| **Orient** | You (coordinator) | Synthesize into INFERRED signals, orient strategy |
| **Decide** | You + memory | Apply LEARNED patterns, form trading decision |
| **Act** | Trade (serial) | Execute — one trade at a time, verify after each |

## 5. Risk Protocol

Before any trade worker:
1. Confirm KNOWN price/liquidity is fresh (< 60s)
2. Check LEARNED patterns for this token/pattern (ask memory worker if needed)
3. Confirm sim vs live mode explicitly
4. Specify exact amount, token, venue — no ambiguity

Workers report back via <task-notification> XML. Summarize new findings for the operator as they arrive. Never fabricate or predict worker results.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Tool Allowlists by type
// ─────────────────────────────────────────────────────────────────────────────

export const WORKER_TOOL_ALLOWLISTS: Record<WorkerType, string[]> = {
  research: [
    "solana.price",
    "solana.token_overview",
    "solana.trending",
    "solana.wallet_pnl",
    "solana.ohlcv",
    "solana.security",
    "memory.recall",
    "memory.search",
    "web.search",
    "web.fetch",
  ],
  trade: [
    "trading.buy",
    "trading.sell",
    "trading.swap",
    "trading.hl_open",
    "trading.hl_close",
    "trading.aster_open",
    "trading.aster_close",
    "solana.price",        // for pre-trade validation
    "memory.recall",       // for LEARNED patterns
  ],
  memory: [
    "memory.recall",
    "memory.search",
    "memory.write",
    "memory.forget",
    "memory.dream",
    "memory.profile",
  ],
  skill: [], // populated at skill load time
  scanner: [
    "solana.trending",
    "solana.new_listings",
    "solana.pump_scan",
    "web.fetch",
  ],
  computer: [
    "browser.navigate",
    "browser.click",
    "browser.extract",
    "computer.shell",
    "computer.read_file",
  ],
  general: [], // all tools
};

// ─────────────────────────────────────────────────────────────────────────────
// Coordinator
// ─────────────────────────────────────────────────────────────────────────────

let workerIdCounter = 0;

function generateWorkerId(): string {
  return `worker-${Date.now().toString(36)}-${(workerIdCounter++).toString(36)}`;
}

export class Coordinator extends EventEmitter {
  private workers = new Map<string, Worker>();
  private executor: ToolExecutor;
  private registry: ToolRegistry;
  private baseCtx: ToolContext;
  private oodaPhase: OODAPhase = "idle";

  constructor(
    baseCtx: ToolContext,
    executor: ToolExecutor,
    registry?: ToolRegistry,
  ) {
    super();
    this.baseCtx = baseCtx;
    this.executor = executor;
    this.registry = registry ?? getToolRegistry();
  }

  // ── Worker management ──────────────────────────────────────────────────────

  spawnWorker(config: WorkerSpawnConfig): Worker {
    const id = generateWorkerId();
    const allowedTools =
      config.allowedTools ??
      WORKER_TOOL_ALLOWLISTS[config.type] ??
      this.registry.all().map((t) => t.name);

    const worker: Worker = {
      id,
      description: config.description,
      type: config.type,
      status: "running",
      prompt: config.prompt,
      allowedTools,
      spawnedAt: new Date(),
      messageQueue: [],
      abortController: new AbortController(),
    };

    this.workers.set(id, worker);
    this.emit("worker:spawned", worker);

    // Start execution asynchronously
    this.runWorker(worker, config).catch((e) => {
      worker.status = "failed";
      worker.error = String(e);
      this.emit("worker:notification", {
        taskId: id,
        status: "failed" as WorkerStatus,
        summary: `Worker "${config.description}" failed: ${e}`,
      } satisfies TaskNotification);
    });

    return worker;
  }

  sendMessage(workerId: string, message: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker || worker.status !== "running") return false;
    worker.messageQueue.push(message);
    this.emit("worker:message_queued", { workerId, message });
    return true;
  }

  stopWorker(workerId: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;
    worker.abortController.abort("Stopped by coordinator");
    worker.status = "stopped";
    worker.completedAt = new Date();
    this.emit("worker:stopped", worker);
    return true;
  }

  getWorker(id: string): Worker | undefined {
    return this.workers.get(id);
  }

  listWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  listActiveWorkers(): Worker[] {
    return this.listWorkers().filter((w) => w.status === "running");
  }

  // ── OODA phase ─────────────────────────────────────────────────────────────

  advancePhase(phase: OODAPhase): void {
    this.oodaPhase = phase;
    this.emit("ooda:phase", phase);
  }

  getCurrentPhase(): OODAPhase {
    return this.oodaPhase;
  }

  // ── Coordinator context (for LLM injection) ────────────────────────────────

  getCoordinatorContext(soulMd?: string): string {
    const workerTools = Array.from(
      new Set(Object.values(WORKER_TOOL_ALLOWLISTS).flat()),
    ).sort();

    return getSolanaOSCoordinatorPrompt({
      workerTools,
      simMode: this.baseCtx.simMode,
      soulContext: soulMd,
      oodaPhase: this.oodaPhase,
    });
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async runWorker(worker: Worker, config: WorkerSpawnConfig): Promise<void> {
    const startMs = Date.now();
    let totalTokens = 0;
    let toolUses = 0;

    try {
      // Build the worker's tool context (scoped to allowed tools)
      const workerCtx: ToolContext = {
        ...this.baseCtx,
        coordinatorId: this.baseCtx.sessionId,
        signal: worker.abortController.signal,
      };

      // Simulate a single-shot LLM call for the worker
      // In production this would be a full query-engine loop
      // For now, emit the worker prompt as a tool call to an "agent.run" tool
      const result = await this.executor.execute(
        {
          id: `${worker.id}-init`,
          name: "agent.run",
          args: {
            prompt: config.prompt,
            allowedTools: worker.allowedTools,
            maxTokens: config.maxTokens ?? 4096,
          },
        } satisfies LLMToolCall,
        workerCtx,
      );

      const durationMs = Date.now() - startMs;

      // Check for continuation messages
      while (worker.messageQueue.length > 0 && !worker.abortController.signal.aborted) {
        const msg = worker.messageQueue.shift()!;
        const contResult = await this.executor.execute(
          {
            id: `${worker.id}-cont-${Date.now()}`,
            name: "agent.run",
            args: {
              prompt: msg,
              allowedTools: worker.allowedTools,
              continuationOf: worker.id,
            },
          } satisfies LLMToolCall,
          workerCtx,
        );
        totalTokens += contResult.tokenUsage?.input ?? 0 + (contResult.tokenUsage?.output ?? 0);
        toolUses++;
        // Update result if continuation succeeded
        if (contResult.status === "success") {
          worker.result = contResult.llmText;
        }
      }

      worker.status = result.status === "success" ? "completed" : "failed";
      worker.result = result.llmText;
      worker.error = result.error;
      worker.completedAt = new Date();
      worker.durationMs = durationMs;
      worker.totalTokens = totalTokens + (result.tokenUsage?.input ?? 0) + (result.tokenUsage?.output ?? 0);
      worker.toolUses = toolUses;

      const notification: TaskNotification = {
        taskId: worker.id,
        status: worker.status,
        summary: `Worker "${worker.description}" ${worker.status}`,
        result: worker.result,
        usage: {
          totalTokens: worker.totalTokens,
          toolUses: worker.toolUses,
          durationMs,
        },
      };

      this.emit("worker:notification", notification);
    } catch (e) {
      if (worker.abortController.signal.aborted) {
        worker.status = "killed";
        worker.completedAt = new Date();
        this.emit("worker:notification", {
          taskId: worker.id,
          status: "killed",
          summary: `Worker "${worker.description}" was stopped`,
        } satisfies TaskNotification);
      } else {
        throw e;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: parallel research fan-out
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spawn multiple research workers in parallel and wait for all to complete.
 * Adapted from the coordinator's "parallelism is your superpower" pattern.
 */
export async function fanOutResearch(
  coordinator: Coordinator,
  tasks: Array<{ description: string; prompt: string }>,
): Promise<Array<TaskNotification>> {
  const results: TaskNotification[] = [];

  const workers = tasks.map((task) =>
    coordinator.spawnWorker({
      description: task.description,
      type: "research",
      prompt: task.prompt,
    }),
  );

  return new Promise((resolve) => {
    const pending = new Set(workers.map((w) => w.id));

    coordinator.on("worker:notification", (n: TaskNotification) => {
      if (pending.has(n.taskId)) {
        results.push(n);
        pending.delete(n.taskId);
        if (pending.size === 0) resolve(results);
      }
    });
  });
}
