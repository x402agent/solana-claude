/**
 * @agentwallet/core — AES-256-GCM encryption module
 * Uses Node.js built-in crypto for encryption/decryption.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const AES_KEY_LENGTH = 32; // 256 bits
const GCM_NONCE_LENGTH = 12; // 96 bits (recommended for AES-GCM)
const GCM_TAG_LENGTH = 16; // 128 bits

/**
 * Derive a 32-byte AES key from a passphrase using SHA-256.
 * For production use, consider using PBKDF2/scrypt/argon2 instead.
 */
export function deriveKey(passphrase: string): Buffer {
  return createHash("sha256").update(passphrase).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns { ciphertext, nonce } as Buffers.
 */
export function encrypt(
  plaintext: Buffer | Uint8Array,
  key: Buffer
): { ciphertext: Buffer; nonce: Buffer } {
  if (key.length !== AES_KEY_LENGTH) {
    throw new Error(`AES key must be ${AES_KEY_LENGTH} bytes, got ${key.length}`);
  }

  const nonce = randomBytes(GCM_NONCE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Append the auth tag to the ciphertext
  const ciphertext = Buffer.concat([encrypted, tag]);

  return { ciphertext, nonce };
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Expects ciphertext with appended auth tag.
 */
export function decrypt(
  ciphertext: Buffer | Uint8Array,
  nonce: Buffer | Uint8Array,
  key: Buffer
): Buffer {
  if (key.length !== AES_KEY_LENGTH) {
    throw new Error(`AES key must be ${AES_KEY_LENGTH} bytes, got ${key.length}`);
  }

  const buf = Buffer.from(ciphertext);
  const encrypted = buf.subarray(0, buf.length - GCM_TAG_LENGTH);
  const tag = buf.subarray(buf.length - GCM_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Generate a random hex ID.
 */
export function generateId(bytes: number = 8): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Hex encode a buffer.
 */
export function toHex(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("hex");
}

/**
 * Hex decode a string to Buffer.
 */
export function fromHex(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}
