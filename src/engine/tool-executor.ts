/**
 * SolanaOS Tool Executor
 *
 * Adapted from Clawd Code's QueryEngine.ts tool-call loop.
 *
 * Handles:
 *  - Permission resolution before execution
 *  - Input validation with Zod
 *  - Execution with timeout + AbortSignal
 *  - Retry with exponential backoff
 *  - Result streaming (via async generator)
 *  - Concurrency management
 *  - Cost/token tracking
 */

import {
  SolanaOSTool,
  ToolContext,
  ToolResult,
  ToolRegistry,
  getToolRegistry,
  validateInput,
  err,
  permissionDenied,
} from "./tool-base.js";
import {
  PermissionEngine,
  PermissionResolutionContext,
  SAFE_DEFAULTS,
} from "./permission-engine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Tool Executor Config
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolExecutorConfig {
  /** Max execution time per tool call in ms (default 60_000) */
  timeoutMs: number;
  /** Max retry attempts for transient errors (default 2) */
  maxRetries: number;
  /** Base delay between retries in ms (default 500) */
  retryBaseDelayMs: number;
  /** Max concurrent tool executions (default 4) */
  maxConcurrency: number;
  /**
   * Called when a tool requires interactive approval.
   * Returns true if approved, false if denied.
   */
  requestApproval(toolName: string, args: unknown, reason?: string): Promise<boolean>;
  /** Optional telemetry hook */
  onToolStart?(toolName: string, args: unknown, ctx: ToolContext): void;
  onToolEnd?(toolName: string, result: ToolResult, durationMs: number, ctx: ToolContext): void;
  onToolError?(toolName: string, error: Error, ctx: ToolContext): void;
}

