/**
 * src/state/app-state.ts
 *
 * In-memory application state for the OODA loop and agent memory system.
 * Memory is organized in three tiers:
 *   KNOWN   — verified facts with optional expiry (e.g. live price)
 *   INFERRED — reasoned conclusions, semi-durable
 *   LEARNED  — promoted patterns from repeated cycles, persistent
 */

import { ulid } from "ulid";

// ── Types ──────────────────────────────────────────────────────────────────

export type OODAPhase = "idle" | "observe" | "orient" | "decide" | "act" | "learn";
export type MemoryTier = "KNOWN" | "INFERRED" | "LEARNED";
export type TaskStatus = "pending" | "running" | "done" | "failed";

export interface MemoryEntry {
  id: string;
  tier: MemoryTier;
  content: string;
  source: string;
  createdAt: number;
  expiresAt?: number;
}

export interface Task {
  id: string;
  type: string;
  title: string;
  description: string;
  status: TaskStatus;
  result?: string;
  createdAt: number;
  opts?: Record<string, unknown>;
}

export interface AppState {
  oodaPhase: OODAPhase;
  memories: MemoryEntry[];
  tasks: Record<string, Task>;
}

// ── Singleton state ────────────────────────────────────────────────────────

const state: AppState = {
  oodaPhase: "idle",
  memories: [],
  tasks: {},
};

// ── OODA phase ─────────────────────────────────────────────────────────────

export function getAppState(): AppState {
  return state;
}

export function setOODAPhase(phase: OODAPhase): void {
  state.oodaPhase = phase;
}

// ── Memory ─────────────────────────────────────────────────────────────────

function purgeExpired(): void {
  const now = Date.now();
  state.memories = state.memories.filter((m) => !m.expiresAt || m.expiresAt > now);
}

export function writeMemory(
  entry: Omit<MemoryEntry, "id" | "createdAt">,
): MemoryEntry {
  purgeExpired();
  const mem: MemoryEntry = {
    id: `mem_${ulid()}`,
    createdAt: Date.now(),
    ...entry,
  };
  state.memories.push(mem);
  return mem;
}

export function recallMemory(query: string, tier?: MemoryTier): MemoryEntry[] {
  purgeExpired();
  const q = query.toLowerCase();
  return state.memories.filter((m) => {
    if (tier && m.tier !== tier) return false;
    return (
      m.content.toLowerCase().includes(q) ||
      m.source.toLowerCase().includes(q) ||
      m.tier.toLowerCase() === q
    );
  });
}

export function clearMemory(tier?: MemoryTier): void {
  if (tier) {
    state.memories = state.memories.filter((m) => m.tier !== tier);
  } else {
    state.memories = [];
  }
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export function spawnTask(
  type: string,
  title: string,
  description: string,
  opts?: Record<string, unknown>,
): Task {
  const task: Task = {
    id: `task_${ulid()}_${type}`,
    type,
    title,
    description,
    status: "running",
    createdAt: Date.now(),
    opts,
  };
  state.tasks[task.id] = task;
  return task;
}

export function updateTask(
  id: string,
  updates: Partial<Pick<Task, "status" | "result">>,
): void {
  const t = state.tasks[id];
  if (t) Object.assign(t, updates);
}

export function getTask(id: string): Task | undefined {
  return state.tasks[id];
}

// ── Context rendering ──────────────────────────────────────────────────────

export function getMemoryContext(s: AppState = state): string {
  purgeExpired();
  const live = s.memories.filter((m) => !m.expiresAt || m.expiresAt > Date.now());
  if (live.length === 0) return "";

  const byTier: Record<MemoryTier, MemoryEntry[]> = {
    KNOWN: [],
    INFERRED: [],
    LEARNED: [],
  };
  for (const m of live) byTier[m.tier].push(m);

  const lines: string[] = [];
  for (const tier of ["KNOWN", "INFERRED", "LEARNED"] as MemoryTier[]) {
    const entries = byTier[tier];
    if (entries.length === 0) continue;
    lines.push(`[${tier}]`);
    for (const m of entries.slice(-5)) {
      lines.push(`  • ${m.content} (src: ${m.source})`);
    }
  }
  return lines.join("\n");
}
