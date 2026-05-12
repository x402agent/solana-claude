/**
 * @agentwallet/core — Keypair generation for Solana and EVM
 */

import type { KeypairResult } from "./types.js";

/**
 * Generate a Solana Ed25519 keypair using tweetnacl.
 * Returns the full 64-byte secret key, 32-byte public key, and base58 address.
 */
export async function generateSolanaKeypair(): Promise<KeypairResult> {
  // Dynamic imports to keep these optional
  const nacl = await import("tweetnacl");
  const bs58 = await import("bs58");

  const keypair = nacl.default.sign.keyPair();

  return {
    publicKey: bs58.default.encode(keypair.publicKey),
    privateKey: keypair.secretKey, // 64 bytes: [privkey(32) + pubkey(32)]
    address: bs58.default.encode(keypair.publicKey),
  };
}

/**
 * Import a Solana keypair from a base58-encoded private key.
 */
export async function importSolanaKeypair(base58Key: string): Promise<KeypairResult> {
  const nacl = await import("tweetnacl");
  const bs58 = await import("bs58");

  const secretKey = bs58.default.decode(base58Key);
  const keypair = nacl.default.sign.keyPair.fromSecretKey(secretKey);

  return {
    publicKey: bs58.default.encode(keypair.publicKey),
    privateKey: keypair.secretKey,
    address: bs58.default.encode(keypair.publicKey),
  };
}

/**
 * Import a Solana keypair from a Uint8Array (e.g., JSON array format from solana-keygen).
 */
export async function importSolanaKeypairFromBytes(secretBytes: Uint8Array): Promise<KeypairResult> {
  const nacl = await import("tweetnacl");
  const bs58 = await import("bs58");

  const keypair = nacl.default.sign.keyPair.fromSecretKey(secretBytes);

  return {
    publicKey: bs58.default.encode(keypair.publicKey),
    privateKey: keypair.secretKey,
    address: bs58.default.encode(keypair.publicKey),
  };
}

/**
 * Generate an EVM (Ethereum/secp256k1) keypair using ethers.js.
 * Returns the private key bytes, hex address, and compressed public key.
 */
export async function generateEVMKeypair(): Promise<KeypairResult> {
  const { HDNodeWallet } = await import("ethers");

  const wallet = HDNodeWallet.createRandom();
  const privateKeyHex = wallet.privateKey.startsWith("0x")
    ? wallet.privateKey.slice(2)
    : wallet.privateKey;

  return {
    publicKey: wallet.signingKey.publicKey,
    privateKey: Buffer.from(privateKeyHex, "hex"),
    address: wallet.address,
  };
}

/**
 * Import an EVM keypair from a hex private key.
 */
export async function importEVMKeypair(privateKeyHex: string): Promise<KeypairResult> {
  const { Wallet } = await import("ethers");

  const hex = privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`;
  const wallet = new Wallet(hex);
  const cleanHex = wallet.privateKey.startsWith("0x")
    ? wallet.privateKey.slice(2)
    : wallet.privateKey;

  return {
    publicKey: wallet.signingKey.publicKey,
    privateKey: Buffer.from(cleanHex, "hex"),
    address: wallet.address,
  };
}
