export type MemoryKind =
  | 'agent'     // operating rules, user prefs, workflow decisions
  | 'research'  // URLs, protocol notes, market structure
  | 'signal'    // market, social, token, infra signals
  | 'trade'     // plans, entry/exit rationale, review
  | 'protocol'  // Solana protocol knowledge, integration notes
  | 'wallet'    // wallet labels, behavior, portfolio context
  | 'perp'      // perpetual venue, oracle, funding, route risk
  | 'note';     // general

export type MemoryTier = 'working' | 'episodic';

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  kind: MemoryKind;
  tier: MemoryTier;
  tags: string[];
  importance: number;   // 0.0 – 1.0
  confidence: number;   // 0.0 – 1.0
  bank: string;
  createdAt: number;    // ms epoch
  accessedAt: number;
  accessCount: number;
}

export interface RememberInput {
  title: string;
  content: string;
  kind?: MemoryKind;
  tags?: string[];
  importance?: number;
  confidence?: number;
  bank?: string;
}

export interface RecallInput {
  query: string;
  topK?: number;
  kind?: MemoryKind;
  bank?: string;
  tier?: MemoryTier;
  minImportance?: number;
}

export interface RecallResult {
  entries: MemoryEntry[];
  query: string;
  bank: string;
}

export interface MemoryStats {
  bank: string;
  total: number;
  working: number;
  episodic: number;
  byKind: Record<MemoryKind, number>;
  dbPath: string;
}

export interface MemoryOptions {
  bank?: string;
  dataDir?: string;
}
