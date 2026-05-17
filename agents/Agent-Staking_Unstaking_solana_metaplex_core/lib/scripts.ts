import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import {
  PublicKey,
  Connection,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction as web3Transaction,
} from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PROGRAM_ID as TOKEN_AUTH_RULES_ID } from "@metaplex-foundation/mpl-token-auth-rules";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import { MPL_CORE_PROGRAM_ID, fetchAsset } from "@metaplex-foundation/mpl-core";

import {
  METAPLEX,
  MPL_DEFAULT_RULE_SET,
  findTokenRecordPda,
  getAssociatedTokenAccount,
  getMasterEdition,
  getMetadata,
  getUTCTimestamps,
} from "./util";
import { GLOBAL_AUTHORITY_SEED } from "./constant";

const findGlobalPoolPda = (programId: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_AUTHORITY_SEED)],
    programId
  )[0];

export const createInitializeTx = async (
  admin: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolPda(program.programId);
  console.log("globalPool: ", globalPool.toBase58());

  const tx = await program.methods
    .initialize()
    .accounts({
      admin,
      globalPool,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
};

export const createStakeAgentTx = async (
  wallet: Wallet,
  assetStr: string,
  collectionStr: string,
  program: anchor.Program,
  connection: Connection,
  keypair: string
) => {
  const json = Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8")));
  const umi = createUmi(connection.rpcEndpoint, "finalized");

  let keyPair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(json));
  const myKeypairSigner = createSignerFromKeypair(umi, keyPair);
  umi.use(signerIdentity(myKeypairSigner));

  const asset = publicKey(assetStr);
  const collection = publicKey(collectionStr);

  const assetData = await fetchAsset(umi, asset);

  if (assetData.updateAuthority.address != collectionStr) {
    throw "collection is incorrect";
  }

  if (!assetData.freezeDelegate) {
    const userAddress = wallet.publicKey;
    const globalPool = findGlobalPoolPda(program.programId);

    if (assetData.owner !== userAddress.toBase58()) {
      throw "wallet is not the agent asset owner";
    }

    const tx = new web3Transaction();

    const txId = await program.methods
      .stakeAgent()
      .accounts({
        owner: userAddress,
        user: userAddress,
        globalPool,
        asset: asset,
        collection: collection,
        coreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    tx.add(txId);

    tx.feePayer = userAddress;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const txData = await wallet.signTransaction(tx);

    return txData.serialize({ requireAllSignatures: false });
  } else if (assetData.freezeDelegate.frozen) {
    throw "already staked";
  }
};

export const createUnstakeAgentTx = async (
  wallet: Wallet, // Owner or admin
  assetStr: string,
  collectionStr: string,
  program: anchor.Program,
  connection: Connection,
  keypair: string
) => {
  const json = Uint8Array.from(JSON.parse(fs.readFileSync(keypair, "utf-8")));
  const umi = createUmi(connection.rpcEndpoint, "finalized");

  let keyPair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(json));
  const myKeypairSigner = createSignerFromKeypair(umi, keyPair);
  umi.use(signerIdentity(myKeypairSigner));

  const asset = publicKey(assetStr);
  const assetData = await fetchAsset(umi, asset);
  const collection = publicKey(collectionStr);

  if (assetData.updateAuthority.address != collectionStr) {
    throw "collection is incorrect";
  }

  if (!assetData.freezeDelegate) {
    throw "non staked mint";
  } else {
    const userAddress = wallet.publicKey;
    const ownerAddress = new PublicKey(assetData.owner);
    const globalPool = findGlobalPoolPda(program.programId);

    const tx = new web3Transaction();

    const txId = await program.methods
      .unstakeAgent()
      .accounts({
        owner: ownerAddress,
        user: userAddress,
        globalPool,
        asset: asset,
        collection: collection,
        coreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    tx.add(txId);

    tx.feePayer = userAddress;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const txData = await wallet.signTransaction(tx);

    return txData.serialize({ requireAllSignatures: false });
  }
};

export const createLockCorenftTx = createStakeAgentTx;
export const createUnlockCorenftTx = createUnstakeAgentTx;
