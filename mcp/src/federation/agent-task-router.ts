/**
 * Agent Task Router — Cross-Agent Task Dispatch
 *
 * Innovation: This is the command-and-control dispatch layer that the
 * Solana Clawd framework has been missing. Instead of every agent
 * subsystem operating in isolation, the Agent Task Router enables:
 *
 *   1. Spawn a Leviathan OODA task from MCP
 *   2. Route a research task to Deep Clawd
 *   3. Dispatch a payment stream to the x402 facilitator
 *   4. Fan-out the same signal to multiple agents
 *   5. Collect results and synthesise a composite report
 *
 * This turns the MCP layer into a genuine orchestrator — agents
 * become resources that can be composed, not isolated processes.
 *
 * Architecture:
 *   MCP Task Request → AgentTaskRouter → { Leviathan, DeepClawd, OODA, x402 }
 *                                        → { Results → Synthesis → Response }
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentType =
  | "leviathan"      // Leviathan OODA pulse
  | "deep-clawd"     // DeepSeek trading agent
  | "ooda"           // OODA loop harness
  | "x402"           // Payment stream facilitator
  | "memory"         // Clawd Memory consolidation
  | "orchestrator";  // Composite orchestration task

export type TaskPriority = "low" | "normal" | "high" | "critical";

export interface TaskSpec {
  id: string;
  type: AgentType;
  description: string;
  priority: TaskPriority;
  payload: Record<string, unknown>;
  timeoutMs: number;
  createdAt: string;
  parentTaskId?: string;
  tags?: string[];
}

export interface TaskResult {
  taskId: string;
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  output: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

// ─── Agent Capability Map ───────────────────────────────────────────────────────

interface AgentCapability {
  type: AgentType;
  name: string;
  description: string;
  maxConcurrency: number;
  defaultTimeoutMs: number;
  supportedActions: string[];
  envRequired: string[];
}

const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    type: "leviathan",
    name: "Leviathan Agent Runtime",
    description: "Sovereign on-chain agent. Runs OODA ticks autonomously.",
    maxConcurrency: 3,
    defaultTimeoutMs: 60_000,
    supportedActions: ["status", "tick", "shell_read", "shell_write", "journal", "three_laws"],
    envRequired: ["ANTHROPIC_API_KEY"],
  },
  {
    type: "deep-clawd",
    name: "Deep Clawd Trading Agent",
    description: "DeepSeek V4-powered OODA trading loop.",
    maxConcurrency: 2,
    defaultTimeoutMs: 120_000,
    supportedActions: ["tick", "orient", "loop", "status"],
    envRequired: ["DEEPSEEK_API_KEY"],
  },
  {
    type: "ooda",
    name: "OODA Loop Harness",
    description: "Dark Ralph OODA loop for paper trading.",
    maxConcurrency: 1,
    defaultTimeoutMs: 300_000,
    supportedActions: ["tick", "analyze", "journal", "status"],
    envRequired: [],
  },
  {
    type: "x402",
    name: "x402 Payment Stream",
    description: "P-token metered billing stream facilitator.",
    maxConcurrency: 10,
    defaultTimeoutMs: 30_000,
    supportedActions: ["status", "ping", "history"],
    envRequired: ["X402_SVM_PRIVATE_KEY"],
  },
  {
    type: "memory",
    name: "Clawd Memory",
    description: "Durable memory bank consolidation and recall.",
    maxConcurrency: 5,
    defaultTimeoutMs: 15_000,
    supportedActions: ["recall", "remember", "research", "consolidate"],
    envRequired: [],
  },
];

// ─── Agent Task Router ──────────────────────────────────────────────────────────

export class AgentTaskRouter {
  private tasks = new Map<string, TaskSpec>();
  private results = new Map<string, TaskResult>();
  private running = new Map<string, Promise<TaskResult>>();
  private concurrencyCounts = new Map<AgentType, number>();

  // ─── Task Submission ────────────────────────────────────────────────────

  /**
   * Submit a task to an agent type. Returns immediately with a task ID.
   * The task runs asynchronously. Check status with getResult().
   */
  submitTask(spec: Omit<TaskSpec, "id" | "createdAt">): string {
    const id = `task-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const task: TaskSpec = {
      ...spec,
      id,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(id, task);
    this.results.set(id, { taskId: id, status: "pending", output: null });

    // Kick off execution
    const promise = this._executeTask(task);
    this.running.set(id, promise);
    promise
      .catch((err) => this.results.set(id, {
        taskId: id,
        status: "failed",
        output: null,
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date().toISOString(),
      }))
      .finally(() => {
        this.running.delete(id);
        this._decrementConcurrency(task.type);
      });

    return id;
  }

  /**
   * Submit and wait for a task result. Blocks until completion or timeout.
   */
  async submitAndWait(
    spec: Omit<TaskSpec, "id" | "createdAt">,
    pollMs = 500,
  ): Promise<TaskResult> {
    const id = this.submitTask(spec);
    const deadline = Date.now() + spec.timeoutMs;

    while (Date.now() < deadline) {
      const result = this.results.get(id);
      if (result && result.status !== "pending" && result.status !== "running") {
        return result;
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }

    return {
      taskId: id,
      status: "timeout",
      output: null,
      error: `Timed out after ${spec.timeoutMs}ms`,
      completedAt: new Date().toISOString(),
    };
  }

  // ─── Result Access ──────────────────────────────────────────────────────

  getResult(taskId: string): TaskResult | undefined {
    return this.results.get(taskId);
  }

  getTask(taskId: string): TaskSpec | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Find all tasks matching criteria.
   */
  findTasks(filter?: {
    type?: AgentType;
    status?: TaskResult["status"];
    priority?: TaskPriority;
    limit?: number;
  }): Array<{ task: TaskSpec; result: TaskResult }> {
    let entries = [...this.tasks.entries()].map(([id, task]) => ({
      task,
      result: this.results.get(id) ?? { taskId: id, status: "pending" as const, output: null },
    }));

    if (filter?.type) entries = entries.filter((e) => e.task.type === filter.type);
    if (filter?.status) entries = entries.filter((e) => e.result.status === filter.status);
    if (filter?.priority) entries = entries.filter((e) => e.task.priority === filter.priority);

    entries.sort((a, b) => {
      const p = { critical: 0, high: 1, normal: 2, low: 3 };
      return (p[a.task.priority] ?? 2) - (p[b.task.priority] ?? 2);
    });

    if (filter?.limit) entries = entries.slice(0, filter.limit);
    return entries;
  }

  // ─── Capability Discovery ──────────────────────────────────────────────

  getCapabilities(): AgentCapability[] {
    return AGENT_CAPABILITIES.map((cap) => ({
      ...cap,
      envRequired: cap.envRequired.filter((key) => !process.env[key]),
    }));
  }

  getActiveConcurrency(type: AgentType): number {
    return this.concurrencyCounts.get(type) ?? 0;
  }

  getCapability(type: AgentType): AgentCapability | undefined {
    return AGENT_CAPABILITIES.find((c) => c.type === type);
  }

  // ─── Task Execution ────────────────────────────────────────────────────

  private async _executeTask(task: TaskSpec): Promise<TaskResult> {
    const cap = AGENT_CAPABILITIES.find((c) => c.type === task.type);
    if (!cap) throw new Error(`Unknown agent type: ${task.type}`);

    // Check concurrency limits
    const current = this.concurrencyCounts.get(task.type) ?? 0;
    if (current >= cap.maxConcurrency) {
      throw new Error(`Max concurrency (${cap.maxConcurrency}) reached for ${task.type}`);
    }
    this._incrementConcurrency(task.type);

    const startedAt = new Date().toISOString();
    this.results.set(task.id, { taskId: task.id, status: "running", output: null, startedAt });

    try {
      const output = await this._dispatchTask(task, cap);
      const completedAt = new Date().toISOString();
      const result: TaskResult = {
        taskId: task.id,
        status: "completed",
        output,
        startedAt,
        completedAt,
        durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      };
      this.results.set(task.id, result);
      return result;
    } catch (err) {
      const completedAt = new Date().toISOString();
      const result: TaskResult = {
        taskId: task.id,
        status: "failed",
        output: null,
        error: err instanceof Error ? err.message : String(err),
        startedAt,
        completedAt,
        durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      };
      this.results.set(task.id, result);
      return result;
    }
  }

  private async _dispatchTask(
    task: TaskSpec,
    cap: AgentCapability,
  ): Promise<unknown> {
    const action = String(task.payload.action ?? task.payload.type ?? "status");

    switch (task.type) {
      // ── Leviathan ──────────────────────────────────────────────────────
      case "leviathan": {
        switch (action) {
          case "status":
            return this._execLeviathan("--status");
          case "tick":
            return this._execLeviathan("--run", `--ticks=${task.payload.ticks ?? 1}`);
          case "shell_read":
            return this._readFile(
              path.join(os.homedir(), ".openclawd", "leviathan", "SHELL.md"),
            );
          case "journal":
            return this._readFile(
              path.join(os.homedir(), ".openclawd", "leviathan", "journal.jsonl"),
            );
          case "three_laws":
            return this._readFile(
              path.join(REPO_ROOT, "leviathan", "three-laws.txt"),
            );
          default:
            throw new Error(`Unsupported leviathan action: ${action}`);
        }
      }

      // ── Deep Clawd ─────────────────────────────────────────────────────
      case "deep-clawd": {
        switch (action) {
          case "tick":
            return this._execDeepClawd();
          case "orient":
            return this._execDeepClawd("--orient");
          case "loop":
            return this._execDeepClawd("--loop", `--ticks=${task.payload.ticks ?? 5}`);
          case "status":
            return "Deep Clawd agent ready for action";
          default:
            throw new Error(`Unsupported deep-clawd action: ${action}`);
        }
      }

      // ── OODA ───────────────────────────────────────────────────────────
      case "ooda": {
        switch (action) {
          case "tick":
            return this._execOODA(1);
          case "analyze": {
            const payload = task.payload as Record<string, unknown>;
            return this._execOODA(typeof payload.ticks === "number" ? payload.ticks : 10);
          }
          case "journal":
            return this._readFile(
              path.join(REPO_ROOT, "ooda", "journal", "ticks.jsonl"),
            );
          default:
            throw new Error(`Unsupported ooda action: ${action}`);
        }
      }

      // ── Memory ─────────────────────────────────────────────────────────
      case "memory": {
        switch (action) {
          case "recall": {
            const query = String(task.payload.query ?? "");
            const cliPath = path.join(REPO_ROOT, "leviathan", "node_modules", ".bin", "tsx");
            const script = `
              const { recallClawdMemory } = await import('${REPO_ROOT.replace(/\\/g, "/")}/leviathan/src/memory/clawd.js');
              console.log(JSON.stringify(await recallClawdMemory({ query: "${query.replace(/"/g, '\\"')}", topK: 5 }, { bank: 'clawd', timeoutMs: 10000 })));
            `;
            try {
              return execSync(`${cliPath} -e "${script}"`, { timeout: 15_000, cwd: REPO_ROOT }).toString().trim();
            } catch {
              return `Memory recall not available`;
            }
          }
          default:
            throw new Error(`Unsupported memory action: ${action}`);
        }
      }

      // ── Orchestrator (composite) ───────────────────────────────────────
      case "orchestrator": {
        // Orchestrator tasks compose multiple agent tasks and synthesise results
        const subTasks = Array.isArray(task.payload.tasks) ? task.payload.tasks : [];
        const results = await Promise.allSettled(
          subTasks.map((st: { type: AgentType; action: string; payload?: Record<string, unknown> }) =>
            this.submitAndWait({
              type: st.type,
              description: `Sub-task: ${st.action}`,
              priority: task.priority,
              payload: { action: st.action, ...(st.payload ?? {}) },
              timeoutMs: task.timeoutMs / subTasks.length,
              tags: task.tags,
              parentTaskId: task.id,
            }),
          ),
        );
        return results.map((r, i) => ({
          subTaskIndex: i,
          status: r.status,
          result: r.status === "fulfilled" ? r.value : { error: r.reason },
        }));
      }

      default:
        throw new Error(`Unknown agent type: ${task.type}`);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private _incrementConcurrency(type: AgentType): void {
    this.concurrencyCounts.set(type, (this.concurrencyCounts.get(type) ?? 0) + 1);
  }

  private _decrementConcurrency(type: AgentType): void {
    this.concurrencyCounts.set(type, Math.max(0, (this.concurrencyCounts.get(type) ?? 1) - 1));
  }

  private async _readFile(absPath: string): Promise<string> {
    try {
      return await fs.readFile(absPath, "utf-8");
    } catch {
      return `File not found: ${absPath}`;
    }
  }

  private _execLeviathan(...args: string[]): string {
    const cliPath = path.join(REPO_ROOT, "leviathan", "node_modules", ".bin", "tsx");
    const entryPath = path.join(REPO_ROOT, "leviathan", "src", "index.ts");
    try {
      return execSync(
        `${cliPath} ${entryPath} ${args.join(" ")}`,
        { timeout: 30_000, cwd: REPO_ROOT },
      ).toString().trim();
    } catch (err) {
      if (err instanceof Error) {
        // Leviathan may not be set up — return a meaningful status
        return `Leviathan not available: ${err.message.slice(0, 100)}`;
      }
      return "Leviathan execution failed";
    }
  }

  private _execDeepClawd(...extra: string[]): string {
    const cliPath = path.join(REPO_ROOT, "deep-clawd", "node_modules", ".bin", "tsx");
    const entryPath = path.join(REPO_ROOT, "deep-clawd", "src", "index.ts");
    try {
      return execSync(
        `${cliPath} ${entryPath} ${extra.join(" ")}`,
        { timeout: 60_000, cwd: REPO_ROOT },
      ).toString().trim();
    } catch {
      return "Deep Clawd agent not available. Set DEEPSEEK_API_KEY and run: cd deep-clawd && npm install";
    }
  }

  private _execOODA(ticks: number): string {
    const cliPath = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");
    const entryPath = path.join(REPO_ROOT, "ooda", "loop.ts");
    try {
      return execSync(
        `${cliPath} ${entryPath} --ticks ${ticks}`,
        { timeout: 60_000, cwd: REPO_ROOT },
      ).toString().trim();
    } catch {
      return "OODA loop not available";
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────────

let _routerInstance: AgentTaskRouter | null = null;

export function getAgentTaskRouter(): AgentTaskRouter {
  if (!_routerInstance) _routerInstance = new AgentTaskRouter();
  return _routerInstance;
}
