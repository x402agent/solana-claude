import { PublicKey } from '@solana/web3.js';

export const ORE_PROGRAM_ID = new PublicKey('oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv');
export const ORE_MINT = new PublicKey('oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp');
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

export const TOKEN_DECIMALS = 11;
export const LAMPORTS_PER_SOL = 1_000_000_000n;

// ORE account discriminants (steel enum variant as u64 LE)
export const DISC_BOARD = 105n;
export const DISC_ROUND = 109n;
export const DISC_MINER = 103n;
export const DISC_AUTOMATION = 100n;
export const DISC_TREASURY = 104n;

// Instruction discriminants (OreInstruction enum)
export const IX_DEPLOY = 6;
export const IX_CLAIM_SOL = 3;
export const IX_CLAIM_ORE = 4;
export const IX_CHECKPOINT = 2;
export const IX_AUTOMATE = 0;

// PDA seeds
const BOARD_SEED = Buffer.from('board');
const MINER_SEED = Buffer.from('miner');
const ROUND_SEED = Buffer.from('round');
const TREASURY_SEED = Buffer.from('treasury');
const CONFIG_SEED = Buffer.from('config');
const AUTOMATION_SEED = Buffer.from('automation');

export function boardPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([BOARD_SEED], ORE_PROGRAM_ID);
}

export function minerPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([MINER_SEED, authority.toBuffer()], ORE_PROGRAM_ID);
}

export function roundPda(roundId: bigint): [PublicKey, number] {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(roundId);
  return PublicKey.findProgramAddressSync([ROUND_SEED, idBuf], ORE_PROGRAM_ID);
}

export function treasuryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TREASURY_SEED], ORE_PROGRAM_ID);
}

export function configPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], ORE_PROGRAM_ID);
}

export function automationPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([AUTOMATION_SEED, authority.toBuffer()], ORE_PROGRAM_ID);
}

export function oreAmount(lamports: bigint): string {
  const divisor = 10n ** BigInt(TOKEN_DECIMALS);
  const whole = lamports / divisor;
  const frac = lamports % divisor;
  return `${whole}.${frac.toString().padStart(TOKEN_DECIMALS, '0').replace(/0+$/, '') || '0'}`;
}

export function solAmount(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const frac = lamports % LAMPORTS_PER_SOL;
  return `${whole}.${frac.toString().padStart(9, '0').replace(/0+$/, '') || '0'}`;
}
