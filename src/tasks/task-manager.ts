/**
 * SolanaOS Task Manager
 *
 * Adapted from Claude Code's src/tasks/ (LocalShellTask, LocalAgentTask, DreamTask).
 *
 * Manages persistent background tasks: OODA loop iterations, pump scanner,
 * Honcho dream/autoDream, skill execution, research pipelines.
 *
 * Key concepts from Claude Code:
 *  - Tasks have a status state machine (pending → running → completed/failed/stopped)
 *  - Tasks can produce streaming output
 *  - TaskCreateTool / TaskUpdateTool / TaskGetTool / TaskListTool / TaskStopTool patterns
 *
 * SolanaOS extensions:
 *  - OODA-typed tasks with phase tracking
 *  - Honcho dream tasks that run in the background
 *  - Scanner tasks with scheduled execution
 */

import { EventEmitter } from "events";

// ─────────────────────────────────────────────────────────────────────────────
// Task Types
// ─────────────────────────────────────────────────────────────────────────────

export type TaskType =
  | "ooda"       // OODA trading loop iteration
  | "scanner"    // Pump/token scanner pipeline
  | "dream"      // Honcho autoDream background reasoning
  | "skill"      // SKILL.md workflow execution
  | "research"   // Parallel research task
  | "shell"      // Background shell command (computer use)
  | "agent"      // Sub-agent execution
  | "cron";      // Scheduled recurring task

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
  | "cancelled";

// ─────────────────────────────────────────────────────────────────────────────
// Task Definition
// ─────────────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  /** Human-readable description */
  description: string;
  /** Input payload (type-specific) */
  input: unknown;
  /** Output / result */
  output?: unknown;
  /** Error message if status === "failed" */
  error?: string;
  /** Streaming output lines */
  outputLines: string[];
  /** Timestamps */
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  /** Session that owns this task */
  sessionId: string;
  /** Coordinator worker ID if this task is running inside a coordinator */
  workerId?: string;
  /** For cron tasks: cron expression */
  cronExpression?: string;
  /** For skill tasks: skill name */
  skillName?: string;
  /** AbortController for cancellation */
  abortController: AbortController;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Input types (strongly typed per task type)
// ─────────────────────────────────────────────────────────────────────────────

export interface OodaTaskInput {
  /** Whether to run in sim mode */
  simMode: boolean;
  /** OODA interval in seconds */
  intervalSeconds: number;
  /** Max iterations (undefined = infinite) */
  maxIterations?: number;
}

export interface ScannerTaskInput {
  /** Scanner variant */
  variant: "pump" | "trending" | "new_listings";
  /** How many tokens to scan */
  limit: number;
  /** Tiers to include */
  tiers?: Array<"fresh" | "near_grad" | "micro" | "mid" | "large">;
}

export interface DreamTaskInput {
  /** Honcho session ID to dream about */
  sessionId: string;
  /** Max conclusions to generate */
  maxConclusions?: number;
}

export interface SkillTaskInput {
  /** SKILL.md name */
  skillName: string;
  /** Arguments to the skill */
  args?: Record<string, unknown>;
}

export interface ShellTaskInput {
  /** Shell command to run */
  command: string;
  /** Working directory */
  cwd?: string;
  /** Timeout in ms */
  timeoutMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Manager
// ─────────────────────────────────────────────────────────────────────────────

let taskIdCounter = 0;

function generateTaskId(type: TaskType): string {
  return `${type}-${Date.now().toString(36)}-${(taskIdCounter++).toString(36)}`;
}

export type TaskHandler = (task: Task, manager: TaskManager) => Promise<void>;

export class TaskManager extends EventEmitter {
  private tasks = new Map<string, Task>();
  private handlers = new Map<TaskType, TaskHandler>();

  // ── Handler registration (adapted from Claude Code's task type dispatch) ──

  registerHandler(type: TaskType, handler: TaskHandler): this {
    this.handlers.set(type, handler);
    return this;
  }

