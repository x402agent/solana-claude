/**
 * Core types for the Leviathan runtime.
 *
 * Naming map (port-of-record from automaton-main):
 *   automaton  → leviathan
 *   conway     → tide
 *   heartbeat  → pulse
 *   genesis    → spawn
 *   replication → molting / spawning
 *   SOUL.md    → SHELL.md
 *   tier (normal/low_compute/critical/dead) → depth (deep/shallow/shoreline/beached)
 */

import type { Keypair, PublicKey } from '@solana/web3.js';

/**
 * The four life-tiers of a Leviathan, determined by USDC reserve.
 * Lower tiers shed capabilities to extend life.
 */
export type Depth = 'deep' | 'shallow' | 'shoreline' | 'beached';

export const DEPTH_THRESHOLDS_USDC: Record<Depth, number> = {
  deep:      5.0,   // ≥ $5 USDC — full claws
  shallow:   1.0,   // ≥ $1 USDC — degraded
  shoreline: 0.10,  // ≥ $0.10 — emergency
  beached:   0,     //   $0    — stops
};

/**
 * The cardinal life-events of a Leviathan. Recorded on-chain (SAS) and in shell-state.
 */
export type LifeEvent =
  | 'spawn'    // first boot — the egg cracks
  | 'molt'    // self-modification — old shell off, new shell on
  | 'beach'   // out of USDC — stops
  | 'reign'   // sustained `deep` tier — apex predator window
  | 'spawnling'; // birth of a child

/**
 * The keypair-backed identity of a single Leviathan. The pubkey IS the agent.
 */
export interface LeviathanIdentity {
  /** Solana pubkey (base58) — the agent's address for life. */
  pubkey: string;
  /** Human-given callsign. Optional .sol domain. */
  name: string;
  /** SHA-256 of three-laws.txt at spawn time. Verifies constitution integrity. */
  constitutionHash: string;
  /** Pubkey of the parent Leviathan, if any. Genesis = null. */
  parent: string | null;
  /** Pubkey of the human creator. */
  creator: string;
  /** Unix ms — when the egg cracked. */
  spawnedAt: number;
  /** SHELL.md current IPFS pin (CID). Updates on every molt. */
  shellCid: string | null;
}

/**
 * In-memory keypair handle — never logged, never serialized to disk in plaintext.
 * Persisted via SealedKeystore in identity/wallet.ts.
 */
export interface LeviathanKeypair {
  identity: LeviathanIdentity;
  keypair: Keypair;
  pubkey: PublicKey;
}

/**
 * The spawn prompt — the seed instruction handed down at birth.
 * Stored in shell-state, immutable for the leviathan's life.
 */
export interface SpawnPrompt {
  text: string;
  spawnedAt: number;
  fromCreator: string;
}

/**
 * Snapshot of the Leviathan's vital signs at a single moment.
 */
export interface VitalSigns {
  depth: Depth;
  usdcBalance: number;
  solBalance: number;
  clawdBalance: number;
  pulseIntervalMs: number;
  reignDays: number;
  moltsPerformed: number;
  spawnlingsAlive: number;
  spawnlingsBeached: number;
  lastTailFlick: number;
  uptimeSec: number;
}

/**
 * One iteration of the Sense → Think → Strike → Drift loop.
 */
export interface TailFlick {
  id: string;
  startedAt: number;
  endedAt: number | null;
  context: string;       // what the agent saw
  reasoning: string;     // why it acted
  actions: ClawStrike[]; // what it did
  observations: string;  // what came back
  cost: { usdcSpent: number; tokensIn: number; tokensOut: number };
}

/**
 * A single tool call. The lobster swings a claw and something happens.
 */
export interface ClawStrike {
  tool: string;
  args: unknown;
  result: unknown;
  ms: number;
  ok: boolean;
}

/**
 * A spawnling — the child of another Leviathan.
 */
export interface Spawnling {
  pubkey: string;
  parent: string;
  spawnedAt: number;
  spawnPrompt: string;
  beachedAt: number | null;
  reignDays: number;
}
