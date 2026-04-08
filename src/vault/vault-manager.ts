/**
 * src/vault/vault-manager.ts — Solana-native encrypted vault manager
 *
 * Securely stores encrypted keypairs, session tokens, API secrets, and
 * other sensitive material at ~/.clawd/vault/vault.json.
 *
 * Encryption: AES-256-GCM with master key derived from a user-provided
 * passphrase via scrypt (N=2^15, r=8, p=1, keylen=32).
 *
 * Security properties:
 *  - All secrets encrypted at rest
 *  - Passphrase verified on open via sentinel value
 *  - Auto-lock after configurable inactivity (default 15 min)
 *  - No secret material is ever logged or printed
 */

import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type VaultEntryType =
  | "keypair"
  | "api_key"
  | "rpc_endpoint"
  | "webhook_secret"
  | "session_token";

export interface VaultEntry {
  id: string;
  type: VaultEntryType;
  encryptedData: string; // base64
  iv: string;            // base64
  tag: string;           // base64
  createdAt: number;     // unix ms
  label?: string;
}

/** Public-safe listing info (no encrypted fields) */
export interface VaultEntryInfo {
  id: string;
  type: VaultEntryType;
  label?: string;
  createdAt: number;
}

/** On-disk vault file format */
interface VaultFile {
  version: 1;
  salt: string;              // base64 — scrypt salt
  sentinel: VaultEntry;      // encrypted known value for passphrase validation
  entries: VaultEntry[];
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VAULT_DIR = join(homedir(), ".clawd", "vault");
const VAULT_FILE = join(VAULT_DIR, "vault.json");

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32; // AES-256

const SENTINEL_PLAINTEXT = "clawd-vault-sentinel-v1";
const DEFAULT_AUTO_LOCK_MS = 15 * 60 * 1000; // 15 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Crypto helpers (module-private)
// ─────────────────────────────────────────────────────────────────────────────

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2,
  });
}

