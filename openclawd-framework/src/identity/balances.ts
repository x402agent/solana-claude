/**
 * Read SOL / USDC / $CLAWD balances for any pubkey.
 *
 * The leviathan calls this every pulse to know its depth tier.
 * Targets the Asset Signer PDA (agent's autonomous wallet) by default.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { CLAWD_MINT, USDC_MINT, USDC_DECIMALS, CLAWD_DECIMALS } from '../config.js';

export interface Balances {
  sol: number;
  usdc: number;
  clawd: number;
  fetchedAt: number;
}

async function tokenBalance(conn: Connection, owner: PublicKey, mint: PublicKey, decimals: number): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner, true);
    const acct = await getAccount(conn, ata);
    return Number(acct.amount) / Math.pow(10, decimals);
  } catch (err) {
    if (err instanceof TokenAccountNotFoundError) return 0;
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
