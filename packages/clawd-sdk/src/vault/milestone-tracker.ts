/**
 * Milestone-Gated Token Locks
 *
 * Developer tokens locked until specific on-chain milestones are achieved.
 * No pure time-lock — dev must *earn* their unlock by growing the project.
 *
 * Milestone types (all verifiable on-chain):
 *   - HolderCount: requires authority attestation (off-chain holders oracle)
 *   - MarketCapQuote: read from DBC pool's quote_reserve (proxy for mcap)
 *   - CumulativeVolume: read from DBC pool's metrics.total_trading_fee_paid
 *   - GraduationAchieved: pool.is_migrated == true
 *   - AgentTasksCompleted: agent_binding.lifetime_tasks_completed >= threshold
 *
 * Each milestone has an unlock_bps — the % of total locked that unlocks.
 * Unlock tranches can be called independently as milestones are hit.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import type {
  MilestoneLockParams,
  MilestoneCondition,
  MilestoneType,
  SdkInstructions,
} from "../types/index.js";
import { CLAWD_PROTOCOL_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../constants.js";
import { deriveMilestoneLockPda } from "../utils/pda.js";

// ─── Create Milestone Lock ────────────────────────────────────────────────────

/**
 * Build a create_milestone_lock instruction.
 */
export function buildCreateMilestoneLockInstruction(
  vault: PublicKey,
  creatorTokenAccount: PublicKey,
  vaultTokenAccount: PublicKey,
  baseMint: PublicKey,
  creator: PublicKey,
  params: MilestoneLockParams,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [milestoneLock] = deriveMilestoneLockPda(vault, creator);

  if (params.milestones.length > 8) {
    throw new Error("Maximum 8 milestones per lock");
  }

  // Verify unlock_bps sum <= 10000
  const totalBps = params.milestones.reduce((s, m) => s + m.unlockBps, 0);
  if (totalBps > 10_000) {
    throw new Error(`Total unlock_bps ${totalBps} exceeds 10000`);
  }

  // Encode params: total_locked (8) + milestones vec (4 + n * milestone_size)
  const milestoneSize = 1 + 8 + 2 + 1; // type(1) + threshold(8) + unlock_bps(2) + achieved(1)
  const dataLen = 8 + 8 + 4 + params.milestones.length * milestoneSize;
  const data = Buffer.alloc(dataLen);
  Buffer.from([11, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0); // create_milestone_lock
  let offset = 8;
  data.writeBigUInt64LE(params.totalLockedAmount, offset); offset += 8;
  data.writeUInt32LE(params.milestones.length, offset); offset += 4;

  const milestoneTypeMap: Record<MilestoneType, number> = {
    holder_count: 0,
    market_cap_quote: 1,
    cumulative_volume: 2,
    graduation_achieved: 3,
    agent_tasks_completed: 4,
  };

  for (const m of params.milestones) {
    data.writeUInt8(milestoneTypeMap[m.milestoneType], offset); offset += 1;
    data.writeBigUInt64LE(m.threshold, offset); offset += 8;
    data.writeUInt16LE(m.unlockBps, offset); offset += 2;
    data.writeUInt8(0, offset); offset += 1; // achieved = false at creation
  }

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: milestoneLock, isSigner: false, isWritable: true },
      { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 90_000 };
}

// ─── Verify Milestone ─────────────────────────────────────────────────────────

/**
 * Build a verify_milestone instruction.
 * Anyone can call this — on-chain state is checked.
 * If milestone is newly met, partial unlock occurs automatically.
 *
 * @param holderCountAttestation  Required for HolderCount milestones (oracle value)
 */
export function buildVerifyMilestoneInstruction(
  vault: PublicKey,
  vaultTokenAccount: PublicKey,
  creatorTokenAccount: PublicKey,
  dbcPool: PublicKey,
  baseMint: PublicKey,
  creator: PublicKey,
  caller: PublicKey,
  milestoneIndex: number,
  holderCountAttestation?: number,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [milestoneLock] = deriveMilestoneLockPda(vault, creator);

  // verify_milestone params: index (1) + option<u32> holder_count
  const hasHolderCount = holderCountAttestation !== undefined;
  const data = Buffer.alloc(8 + 1 + 1 + (hasHolderCount ? 4 : 0));
  Buffer.from([12, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0);
  let offset = 8;
  data.writeUInt8(milestoneIndex, offset); offset += 1;
  data.writeUInt8(hasHolderCount ? 1 : 0, offset); offset += 1;
  if (hasHolderCount && holderCountAttestation !== undefined) {
    data.writeUInt32LE(holderCountAttestation, offset);
  }

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: milestoneLock, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
      { pubkey: dbcPool, isSigner: false, isWritable: false },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: caller, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 80_000 };
}

