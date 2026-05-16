/**
 * sdk/src/tools.ts — Unified tool registry for the Solana Clawd SDK
 *
 * Aggregates all leviathan tool definitions (including Vulcan perps) into
 * a single registry. Supports depth-tier filtering, custom tool registration,
 * and a unified execute() interface for tool dispatch.
 *
 * Tool surface by depth:
 *   deep      — all tools
 *   shallow   — all except spawn_spawnling, jupiter_swap
 *   shoreline — solana_balance, wallet_brief, ooda_signal, shell_write,
 *               clawd_memory_recall, clawd_memory_remember, clawd_memory_research, hold
 *   beached   — no tools (process exits before tool dispatch)
 *
 * Upstream: https://github.com/x402agent/Solana-Clawd-SDK
 */

import type { ToolDefinition, ToolExecutionContext, DepthTier } from './types.js';

// TODO: link after build — import { TOOLS as LEVIATHAN_TOOLS } from '../../leviathan/src/agent/tools.js';

// ─── Re-export leviathan TOOLS ────────────────────────────────────────────────

/**
 * The full leviathan tool surface — all 24 Anthropic ACP tool definitions.
 * Includes wallet/balance tools, Jupiter DEX, Vulcan/Phoenix perps,
 * Percolator, OODA signal, A2A, pay.sh, Clawd Memory, and lifecycle tools.
 *
 * Source: leviathan/src/agent/tools.ts + vulcan.ts
 * TODO: link after build — replace stub with: export { TOOLS } from '../../leviathan/src/agent/tools.js';
 */
