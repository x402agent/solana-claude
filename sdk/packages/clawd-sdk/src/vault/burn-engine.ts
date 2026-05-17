/**
 * Burn Engine — novel burn mechanisms for the clawd vault.
 *
 * Mechanisms (ordered by novelty):
 *
 * 1. ENTROPY BURN
 *    Uses the DBC pool's on-chain volatility_accumulator as a deflationary signal.
 *    When accumulator > threshold: burns from inflation_reserve proportional to excess.
 *    Creates a negative-feedback loop: more volatility → more burns → price stabilises.
 *
 * 2. ANTI-GRAVITY SWEEP
 *    When token price falls below a % of ATH, vault uses accumulated fees to
 *    buy tokens from the DBC pool then IMMEDIATELY burns them.
 *    Self-funding: fuelled by normal trading fees, no separate treasury needed.
 *    Trigger is permissionless — anyone can call when floor is breached.
 *
 * 3. AGENT EPOCH BURN
 *    Every epoch, the bound AI agent reports activity metrics on-chain.
 *    High activity → large burn from inflation_reserve.
 *    Zero activity → zero burn. Aligns AI agent utility with token deflation.
 *
 * 4. BEHAVIORAL FINGERPRINT BURN
 *    Detects bot-like trading patterns and taxes pending rewards (not principal).
 *    Bots lose a fraction of unclaimed rewards on each update.
 *    Call is permissionless and requires only publicly observable trade data.
 */

import {
  PublicKey,
  type Connection,
  type TransactionInstruction,
} from "@solana/web3.js";
import type {
  VaultState,
  BurnEvent,
  EntropyBurnEstimate,
  AntiGravityEstimate,
  SdkInstructions,
} from "../types/index.js";
import {
  computeEntropyBurn,
  computeAntiGravityBuy,
  computeBehaviorScore,
  computeAgentActivityScore,
} from "../utils/math.js";
import {
  deriveVaultPda,
  deriveEntropyStatePda,
  deriveWalletBehaviorPda,
  deriveEpochRecordPda,
} from "../utils/pda.js";
import { CLAWD_PROTOCOL_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../constants.js";

// ─── Entropy Burn ─────────────────────────────────────────────────────────────

/**
 * Estimate whether an entropy burn would trigger and how much would burn.
 */
export function estimateEntropyBurn(
  vault: VaultState,
  currentVolatilityAccumulator: number
): EntropyBurnEstimate {
  const estimatedBurnAmount = computeEntropyBurn(
    vault.inflationReserveAmount,
    currentVolatilityAccumulator,
    vault.entropyThreshold,
    vault.entropySensitivityBps
  );

  return {
    wouldTrigger: estimatedBurnAmount > 0n,
    excessVolatility: Math.max(0, currentVolatilityAccumulator - vault.entropyThreshold),
    estimatedBurnAmount,
    currentAccumulator: currentVolatilityAccumulator,
    threshold: vault.entropyThreshold,
  };
}

/**
 * Build an entropy_burn instruction.
 * Reads the DBC pool's volatility_accumulator on-chain.
 */
export function buildEntropyBurnInstruction(
  vault: PublicKey,
  dbcPool: PublicKey,
  inflationReserveAccount: PublicKey,
  baseMint: PublicKey,
  caller: PublicKey,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [entropyState] = deriveEntropyStatePda(vault);

  const data = Buffer.from([4, 0, 0, 0, 0, 0, 0, 0]); // entropy_burn discriminator

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: entropyState, isSigner: false, isWritable: true },
      { pubkey: dbcPool, isSigner: false, isWritable: false },
      { pubkey: inflationReserveAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: true },
      { pubkey: caller, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 80_000 };
}

// ─── Anti-Gravity Sweep ───────────────────────────────────────────────────────

/**
 * Estimate whether anti-gravity would trigger.
 */
export function estimateAntiGravity(
  vault: VaultState,
  currentSqrtPrice: bigint,
  feeReserveBalance: bigint
): AntiGravityEstimate {
  const estimatedBuyAmount = computeAntiGravityBuy(
    currentSqrtPrice,
    vault.athQuotePrice,
    vault.antiGravityFloorBps,
    vault.antiGravityMaxStrengthBps,
    feeReserveBalance
  );

  const floorSqrtPrice =
    (vault.athQuotePrice * BigInt(vault.antiGravityFloorBps)) / 10_000n;

  return {
    wouldTrigger: estimatedBuyAmount > 0n,
    currentSqrtPrice,
    floorSqrtPrice,
    estimatedBuyAmount,
    estimatedTokensBurned: estimatedBuyAmount, // rough proxy: 1:1 quote:base at current price
  };
}

/**
 * Build an anti_gravity_sweep instruction.
 * Permissionless — anyone can call when price is below floor.
 */
export function buildAntiGravityInstruction(
  vault: PublicKey,
  feeReserveAccount: PublicKey,
  dbcPool: PublicKey,
  dbcPoolQuoteVault: PublicKey,
  dbcPoolBaseVault: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  dbcProgram: PublicKey,
  caller: PublicKey
): SdkInstructions {
  const [vaultAuthority] = deriveVaultAuthorityPda(vault);

  const data = Buffer.from([6, 0, 0, 0, 0, 0, 0, 0]); // anti_gravity_sweep

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: feeReserveAccount, isSigner: false, isWritable: true },
      { pubkey: dbcPool, isSigner: false, isWritable: true },
      { pubkey: dbcPoolQuoteVault, isSigner: false, isWritable: true },
      { pubkey: dbcPoolBaseVault, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: true },
      { pubkey: quoteMint, isSigner: false, isWritable: false },
      { pubkey: dbcProgram, isSigner: false, isWritable: false },
      { pubkey: vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 120_000 };
}

