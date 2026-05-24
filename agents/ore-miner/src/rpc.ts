/**
 * rpc.ts — On-chain state reader for the ORE v3 mining program.
 *
 * Deserializes Board, Round, and Miner accounts from raw binary data.
 * All u64 values returned as BigInt to avoid float precision loss.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { boardPda, minerPda, roundPda, DISC_BOARD, DISC_ROUND, DISC_MINER } from './constants.js';

export interface BoardState {
  address: string;
  roundId: bigint;
  startSlot: bigint;
  endSlot: bigint;
  epochId: bigint;
}

export interface RoundState {
  address: string;
  id: bigint;
  deployed: bigint[];   // SOL in lamports per square (25 elements)
  count: bigint[];      // unique miners per square (25 elements)
  expiresAt: bigint;
  motherlode: bigint;   // ORE in grams
  topMiner: string;
  topMinerReward: bigint;
  totalDeployed: bigint;
  totalMiners: bigint;
  totalVaulted: bigint;
  totalWinnings: bigint;
  slotHashRevealed: boolean;
  winningSquare: number | null;
}

export interface MinerState {
  address: string;
  authority: string;
  deployed: bigint[];    // SOL deployed per square this round
  cumulative: bigint[];  // cumulative SOL prior to miner's move, per square
  checkpointFee: bigint;
  checkpointId: bigint;
  rewardsSol: bigint;
  rewardsOre: bigint;
  refinedOre: bigint;
  roundId: bigint;
  lifetimeSol: bigint;
  lifetimeOre: bigint;
  lifetimeDeployed: bigint;
  checkpointNeeded: boolean;
}

function readU64LE(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

function readI64LE(buf: Buffer, offset: number): bigint {
  return buf.readBigInt64LE(offset);
}

function readPubkey(buf: Buffer, offset: number): string {
  return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

function readU64Array(buf: Buffer, offset: number, count: number): bigint[] {
  const arr: bigint[] = [];
  for (let i = 0; i < count; i++) {
    arr.push(readU64LE(buf, offset + i * 8));
  }
  return arr;
}

function checkDiscriminator(data: Buffer, expected: bigint, label: string): void {
  const disc = data.readBigUInt64LE(0);
  if (disc !== expected) {
    throw new Error(`${label}: expected discriminator ${expected}, got ${disc}`);
  }
}

export async function getBoard(conn: Connection): Promise<BoardState> {
  const [pda] = boardPda();
  const account = await conn.getAccountInfo(pda);
  if (!account) throw new Error('Board account not found');

  const buf = Buffer.from(account.data);
  checkDiscriminator(buf, DISC_BOARD, 'Board');

  // After 8-byte discriminator:
  // round_id: u64, start_slot: u64, end_slot: u64, epoch_id: u64
  return {
    address: pda.toBase58(),
    roundId: readU64LE(buf, 8),
    startSlot: readU64LE(buf, 16),
    endSlot: readU64LE(buf, 24),
    epochId: readU64LE(buf, 32),
  };
}

export async function getRound(conn: Connection, roundId: bigint): Promise<RoundState> {
  const [pda] = roundPda(roundId);
  const account = await conn.getAccountInfo(pda);
  if (!account) throw new Error(`Round ${roundId} account not found`);

  const buf = Buffer.from(account.data);
  checkDiscriminator(buf, DISC_ROUND, 'Round');

  // Layout after 8-byte discriminator:
  // id: u64                    @ 8
  // deployed: [u64; 25]        @ 16  (200 bytes)
  // slot_hash: [u8; 32]        @ 216
  // count: [u64; 25]           @ 248 (200 bytes)
  // expires_at: u64            @ 448
  // motherlode: u64            @ 456
  // rent_payer: [u8; 32]       @ 464
  // top_miner: [u8; 32]        @ 496
  // top_miner_reward: u64      @ 528
  // total_deployed: u64        @ 536
  // total_miners: u64          @ 544
  // total_vaulted: u64         @ 552
  // total_winnings: u64        @ 560

  const id = readU64LE(buf, 8);
  const deployed = readU64Array(buf, 16, 25);
  const slotHash = buf.subarray(216, 248);
  const count = readU64Array(buf, 248, 25);
  const expiresAt = readU64LE(buf, 448);
  const motherlode = readU64LE(buf, 456);
  const topMiner = readPubkey(buf, 496);
  const topMinerReward = readU64LE(buf, 528);
  const totalDeployed = readU64LE(buf, 536);
  const totalMiners = readU64LE(buf, 544);
  const totalVaulted = readU64LE(buf, 552);
  const totalWinnings = readU64LE(buf, 560);

  // Determine if slot hash is revealed and compute winning square
  const zeroHash = slotHash.every(b => b === 0);
  const ffHash = slotHash.every(b => b === 0xff);
  const revealed = !zeroHash && !ffHash;

  let winningSquare: number | null = null;
  if (revealed) {
    const r1 = slotHash.readBigUInt64LE(0);
    const r2 = slotHash.readBigUInt64LE(8);
    const r3 = slotHash.readBigUInt64LE(16);
    const r4 = slotHash.readBigUInt64LE(24);
    const rng = r1 ^ r2 ^ r3 ^ r4;
    winningSquare = Number(rng % 25n);
  }

  return {
    address: pda.toBase58(),
    id,
    deployed,
    count,
    expiresAt,
    motherlode,
    topMiner,
    topMinerReward,
    totalDeployed,
    totalMiners,
    totalVaulted,
    totalWinnings,
    slotHashRevealed: revealed,
    winningSquare,
  };
}

export async function getMiner(conn: Connection, authority: PublicKey): Promise<MinerState | null> {
  const [pda] = minerPda(authority);
  const account = await conn.getAccountInfo(pda);
  if (!account) return null;

  const buf = Buffer.from(account.data);
  checkDiscriminator(buf, DISC_MINER, 'Miner');

  // Layout after 8-byte discriminator:
  // authority: [u8; 32]        @ 8
  // deployed: [u64; 25]        @ 40   (200 bytes)
  // cumulative: [u64; 25]      @ 240  (200 bytes)
  // checkpoint_fee: u64        @ 440
  // checkpoint_id: u64         @ 448
  // last_claim_ore_at: i64     @ 456
  // last_claim_sol_at: i64     @ 464
  // rewards_factor: Numeric    @ 472  (16 bytes, I80F48)
  // rewards_sol: u64           @ 488
  // rewards_ore: u64           @ 496
  // refined_ore: u64           @ 504
  // round_id: u64              @ 512
  // lifetime_rewards_sol: u64  @ 520
  // lifetime_rewards_ore: u64  @ 528
  // lifetime_deployed: u64     @ 536

  const auth = readPubkey(buf, 8);
  const deployed = readU64Array(buf, 40, 25);
  const cumulative = readU64Array(buf, 240, 25);
  const checkpointFee = readU64LE(buf, 440);
  const checkpointId = readU64LE(buf, 448);
  const rewardsSol = readU64LE(buf, 488);
  const rewardsOre = readU64LE(buf, 496);
  const refinedOre = readU64LE(buf, 504);
  const roundId = readU64LE(buf, 512);
  const lifetimeSol = readU64LE(buf, 520);
  const lifetimeOre = readU64LE(buf, 528);
  const lifetimeDeployed = readU64LE(buf, 536);

  return {
    address: pda.toBase58(),
    authority: auth,
    deployed,
    cumulative,
    checkpointFee,
    checkpointId,
    rewardsSol,
    rewardsOre,
    refinedOre,
    roundId,
    lifetimeSol,
    lifetimeOre,
    lifetimeDeployed,
    checkpointNeeded: checkpointId < roundId,
  };
}

export async function getCurrentSlot(conn: Connection): Promise<bigint> {
  const slot = await conn.getSlot();
  return BigInt(slot);
}

export async function getSolBalance(conn: Connection, pubkey: PublicKey): Promise<bigint> {
  const bal = await conn.getBalance(pubkey);
  return BigInt(bal);
}
