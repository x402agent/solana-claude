/**
 * Vault Client — main interface for all vault operations.
 *
 * Composes lock management, burn engine, and conviction vault into a
 * single client that mirrors the on-chain clawd_protocol instructions.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  type TransactionInstruction,
} from "@solana/web3.js";
import type {
  VaultConfig,
  VaultState,
  LockParams,
  LockPosition,
  SdkInstructions,
} from "../types/index.js";
import {
  CLAWD_PROTOCOL_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "../constants.js";
import {
  deriveVaultPda,
  deriveLockPositionPda,
  deriveEntropyStatePda,
} from "../utils/pda.js";

// ─── Vault Initialisation ─────────────────────────────────────────────────────

/**
 * Build an initialize_vault instruction.
 */
export function buildInitializeVaultInstruction(
  baseMint: PublicKey,
  vaultTokenAccount: PublicKey,
  dbcConfig: PublicKey,
  authority: PublicKey,
  config: VaultConfig,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [vaultPda] = deriveVaultPda(baseMint);

  // Serialise InitializeVaultParams
  const data = Buffer.alloc(8 + 8 + 4 + 4 + 2 + 2 + 2 + 8 + 2);
  Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0); // discriminator
  let offset = 8;
  data.writeBigUInt64LE(config.inflationReserveAmount, offset); offset += 8;
  data.writeUInt32LE(config.entropyThreshold, offset); offset += 4;
  data.writeUInt32LE(config.entropySensitivityBps, offset); offset += 4;
  data.writeUInt16LE(config.antiGravityFloorBps, offset); offset += 2;
  data.writeUInt16LE(config.antiGravityMaxStrengthBps, offset); offset += 2;
  data.writeUInt16LE(config.transferFeeBps, offset); offset += 2;
  data.writeBigUInt64LE(config.epochDurationSlots, offset); offset += 8;
  data.writeUInt16LE(config.epochBurnRateBps, offset);

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: dbcConfig, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 80_000 };
}

// ─── Lock Tokens ──────────────────────────────────────────────────────────────

/**
 * Build a lock_tokens instruction.
 */
export function buildLockTokensInstruction(
  vault: PublicKey,
  ownerTokenAccount: PublicKey,
  vaultTokenAccount: PublicKey,
  baseMint: PublicKey,
  owner: PublicKey,
  params: LockParams,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [lockPosition] = deriveLockPositionPda(vault, owner);

  // Encode LockType as u8
  const lockTypeMap = { time: 0, milestone: 1, hybrid: 2, conviction: 3 };
  const lockTypeByte = lockTypeMap[params.lockType];

  // Encode params
  const hasDuration = params.durationSlots !== undefined;
  const hasMilestoneIdx = params.milestoneConfigIndex !== undefined;
  const paramsLen = 8 + 1 + 1 + (hasDuration ? 8 : 0) + 1 + (hasMilestoneIdx ? 1 : 0);
  const data = Buffer.alloc(8 + paramsLen);
  Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0); // discriminator
  let offset = 8;
  data.writeBigUInt64LE(params.amount, offset); offset += 8;
  data.writeUInt8(lockTypeByte, offset); offset += 1;
  // option encoding: 1 byte prefix (1=Some, 0=None)
  data.writeUInt8(hasDuration ? 1 : 0, offset); offset += 1;
  if (hasDuration && params.durationSlots !== undefined) {
    data.writeBigUInt64LE(params.durationSlots, offset); offset += 8;
  }
  data.writeUInt8(hasMilestoneIdx ? 1 : 0, offset); offset += 1;
  if (hasMilestoneIdx && params.milestoneConfigIndex !== undefined) {
    data.writeUInt8(params.milestoneConfigIndex, offset);
  }

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: lockPosition, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 80_000 };
}

// ─── Unlock Tokens ────────────────────────────────────────────────────────────

/**
 * Build an unlock_tokens instruction.
 * Set forceEarlyExit=true to unlock before maturity (triggers 20% conviction burn).
 */