const DEFAULT_CONFIG: Omit<ToolExecutorConfig, "requestApproval"> = {
  timeoutMs: 60_000,
  maxRetries: 2,
  retryBaseDelayMs: 500,
  maxConcurrency: 4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool Call (what the LLM sends us)
// ─────────────────────────────────────────────────────────────────────────────

export interface LLMToolCall {
  /** Tool call ID from the LLM */
  id: string;
  /** Tool name */
  name: string;
  /** Raw arguments from the LLM (pre-validation) */
  args: unknown;
}

export interface ToolCallResult extends ToolResult {
  /** Mirrors the tool call ID for response matching */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Execution time */
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Executor
// ─────────────────────────────────────────────────────────────────────────────

export class ToolExecutor {
  private config: ToolExecutorConfig;
  private registry: ToolRegistry;
  private permissionEngine: PermissionEngine;
  private activeCount = 0;
  private queue: Array<() => void> = [];

  constructor(
    config: Partial<ToolExecutorConfig> & Pick<ToolExecutorConfig, "requestApproval">,
    registry?: ToolRegistry,
    permissionEngine?: PermissionEngine,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = registry ?? getToolRegistry();
    this.permissionEngine = permissionEngine ?? new PermissionEngine(SAFE_DEFAULTS);
  }

  /**
   * Execute a single tool call from the LLM.
   * Handles validation, permission, execution, retry.
   */
  async execute(call: LLMToolCall, ctx: ToolContext): Promise<ToolCallResult> {
    const startMs = Date.now();
    const tool = this.registry.get(call.name);

    if (!tool) {
      return {
        toolCallId: call.id,
        toolName: call.name,
        durationMs: Date.now() - startMs,
        status: "error",
        error: `Unknown tool: ${call.name}`,
        llmText: `Error: Unknown tool "${call.name}". Available tools: ${
          this.registry.all().map((t) => t.name).join(", ")
        }`,
      };
    }

    // Availability check
    if (tool.isAvailable && !tool.isAvailable(ctx)) {
      return {
        toolCallId: call.id,
        toolName: call.name,
        durationMs: Date.now() - startMs,
        status: "error",
        error: `Tool "${call.name}" is not available in this context`,
        llmText: `Tool "${call.name}" is not available on ${ctx.surface} surface`,
      };
    }

    // Input validation
    const validated = validateInput(tool.inputSchema, call.args);
    if (!validated.ok) {
      return {
        toolCallId: call.id,
        toolName: call.name,
        durationMs: Date.now() - startMs,
        status: "error",
        error: `Invalid input: ${validated.error}`,
        llmText: `Input validation failed for ${call.name}: ${validated.error}`,
      };
    }

    // Permission resolution
    const permCtx: PermissionResolutionContext = {
      simMode: ctx.simMode,
      surface: ctx.surface,
      bypassPermissions: false,
      planMode: false,
    };
    const action = this.permissionEngine.resolve(
      call.name,
      tool.permissionLevel,
      call.args as Record<string, unknown>,
      permCtx,
    );

    if (action === "deny") {
      return {
        toolCallId: call.id,
        toolName: call.name,
        durationMs: Date.now() - startMs,
        ...permissionDenied(`Tool "${call.name}" is denied by permission rules`),
      };
    }

    if (action === "ask") {
      // Tool-level custom check
      let reason: string | undefined;
      if (tool.checkPermission) {
        const check = await tool.checkPermission(validated.value, ctx);
        if (check?.needsApproval) {
          reason = check.reason;
        }
      }

      const approved = await this.config.requestApproval(call.name, call.args, reason);
      if (!approved) {
        return {
          toolCallId: call.id,
          toolName: call.name,
          durationMs: Date.now() - startMs,
          ...permissionDenied("User denied permission"),
        };
      }
    }

    // Concurrency gate (adapted from Clawd Code isConcurrencySafe)
    await this.acquireSlot(tool);

    try {
      this.config.onToolStart?.(call.name, call.args, ctx);

      const result = await this.executeWithTimeout(tool, validated.value, ctx);

      const duration = Date.now() - startMs;
      this.config.onToolEnd?.(call.name, result, duration, ctx);

      return { toolCallId: call.id, toolName: call.name, durationMs: duration, ...result };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.config.onToolError?.(call.name, error, ctx);
      return {
        toolCallId: call.id,
        toolName: call.name,
        durationMs: Date.now() - startMs,
        ...err(error.message),
      };
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * Execute multiple tool calls in parallel (respecting concurrency limits).
   * Adapted from Clawd Code's parallel tool call handling in QueryEngine.
   */
  async executeMany(calls: LLMToolCall[], ctx: ToolContext): Promise<ToolCallResult[]> {
    return Promise.all(calls.map((call) => this.execute(call, ctx)));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ───────────────────────────────────────────────────────────────────────────

  private async executeWithTimeout<TInput, TOutput>(
    tool: SolanaOSTool<TInput, TOutput>,
    input: TInput,
    ctx: ToolContext,
  ): Promise<ToolResult<TOutput>> {
    return this.withRetry(async () => {
      const timeoutSignal = AbortSignal.timeout(this.config.timeoutMs);
      const combinedSignal = ctx.signal
        ? AbortSignal.any([ctx.signal, timeoutSignal])
        : timeoutSignal;

      return tool.execute(input, { ...ctx, signal: combinedSignal });
    }, this.config.maxRetries);
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < maxRetries && isRetryableError(lastError)) {
          const delay = this.config.retryBaseDelayMs * 2 ** attempt;
          await sleep(delay);
        } else {
          throw lastError;
        }
      }
    }
    throw lastError!;
  }

  private async acquireSlot(tool: SolanaOSTool): Promise<void> {
    if (tool.isConcurrencySafe && this.activeCount < this.config.maxConcurrency) {
      this.activeCount++;
      return;
    }
    if (!tool.isConcurrencySafe) {
      // Non-concurrency-safe tools wait for all others to finish
      while (this.activeCount > 0) {
        await new Promise<void>((resolve) => this.queue.push(resolve));
      }
    } else {
      // Wait for a slot
      while (this.activeCount >= this.config.maxConcurrency) {
        await new Promise<void>((resolve) => this.queue.push(resolve));
      }
    }
    this.activeCount++;
  }

  private releaseSlot(): void {
    this.activeCount--;
    const next = this.queue.shift();
    next?.();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("connection") ||
    msg.includes("rate limit") ||
    msg.includes("503") ||
    msg.includes("502")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
