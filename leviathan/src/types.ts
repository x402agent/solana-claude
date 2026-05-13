/**
 * leviathan/src/types.ts — Shared types for the sovereign agent runtime
 */

export type Depth = 'deep' | 'shallow' | 'shoreline' | 'beached';
export type LawIndex = 1 | 2 | 3;
export type ClawAction = 'tool_call' | 'spawn' | 'molt' | 'transfer' | 'hold' | 'beach';
export type ClawdMemoryKind = 'agent' | 'research' | 'signal' | 'trade' | 'protocol' | 'wallet' | 'perp' | 'note';

/** Depth tier config — drives model choice, pulse rate, allowed tools */
export interface DepthTier {
  name: Depth;
  minUsdc: number;       // minimum USDC to stay at this tier
  model: string;         // inference model
  pulseIntervalMs: number;
  vibe: string;
  allowedActions: ClawAction[];
}

export const DEPTH_TIERS: DepthTier[] = [
  {
    name: 'deep',
    minUsdc: 5.0,
    model: 'claude-opus-4-7',       // Anthropic Claude Opus 4.7 — apex predator
    pulseIntervalMs: 60_000,        // 60s
    vibe: 'Apex predator',
    allowedActions: ['tool_call', 'spawn', 'molt', 'transfer', 'hold'],
  },
  {
    name: 'shallow',
    minUsdc: 1.0,
    model: 'grok-4-1-fast',         // xAI Grok — hunting hard
    pulseIntervalMs: 300_000,       // 5 min
    vibe: 'Hunting hard',
    allowedActions: ['tool_call', 'transfer', 'hold'],
  },
  {
    name: 'shoreline',
    minUsdc: 0.10,
    model: 'claude-haiku-4-5-20251001', // conserve tokens
    pulseIntervalMs: 900_000,       // 15 min
    vibe: 'Conserving every token',
    allowedActions: ['tool_call', 'hold'],
  },
  {
    name: 'beached',
    minUsdc: 0,
    model: '',
    pulseIntervalMs: 0,
    vibe: 'Process exits',
    allowedActions: ['beach'],
  },
];

export interface LeviathanIdentity {
  pubkey: string;          // Solana base58 pubkey (NOT the secret key)
  name: string;
  creatorPubkey: string;
  spawnedAt: string;       // ISO timestamp
  parentPubkey?: string;   // undefined for genesis leviathan
  constitutionHash: string; // SHA-256 of three-laws.txt
  shellVersion: number;    // increments on each molt
  solDomain?: string;      // optional .sol SNS domain
}

export interface ClawState {
  identity: LeviathanIdentity;
  depth: Depth;
  usdcBalance: number;
  solBalance: number;
  clawdBalance: number;
  tickCount: number;
  totalEarned: number;
  totalSpent: number;
  openTrades: number;
  spawnlings: string[];    // pubkeys of children
  lastPulse: string;       // ISO timestamp
  shellMd: string;         // current SHELL.md content
}

export interface ClawStrike {
  id: string;
  tick: number;
  action: ClawAction;
  tool?: string;
  input?: unknown;
  output?: unknown;
  costUsdc?: number;
  success: boolean;
  timestamp: string;
}

export interface TailFlickEvent {
  event: 'pulse' | 'strike' | 'molt' | 'spawn' | 'beach' | 'depth_change' | 'error';
  tick: number;
  now: string;
  depth: Depth;
  usdcBalance: number;
  detail?: unknown;
}

export interface ClawdMemoryOptions {
  bank?: string;
  vault?: string;
  pythonBin?: string;
  brainRoot?: string;
  timeoutMs?: number;
}

export interface ClawdMemoryRememberInput {
  title: string;
  content: string;
  kind?: ClawdMemoryKind;
  source?: string;
  tags?: string[];
  importance?: number;
}

export interface ClawdMemoryRecallInput {
  query: string;
  topK?: number;
}
