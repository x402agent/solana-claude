/**
 * Token2022 (Token Extensions Program) launcher.
 *
 * Supports the full range of Token2022 extensions:
 *   - Transfer Fee
 *   - Metadata Pointer + embedded metadata
 *   - Permanent Delegate
 *   - Non-Transferable
 *   - Interest Bearing
 *   - Mint Close Authority
 *   - Default Account State
 *
 * For Transfer Hook (pToken), see ptoken-launcher.ts.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  ExtensionType,
  getMintLen,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintCloseAuthorityInstruction,
  createInitializeDefaultAccountStateInstruction,
  AccountState,
} from "@solana/spl-token";
import type { TokenLaunchConfig, Token2022Extensions, SdkInstructions } from "../types/index.js";

export interface Token2022LaunchResult extends SdkInstructions {
  mintKeypair: Keypair;
  mintPubkey: PublicKey;
  creatorAta: PublicKey;
  extensionsEnabled: ExtensionType[];
}

/**
 * Build all instructions for a Token2022 mint with the requested extensions.
 *
 * Extension order matters for getMintLen — must be declared before createAccount.
 */
export async function buildToken2022LaunchInstructions(
  connection: Connection,
  payer: PublicKey,
  config: TokenLaunchConfig
): Promise<Token2022LaunchResult> {
  if (config.standard !== "token2022" && config.standard !== "ptoken") {
    throw new Error("Use buildSplLaunchInstructions for SPL tokens");
  }

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const extensions = config.extensions ?? {};
  const extensionTypes = resolveExtensionTypes(extensions);

  const mintLen = getMintLen(extensionTypes);
  const mintRent = await connection.getMinimumBalanceForRentExemption(mintLen);

  const instructions: TransactionInstruction[] = [];

  // Create mint account
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      lamports: mintRent,
      space: mintLen,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // ── Extension initialisers (must come before InitializeMint) ──────────────

  if (extensions.mintCloseAuthority) {
    instructions.push(
      createInitializeMintCloseAuthorityInstruction(
        mint,
        extensions.mintCloseAuthority,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  if (extensions.permanentDelegate) {
    instructions.push(
      createInitializePermanentDelegateInstruction(
        mint,
        extensions.permanentDelegate,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  if (extensions.nonTransferable) {
    instructions.push(
      createInitializeNonTransferableMintInstruction(mint, TOKEN_2022_PROGRAM_ID)
    );
  }

  if (extensions.transferFee) {
    const tf = extensions.transferFee;
    instructions.push(
      createInitializeTransferFeeConfigInstruction(
        mint,
        tf.transferFeeConfigAuthority,
        tf.withdrawWithheldAuthority,
        tf.feeBps,
        tf.maxFee,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  if (extensions.metadataPointer) {
    const mp = extensions.metadataPointer;
    instructions.push(
      createInitializeMetadataPointerInstruction(
        mint,
        mp.authority,
        mp.metadataAddress,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  if (extensions.defaultAccountState) {
    const state =
      extensions.defaultAccountState === "frozen"
        ? AccountState.Frozen
        : AccountState.Initialized;
    instructions.push(
      createInitializeDefaultAccountStateInstruction(
        mint,
        state,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Initialize the mint itself
  instructions.push(
    createInitializeMintInstruction(
      mint,
      config.decimals,
      payer,
      payer,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Create creator ATA (Token2022-aware)
  const creatorAta = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  instructions.push(
    createAssociatedTokenAccountInstruction(
      payer,
      creatorAta,
      payer,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Mint initial supply
  if (config.initialSupply > 0n) {
    instructions.push(
      createMintToInstruction(
        mint,
        creatorAta,
        payer,
        config.initialSupply,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  return {
    instructions,
    signers: [mintKeypair],
    mintKeypair,
    mintPubkey: mint,
    creatorAta,
    extensionsEnabled: extensionTypes,
    computeUnits: 120_000,
  };
}

function resolveExtensionTypes(ext: Token2022Extensions): ExtensionType[] {
  const types: ExtensionType[] = [];
  if (ext.transferFee) types.push(ExtensionType.TransferFeeConfig);
  if (ext.transferHook) types.push(ExtensionType.TransferHook);
  if (ext.permanentDelegate) types.push(ExtensionType.PermanentDelegate);
  if (ext.nonTransferable) types.push(ExtensionType.NonTransferable);
  if (ext.interestBearing) types.push(ExtensionType.InterestBearingConfig);
  if (ext.metadataPointer) types.push(ExtensionType.MetadataPointer);
  if (ext.mintCloseAuthority) types.push(ExtensionType.MintCloseAuthority);
  if (ext.defaultAccountState) types.push(ExtensionType.DefaultAccountState);
  return types;
}
