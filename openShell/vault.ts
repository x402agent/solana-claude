/**
 * OpenShell Vault Adapter — AES-256-GCM
 *
 * Bridges the OpenShell sandbox to the agentwallet-vault encrypted key store.
 * The vault holds the Solana wallet private key in memory (AES-256-GCM encrypted
 * at rest) and exposes ONLY a sign() operation — the private key is NEVER
 * returned, logged, or passed to any external caller.
 *
 * SECURITY INVARIANTS:
 *   - No public method returns raw private key bytes.
 *   - lock() zeroes all in-memory key material.
 *   - Signing happens entirely within this module; callers receive only the
 *     base58-encoded signature.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AES_KEY_LENGTH = 32; // 256 bits
const GCM_NONCE_LENGTH = 12; // 96 bits (NIST recommended)
const GCM_TAG_LENGTH = 16; // 128-bit auth tag
const VAULT_VERSION = 1;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface VaultEnvelope {
  version: number;
  data: string; // hex-encoded AES-256-GCM ciphertext (with appended auth tag)
  nonce: string; // hex-encoded 12-byte GCM nonce
}

interface VaultPayload {
  publicKey: string; // base58
  privateKey: string; // base58 — stored only inside the encrypted envelope
  credentials?: Record<string, string>; // non-key credentials stored alongside
}

// ---------------------------------------------------------------------------
// Internal crypto helpers (mirrors packages/agentwallet/src/crypto.ts)
// ---------------------------------------------------------------------------

function deriveKey(passphrase: string): Buffer {
  return createHash("sha256").update(passphrase).digest();
}

function gcmEncrypt(
  plaintext: Buffer,
  key: Buffer,
): { ciphertext: Buffer; nonce: Buffer } {
  const nonce = randomBytes(GCM_NONCE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Append auth tag to ciphertext (same convention as agentwallet)
  return { ciphertext: Buffer.concat([encrypted, tag]), nonce };
}

function gcmDecrypt(ciphertext: Buffer, nonce: Buffer, key: Buffer): Buffer {
  const encrypted = ciphertext.subarray(0, ciphertext.length - GCM_TAG_LENGTH);
  const tag = ciphertext.subarray(ciphertext.length - GCM_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// ---------------------------------------------------------------------------
// Base58 helpers (minimal — avoids external dependencies)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(buf: Buffer): string {
  let n = BigInt("0x" + buf.toString("hex"));
  let result = "";
  const base = BigInt(58);
  while (n > 0n) {
    result = BASE58_ALPHABET[Number(n % base)] + result;
    n /= base;
  }
  // Leading zero bytes → leading '1's
  for (const byte of buf) {
    if (byte !== 0) break;
    result = "1" + result;
  }
  return result;
}

function base58Decode(str: string): Buffer {
  let n = 0n;
  const base = BigInt(58);
  for (const ch of str) {
    const idx = BASE58_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base58 character: ${ch}`);
    n = n * base + BigInt(idx);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const bytes = Buffer.from(hex, "hex");
  // Count leading '1's → leading zero bytes
  let leadingZeros = 0;
  for (const ch of str) {
    if (ch !== "1") break;
    leadingZeros++;
  }
  return Buffer.concat([Buffer.alloc(leadingZeros), bytes]);
}

// ---------------------------------------------------------------------------
// Ed25519 signing via Node.js built-in crypto
// ---------------------------------------------------------------------------

async function ed25519Sign(message: Buffer, privateKeyBytes: Buffer): Promise<Buffer> {
  const { createSign, KeyObject } = await import("node:crypto");
  // Node ≥ 15 supports Ed25519 via the webcrypto-compatible interface
  const keyObj = (KeyObject as unknown as { from: (opts: object) => unknown }).from
    ? (KeyObject as unknown as { from: (opts: object) => unknown }).from({
        format: "der",
        type: "pkcs8",
        key: privateKeyBytes,
      })
    : undefined;

  // Prefer SubtleCrypto when available (Node ≥ 18)
  if (typeof globalThis.crypto?.subtle?.sign === "function") {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      privateKeyBytes.subarray(0, 32),
      { name: "Ed25519" },
      false,
      ["sign"],
    );
    const sig = await globalThis.crypto.subtle.sign("Ed25519", cryptoKey, message);
    return Buffer.from(sig);
  }

  // Fallback: Node crypto sign with Ed25519 DER-encoded private key
  // Solana Ed25519 seed is the first 32 bytes of the 64-byte private key
  const seed = privateKeyBytes.subarray(0, 32);
  const { privateKey: nodeKey } = await import("node:crypto").then((m) =>
    m.generateKeyPairSync("ed25519", {
      privateKeyEncoding: { format: "der", type: "pkcs8" },
      publicKeyEncoding: { format: "der", type: "spki" },
    } as Parameters<typeof m.generateKeyPairSync>[1]),
  );
  void nodeKey; // unused — real signing path uses SubtleCrypto above
  void seed;

  throw new Error(
    "[vault] Ed25519 signing requires Node.js ≥ 18 with SubtleCrypto support.",
  );
}

// ---------------------------------------------------------------------------
// OpenShellVault
// ---------------------------------------------------------------------------

/**
 * AES-256-GCM vault adapter for the OpenShell sandbox.
 *
 * Lifecycle:
 *   const vault = new OpenShellVault();
 *   await vault.load();               // decrypts keystore.json into memory
 *   const sig = await vault.sign(msg); // signs without exposing private key
 *   vault.lock();                      // zeroes in-memory key material
 */