export function buildUnlockTokensInstruction(
  vault: PublicKey,
  ownerTokenAccount: PublicKey,
  vaultTokenAccount: PublicKey,
  burnMint: PublicKey,
  baseMint: PublicKey,
  owner: PublicKey,
  forceEarlyExit = false,
  tokenProgram = TOKEN_PROGRAM_ID
): SdkInstructions {
  const [lockPosition] = deriveLockPositionPda(vault, owner);

  const data = Buffer.alloc(8 + 1);
  Buffer.from([3, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0);
  data.writeUInt8(forceEarlyExit ? 1 : 0, 8);

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: lockPosition, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: burnMint, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 100_000 };
}

// ─── Fetch Vault State ────────────────────────────────────────────────────────

export async function fetchVaultState(
  connection: Connection,
  baseMint: PublicKey
): Promise<VaultState | null> {
  const [vaultPda] = deriveVaultPda(baseMint);
  const info = await connection.getAccountInfo(vaultPda);
  if (!info) return null;

  const d = info.data.slice(8); // skip discriminator
  let o = 0;
  const rk = () => { const pk = new PublicKey(d.slice(o, o + 32)); o += 32; return pk; };
  const r64 = () => { const v = d.readBigUInt64LE(o); o += 8; return v; };
  const r128 = () => { const lo = d.readBigUInt64LE(o); const hi = d.readBigUInt64LE(o + 8); o += 16; return lo + (hi << 64n); };
  const r32 = () => { const v = d.readUInt32LE(o); o += 4; return v; };
  const r16 = () => { const v = d.readUInt16LE(o); o += 2; return v; };
  const rOpt = <T>(read: () => T): T | undefined => { const has = d.readUInt8(o); o += 1; return has ? read() : undefined; };

  const agentBindingVal = rOpt(rk);
  return {
    baseMint: rk(),
    dbcPool: rk(),
    ...(agentBindingVal !== undefined ? { agentBinding: agentBindingVal } : {}),
    vaultTokenAccount: rk(),
    feeReserveAccount: rk(),
    inflationReserveAmount: r64(),
    totalLocked: r64(),
    totalConvictionScore: r128(),
    totalBurned: r64(),
    totalFeesCollected: r64(),
    athQuotePrice: r128(),
    entropyThreshold: r32(),
    entropySensitivityBps: r32(),
    antiGravityFloorBps: r16(),
    antiGravityMaxStrengthBps: r16(),
    transferFeeBps: r16(),
    epochDurationSlots: r64(),
    epochBurnRateBps: r16(),
  } as VaultState;
}

export async function fetchLockPosition(
  connection: Connection,
  vault: PublicKey,
  owner: PublicKey
): Promise<LockPosition | null> {
  const [lockPda] = deriveLockPositionPda(vault, owner);
  const info = await connection.getAccountInfo(lockPda);
  if (!info) return null;

  const d = info.data.slice(8);
  let o = 0;
  const rk = () => { const pk = new PublicKey(d.slice(o, o + 32)); o += 32; return pk; };
  const r64 = () => { const v = d.readBigUInt64LE(o); o += 8; return v; };
  const r8 = () => { const v = d.readUInt8(o); o += 1; return v; };
  const rOpt64 = () => { const has = d.readUInt8(o); o += 1; return has ? r64() : undefined; };
  const rOpt8 = () => { const has = d.readUInt8(o); o += 1; return has ? r8() : undefined; };
  const lockTypeMap = ["time", "milestone", "hybrid", "conviction"] as const;

  const unlockSlotVal = rOpt64();
  const milestoneIndexVal = rOpt8();
  return {
    owner: rk(),
    vault: rk(),
    lockedAmount: r64(),
    lockType: lockTypeMap[r8()] ?? "time",
    lockedAtSlot: r64(),
    ...(unlockSlotVal !== undefined ? { unlockSlot: unlockSlotVal } : {}),
    ...(milestoneIndexVal !== undefined ? { milestoneIndex: milestoneIndexVal } : {}),
    isUnlocked: r8() === 1,
  } as LockPosition;
}