  // ── Task lifecycle ─────────────────────────────────────────────────────────

  async create(params: {
    type: TaskType;
    description: string;
    input: unknown;
    sessionId: string;
    workerId?: string;
    skillName?: string;
    cronExpression?: string;
    autoStart?: boolean;
  }): Promise<Task> {
    const task: Task = {
      id: generateTaskId(params.type),
      type: params.type,
      status: "pending",
      description: params.description,
      input: params.input,
      outputLines: [],
      createdAt: new Date(),
      sessionId: params.sessionId,
      workerId: params.workerId,
      skillName: params.skillName,
      cronExpression: params.cronExpression,
      abortController: new AbortController(),
    };

    this.tasks.set(task.id, task);
    this.emit("task:created", task);

    if (params.autoStart !== false) {
      // Start immediately (non-blocking)
      this.start(task.id).catch((e) => {
        task.status = "failed";
        task.error = String(e);
        this.emit("task:failed", task);
      });
    }

    return task;
  }

  async start(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "pending") throw new Error(`Task ${taskId} is ${task.status}, not pending`);

    const handler = this.handlers.get(task.type);
    if (!handler) throw new Error(`No handler registered for task type "${task.type}"`);

    task.status = "running";
    task.startedAt = new Date();
    this.emit("task:started", task);

    try {
      await handler(task, this);

      if (task.status === "running") {
        task.status = "completed";
        task.completedAt = new Date();
        this.emit("task:completed", task);
      }
    } catch (e) {
      if (task.abortController.signal.aborted) {
        task.status = "stopped";
        task.completedAt = new Date();
        this.emit("task:stopped", task);
      } else {
        task.status = "failed";
        task.error = String(e);
        task.completedAt = new Date();
        this.emit("task:failed", task);
      }
    }
  }

  stop(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return false;
    task.abortController.abort("Stopped by user");
    this.emit("task:stopping", task);
    return true;
  }

  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "pending") return false;
    task.status = "cancelled";
    task.completedAt = new Date();
    this.emit("task:cancelled", task);
    return true;
  }

  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getOrThrow(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    return task;
  }

  list(filter?: { sessionId?: string; type?: TaskType; status?: TaskStatus }): Task[] {
    return Array.from(this.tasks.values()).filter((t) => {
      if (filter?.sessionId && t.sessionId !== filter.sessionId) return false;
      if (filter?.type && t.type !== filter.type) return false;
      if (filter?.status && t.status !== filter.status) return false;
      return true;
    });
  }

  listActive(sessionId?: string): Task[] {
    return this.list({ sessionId, status: "running" });
  }

  // ── Output streaming helpers (adapted from Claude Code task output patterns) ──

  appendOutput(taskId: string, line: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.outputLines.push(line);
    this.emit("task:output", { taskId, line });
  }

  getOutput(taskId: string): string[] {
    return this.tasks.get(taskId)?.outputLines ?? [];
  }

  // ── Serialisation for persistence ─────────────────────────────────────────

  toJSON(taskId: string): object | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    // Exclude non-serializable fields
    const { abortController, ...rest } = task;
    return rest;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Tool Definitions (mirrors Claude Code's TaskCreateTool, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the tool call specs for the LLM so it can create/manage tasks.
 * These integrate with ToolRegistry — register them via registerTaskTools().
 */
export function getTaskToolDescriptions(): Array<{
  name: string;
  description: string;
}> {
  return [
    {
      name: "task.create",
      description: "Create and start a background task (ooda, scanner, dream, skill, shell, agent)",
    },
    {
      name: "task.update",
      description: "Update a running task's input parameters",
    },
    {
      name: "task.get",
      description: "Get task details and current output",
    },
    {
      name: "task.list",
      description: "List all tasks, optionally filtered by type or status",
    },
    {
      name: "task.stop",
      description: "Stop a running task",
    },
    {
      name: "task.output",
      description: "Get the streaming output lines from a task",
    },
  ];
}