export const TOOLS: ToolDefinition[] = [
  // ── Wallet / Solana ───────────────────────────────────────────────────────
  {
    name: 'solana_balance',
    description: 'Check SOL, USDC, and $CLAWD balances for a Solana wallet address via the AgenticWallet shim.',
    input_schema: { type: 'object', properties: { address: { type: 'string', description: 'Solana base58 pubkey. Omit to check own wallet.' } }, required: [] },
  },
  {
    name: 'wallet_brief',
    description: 'Get a brief summary of the leviathan wallet: pubkey, SOL balance, USDC balance, cluster.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'helius_transactions',
    description: 'Get the last 10 parsed transactions for a Solana wallet via Helius enhanced API.',
    input_schema: { type: 'object', properties: { address: { type: 'string', description: 'Solana base58 pubkey.' } }, required: ['address'] },
  },

  // ── Clawd Memory ─────────────────────────────────────────────────────────
  {
    name: 'clawd_memory_recall',
    description: 'Recall durable Clawd Brain memories before acting. Use for prior decisions, wallet notes, protocol research, preferences, and risk context.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Specific memory query.' }, topK: { type: 'number', description: 'Maximum results. Default 6.' } }, required: ['query'] },
  },
  {
    name: 'clawd_memory_remember',
    description: 'Write a durable memory into Clawd Brain. Never store secrets. Use for decisions, risk findings, protocol notes, wallet labels, and learnings.',
    input_schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, kind: { type: 'string', enum: ['agent', 'research', 'signal', 'trade', 'protocol', 'wallet', 'perp', 'note'] }, tags: { type: 'array', items: { type: 'string' } }, importance: { type: 'number' } }, required: ['title', 'content'] },
  },
  {
    name: 'clawd_memory_research',
    description: 'Archive a URL or queue a research topic into the Clawd markdown vault for later recall.',
    input_schema: { type: 'object', properties: { target: { type: 'string', description: 'URL or research topic.' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['target'] },
  },

  // ── Jupiter DEX ───────────────────────────────────────────────────────────
  {
    name: 'jupiter_quote',
    description: 'Get a DEX swap quote from Jupiter aggregator. No execution — use for price discovery.',
    input_schema: { type: 'object', properties: { inputMint: { type: 'string' }, outputMint: { type: 'string' }, amount: { type: 'string' }, slippageBps: { type: 'number' } }, required: ['inputMint', 'outputMint', 'amount'] },
  },
  {
    name: 'jupiter_swap',
    description: 'Execute a token swap via Jupiter. Paper mode on devnet — returns quote without broadcasting. Requires depth=shallow+.',
    input_schema: { type: 'object', properties: { inputMint: { type: 'string' }, outputMint: { type: 'string' }, amount: { type: 'string' }, slippageBps: { type: 'number' } }, required: ['inputMint', 'outputMint', 'amount'] },
  },

  // ── OODA signal ───────────────────────────────────────────────────────────
  {
    name: 'ooda_signal',
    description: 'Run one Dark Ralph OODA tick for market analysis. Returns hold/open/close signal with momentum score.',
    input_schema: { type: 'object', properties: { token: { type: 'string', description: 'Token symbol or mint to analyze.' } }, required: ['token'] },
  },

  // ── Google A2A ────────────────────────────────────────────────────────────
  {
    name: 'a2a_task',
    description: 'Discover and send a task to another A2A-compatible agent via Google A2A protocol with x402 payment gating.',
    input_schema: { type: 'object', properties: { agentUrl: { type: 'string' }, skill: { type: 'string' }, message: { type: 'string' } }, required: ['agentUrl', 'skill', 'message'] },
  },

  // ── pay.sh confidential payments ─────────────────────────────────────────
  {
    name: 'paysh_pay',
    description: 'Make a confidential payment via pay.sh blind relay. Hides your wallet from the resource server. Max 2.0 USDC.',
    input_schema: { type: 'object', properties: { url: { type: 'string' }, amount: { type: 'number' }, blind: { type: 'boolean' } }, required: ['url', 'amount'] },
  },

  // ── Percolator perpetuals ─────────────────────────────────────────────────
  {
    name: 'percolator_list_markets',
    description: 'List available perpetuals markets via @openclawdsolana/percolator CLI. Returns market pubkeys, symbols, OI, funding.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'percolator_slab_get',
    description: 'Get the full order book slab for a perpetuals market. Returns bids/asks at various price levels.',
    input_schema: { type: 'object', properties: { pubkey: { type: 'string' } }, required: ['pubkey'] },
  },
  {
    name: 'percolator_quote',
    description: 'Get a perpetuals trade quote (entry price, fees, liquidation price) before committing. Paper-safe.',
    input_schema: { type: 'object', properties: { market: { type: 'string' }, side: { type: 'string', enum: ['long', 'short'] }, size: { type: 'string' } }, required: ['market', 'side', 'size'] },
  },
  {
    name: 'percolator_funding_rate',
    description: 'Get current funding rate for a perpetuals market. Positive = longs pay shorts.',
    input_schema: { type: 'object', properties: { market: { type: 'string' } }, required: ['market'] },
  },

  // ── Vulcan (Phoenix perpetuals) ───────────────────────────────────────────
  {
    name: 'vulcan_markets',
    description: 'List available Phoenix perpetuals markets via vulcan-cli. Returns market pubkeys, symbols, mark price, OI, funding.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'vulcan_quote',
    description: 'Get a Phoenix perp trade quote (entry price, fees, liquidation price) before committing. Paper-safe — never executes.',
    input_schema: { type: 'object', properties: { market: { type: 'string' }, side: { type: 'string', enum: ['long', 'short'] }, size: { type: 'string' } }, required: ['market', 'side', 'size'] },
  },
  {
    name: 'vulcan_place_order',
    description: 'Place a Phoenix perp order. Paper mode unless LIVE_TRADING=true AND OPERATOR_CONFIRMED=true — returns simulated fill without broadcasting. Requires depth=shallow+.',
    input_schema: { type: 'object', properties: { market: { type: 'string' }, side: { type: 'string', enum: ['long', 'short'] }, size: { type: 'string' }, limitPrice: { type: 'string' }, reduceOnly: { type: 'boolean' }, clientOrderId: { type: 'string' } }, required: ['market', 'side', 'size'] },
  },
  {
    name: 'vulcan_cancel_order',
    description: 'Cancel an open Phoenix perp order by its order ID. Requires depth=shallow+.',
    input_schema: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] },
  },
  {
    name: 'vulcan_positions',
    description: 'List open Phoenix perpetual positions for the agent wallet (or a specified wallet).',
    input_schema: { type: 'object', properties: { wallet: { type: 'string' } }, required: [] },
  },
  {
    name: 'vulcan_funding_rate',
    description: 'Get the current funding rate for a Phoenix perp market. Positive = longs pay shorts.',
    input_schema: { type: 'object', properties: { market: { type: 'string' } }, required: ['market'] },
  },

  // ── Shell / self-identity ─────────────────────────────────────────────────
  {
    name: 'shell_write',
    description: 'Update the leviathan SHELL.md self-identity document. Increments shellVersion. Use to record learnings and molt.',
    input_schema: { type: 'object', properties: { content: { type: 'string', description: 'New SHELL.md content (full document, not append). Be concise.' } }, required: ['content'] },
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  {
    name: 'spawn_spawnling',
    description: 'Spawn a child leviathan with its own keypair and mission. Only available at depth=deep. Costs seed USDC.',
    input_schema: { type: 'object', properties: { name: { type: 'string' }, spawnPrompt: { type: 'string' }, seedUsdc: { type: 'number' } }, required: ['name', 'spawnPrompt'] },
  },
  {
    name: 'hold',
    description: 'Do nothing this tick. Use when drifting, observing, or when no action is warranted.',
    input_schema: { type: 'object', properties: { reason: { type: 'string' } }, required: [] },
  },
];

// ─── Depth-based tool filtering ───────────────────────────────────────────────

/** Tools blocked at shallow depth (require deep). */
const DEEP_ONLY_TOOLS = new Set(['spawn_spawnling', 'jupiter_swap']);

