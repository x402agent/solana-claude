import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORE_PROGRAM_ID = 'oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv';
export const ORE_MINT = 'oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp';
export const ORE_DECIMALS = 11;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const PERMISSIONLESS_ORE_EXECUTOR = 'executor11111111111111111111111111111111112';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ORE_MASTER_DIR =
  process.env.OPENCLAWD_ORE_DIR ||
  path.resolve(__dirname, '..', '..', 'ore-master');

export type OreAutomationStrategy = 'random' | 'preferred' | 'discretionary';

export const ORE_AUTOMATION_STRATEGY_ID: Record<OreAutomationStrategy, number> = {
  random: 0,
  preferred: 1,
  discretionary: 2,
};

export function solToLamports(sol: number): number {
  if (!Number.isFinite(sol) || sol < 0) {
    throw new Error(`Invalid SOL amount: ${sol}`);
  }
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}