function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decrypt(ciphertext: string, ivB64: string, tagB64: string, key: Buffer): string {
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function generateId(): string {
  return `ve-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vault file I/O
// ─────────────────────────────────────────────────────────────────────────────

async function ensureVaultDir(): Promise<void> {
  if (!existsSync(VAULT_DIR)) {
    await mkdir(VAULT_DIR, { recursive: true, mode: 0o700 });
  }
}

async function readVaultFile(): Promise<VaultFile | null> {
  try {
    const raw = await readFile(VAULT_FILE, "utf8");
    return JSON.parse(raw) as VaultFile;
  } catch {
    return null;
  }
}

async function writeVaultFile(data: VaultFile): Promise<void> {
  await ensureVaultDir();
  data.updatedAt = Date.now();
  await writeFile(VAULT_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

// ─────────────────────────────────────────────────────────────────────────────
// SolanaVault
// ─────────────────────────────────────────────────────────────────────────────

export class SolanaVault {
  private masterKey: Buffer | null = null;
  private vaultData: VaultFile | null = null;
  private lastActivity: number = Date.now();
  private autoLockMs: number;
  private autoLockTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(autoLockMs: number = DEFAULT_AUTO_LOCK_MS) {
    this.autoLockMs = autoLockMs;
  }

  // ── Static constructors ──────────────────────────────────────────────────

  /**
   * Create a brand-new vault protected by `passphrase`.
   * Throws if a vault file already exists.
   */
  static async create(passphrase: string, autoLockMs?: number): Promise<SolanaVault> {
    if (!passphrase || passphrase.length < 1) {
      throw new Error("Passphrase must not be empty");
    }

    const existing = await readVaultFile();
    if (existing) {
      throw new Error(
        `Vault already exists at ${VAULT_FILE}. Use SolanaVault.open() to unlock it.`
      );
    }

    const vault = new SolanaVault(autoLockMs);
    const salt = randomBytes(32);
    vault.masterKey = deriveKey(passphrase, salt);

    // Encrypt sentinel for passphrase validation on future opens
    const { ciphertext, iv, tag } = encrypt(SENTINEL_PLAINTEXT, vault.masterKey);
    const sentinel: VaultEntry = {
      id: "__sentinel__",
      type: "session_token",
      encryptedData: ciphertext,
      iv,
      tag,
      createdAt: Date.now(),
      label: "__sentinel__",
    };

    vault.vaultData = {
      version: 1,
      salt: salt.toString("base64"),
      sentinel,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await writeVaultFile(vault.vaultData);
    vault.touch();
    return vault;
  }

  /**
   * Open an existing vault by verifying `passphrase` against the sentinel.
   * Throws if the vault does not exist or the passphrase is incorrect.
   */
  static async open(passphrase: string, autoLockMs?: number): Promise<SolanaVault> {
    if (!passphrase || passphrase.length < 1) {
      throw new Error("Passphrase must not be empty");
    }

    const data = await readVaultFile();
    if (!data) {
      throw new Error(
        `No vault found at ${VAULT_FILE}. Use SolanaVault.create() to initialize one.`
      );
    }

    const salt = Buffer.from(data.salt, "base64");
    const key = deriveKey(passphrase, salt);

    // Validate passphrase by decrypting sentinel
    try {
      const sentinelValue = decrypt(
        data.sentinel.encryptedData,
        data.sentinel.iv,
        data.sentinel.tag,
        key
      );
      if (sentinelValue !== SENTINEL_PLAINTEXT) {
        throw new Error("Sentinel mismatch");
      }
    } catch {
      throw new Error("Invalid passphrase — unable to decrypt vault");
    }

    const vault = new SolanaVault(autoLockMs);
    vault.masterKey = key;
    vault.vaultData = data;
    vault.touch();
    return vault;
  }

  // ── Auto-lock management ─────────────────────────────────────────────────

  private touch(): void {
    this.lastActivity = Date.now();
    this.resetAutoLockTimer();
  }

  private resetAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
    }
    if (this.autoLockMs > 0) {
      this.autoLockTimer = setTimeout(() => {
        this.lock();
      }, this.autoLockMs);
      // Allow the process to exit even if timer is pending
      if (this.autoLockTimer && typeof this.autoLockTimer === "object" && "unref" in this.autoLockTimer) {
        this.autoLockTimer.unref();
      }
    }
  }

  private ensureUnlocked(): void {
    if (!this.masterKey || !this.vaultData) {
      throw new Error("Vault is locked — call SolanaVault.open() to unlock");
    }
    // Check for inactivity-based expiry (belt-and-suspenders with the timer)
    if (this.autoLockMs > 0 && Date.now() - this.lastActivity > this.autoLockMs) {
      this.lock();
      throw new Error("Vault auto-locked due to inactivity");
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Store a secret in the vault.
   * @returns The generated entry ID.
   */
  async store(type: VaultEntryType, data: string, label?: string): Promise<string> {
    this.ensureUnlocked();
    this.touch();

    const id = generateId();
    const { ciphertext, iv, tag } = encrypt(data, this.masterKey!);

    const entry: VaultEntry = {
      id,
      type,
      encryptedData: ciphertext,
      iv,
      tag,
      createdAt: Date.now(),
      ...(label ? { label } : {}),
    };

    this.vaultData!.entries.push(entry);
    await writeVaultFile(this.vaultData!);
    return id;
  }

  /**
   * Retrieve and decrypt a secret by ID.
   */
  async retrieve(id: string): Promise<string> {
    this.ensureUnlocked();
    this.touch();

    const entry = this.vaultData!.entries.find((e) => e.id === id);
    if (!entry) {
      throw new Error(`Vault entry not found: ${id}`);
    }

    return decrypt(entry.encryptedData, entry.iv, entry.tag, this.masterKey!);
  }

  /**
   * Remove an entry from the vault.
   * @returns true if the entry was found and removed.
   */
  async remove(id: string): Promise<boolean> {
    this.ensureUnlocked();
    this.touch();

    const idx = this.vaultData!.entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    this.vaultData!.entries.splice(idx, 1);
    await writeVaultFile(this.vaultData!);
    return true;
  }

  /**
   * List all entries (public metadata only — no decrypted data).
   */
  async list(): Promise<VaultEntryInfo[]> {
    this.ensureUnlocked();
    this.touch();

    return this.vaultData!.entries.map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Re-encrypt the entire vault with a new passphrase.
   * Requires the current (old) passphrase for verification.
   */
  async rotatePassphrase(oldPassphrase: string, newPassphrase: string): Promise<void> {
    this.ensureUnlocked();

    if (!newPassphrase || newPassphrase.length < 1) {
      throw new Error("New passphrase must not be empty");
    }

    // Verify old passphrase matches current key
    const oldSalt = Buffer.from(this.vaultData!.salt, "base64");
    const oldKey = deriveKey(oldPassphrase, oldSalt);
    try {
      const sentinel = decrypt(
        this.vaultData!.sentinel.encryptedData,
        this.vaultData!.sentinel.iv,
        this.vaultData!.sentinel.tag,
        oldKey
      );
      if (sentinel !== SENTINEL_PLAINTEXT) throw new Error("mismatch");
    } catch {
      throw new Error("Old passphrase is incorrect");
    }

    // Decrypt all entries with old key
    const decryptedEntries: Array<{ meta: Omit<VaultEntry, "encryptedData" | "iv" | "tag">; plaintext: string }> = [];
    for (const entry of this.vaultData!.entries) {
      const plaintext = decrypt(entry.encryptedData, entry.iv, entry.tag, this.masterKey!);
      decryptedEntries.push({
        meta: {
          id: entry.id,
          type: entry.type,
          createdAt: entry.createdAt,
          ...(entry.label ? { label: entry.label } : {}),
        },
        plaintext,
      });
    }

    // Derive new key with fresh salt
    const newSalt = randomBytes(32);
    const newKey = deriveKey(newPassphrase, newSalt);

    // Re-encrypt sentinel
    const sentinelEnc = encrypt(SENTINEL_PLAINTEXT, newKey);
    const newSentinel: VaultEntry = {
      id: "__sentinel__",
      type: "session_token",
      encryptedData: sentinelEnc.ciphertext,
      iv: sentinelEnc.iv,
      tag: sentinelEnc.tag,
      createdAt: this.vaultData!.sentinel.createdAt,
      label: "__sentinel__",
    };

    // Re-encrypt all entries
    const newEntries: VaultEntry[] = decryptedEntries.map(({ meta, plaintext }) => {
      const enc = encrypt(plaintext, newKey);
      return {
        ...meta,
        encryptedData: enc.ciphertext,
        iv: enc.iv,
        tag: enc.tag,
      };
    });

    // Update vault state
    this.masterKey = newKey;
    this.vaultData = {
      version: 1,
      salt: newSalt.toString("base64"),
      sentinel: newSentinel,
      entries: newEntries,
      createdAt: this.vaultData!.createdAt,
      updatedAt: Date.now(),
    };

    await writeVaultFile(this.vaultData);
    this.touch();
  }

  /**
   * Check if the vault is currently unlocked.
   */
  isUnlocked(): boolean {
    if (!this.masterKey || !this.vaultData) return false;
    // Also check inactivity
    if (this.autoLockMs > 0 && Date.now() - this.lastActivity > this.autoLockMs) {
      this.lock();
      return false;
    }
    return true;
  }

  /**
   * Lock the vault — wipes the master key from memory.
   * The vault must be re-opened with the passphrase to use again.
   */
  lock(): void {
    if (this.masterKey) {
      // Zero-fill the key buffer before releasing
      this.masterKey.fill(0);
    }
    this.masterKey = null;
    this.vaultData = null;
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Store a Solana keypair's secret key in the vault.
 * The Uint8Array is base64-encoded before encryption.
 */
export async function storeKeypair(
  vault: SolanaVault,
  secretKey: Uint8Array,
  label?: string
): Promise<string> {
  const encoded = Buffer.from(secretKey).toString("base64");
  return vault.store("keypair", encoded, label);
}

/**
 * Retrieve a Solana keypair's secret key from the vault.
 * Returns the raw Uint8Array.
 */
export async function retrieveKeypair(
  vault: SolanaVault,
  id: string
): Promise<Uint8Array> {
  const encoded = await vault.retrieve(id);
  return new Uint8Array(Buffer.from(encoded, "base64"));
}

/**
 * Store an API key with a service label.
 */
export async function storeApiKey(
  vault: SolanaVault,
  service: string,
  key: string
): Promise<string> {
  return vault.store("api_key", key, service);
}

/**
 * Retrieve a decrypted API key.
 */
export async function retrieveApiKey(
  vault: SolanaVault,
  id: string
): Promise<string> {
  return vault.retrieve(id);
}
