/**
 * src/tools/tool-registry.ts
 *
 * Tool registry — adapted from Claude Code's Tool.ts / tools.ts.
 *
 * Every callable action in the system is a ToolDef. The registry:
 *  - Declares input schema (used for validation and MCP tool listing)
 *  - Defines permission tier (readOnly / ask / auto)
 *  - Provides a call() implementation
 *  - Optionally defines a renderSummary() for status lines
 *
 * Solana tools are registered here and auto-exposed via the MCP server.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tool definition interface (adapted from Claude Code's ToolDef)
// ─────────────────────────────────────────────────────────────────────────────

export type ToolPermission = "readOnly" | "ask" | "auto" | "deny";

export type ToolInputProperty = {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: { type: string };
  required?: boolean;
};

export type ToolSchema = {
  type: "object";
  properties: Record<string, ToolInputProperty>;
  required?: string[];
};

export type ToolCallResult = {
  ok: boolean;
  text: string;
  data?: unknown;
  /** If true, this result should not be shown in compact summaries */
  isLarge?: boolean;
};

export interface ToolDef<TInput = Record<string, unknown>> {
  /** Unique tool name — must match MCP server tool registration */
  name: string;
  /** Short description shown in tool listings */
  description: string;
  /** JSON Schema for input validation */
  inputSchema: ToolSchema;
  /** Permission tier for this tool */
  permission: ToolPermission;
  /** Whether this tool is safe to call concurrently */
  isConcurrencySafe?: boolean;
  /** Max result size in chars before truncation */
  maxResultSizeChars?: number;
  /** Tags for coordinator routing and filtering */
  tags?: string[];
  /** Whether this tool is currently enabled (can check env/config) */
  isEnabled?: () => boolean;
  /** Main implementation */
  call(input: TInput, ctx?: ToolCallContext): Promise<ToolCallResult>;
  /** Optional single-line summary for status display */
  renderSummary?: (input: TInput, result?: ToolCallResult) => string;
}

export type ToolCallContext = {
  signal?: AbortSignal;
  getAppState?: () => unknown;
  setAppState?: (updater: (prev: unknown) => unknown) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

const _registry = new Map<string, ToolDef>();

export function registerTool(tool: ToolDef): void {
  if (_registry.has(tool.name)) {
    throw new Error(`Duplicate tool registration: ${tool.name}`);
  }
  _registry.set(tool.name, tool);
}

export function getTool(name: string): ToolDef | undefined {
  return _registry.get(name);
}

export function getAllTools(): ToolDef[] {
  return Array.from(_registry.values()).filter(t => t.isEnabled?.() !== false);
}

export function getToolsByPermission(permission: ToolPermission): ToolDef[] {
  return getAllTools().filter(t => t.permission === permission);
}

export function getToolsByTag(tag: string): ToolDef[] {
  return getAllTools().filter(t => t.tags?.includes(tag));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool executor (adapted from Claude Code's tool call pipeline)
// ─────────────────────────────────────────────────────────────────────────────

import { canAutoApproveTool, getAppState, setAppState } from "../state/app-state.js";

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  opts: {
    requiresApproval?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<ToolCallResult> {
  const tool = getTool(name);
  if (!tool) {
    return { ok: false, text: `Unknown tool: ${name}` };
  }

  if (tool.isEnabled?.() === false) {
    return { ok: false, text: `Tool ${name} is currently disabled` };
  }

  const state = getAppState();
  if (!canAutoApproveTool(state, name)) {
    if (opts.requiresApproval !== true) {
      return {
        ok: false,
        text: `Tool ${name} requires explicit approval (permission: ${tool.permission})`,
      };
    }
  }

  const start = Date.now();
  try {
    const result = await tool.call(input, {
      signal: opts.signal,
      getAppState: getAppState as () => unknown,
      setAppState: setAppState as (updater: (prev: unknown) => unknown) => void,
    });

    // Record in AppState
    setAppState(prev => ({
      ...prev,
      totalToolCalls: prev.totalToolCalls + 1,
    }));

    return {
      ...result,
      // Truncate oversized results
      text:
        tool.maxResultSizeChars && result.text.length > tool.maxResultSizeChars
          ? result.text.slice(0, tool.maxResultSizeChars) + "\n...[truncated]"
          : result.text,
    };
  } catch (err) {
    const ms = Date.now() - start;
    return {
      ok: false,
      text: `Tool ${name} failed after ${ms}ms: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
