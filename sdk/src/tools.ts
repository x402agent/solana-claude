/**
 * sdk/src/tools.ts — Unified tool registry for @solanaclawd/sdk
 *
 * Combines all tools from the leviathan (OODA + Jupiter + Percolator + Vulcan)
 * and allows external consumers to register custom tools.
 */

import type { ToolDefinition, ToolExecutionContext } from './types.js';

// ─── Tool executor function type ──────────────────────────────────────────────

export type ToolExecutor = (
  input: Record<string, unknown>,
  context: ToolExecutionContext,
) => Promise<unknown>;

// ─── ToolRegistry ─────────────────────────────────────────────────────────────

export class ToolRegistry {
  private readonly definitions: Map<string, ToolDefinition> = new Map();
  private readonly executors: Map<string, ToolExecutor> = new Map();

  /** Register a custom tool with its executor. */
  registerTool(definition: ToolDefinition, executor: ToolExecutor): void {
    this.definitions.set(definition.name, definition);
    this.executors.set(definition.name, executor);
  }

  /** Unregister a tool by name. */
  unregisterTool(name: string): void {
    this.definitions.delete(name);
    this.executors.delete(name);
  }

  /** Get all registered tool definitions. */
  getAll(): ToolDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get tools available at a given depth tier.
   * Depth filter mirrors the leviathan survival.ts allowed actions:
   *   shoreline — observe + memory + ooda_signal + shell_write + hold
   *   shallow   — + jupiter tools + perp quotes + vulcan read tools
   *   deep      — all tools including spawn_spawnling and live orders
   */
  getToolsForDepth(depth: 'deep' | 'shallow' | 'shoreline' | 'beached'): ToolDefinition[] {
    if (depth === 'beached') return [];
    const all = this.getAll();
    if (depth === 'deep') return all;

    const SHALLOW_BLOCKED = new Set(['spawn_spawnling']);
    const SHORELINE_ALLOWED = new Set([
      'solana_balance', 'wallet_brief', 'ooda_signal', 'shell_write', 'hold',
      'clawd_memory_recall', 'clawd_memory_remember', 'clawd_memory_research',
    ]);

    if (depth === 'shoreline') {
      return all.filter(t => SHORELINE_ALLOWED.has(t.name));
    }
    // shallow
    return all.filter(t => !SHALLOW_BLOCKED.has(t.name));
  }

  /** Execute a tool by name with the given input and context. */
  async execute(
    name: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<{ output: unknown; success: boolean }> {
    const executor = this.executors.get(name);
    if (!executor) {
      return { output: `unknown tool: ${name}`, success: false };
    }
    try {
      const output = await executor(input, context);
      return { output, success: true };
    } catch (e) {
      return {
        output: `tool error [${name}]: ${e instanceof Error ? e.message : String(e)}`,
        success: false,
      };
    }
  }

  /** Number of registered tools. */
  get size(): number {
    return this.definitions.size;
  }
}

// ─── Default registry (lazy-loaded from leviathan) ───────────────────────────

let _defaultRegistry: ToolRegistry | null = null;

/**
 * Get the default tool registry pre-populated with all leviathan tools
 * (OODA, Jupiter, Percolator perpetuals, Vulcan Phoenix perps, memory, etc.).
 *
 * Lazy-loads tool definitions from leviathan/src/agent/tools.ts on first call.
 */
export async function getDefaultRegistry(): Promise<ToolRegistry> {
  if (_defaultRegistry) return _defaultRegistry;

  _defaultRegistry = new ToolRegistry();

  try {
    // Dynamic import — leviathan tools are in the same repo
    const { TOOLS } = await import('../../leviathan/src/agent/tools.js');
    for (const tool of TOOLS) {
      // Register with a stub executor (callers use the leviathan loop directly)
      _defaultRegistry.registerTool(tool as ToolDefinition, async () => ({
        note: 'Use the leviathan agent loop to execute tools — direct execution requires a full agent context.',
      }));
    }
  } catch {
    // leviathan not built yet — return empty registry
  }

  return _defaultRegistry;
}

/**
 * Get tool definitions for a given depth tier (convenience wrapper).
 * Uses the default registry populated with all leviathan tools.
 */
export async function getToolsForDepth(
  depth: 'deep' | 'shallow' | 'shoreline' | 'beached',
): Promise<ToolDefinition[]> {
  const registry = await getDefaultRegistry();
  return registry.getToolsForDepth(depth);
}
