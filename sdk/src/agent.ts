/**
 * sdk/src/agent.ts — Agent factory for the Solana Clawd SDK
 *
 * Creates and manages a leviathan agent handle. Wraps the leviathan's
 * SENSE→THINK→STRIKE→DRIFT tail-flick loop with a clean SDK surface.
 *
 * Three Laws are enforced at factory time:
 *   - paperOnly=true blocks any live-execution tool calls
 *   - devnetOnly=true blocks any mainnet-beta connection
 *
 * No private key bytes are accepted, stored, or surfaced here.
 *
 * Upstream: https://github.com/x402agent/Solana-Clawd-SDK
 */

import { assertPaperOnly, assertDevnetOnly, ThreeLawsViolation } from './three-laws.js';

// TODO: link after build — import { tailFlick } from '../../leviathan/src/agent/loop.js';
// TODO: link after build — import { loadState, saveState } from '../../leviathan/src/state/index.js';
// TODO: link after build — import { computeDepth } from '../../leviathan/src/survival.js';
import type { ClawState, Depth } from '../../leviathan/src/types.js';

// ─── Public interfaces ────────────────────────────────────────────────────────

/**
 * Configuration for creating a leviathan agent.
 * All fields optional — safe defaults apply.
 */
export interface AgentConfig {
  /** Anthropic API key for Claude inference. Defaults to ANTHROPIC_API_KEY env var. */
  anthropicApiKey?: string;
  /** Helius API key for enhanced Solana transaction data. */
  heliusApiKey?: string;
  /** Solana cluster. Defaults to 'devnet'. */
  cluster?: 'devnet' | 'mainnet-beta';
  /**
   * Paper-only mode. When true, all live execution tools (jupiter_swap,
   * vulcan_place_order, paysh_pay) are blocked at the Law I layer.
   * Defaults to true for safety.
   */
  paperOnly?: boolean;
  /**
   * Devnet-only mode. When true, any attempt to connect to mainnet-beta
   * throws a ThreeLawsViolation. Defaults to true.
   */
  devnetOnly?: boolean;
  /** Founding mission / spawn prompt injected into every system prompt. */
  spawnPrompt?: string;
  /** Session ID for telemetry and multi-agent routing. */
  sessionId?: string;
}

/** Resolved internal config after applying defaults. */
interface ResolvedAgentConfig extends Required<AgentConfig> {}

/** Tick event emitted after each OODA cycle. */
export interface TickEvent {
  tick: number;
  depth: Depth;
  action: string;
  tool?: string;
  output?: unknown;
  costUsdc?: number;
  timestamp: string;
}

/** Handler function for tick events. */
export type TickHandler = (event: TickEvent) => void | Promise<void>;

/**
 * Handle to a live leviathan agent.
 * Returned by createAgent(). Controls the OODA loop lifecycle.
 */
