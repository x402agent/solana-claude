/**
 * SolanaOS Tool Base
 *
 * Adapted from Anthropic Clawd Code's src/Tool.ts architecture.
 * Tools are self-contained execution units with Zod schema validation,
 * a permission model, and a render hook for multi-surface output
 * (Telegram, web, Android, macOS menu bar).
 *
 * Permission levels map to SolanaOS's trust model:
 *   safe    → read-only data: prices, balances, memory recall
 *   write   → state changes: memory writes, config updates, file edits
 *   execute → shell/browser automation: computer use, page agent
 *   trade   → financial: spot buy/sell, perp open/close, swaps
 */

import { z, ZodSchema, ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Permission Model
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionLevel = "safe" | "write" | "execute" | "trade";

export type PermissionAction = "allow" | "deny" | "ask";

/** Wildcard pattern permission rule — adapated from Clawd Code's toolPermission handlers */
export interface PermissionRule {
  /** Glob-style pattern: "trading.buy(*)", "memory.write(*)", "bash(git *)" */
  pattern: string;
  action: PermissionAction;
  /** Optional: only apply rule in simulated mode */
  simOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Context
// ─────────────────────────────────────────────────────────────────────────────

/** Runtime context passed to every tool on execution */
export interface ToolContext {
  /** Current session ID */
  sessionId: string;
  /** Authenticated wallet address */
  walletAddress?: string;
  /** Whether the daemon is in simulated trading mode */
  simMode: boolean;
  /** Current SOUL/agent identity */
  agentId?: string;
  /** Caller surface (telegram, web, android, macos, extension) */
  surface: "telegram" | "web" | "android" | "macos" | "extension" | "cli" | "api";
  /** Permission rules in effect for this session */
  permissionRules: PermissionRule[];
  /** Tool registry (for tools that spawn sub-tools) */
  registry?: ToolRegistry;
  /** Coordinator agent ID if running inside a coordinator session */
  coordinatorId?: string;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Result
// ─────────────────────────────────────────────────────────────────────────────

export type ToolResultStatus = "success" | "error" | "permission_denied" | "cancelled" | "skipped";

export interface ToolResult<TOutput = unknown> {
  status: ToolResultStatus;
  output?: TOutput;
  error?: string;
  /** Markdown-formatted text for LLM context injection */
  llmText: string;
  /** Human-readable summary for Telegram/chat surfaces */
  summary?: string;
  /** Token usage if the tool itself made an LLM call */
  tokenUsage?: { input: number; output: number };
  /** Whether the result should be cached */
  cacheable?: boolean;
  /** Cache TTL in seconds */
  cacheTtlSeconds?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export interface SolanaOSTool<TInput = unknown, TOutput = unknown> {
  /** Unique tool name: "trading.buy", "memory.recall", "solana.price" */
  name: string;
  /** Human-readable description (shown in coordinator context, /skills, etc.) */
  description: string;
  /** Zod schema for input validation */
  inputSchema: ZodSchema<TInput>;
  /** Minimum required permission level */
  permissionLevel: PermissionLevel;
  /** Whether this tool can run concurrently with other tools */
  isConcurrencySafe: boolean;
  /**
   * Main execution function.
   * Should throw only for unrecoverable runtime errors.
   * Business logic failures should return { status: "error" }.
   */
  execute(input: TInput, ctx: ToolContext): Promise<ToolResult<TOutput>>;
  /**
   * Optional: called before execution to check if this specific invocation
   * needs interactive approval beyond the base permissionLevel.
   * Returns undefined = no additional check needed.
   */
  checkPermission?(
    input: TInput,
    ctx: ToolContext,
  ): Promise<{ needsApproval: boolean; reason?: string } | undefined>;
  /** Optional: render output for a specific surface */
  renderForSurface?(output: TOutput, surface: ToolContext["surface"]): string;
  /** Optional: short-circuit if tool is not available in this context */
  isAvailable?(ctx: ToolContext): boolean;
  /** Tags for discoverability: ["solana", "trading", "read-only"] */
  tags?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────

export class ToolRegistry {
  private tools = new Map<string, SolanaOSTool>();

  register(tool: SolanaOSTool): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  registerAll(tools: SolanaOSTool[]): this {
    for (const tool of tools) this.register(tool);
    return this;
  }

  get(name: string): SolanaOSTool | undefined {
    return this.tools.get(name);
  }

  getOrThrow(name: string): SolanaOSTool {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found in registry`);
    return tool;
  }

  all(): SolanaOSTool[] {
    return Array.from(this.tools.values());
  }

  byTag(tag: string): SolanaOSTool[] {
    return this.all().filter((t) => t.tags?.includes(tag));
  }

  byPermission(level: PermissionLevel): SolanaOSTool[] {
    return this.all().filter((t) => t.permissionLevel === level);
  }

  forLLMContext(): Array<{ name: string; description: string; inputSchema: object }> {
    return this.all().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Zod → JSON Schema (minimal, for LLM function calling)
// ─────────────────────────────────────────────────────────────────────────────

function zodToJsonSchema(schema: ZodSchema): object {
  // Use zod-to-json-schema if available, fallback to minimal extraction
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { zodToJsonSchema: z2js } = require("zod-to-json-schema");
    return z2js(schema, { target: "openAi" });
  } catch {
    // Minimal fallback: returns the Zod description
    return { type: "object", description: String(schema.description ?? "") };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: createTool — strongly typed factory
// ─────────────────────────────────────────────────────────────────────────────

export function createTool<TInput, TOutput>(
  def: SolanaOSTool<TInput, TOutput>,
): SolanaOSTool<TInput, TOutput> {
  return def;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: tool result builders
// ─────────────────────────────────────────────────────────────────────────────

export function ok<T>(output: T, opts?: { summary?: string; llmText?: string; cacheTtlSeconds?: number }): ToolResult<T> {
  return {
    status: "success",
    output,
    llmText: opts?.llmText ?? JSON.stringify(output, null, 2),
    summary: opts?.summary,
    cacheable: opts?.cacheTtlSeconds !== undefined,
    cacheTtlSeconds: opts?.cacheTtlSeconds,
  };
}

export function err(message: string, opts?: { status?: ToolResultStatus }): ToolResult<never> {
  return {
    status: opts?.status ?? "error",
    error: message,
    llmText: `Error: ${message}`,
    summary: `❌ ${message}`,
  };
}

export function permissionDenied(reason: string): ToolResult<never> {
  return {
    status: "permission_denied",
    error: reason,
    llmText: `Permission denied: ${reason}`,
    summary: `🔒 Permission denied: ${reason}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: validate input with Zod, return typed result
// ─────────────────────────────────────────────────────────────────────────────

export function validateInput<T>(
  schema: ZodSchema<T>,
  input: unknown,
): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const value = schema.parse(input);
    return { ok: true, value };
  } catch (e) {
    if (e instanceof ZodError) {
      return { ok: false, error: e.errors.map((e) => e.message).join("; ") };
    }
    return { ok: false, error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton registry (can be overridden in tests)
// ─────────────────────────────────────────────────────────────────────────────

let _registry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!_registry) _registry = new ToolRegistry();
  return _registry;
}

export function setToolRegistry(registry: ToolRegistry): void {
  _registry = registry;
}