export class OpenShellVault {
  /** In-memory private key bytes — zeroed by lock(). NEVER exposed externally. */
  private privateKeyBytes: Buffer | null = null;

  /** Base58-encoded public key (safe to surface). */
  private publicKeyBase58: string | null = null;

  /** Decrypted credential store (non-key entries). */
  private credentials: Map<string, string> = new Map();

  /** Derived AES master key (kept for re-encryption if needed). */
  private masterKey: Buffer | null = null;

  /** Path of the loaded vault file. */
  private vaultPath: string | null = null;

  // ── Factory / load ────────────────────────────────────────────────────────

  /**
   * Load and decrypt the vault from `~/.openclawd/keystore.json`.
   * The passphrase is read from VAULT_PASSPHRASE or OPENCLAWD_PASSPHRASE env vars.
   *
   * Throws if the vault file is missing or the passphrase is wrong.
   */
  async load(
    vaultPath: string = join(homedir(), ".openclawd", "keystore.json"),
  ): Promise<void> {
    this.vaultPath = vaultPath;

    const passphrase = process.env.VAULT_PASSPHRASE ?? process.env.OPENCLAWD_PASSPHRASE;
    if (!passphrase) {
      throw new Error(
        "[vault] No passphrase found. Set VAULT_PASSPHRASE or OPENCLAWD_PASSPHRASE.",
      );
    }

    const raw = await readFile(vaultPath, "utf-8");
    const envelope = JSON.parse(raw) as VaultEnvelope;

    if (envelope.version !== VAULT_VERSION) {
      throw new Error(
        `[vault] Unsupported vault version: ${envelope.version} (expected ${VAULT_VERSION})`,
      );
    }

    const key = deriveKey(passphrase);
    const ciphertext = Buffer.from(envelope.data, "hex");
    const nonce = Buffer.from(envelope.nonce, "hex");

    let plaintext: Buffer;
    try {
      plaintext = gcmDecrypt(ciphertext, nonce, key);
    } catch {
      throw new Error("[vault] Decryption failed — wrong passphrase or corrupted vault.");
    }

    const payload = JSON.parse(plaintext.toString("utf-8")) as VaultPayload;

    // Decode private key — kept in memory only, never logged
    this.privateKeyBytes = base58Decode(payload.privateKey);
    this.publicKeyBase58 = payload.publicKey;
    this.masterKey = key;

    if (payload.credentials) {
      for (const [k, v] of Object.entries(payload.credentials)) {
        this.credentials.set(k, v);
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Sign a message (as Buffer or Uint8Array) with the vault's Ed25519 key.
   * Returns the base58-encoded signature.
   *
   * SECURITY: The private key never leaves this method.
   */
  async sign(message: Buffer | Uint8Array): Promise<string> {
    if (!this.privateKeyBytes) {
      throw new Error("[vault] Vault is locked or not loaded. Call load() first.");
    }
    const msgBuf = Buffer.isBuffer(message) ? message : Buffer.from(message);
    const signature = await ed25519Sign(msgBuf, this.privateKeyBytes);
    return base58Encode(signature);
  }

  /**
   * Return the base58-encoded public key.
   * Safe to surface — contains no private key material.
   */
  getPublicKey(): string {
    if (!this.publicKeyBase58) {
      throw new Error("[vault] Vault is locked or not loaded. Call load() first.");
    }
    return this.publicKeyBase58;
  }

  /**
   * Return true if the vault is loaded and the private key is in memory.
   */
  isUnlocked(): boolean {
    return this.privateKeyBytes !== null;
  }

  /**
   * Zero out all in-memory private key material.
   * After calling lock(), sign() and getPublicKey() will throw until load() is called again.
   */
  lock(): void {
    if (this.privateKeyBytes) {
      // Overwrite the buffer contents before releasing the reference
      this.privateKeyBytes.fill(0);
      this.privateKeyBytes = null;
    }
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.publicKeyBase58 = null;
    this.credentials.clear();
    this.vaultPath = null;
  }

  /**
   * Retrieve a non-key credential stored in the vault payload.
   * Returns undefined if not present or if the vault is locked.
   *
   * SECURITY: Requesting "SOLANA_PRIVATE_KEY" always returns undefined.
   */
  async getCredential(name: string): Promise<string | undefined> {
    if (name === "SOLANA_PRIVATE_KEY") {
      return undefined;
    }
    return this.credentials.get(name);
  }

  // ── Vault creation (for tooling / keygen) ─────────────────────────────────

  /**
   * Create a new vault file from a Solana keypair.
   * Used by the keygen CLI; not called during normal agent operation.
   *
   * @param publicKey  base58-encoded public key
   * @param privateKey base58-encoded 64-byte private key (NEVER logged)
   * @param passphrase encryption passphrase
   * @param outputPath path to write the encrypted vault (default: ~/.openclawd/keystore.json)
   */
  static async create(
    publicKey: string,
    privateKey: string,
    passphrase: string,
    outputPath: string = join(homedir(), ".openclawd", "keystore.json"),
  ): Promise<void> {
    const key = deriveKey(passphrase);

    const payload: VaultPayload = { publicKey, privateKey };
    const plaintext = Buffer.from(JSON.stringify(payload), "utf-8");

    const { ciphertext, nonce } = gcmEncrypt(plaintext, key);

    const envelope: VaultEnvelope = {
      version: VAULT_VERSION,
      data: ciphertext.toString("hex"),
      nonce: nonce.toString("hex"),
    };

    // Immediately zero the local copy of private key material
    plaintext.fill(0);

    await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
    await writeFile(outputPath, JSON.stringify(envelope, null, 2), { mode: 0o600 });
  }
}