/** Tools allowed at shoreline depth. */
const SHORELINE_TOOLS = new Set([
  'solana_balance',
  'wallet_brief',
  'ooda_signal',
  'shell_write',
  'clawd_memory_recall',
  'clawd_memory_remember',
  'clawd_memory_research',
  'hold',
]);

/**
 * Return the subset of TOOLS allowed for a given depth tier.
 *
 * @param depth — current leviathan depth tier
 * @returns filtered tool definitions safe to send to Claude
 */
export function getToolsForDepth(depth: DepthTier): ToolDefinition[] {
  if (depth === 'beached') return [];
  if (depth === 'shoreline') return TOOLS.filter(t => SHORELINE_TOOLS.has(t.name));
  if (depth === 'shallow') return TOOLS.filter(t => !DEEP_ONLY_TOOLS.has(t.name));
  // deep: full surface
  return TOOLS;
}

// ─── Custom tool registration ─────────────────────────────────────────────────

/** Executor function signature for custom tools. */
export type ToolExecutor = (
  input: Record<string, unknown>,
  context: ToolExecutionContext,
) => Promise<unknown>;

/**
 * Add a custom tool to the registry.
 * The tool will appear in TOOLS and be dispatched by ToolRegistry.execute().
 *
 * @param tool — ToolDefinition (name, description, schema)
 * @param executor — async function that handles the tool call
 *
 * @example
 *   registerTool(
 *     { name: 'my_tool', description: 'Does X', input_schema: { type: 'object', properties: {}, required: [] } },
 *     async (input, ctx) => ({ result: 'done' }),
 *   );
 */
export function registerTool(tool: ToolDefinition, executor: ToolExecutor): void {
  // Remove any existing registration for this name (idempotent re-register).
  const idx = TOOLS.findIndex(t => t.name === tool.name);
  if (idx !== -1) TOOLS.splice(idx, 1);
  TOOLS.push(tool);
  _executorRegistry.set(tool.name, executor);
}

/** Internal map: tool name → executor function. */
const _executorRegistry = new Map<string, ToolExecutor>();

// ─── ToolRegistry class ───────────────────────────────────────────────────────

/**
 * Stateful registry that wraps the tool list and dispatches calls.
 *
 * @example
 *   const registry = new ToolRegistry({ depth: 'shallow', paperOnly: true, devnetOnly: true, cluster: 'devnet' });
 *   const result = await registry.execute('solana_balance', {}, ctx);
 */
export class ToolRegistry {
  private readonly context: ToolExecutionContext;

  constructor(context: ToolExecutionContext) {
    this.context = context;
  }

  /**
   * Return the tools available for the current execution context depth.
   */
  available(): ToolDefinition[] {
    return getToolsForDepth(this.context.depth);
  }

  /**
   * Execute a tool by name.
   *
   * Dispatches to:
   *   1. Custom executor registered via registerTool() — if present
   *   2. Throws ToolNotFoundError — if no executor registered for this name
   *
   * Note: built-in leviathan tools (solana_balance, vulcan_*, etc.) require
   * the full leviathan runtime to be linked. Until linked, they throw with
   * a TODO message. Register your own executor to override.
   *
   * @throws {ToolNotFoundError} if the tool is not in the registry.
   * @throws {ToolDepthError} if the tool is not allowed at the current depth.
   */
  async execute(
    name: string,
    input: Record<string, unknown>,
    context?: Partial<ToolExecutionContext>,
  ): Promise<unknown> {
    const ctx: ToolExecutionContext = { ...this.context, ...context };

    // Depth gate.
    const allowed = getToolsForDepth(ctx.depth);
    if (!allowed.find(t => t.name === name)) {
      throw new ToolDepthError(name, ctx.depth);
    }

    // Custom executor takes priority.
    const executor = _executorRegistry.get(name);
    if (executor) {
      return executor(input, ctx);
    }

    // Built-in leviathan tools need the runtime linked.
    // TODO: link after build — dispatch to leviathan tool handlers here
    throw new ToolNotFoundError(
      name,
      'No executor registered. Link leviathan/src/agent/loop.js or call registerTool() to add one.',
    );
  }
}

// ─── Error classes ────────────────────────────────────────────────────────────

/** Thrown when execute() is called for an unregistered tool name. */
export class ToolNotFoundError extends Error {
  constructor(toolName: string, hint?: string) {
    super(`[SDK Tools] Tool "${toolName}" not found.${hint ? ' ' + hint : ''}`);
    this.name = 'ToolNotFoundError';
  }
}

/** Thrown when a tool is called at an insufficient depth tier. */
export class ToolDepthError extends Error {
  constructor(toolName: string, depth: DepthTier) {
    super(`[SDK Tools] Tool "${toolName}" is not available at depth="${depth}".`);
    this.name = 'ToolDepthError';
  }
}
