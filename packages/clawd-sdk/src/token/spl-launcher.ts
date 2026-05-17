/**
 * Standard SPL Token (Token Program) launcher.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { TokenLaunchConfig, SdkInstructions } from "../types/index.js";

export interface SplLaunchResult extends SdkInstructions {
  mintKeypair: Keypair;
  mintPubkey: PublicKey;
  creatorAta: PublicKey;
}

/**
 * Build instructions to create an SPL token mint + mint initial supply to creator.
 */
export async function buildSplLaunchInstructions(
  connection: Connection,
  payer: PublicKey,
  config: TokenLaunchConfig
): Promise<SplLaunchResult> {
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const mintLen = getMintLen([]);
  const mintRent = await connection.getMinimumBalanceForRentExemption(mintLen);

  const instructions: TransactionInstruction[] = [];

  // Create mint account
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      lamports: mintRent,
      space: mintLen,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // Initialize mint
  instructions.push(
    createInitializeMintInstruction(
      mint,
      config.decimals,
      payer, // mintAuthority
      payer  // freezeAuthority
    )
  );

  // Create creator ATA
  const creatorAta = getAssociatedTokenAddressSync(mint, payer);
  instructions.push(
    createAssociatedTokenAccountInstruction(payer, creatorAta, payer, mint)
  );

  // Mint initial supply to creator
  if (config.initialSupply > 0n) {
    instructions.push(
      createMintToInstruction(mint, creatorAta, payer, config.initialSupply)
    );
  }

  return {
    instructions,
    signers: [mintKeypair],
    mintKeypair,
    mintPubkey: mint,
    creatorAta,
    computeUnits: 80_000,
  };
}