// ─── Preset Milestone Schedules ───────────────────────────────────────────────

/**
 * Standard 4-tranche dev schedule aligned with project growth.
 * Total: 100% of locked amount, released as project hits milestones.
 */
export function defaultDevMilestones(totalLockedAmount: bigint): MilestoneLockParams {
  return {
    totalLockedAmount,
    milestones: [
      {
        milestoneType: "holder_count",
        threshold: 1_000n,
        unlockBps: 1_000, // 10% at 1k holders
        achieved: false,
      },
      {
        milestoneType: "market_cap_quote",
        threshold: 85_000_000_000n, // 85 SOL = ~graduation equivalent
        unlockBps: 2_000, // 20% at graduation-size mcap
        achieved: false,
      },
      {
        milestoneType: "holder_count",
        threshold: 5_000n,
        unlockBps: 3_000, // 30% at 5k holders
        achieved: false,
      },
      {
        milestoneType: "graduation_achieved",
        threshold: 1n, // any non-zero = graduated
        unlockBps: 4_000, // final 40% at graduation
        achieved: false,
      },
    ],
  };
}

/**
 * Agent-aligned dev schedule — dev tokens unlock as the agent delivers.
 */
export function agentAlignedMilestones(totalLockedAmount: bigint): MilestoneLockParams {
  return {
    totalLockedAmount,
    milestones: [
      {
        milestoneType: "agent_tasks_completed",
        threshold: 100n,
        unlockBps: 2_000, // 20% after 100 agent tasks
        achieved: false,
      },
      {
        milestoneType: "agent_tasks_completed",
        threshold: 1_000n,
        unlockBps: 3_000, // 30% after 1k agent tasks
        achieved: false,
      },
      {
        milestoneType: "cumulative_volume",
        threshold: 10_000_000_000n, // 10 SOL cumulative volume
        unlockBps: 2_000, // 20% at meaningful volume
        achieved: false,
      },
      {
        milestoneType: "graduation_achieved",
        threshold: 1n,
        unlockBps: 3_000, // final 30% at graduation
        achieved: false,
      },
    ],
  };
}

// ─── Milestone Status Check ───────────────────────────────────────────────────

export interface MilestoneStatus {
  index: number;
  type: MilestoneType;
  threshold: bigint;
  unlockBps: number;
  achieved: boolean;
  unlockedAmount: bigint;
}

/**
 * Compute current milestone statuses from vault on-chain state.
 * Pass dbcPool quote_reserve and cumulative_fee for automatic checks.
 */
export function checkMilestoneStatus(
  params: MilestoneLockParams,
  currentDbcQuoteReserve: bigint,
  cumulativeVolume: bigint,
  isMigrated: boolean,
  agentTasksCompleted: bigint
): MilestoneStatus[] {
  return params.milestones.map((m, i) => {
    let conditionMet = m.achieved;

    if (!conditionMet) {
      switch (m.milestoneType) {
        case "market_cap_quote":
          conditionMet = currentDbcQuoteReserve >= m.threshold;
          break;
        case "cumulative_volume":
          conditionMet = cumulativeVolume >= m.threshold;
          break;
        case "graduation_achieved":
          conditionMet = isMigrated;
          break;
        case "agent_tasks_completed":
          conditionMet = agentTasksCompleted >= m.threshold;
          break;
        case "holder_count":
          conditionMet = false; // requires attestation
          break;
      }
    }

    const unlockedAmount = conditionMet
      ? (params.totalLockedAmount * BigInt(m.unlockBps)) / 10_000n
      : 0n;

    return {
      index: i,
      type: m.milestoneType,
      threshold: m.threshold,
      unlockBps: m.unlockBps,
      achieved: conditionMet,
      unlockedAmount,
    };
  });
}
