/**
 * pToken (Programmable Token) launcher.
 *
 * A pToken is a Token2022 mint with the TransferHook extension set to
 * the clawd_protocol program. On every transfer, the hook:
 *   1. Records the transfer in WalletBehavior PDAs (for behavioral burn scoring)
 *   2. Routes transfer_fee_bps of the amount into the vault fee_reserve
 *   3. Updates conviction scores for large locked positions
 *
 * This makes every token transfer "intelligent" — it feeds the vault
 * with real-time data about trading behaviour without any off-chain oracle.
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
  createInitializeTransferHookInstruction,
  createInitializeMetadataPointerInstruction,
} from "@solana/spl-token";
import type { TokenLaunchConfig, SdkInstructions } from "../types/index.js";
import { CLAWD_PROTOCOL_PROGRAM_ID } from "../constants.js";
import { deriveExtraAccountMetasPda, deriveVaultPda } from "../utils/pda.js";

export interface PTokenLaunchResult extends SdkInstructions {
  mintKeypair: Keypair;
  mintPubkey: PublicKey;
  creatorAta: PublicKey;
  extraAccountMetasPda: PublicKey;
  vaultPda: PublicKey;
  /** Call this instruction AFTER creating the mint to register hook accounts */
  initExtraMetasInstruction: TransactionInstruction;
}

/**
 * Build instructions for a pToken — Token2022 + TransferHook to clawd_protocol.
 *
 * Two transaction groups required:
 *   Tx 1: createAccount + extension initialisers + initializeMint + createATA + mintTo
 *   Tx 2: initialize_extra_account_meta_list (registers vault + behavior PDAs with hook)
 */
export async function buildPTokenLaunchInstructions(
  connection: Connection,
  payer: PublicKey,
  config: TokenLaunchConfig,
  feeReserveAccount: PublicKey
): Promise<PTokenLaunchResult> {
  if (config.standard !== "ptoken") {
    throw new Error("Use buildToken2022LaunchInstructions for non-ptoken");
  }

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const ext = config.extensions ?? {};
  const transferFeeBps = ext.transferFee?.feeBps ?? 100; // default 1%

  const extensionTypes: ExtensionType[] = [
    ExtensionType.TransferFeeConfig,
    ExtensionType.TransferHook,
    ExtensionType.MetadataPointer,
  ];

  const mintLen = getMintLen(extensionTypes);
  const mintRent = await connection.getMinimumBalanceForRentExemption(mintLen);

  const instructions: TransactionInstruction[] = [];

  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      lamports: mintRent,
      space: mintLen,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // Transfer fee config (routes fee to vault fee_reserve via hook)
  instructions.push(
    createInitializeTransferFeeConfigInstruction(
      mint,
      payer, // transferFeeConfigAuthority
      payer, // withdrawWithheldAuthority
      transferFeeBps,
      ext.transferFee?.maxFee ?? BigInt("18446744073709551615"),
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Transfer hook — points to clawd_protocol
  instructions.push(
    createInitializeTransferHookInstruction(
      mint,
      payer, // authority that can update the hook program
      CLAWD_PROTOCOL_PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Metadata pointer — points to mint itself (self-describing)
  instructions.push(
    createInitializeMetadataPointerInstruction(
      mint,
      payer,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Initialize mint
  instructions.push(
    createInitializeMintInstruction(
      mint,
      config.decimals,
      payer,
      payer,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Creator ATA
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

  // ── Tx 2: initialize_extra_account_meta_list ────────────────────────────────
  const [extraMetasPda] = deriveExtraAccountMetasPda(mint);
  const [vaultPda] = deriveVaultPda(mint);

  const initExtraMetasData = Buffer.alloc(8);
  // discriminator: [43, 34, 13, 49, 167, 88, 235, 235]
  Buffer.from([43, 34, 13, 49, 167, 88, 235, 235]).copy(initExtraMetasData);

  const initExtraMetasInstruction: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: extraMetasPda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: vaultPda, isSigner: false, isWritable: false },
      { pubkey: feeReserveAccount, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initExtraMetasData,
  };

  return {
    instructions,
    signers: [mintKeypair],
    mintKeypair,
    mintPubkey: mint,
    creatorAta,
    extraAccountMetasPda: extraMetasPda,
    vaultPda,
    initExtraMetasInstruction,
    computeUnits: 150_000,
  };
}

/**
 * pToken transfer: builds a Token2022 transfer with hook resolution.
 * The hook automatically calls clawd_protocol.transfer_hook.
 */
export function buildPTokenTransferAccounts(
  source: PublicKey,
  destination: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  vaultPda: PublicKey,
  feeReserveAccount: PublicKey,
  sourceBehavior: PublicKey,
  destinationBehavior: PublicKey,
  extraAccountMetasPda: PublicKey
): PublicKey[] {
  // Remaining accounts for executeTransfer hook resolution:
  // [extra_metas, vault, fee_reserve, source_behavior, dest_behavior, token2022_program]
  return [
    extraAccountMetasPda,
    vaultPda,
    feeReserveAccount,
    sourceBehavior,
    destinationBehavior,
    TOKEN_2022_PROGRAM_ID,
  ];
}
