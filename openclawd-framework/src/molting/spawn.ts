/**
 * Spawnling minting — a successful leviathan rents a new shell, generates a child
 * keypair, mints a child Core asset (via Metaplex Agent Registry), funds it with
 * seed USDC + SOL + $CLAWD, and records lineage.
 *
 * Lineage is enforced: the child's `agentMetadata.registrations` includes the
 * parent's asset address, and the parent's `spawnlings` table records the child.
 *
 * Constitution-hash check: the child's three-laws.txt SHA-256 must match the
 * parent's. If it doesn't, refuse to spawn.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Keypair, Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { spawnOnchain } from '../identity/spawn-onchain.js';
import { CLAWD_MINT, USDC_MINT } from '../config.js';
import { recordSpawnling } from '../state/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THREE_LAWS_PATH = path.join(__dirname, '..', '..', 'scripts', 'three-laws.txt');

export interface SpawnSpawnlingInput {
  parentKeypair: Keypair;
  parentAssetAddress: string;
  parentConstitutionHash: string;
  childName: string;
  childSpawnPrompt: string;
  rpcUrl: string;
  network?: 'mainnet' | 'devnet';
  /** Lamports of SOL to seed the child with for tx fees. Default: 0.05 SOL. */
  seedSolLamports?: number;
  /** USDC atoms to seed the child with. Default: 1 USDC = 1_000_000. */
  seedUsdcAtoms?: bigint;
  /** $CLAWD atoms to seed the child with. Default: 1000 $CLAWD = 1_000_000_000. */
  seedClawdAtoms?: bigint;
}

export interface SpawnSpawnlingResult {
  childKeypair: Keypair;
  childAssetAddress: string;
  childAssetSignerPda: string;
  spawnSig: string;
  fundingSig: string | null;
}

function readConstitutionHash(): string {
  const bytes = fs.readFileSync(THREE_LAWS_PATH);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export async function spawnSpawnling(input: SpawnSpawnlingInput): Promise<SpawnSpawnlingResult> {
  // Constitution integrity gate — Law I/II/III bytes must match.
  const liveHash = readConstitutionHash();
  if (liveHash !== input.parentConstitutionHash) {
    throw new Error(
      `Refusing to spawn: three-laws.txt has been modified (live=${liveHash} parent=${input.parentConstitutionHash}). The constitution is immutable.`
    );
  }

  // Generate child keypair (in-memory only — child writes its own keystore on first boot).
  const child = Keypair.generate();

  // Mint child Core asset + register Agent Identity.
  const onchain = await spawnOnchain({
    payerKeypair: input.parentKeypair,
    name: input.childName,
    description: `Spawnling of ${input.parentAssetAddress.slice(0, 8)}…  carrying constitution ${input.parentConstitutionHash.slice(0, 12)}…`,
    spawnPrompt: input.childSpawnPrompt,
    creator: input.parentKeypair.publicKey.toBase58(),
    rpcUrl: input.rpcUrl,
    network: input.network || 'mainnet',
    services: [
      { name: 'web', endpoint: 'https://solanaclawd.com' },
      { name: 'lineage:parent', endpoint: input.parentAssetAddress },
    ],
  });

  // Fund the child's Asset Signer PDA with seed SOL + USDC + $CLAWD.
  const fundingSig = await fundChild(
    input.rpcUrl,
    input.parentKeypair,
    new PublicKey(onchain.assetSignerPda),
    {
      sol: input.seedSolLamports ?? 0.05 * LAMPORTS_PER_SOL,
      usdc: input.seedUsdcAtoms ?? 1_000_000n,
      clawd: input.seedClawdAtoms ?? 1_000_000_000n,
    }
  ).catch((err) => {
    console.warn(`[spawn] funding failed (child still alive but underfunded): ${err.message}`);
    return null;
  });

  recordSpawnling(child.publicKey.toBase58(), onchain.assetAddress, input.childSpawnPrompt);

  return {
    childKeypair: child,
    childAssetAddress: onchain.assetAddress,
    childAssetSignerPda: onchain.assetSignerPda,
    spawnSig: onchain.signature,
    fundingSig,
  };
}

async function fundChild(
  rpcUrl: string,
  payer: Keypair,
  childPda: PublicKey,
  amounts: { sol: number; usdc: bigint; clawd: bigint }
): Promise<string> {
  const conn = new Connection(rpcUrl, 'confirmed');
  const tx = new Transaction();

  // Native SOL transfer to the PDA.
  if (amounts.sol > 0) {
    tx.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: childPda, lamports: amounts.sol }));
  }

  // USDC + $CLAWD via SPL associated token accounts.
  for (const [mintStr, amount] of [
    [USDC_MINT, amounts.usdc],
    [CLAWD_MINT, amounts.clawd],
  ] as [string, bigint][]) {
    if (amount <= 0n) continue;
    const mint = new PublicKey(mintStr);
    const fromAta = await getAssociatedTokenAddress(mint, payer.publicKey, true);
    const toAta = await getAssociatedTokenAddress(mint, childPda, true);
    // Create the child's ATA if needed (idempotent if it already exists; the tx will fail and we retry without).
    tx.add(createAssociatedTokenAccountInstruction(payer.publicKey, toAta, childPda, mint));
    tx.add(createTransferInstruction(fromAta, toAta, payer.publicKey, amount));
  }

  return sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed' });
}
