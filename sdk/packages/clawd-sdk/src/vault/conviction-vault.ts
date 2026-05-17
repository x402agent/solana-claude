/**
 * Conviction Vault — time × amount × consistency = economic power.
 *
 * Stakers earn conviction score by locking tokens for defined durations.
 * Score determines protocol revenue share proportionally.
 *
 * Novel: the consistency_multiplier rewards holders who re-lock consecutively,
 * creating a compounding loyalty effect. Each missed epoch resets the multiplier.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import type { ConvictionPosition, SdkInstructions } from "../types/index.js";
import { CLAWD_PROTOCOL_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../constants.js";
import {
  deriveVaultPda,
  deriveConvictionPositionPda,
} from "../utils/pda.js";
import { computeConvictionScore, computeConvictionReward } from "../utils/math.js";

const SYSVAR_CLOCK = new PublicKey("SysvarC1ock11111111111111111111111111111111");

// ─── Conviction Stake ─────────────────────────────────────────────────────────

/**
 * Build a conviction_stake instruction.
 */
export function buildConvictionStakeInstruction(
  vault: PublicKey,
  stakerTokenAccount: PublicKey,
  convictionPoolAccount: PublicKey,
  baseMint: PublicKey,
  staker: PublicKey,
  amount: bigint,
  lockDurationSlots: bigint,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [convictionPosition] = deriveConvictionPositionPda(vault, staker);

  const data = Buffer.alloc(8 + 8 + 8);
  Buffer.from([8, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0); // conviction_stake
  data.writeBigUInt64LE(amount, 8);
  data.writeBigUInt64LE(lockDurationSlots, 16);

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: convictionPosition, isSigner: false, isWritable: true },
      { pubkey: stakerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: convictionPoolAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: staker, isSigner: true, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 80_000 };
}

// ─── Conviction Unstake ───────────────────────────────────────────────────────

/**
 * Build a conviction_unstake instruction.
 * If called before unlockSlot: burns 20% of principal.
 */
export function buildConvictionUnstakeInstruction(
  vault: PublicKey,
  stakerTokenAccount: PublicKey,
  convictionPoolAccount: PublicKey,
  baseMint: PublicKey,
  staker: PublicKey,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [convictionPosition] = deriveConvictionPositionPda(vault, staker);

  const data = Buffer.from([9, 0, 0, 0, 0, 0, 0, 0]); // conviction_unstake

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: convictionPosition, isSigner: false, isWritable: true },
      { pubkey: stakerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: convictionPoolAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: true },
      { pubkey: staker, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 90_000 };
}

// ─── Claim Conviction Rewards ─────────────────────────────────────────────────

/**
 * Build a claim_conviction_rewards instruction.
 */
export function buildClaimConvictionRewardsInstruction(
  vault: PublicKey,
  revenuePoolAccount: PublicKey,
  stakerTokenAccount: PublicKey,
  baseMint: PublicKey,
  staker: PublicKey,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [convictionPosition] = deriveConvictionPositionPda(vault, staker);

  const data = Buffer.from([10, 0, 0, 0, 0, 0, 0, 0]); // claim_conviction_rewards

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: convictionPosition, isSigner: false, isWritable: true },
      { pubkey: revenuePoolAccount, isSigner: false, isWritable: true },
      { pubkey: stakerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: staker, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 60_000 };
}

// ─── Fetch Conviction Position ─────────────────────────────────────────────────

export async function fetchConvictionPosition(
  connection: Connection,
  vault: PublicKey,
  staker: PublicKey
): Promise<ConvictionPosition | null> {
  const [positionPda] = deriveConvictionPositionPda(vault, staker);
  const info = await connection.getAccountInfo(positionPda);
  if (!info) return null;

  const d = info.data.slice(8);
  let o = 0;
  const rk = () => { const pk = new PublicKey(d.slice(o, o + 32)); o += 32; return pk; };
  const r64 = () => { const v = d.readBigUInt64LE(o); o += 8; return v; };
  const r128 = () => { const lo = d.readBigUInt64LE(o); const hi = d.readBigUInt64LE(o + 8); o += 16; return lo + (hi << 64n); };
  const r32 = () => { const v = d.readUInt32LE(o); o += 4; return v; };

  return {
    staker: rk(),
    vault: rk(),
    stakedAmount: r64(),
    lockDurationSlots: r64(),
    stakedAtSlot: r64(),
    unlockSlot: r64(),
    convictionScore: r128(),
    consecutiveEpochs: r32(),
    lastClaimSlot: r64(),
    totalRewardsClaimed: r64(),
  };
}

// ─── Score Helpers ────────────────────────────────────────────────────────────

/**
 * Estimate what conviction score a new stake would generate.
 */
export function estimateConvictionScore(
  amount: bigint,
  durationSlots: bigint,
  consecutiveEpochs: number,
  epochDurationSlots: bigint = 216_000n
): bigint {
  return computeConvictionScore(amount, durationSlots, consecutiveEpochs, epochDurationSlots);
}

/**
 * Estimate revenue share for a staker given vault totals.
 */
export function estimateRevenueShare(
  stakerScore: bigint,
  totalVaultScore: bigint,
  epochRevenue: bigint
): bigint {
  return computeConvictionReward(stakerScore, totalVaultScore, epochRevenue);
}

/**
 * How many slots remain before a conviction position unlocks penalty-free.
 */
export function slotsUntilFreeUnlock(
  position: ConvictionPosition,
  currentSlot: bigint
): bigint {
  if (currentSlot >= position.unlockSlot) return 0n;
  return position.unlockSlot - currentSlot;
}