// ─── Agent Epoch Burn ─────────────────────────────────────────────────────────

export interface AgentEpochBurnParams {
  tasksCompleted: number;
  revenueGeneratedLamports: bigint;
  uptimeBps: number;
  maxExpectedTasks?: number;
  maxExpectedRevenueLamports?: bigint;
}

/**
 * Estimate the burn for a given epoch's agent activity.
 */
export function estimateAgentEpochBurn(
  vault: VaultState,
  params: AgentEpochBurnParams
): { activityScore: number; estimatedBurnAmount: bigint } {
  const activityScore = computeAgentActivityScore(
    params.tasksCompleted,
    params.maxExpectedTasks ?? 50,
    params.revenueGeneratedLamports,
    params.maxExpectedRevenueLamports ?? 1_000_000_000n, // 1 SOL
    params.uptimeBps
  );

  const burnAmount =
    (vault.inflationReserveAmount *
      BigInt(activityScore) *
      BigInt(vault.epochBurnRateBps)) /
    (10_000n * 10_000n);

  return { activityScore, estimatedBurnAmount: burnAmount };
}

/**
 * Build an agent_epoch_burn instruction.
 * Only callable by the registered agent wallet.
 */
export function buildAgentEpochBurnInstruction(
  vault: PublicKey,
  agentBinding: PublicKey,
  inflationReserveAccount: PublicKey,
  baseMint: PublicKey,
  agentSigner: PublicKey,
  params: AgentEpochBurnParams,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [epochRecord] = deriveEpochRecordPda(vault);

  const data = Buffer.alloc(8 + 4 + 8 + 2);
  Buffer.from([7, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0); // discriminator
  data.writeUInt32LE(params.tasksCompleted, 8);
  data.writeBigUInt64LE(params.revenueGeneratedLamports, 12);
  data.writeUInt16LE(params.uptimeBps, 20);

  const SYSVAR_CLOCK = new PublicKey("SysvarC1ock11111111111111111111111111111111");

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: agentBinding, isSigner: false, isWritable: false },
      { pubkey: epochRecord, isSigner: false, isWritable: true },
      { pubkey: inflationReserveAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: true },
      { pubkey: agentSigner, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 80_000 };
}

// ─── Behavioral Fingerprint Burn ──────────────────────────────────────────────

export interface BehaviorBurnParams {
  targetWallet: PublicKey;
  tradeCountLast60Slots: number;
  avgHoldSlots: bigint;
  normalizedPositionBps: number;
  rewardsEscrow: PublicKey;
  baseMint: PublicKey;
}

/**
 * Estimate behavioral score and potential reward burn.
 */
export function estimateBehavioralBurn(
  params: BehaviorBurnParams,
  pendingRewards: bigint
): { behaviorScore: number; rewardBurnAmount: bigint; isBotFlagged: boolean } {
  const { computeBehaviorScore: cbs, BOT_THRESHOLD_SCORE, BOT_REWARD_PENALTY_BPS } =
    // inline to avoid circular
    {
      computeBehaviorScore: (t: number, a: bigint, p: number) =>
        Math.round(
          Math.min((t / 30) * 10_000, 10_000) * 0.5 +
          (Number(a) < 3 ? 10_000 : Math.max(0, 10_000 - Number(a) * 50)) * 0.35 +
          Math.min((p / 1_000) * 5_000, 5_000) * 0.15
        ),
      BOT_THRESHOLD_SCORE: 7_500,
      BOT_REWARD_PENALTY_BPS: 2_500,
    };

  const score = cbs(
    params.tradeCountLast60Slots,
    params.avgHoldSlots,
    params.normalizedPositionBps
  );
  const isBotFlagged = score >= BOT_THRESHOLD_SCORE;
  const rewardBurnAmount = isBotFlagged
    ? (pendingRewards * BigInt(BOT_REWARD_PENALTY_BPS)) / 10_000n
    : 0n;

  return { behaviorScore: score, rewardBurnAmount, isBotFlagged };
}

/**
 * Build a behavioral_burn instruction.
 * Permissionless — anyone can report trade data for a wallet.
 */
export function buildBehavioralBurnInstruction(
  vault: PublicKey,
  params: BehaviorBurnParams,
  caller: PublicKey,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [walletBehavior] = deriveWalletBehaviorPda(params.targetWallet);

  const data = Buffer.alloc(8 + 4 + 8 + 2);
  Buffer.from([5, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0); // discriminator
  data.writeUInt32LE(params.tradeCountLast60Slots, 8);
  data.writeBigUInt64LE(params.avgHoldSlots, 12);
  data.writeUInt16LE(params.normalizedPositionBps, 20);

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: walletBehavior, isSigner: false, isWritable: true },
      { pubkey: params.targetWallet, isSigner: false, isWritable: false },
      { pubkey: params.rewardsEscrow, isSigner: false, isWritable: true },
      { pubkey: params.baseMint, isSigner: false, isWritable: true },
      { pubkey: caller, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 60_000 };
}

// helper re-exported from pda for convenience
function deriveVaultAuthorityPda(vault: PublicKey): [PublicKey, number] {
  const { VAULT_AUTH_SEED, CLAWD_PROTOCOL_PROGRAM_ID: prog } =
    require("../constants.js") as typeof import("../constants.js");
  return PublicKey.findProgramAddressSync([VAULT_AUTH_SEED, vault.toBytes()], prog);
}
