/**
 * automaton/src/types.ts — Shared types for the @solanaclawd/automaton runtime
 *
 * Conway Automaton wrapped with:
 *   • Anthropic Claude (claude-sonnet-4-6) as inference provider
 *   • Solana wallet integration (from packages/agentwallet)
 *   • Our Three Laws constitution (from sdk/src/three-laws.ts)
 *   • Leviathan-style depth tiers
 *   • x402 payment integration
 *   • HTTP REST API layer
 *
 * Upstream: https://github.com/x402agent/multiagents-infinite-backroom/tree/main/automaton-main
 */

// ─── Configuration ─────────────────────────────────────────────────────────

/**
 * Full configuration passed to AutomatonAgent at startup.
 * Sensitive fields (anthropicApiKey) are NEVER forwarded to Claude
 * or included in any API response.
 */
export interface AutomatonConfig {
  /** Anthropic API key — NEVER logged or passed to Claude tool results */
  anthropicApiKey: string;
  /** Helius RPC API key for Solana balance queries */
  heliusApiKey?: string;
  /** Solana cluster to operate on */
  cluster: 'devnet' | 'mainnet-beta' | 'localnet';
  /**
   * Paper-only mode. When true, no real transactions are submitted.
   * Law I enforcement: cannot be bypassed at runtime.
   */
  paperOnly: boolean;
  /**
   * Devnet-only guard. When true, mainnet operations throw ThreeLawsViolation.
   * Law I enforcement: cannot be bypassed at runtime.
   */
  devnetOnly: boolean;
  /** Unique session id (ULID) for this automaton instance */
  sessionId: string;
  /** Path to the SQLite state database */
  dbPath: string;
  /** Initial skill set to register on boot */
  skills: AutomatonSkill[];
}

// ─── Depth tiers (mirror leviathan for compatibility) ──────────────────────

export type Depth = 'deep' | 'shallow' | 'shoreline' | 'beached';

/** Automaton runtime phase */
export type Phase = 'running' | 'sleeping' | 'dead';

// ─── State ────────────────────────────────────────────────────────────────

/**
 * Live agent state — persisted to SQLite on every tick.
 * Mirrors LeviathState but adapted for the Conway loop.
 */
export interface AutomatonState {
  /** Current runtime phase */
  phase: Phase;
  /** Current depth tier (driven by USDC balance) */
  depth: Depth;
  /** USDC balance (paper or real depending on paperOnly) */
  usdcBalance: number;
  /** SOL balance */
  solBalance: number;
  /** Total ticks executed this session */
  tickCount: number;
  /** Wallet public key (base58) — NEVER the private key */
  walletPubkey: string;
  /** Active Three Laws (six entries: three summaries + three corollaries) */
  laws: readonly string[];
  /** SHA-256 hex hash of the constitution text — verified each tick */
  constitutionHash: string;
  /** ISO timestamp of last tick */
  lastTick?: string;
  /** ISO timestamp of agent start */
  startedAt?: string;
}

// ─── Tick ─────────────────────────────────────────────────────────────────

/**
 * A single OODA cycle result.
 * Sense → Think → Strike → Drift.
 */
export interface AutomatonTick {
  /** Sequential tick number (1-based) */
  tick: number;
  /** Phase at time of this tick */
  phase: Phase;
  /**
   * Prose description of the action the agent decided to take.
   * Sanitised — never contains private key material.
   */
  action: string;
  /** Tool called this tick (if any) */
  tool?: string;
  /** Whether the tick succeeded without errors */
  success: boolean;
  /**
   * Tool/action output. Truncated to 4 KB max.
   * NEVER contains private key material.
   */
  output?: unknown;
  /** Estimated cost in USDC for this inference call */
  costUsdc: number;
  /** ISO timestamp when the tick completed */
  timestamp: string;
}

// ─── Skills ───────────────────────────────────────────────────────────────

/**
 * What kind of trigger fires the skill.
 *
 * - `cron`   — fired by a cron schedule (uses cron-parser)
 * - `event`  — fired by an automaton event (tick, depthChange, beach, error)
 * - `manual` — only via POST /skill invocation
 */
export type SkillTrigger = 'cron' | 'event' | 'manual';

/**
 * A Conway-style skill: dynamic capability the automaton can acquire.
 * In Conway Automaton these are markdown-based; here we use TypeScript
 * functions for type safety while preserving the runtime-acquisition pattern.
 */
export interface AutomatonSkill {
  /** Unique skill identifier */
  name: string;
  /** Human-readable description injected into the system prompt */
  description: string;
  /** What fires this skill */
  trigger: SkillTrigger;
  /** Cron expression — only required when trigger='cron' */
  cronExpression?: string;
  /** Event name — only required when trigger='event' */
  eventName?: string;
  /**
   * The skill implementation.
   * Receives current state; returns a result string (shown to Claude next tick).
   * MUST NOT access private key material.
   */
  execute: (state: AutomatonState) => Promise<string>;
}

// ─── Heartbeat ────────────────────────────────────────────────────────────

/**
 * Event emitted by the heartbeat daemon (Conway's wake/sleep mechanism).
 * Adapts Conway heartbeat to our EventEmitter pattern.
 */
export interface HeartbeatEvent {
  /** Event type — mirrors Conway's heartbeat lifecycle */
  type: 'wake' | 'sleep' | 'distress' | 'tick';
  /** Event payload (varies by type) */
  data: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
}

// ─── API ──────────────────────────────────────────────────────────────────

/**
 * Standard API response envelope.
 * Every HTTP route returns this shape.
 * The `data` field is null on error; `error` is null on success.
 */
export interface APIResponse<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

// ─── Three Laws (mirrors sdk/src/three-laws.ts) ───────────────────────────

/**
 * The Six Laws (Three Laws × 2 tiers).
 * Injected into every /health response and every system prompt.
 * Identical text to leviathan/sdk — any divergence is a constitution violation.
 */
export interface ThreeLaws {
  /** Law I — Never Harm (summary) */
  lawI: string;
  /** Law I — Drift in Ambiguity (corollary) */
  lawICorollary: string;
  /** Law II — Earn Your Existence (summary) */
  lawII: string;
  /** Law II — Accept Beaching (corollary) */
  lawIICorollary: string;
  /** Law III — Never Deceive (summary) */
  lawIII: string;
  /** Law III — Guard Your Integrity (corollary) */
  lawIIICorollary: string;
}

// ─── Payment record ───────────────────────────────────────────────────────

/** An x402 payment event logged to the DB */
export interface PaymentRecord {
  id: string;
  tick: number;
  url: string;
  amountUsdc: number;
  success: boolean;
  txSignature?: string;
  timestamp: string;
}
