/**
 * Signing helpers.
 *
 * The aggregator never sees private keys. It produces partially-signed
 * transactions (base64) that the caller signs in their own wallet runtime
 * (browser wallet adapter, Phantom, hardware wallet, or a Node Keypair).
 *
 * These helpers cover the small surface needed: decoding a base64 tx into
 * the version-aware Solana Web3 type, signing with an arbitrary signer
 * function, and serialising back for submission via the venue/router RPC.
 */

export type Base64Tx = string;

export interface SignerLike {
  /** Returns the public key as a base58 string. */
  publicKey(): string;
  /** Sign raw bytes; returns the 64-byte signature. */
  signMessage(bytes: Uint8Array): Promise<Uint8Array>;
  /** Sign a serialised v0/legacy transaction; returns the fully signed bytes. */
  signTransaction(txBytes: Uint8Array): Promise<Uint8Array>;
}

/** Decode a base64 string into raw bytes (works in Node and browsers). */
export function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(b64, "base64"));
  // Browser path
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/**
 * Sign a base64-encoded transaction with a SignerLike, returning the signed
 * base64 representation. The caller is responsible for actually submitting
 * the signed tx via an RPC client (we don't bundle one — Solana clients vary
 * across runtimes and we don't want to pin to a specific @solana/web3.js).
 */
export async function signBase64Transaction(
  txBase64: Base64Tx,
  signer: SignerLike,
): Promise<Base64Tx> {
  const bytes = base64ToBytes(txBase64);
  const signed = await signer.signTransaction(bytes);
  return bytesToBase64(signed);
}

/**
 * Build the Imperial mobile-connect signing message. The caller signs this
 * string with their wallet keypair, then exchanges the resulting code +
 * signature with the Imperial /mobile/connect endpoint to mint a JWT.
 */
export function buildConnectMessage(wallet: string, nonce: string): string {
  return `imperial:mobile-connect:${wallet}:${nonce}`;
}