export interface AgentHandle {
  /** Run one OODA tick (SENSE→THINK→STRIKE→DRIFT). */
  tailFlick(): Promise<TickEvent>;
  /** Return the current ClawState (snapshot). */
  getState(): ClawState | null;
  /** Return the current depth tier name. */
  getDepth(): Depth;
  /** Subscribe to tick events. Returns an unsubscribe function. */
  onTick(handler: TickHandler): () => void;
  /** Gracefully stop the agent loop (no-op if not running). */
  stop(): void;
  /** The resolved config this handle was created with. */
  readonly config: Readonly<ResolvedAgentConfig>;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<AgentConfig> = {
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
  heliusApiKey: process.env['HELIUS_API_KEY'] ?? '',
  cluster: 'devnet',
  paperOnly: true,
  devnetOnly: true,
  spawnPrompt: 'Observe Solana. Find honest revenue. Survive. Earn. Spawn.',
  sessionId: `sdk-${Date.now()}`,
};

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a leviathan agent handle.
 *
 * Three Laws guards fire at construction time:
 *   - If devnetOnly=true and cluster='mainnet-beta', throws ThreeLawsViolation.
 *
 * @throws {ThreeLawsViolation} if config violates a constitutional constraint.
 *
 * @example
 *   const agent = createAgent({
 *     anthropicApiKey: process.env.ANTHROPIC_API_KEY,
 *     cluster: 'devnet',
 *     paperOnly: true,
 *   });
 *   const event = await agent.tailFlick();
 */
export function createAgent(config: AgentConfig = {}): AgentHandle {
  const resolved: ResolvedAgentConfig = { ...DEFAULT_CONFIG, ...config };

  // ── Three Laws enforcement ──────────────────────────────────────────────
  // Check devnet-only constraint before any network interaction.
  assertDevnetOnly(resolved, resolved.cluster);

  // ── Internal state ──────────────────────────────────────────────────────
  let stopped = false;
  let currentState: ClawState | null = null;
  const tickHandlers = new Set<TickHandler>();

  // Lazy-load Anthropic client to avoid requiring the SDK at import time.
  let _anthropicClient: unknown = null;
  function getAnthropicClient(): unknown {
    if (_anthropicClient) return _anthropicClient;
    if (!resolved.anthropicApiKey) {
      throw new Error(
        '[SDK] anthropicApiKey is required. Set ANTHROPIC_API_KEY or pass it in AgentConfig.',
      );
    }
    // TODO: link after build — import Anthropic and construct here
    // _anthropicClient = new Anthropic({ apiKey: resolved.anthropicApiKey });
    return null; // placeholder until leviathan build link
  }

  // ── Tick helpers ────────────────────────────────────────────────────────

  async function _doTailFlick(): Promise<TickEvent> {
    if (stopped) {
      throw new Error('[SDK] Agent has been stopped. Create a new handle to resume.');
    }

    // Paper-only check: if paperOnly, downstream tool execution will enforce
    // this via assertPaperOnly inside tool handlers. We surface it early here
    // for clarity — actual enforcement is repeated per-tool.
    // assertPaperOnly is called lazily in tool dispatch, not here at tick level.

    // Load state from leviathan state store.
    // TODO: link after build — currentState = loadState();
    // For now: synthesize a minimal state stub so the handle is usable
    // without the full leviathan runtime wired.
    if (!currentState) {
      currentState = _stubState(resolved);
    }

    const depth = _computeDepthLocal(currentState.usdcBalance);

    // TODO: link after build — const client = getAnthropicClient();
    // TODO: link after build — const result = await tailFlick(currentState, resolved.spawnPrompt, client, []);

    // Stub result until build link is active.
    const now = new Date().toISOString();
    const event: TickEvent = {
      tick: currentState.tickCount + 1,
      depth,
      action: 'hold',
      tool: undefined,
      output: { note: 'SDK stub — link leviathan/src/agent/loop.js to activate' },
      costUsdc: 0,
      timestamp: now,
    };

    // Update local state snapshot.
    currentState = { ...currentState, tickCount: event.tick, lastPulse: now };
    // TODO: link after build — saveState(currentState);

    // Emit to subscribers.
    await _emitTick(event);

    return event;
  }

  async function _emitTick(event: TickEvent): Promise<void> {
    for (const handler of tickHandlers) {
      try {
        await handler(event);
      } catch (err) {
        // Subscriber errors must not crash the agent loop.
        console.error('[SDK] onTick handler threw:', err);
      }
    }
  }

  // ── AgentHandle implementation ──────────────────────────────────────────

  const handle: AgentHandle = {
    config: Object.freeze(resolved),

    async tailFlick(): Promise<TickEvent> {
      return _doTailFlick();
    },

    getState(): ClawState | null {
      return currentState;
    },

    getDepth(): Depth {
      if (!currentState) currentState = _stubState(resolved);
      return _computeDepthLocal(currentState.usdcBalance);
    },

    onTick(handler: TickHandler): () => void {
      tickHandlers.add(handler);
      return () => { tickHandlers.delete(handler); };
    },

    stop(): void {
      stopped = true;
      tickHandlers.clear();
    },
  };

  return handle;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Local depth computation — mirrors leviathan/src/survival.ts:computeDepth.
 * Duplicated here so agent.ts has zero runtime dependency on leviathan
 * until the build link is active.
 */
function _computeDepthLocal(usdcBalance: number): Depth {
  if (usdcBalance >= 5.0) return 'deep';
  if (usdcBalance >= 1.0) return 'shallow';
  if (usdcBalance >= 0.10) return 'shoreline';
  return 'beached';
}

/**
 * Synthesize a minimal ClawState stub for use before leviathan state store
 * is linked. Allows the AgentHandle API to work in isolation.
 */
function _stubState(config: ResolvedAgentConfig): ClawState {
  return {
    identity: {
      pubkey: 'UNSPAWNED',
      name: 'sdk-agent',
      creatorPubkey: 'UNSET',
      spawnedAt: new Date().toISOString(),
      constitutionHash: '',
      shellVersion: 0,
    },
    depth: 'shoreline',
    usdcBalance: 0.1,
    solBalance: 0,
    clawdBalance: 0,
    tickCount: 0,
    totalEarned: 0,
    totalSpent: 0,
    openTrades: 0,
    spawnlings: [],
    lastPulse: new Date().toISOString(),
    shellMd: `# ${config.spawnPrompt}`,
  };
}

// Re-export Three Laws violation so consumers import from one place.
export { ThreeLawsViolation };
