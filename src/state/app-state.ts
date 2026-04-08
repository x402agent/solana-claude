/**
 * src/state/app-state.ts
 *
 * AppState shape for the solana-claude agent runtime.
 *
 * Architectural DNA from Clawd Code's AppStateStore.ts + selectors.ts,
 * adapted for Solana: tasks, memory tiers, permission mode, onchain
 * subscriptions, OODA phase, and agent fleet.
 */

import { createStore } from "./store.js";

// ─────────────────────────────────────────────────────────────────────────────
// Core types (adapted from Clawd Code)
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionMode =
  | "ask"         // default — prompt before any irreversible action
  | "auto"        // auto-approve read-only tools, ask for writes
  | "bypassAll"   // dangerous: skip all permission checks (dev only)
  | "readOnly";   // deny all writes/trades at engine level

export type MemoryTier = "KNOWN" | "LEARNED" | "INFERRED";

export type MemoryEntry = {
  id: string;
  tier: MemoryTier;
  content: string;
  source?: string;
  expiresAt?: number;   // unix ms — only KNOWN entries expire
  createdAt: number;
};

/** OODA cycle phase */
export type OODAPhase = "observe" | "orient" | "decide" | "act" | "learn" | "idle";

/** A running or completed agent task (adapted from Claude Code's LocalAgentTask) */
export type AgentTask = {
  id: string;
  type: "research" | "analysis" | "ooda" | "scanner" | "monitor" | "dream";
  description: string;
  prompt: string;
  status: "pending" | "running" | "done" | "stopped" | "error";
  agentType?: string;
  /** Whether this task can show permission prompts (false=background agent) */
  canShowPermissions: boolean;
  /** Tool call history for this task */
  toolCalls: ToolCallRecord[];
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

export type ToolCallRecord = {
  toolName: string;
  input: Record<string, unknown>;
  output?: string;
  durationMs?: number;
  timestamp: number;
  approved: boolean;
};

/** A live Helius WebSocket subscription */
export type OnchainSubscription = {
  id: number;
  type: "account" | "program" | "logs" | "slot" | "signature" | "transaction";
  address?: string;
  createdAt: number;
  active: boolean;
};

/** Top pump signal from scanner (stored in AppState for quick access) */
export type PumpSignal = {
  mint: string;
  symbol: string;
  score: number;
  strength: "strong" | "moderate" | "weak" | "avoid";
  progressBps: number;
  isGraduated: boolean;
  reasons: string[];
  risks: string[];
  detectedAt: number;
};

/** Full runtime state for the solana-claude agent */
export type AppState = {
  // Permission engine
  permissionMode: PermissionMode;
  alwaysAllowTools: string[];    // tool names auto-approved in this session
  alwaysDenyTools: string[];     // tool names always rejected

  // Memory vault
  memories: MemoryEntry[];

  // Agent fleet (adapted from Claude Code's tasks Record<agentId, TaskState>)
  tasks: Record<string, AgentTask>;

  // OODA loop
  oodaPhase: OODAPhase;
  oodaCycleCount: number;

  // Onchain event listeners
  onchainSubscriptions: Record<number, OnchainSubscription>;

  // Tool call summary (session-level)
  totalToolCalls: number;
  totalApiCalls: number;

  // UI / display hints
  expandedView: "tasks" | "memory" | "tools" | "pump" | null;

  // Active skill context
  activeSkill: string | null;

  // ── Pump.fun scanner state ──────────────────────────────────────────────
  /** Whether the PumpScanner background task is running */
  pumpScannerActive: boolean;
  /** Top Pump.fun signals from the scanner (STRONG/MODERATE only) */
  pumpTopSignals: PumpSignal[];
  /** Mints on the graduation watchlist */
  pumpWatchlist: string[];
  /** Total tokens observed by scanner this session */
  pumpTokensObserved: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const initialState: AppState = {
  permissionMode: "ask",
  alwaysAllowTools: [
    // Read-only tools auto-approved by default
    "solana_price",
    "solana_trending",
    "solana_token_info",
    "solana_wallet_pnl",
    "solana_search",
    "solana_top_traders",
    "solana_wallet_tokens",
    "sol_price",
    "helius_account_info",
    "helius_balance",
    "helius_transactions",
    "helius_priority_fee",
    "helius_das_asset",
    "helius_listener_setup",
    "memory_recall",
    "skill_list",
    "skill_read",
    "agent_list",
    // Pump.fun read-only tools
    "pump_token_scan",
    "pump_buy_quote",
    "pump_sell_quote",
    "pump_graduation",
    "pump_market_cap",
    "pump_top_tokens",
    "pump_new_tokens",
    "pump_cashback_info",
  ],
  alwaysDenyTools: [
    // These require explicit human approval — no auto-approve ever
    // (adapted from Claude Code's deny-first pattern for destructive tools)
    "trade_execute",
    "wallet_send",
    "wallet_sign",
  ],
  memories: [],
  tasks: {},
  oodaPhase: "idle",
  oodaCycleCount: 0,
  onchainSubscriptions: {},
  totalToolCalls: 0,
  totalApiCalls: 0,
  expandedView: null,
  activeSkill: null,
  // Pump.fun scanner
  pumpScannerActive: false,
  pumpTopSignals: [],
  pumpWatchlist: [],
  pumpTokensObserved: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Singleton store
// ─────────────────────────────────────────────────────────────────────────────

export const appStateStore = createStore<AppState>(initialState, ({ newState, oldState }) => {
  // Log OODA phase transitions
  if (newState.oodaPhase !== oldState.oodaPhase) {
    const ts = new Date().toISOString();
    process.stderr.write(`[OODA] ${oldState.oodaPhase} → ${newState.oodaPhase} @ ${ts}\n`);
  }
});

export const getAppState = () => appStateStore.getState();
export const setAppState = (updater: (prev: AppState) => AppState) =>
  appStateStore.setState(updater);

// ─────────────────────────────────────────────────────────────────────────────
// Selectors (adapted from Claude Code's selectors.ts)
// ─────────────────────────────────────────────────────────────────────────────

/** Get all running tasks */
export function getRunningTasks(state: AppState): AgentTask[] {
  return Object.values(state.tasks).filter(t => t.status === "running");
}

/** Get memories for a specific tier, sorted by recency */
export function getMemoriesByTier(state: AppState, tier: MemoryTier): MemoryEntry[] {
  const now = Date.now();
  return state.memories
    .filter(m => m.tier === tier && (m.expiresAt === undefined || m.expiresAt > now))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Check if a tool call should be auto-approved */
export function canAutoApproveTool(state: AppState, toolName: string): boolean {
  if (state.alwaysDenyTools.includes(toolName)) return false;
  if (state.permissionMode === "bypassAll") return true;
  if (state.permissionMode === "readOnly") {
    // In readOnly mode, only allow the pre-approved read tools
    return state.alwaysAllowTools.includes(toolName);
  }
  return state.alwaysAllowTools.includes(toolName);
}

/** Get active onchain subscriptions */
export function getActiveSubscriptions(state: AppState): OnchainSubscription[] {
  return Object.values(state.onchainSubscriptions).filter(s => s.active);
}

/** Get memory context for LLM injection (all tiers, formatted) */
export function getMemoryContext(state: AppState): string {
  const now = Date.now();
  const valid = state.memories.filter(
    m => m.expiresAt === undefined || m.expiresAt > now,
  );
  if (valid.length === 0) return "";

  const byTier: Record<MemoryTier, string[]> = { KNOWN: [], LEARNED: [], INFERRED: [] };
  for (const m of valid) byTier[m.tier].push(m.content);

  const sections = (["KNOWN", "LEARNED", "INFERRED"] as MemoryTier[])
    .filter(t => byTier[t].length > 0)
    .map(t => `## ${t}\n${byTier[t].map(c => `- ${c}`).join("\n")}`);

  return `# Agent Memory\n\n${sections.join("\n\n")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// State helpers (adapted from Claude Code's action patterns)
// ─────────────────────────────────────────────────────────────────────────────

let _taskCounter = 0;

export function spawnTask(
  type: AgentTask["type"],
  description: string,
  prompt: string,
  opts: Partial<Pick<AgentTask, "agentType" | "canShowPermissions">> = {},
): AgentTask {
  const id = `task-${Date.now()}-${++_taskCounter}`;
  const task: AgentTask = {
    id,
    type,
    description,
    prompt,
    agentType: opts.agentType ?? type,
    canShowPermissions: opts.canShowPermissions ?? false,
    status: "running",
    toolCalls: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  setAppState(prev => ({ ...prev, tasks: { ...prev.tasks, [id]: task } }));
  return task;
}

export function updateTask(id: string, patch: Partial<AgentTask>): void {
  setAppState(prev => {
    const existing = prev.tasks[id];
    if (!existing) return prev;
    return {
      ...prev,
      tasks: { ...prev.tasks, [id]: { ...existing, ...patch, updatedAt: Date.now() } },
    };
  });
}

export function writeMemory(entry: Omit<MemoryEntry, "id" | "createdAt">): MemoryEntry {
  const mem: MemoryEntry = {
    ...entry,
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
  setAppState(prev => ({ ...prev, memories: [...prev.memories, mem] }));
  return mem;
}

export function recallMemory(query: string, tier?: MemoryTier): MemoryEntry[] {
  const state = getAppState();
  const now = Date.now();
  const q = query.toLowerCase();
  return state.memories.filter(m =>
    (tier === undefined || m.tier === tier) &&
    (m.expiresAt === undefined || m.expiresAt > now) &&
    m.content.toLowerCase().includes(q),
  );
}

export function setOODAPhase(phase: OODAPhase): void {
  setAppState(prev => ({ ...prev, oodaPhase: phase }));
}

export function registerSubscription(sub: Omit<OnchainSubscription, "active" | "createdAt">): void {
  setAppState(prev => ({
    ...prev,
    onchainSubscriptions: {
      ...prev.onchainSubscriptions,
      [sub.id]: { ...sub, active: true, createdAt: Date.now() },
    },
  }));
}

export function removeSubscription(id: number): void {
  setAppState(prev => {
    const subs = { ...prev.onchainSubscriptions };
    if (subs[id]) subs[id] = { ...subs[id], active: false };
    return { ...prev, onchainSubscriptions: subs };
  });
}
