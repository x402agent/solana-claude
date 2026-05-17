/**
 * Read SOL / USDC / $CLAWD balances for any pubkey.
 *
 * The leviathan calls this every pulse to know its depth tier.
 * Targets the Asset Signer PDA (agent's autonomous wallet) by default.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CLAWD_MINT, USDC_MINT, USDC_DECIMALS, CLAWD_DECIMALS } from '../config.js';
import { getAssociatedTokenAddress, readTokenAccountAmount } from './spl-token-lite.js';

export interface Balances {
  sol: number;
  usdc: number;
  clawd: number;
  fetchedAt: number;
}

async function tokenBalance(conn: Connection, owner: PublicKey, mint: PublicKey, decimals: number): Promise<number> {
  try {
    const ata = getAssociatedTokenAddress(mint, owner);
    const acct = await conn.getAccountInfo(ata);
    if (!acct) return 0;
    return Number(readTokenAccountAmount(acct.data)) / Math.pow(10, decimals);
  } catch (err) {
    return 0;
  }
}

export async function readBalances(rpcUrl: string, ownerPubkey: string): Promise<Balances> {
  const conn = new Connection(rpcUrl, 'confirmed');
  const owner = new PublicKey(ownerPubkey);
  const [solLamports, usdc, clawd] = await Promise.all([
    conn.getBalance(owner),
    tokenBalance(conn, owner, new PublicKey(USDC_MINT), USDC_DECIMALS),
    tokenBalance(conn, owner, new PublicKey(CLAWD_MINT), CLAWD_DECIMALS),
  ]);
  return {
    sol: solLamports / LAMPORTS_PER_SOL,
    usdc,
    clawd,
    fetchedAt: Date.now(),
  };
}
