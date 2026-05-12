/**
 * @agentwallet/core — Vault implementation
 * Encrypted wallet storage with AES-256-GCM
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { WalletEntry, WalletInfo, VaultConfig, VaultEnvelope, ChainType } from "./types.js";
import { deriveKey, encrypt, decrypt, generateId, toHex, fromHex } from "./crypto.js";

const VAULT_VERSION = 1;

/**
 * Default vault configuration from environment variables.
 */
export function defaultVaultConfig(): VaultConfig {
  const home = homedir();
  let passphrase = process.env.VAULT_PASSPHRASE;
  if (!passphrase) {
    passphrase = process.env.SOLANA_PRIVATE_KEY; // fallback derivation seed
  }
  if (!passphrase) {
    passphrase = "agentwallet-vault-default";
    console.warn("[VAULT] ⚠️  Using default passphrase. Set VAULT_PASSPHRASE for production.");
  }
  return {
    storePath: join(home, ".agentwallet", "vault"),
    passphrase,
  };
}

/**
 * Vault manages encrypted wallet storage.
 */
export class Vault {
  private wallets: Map<string, WalletEntry> = new Map();
  private masterKey: Buffer;
  private storePath: string;
  private initialized: boolean = false;

  private constructor(config: VaultConfig) {
    this.masterKey = deriveKey(config.passphrase);
    this.storePath = config.storePath;
  }

  /**
   * Create or load a wallet vault.
   */
  static async create(config?: VaultConfig): Promise<Vault> {
    const cfg = config ?? defaultVaultConfig();
    await mkdir(cfg.storePath, { recursive: true, mode: 0o700 });

    const vault = new Vault(cfg);
    await vault.load();
    vault.initialized = true;

    console.log(`[VAULT] 🔐 Vault initialized (${vault.wallets.size} wallets) at ${cfg.storePath}`);
    return vault;
  }

  /**
   * Add a new wallet to the vault.
   */
  async addWallet(
    id: string | undefined,
    label: string,
    chainType: ChainType,
    chainId: number,
    address: string,
    privateKey: Uint8Array
  ): Promise<WalletEntry> {
    const walletId = id ?? generateId(8);
    
    const { ciphertext, nonce } = encrypt(Buffer.from(privateKey), this.masterKey);

    const entry: WalletEntry = {
      id: walletId,
      label,
      chainType,
      chainId,
      address,
      encryptedKey: toHex(ciphertext),
      nonce: toHex(nonce),
      createdAt: new Date().toISOString(),
      paused: false,
    };

    this.wallets.set(walletId, entry);
    await this.save();

    return entry;
  }

  /**
   * Get a wallet entry by ID (without private key).
   */
  getWallet(id: string): WalletInfo | undefined {
    const entry = this.wallets.get(id);
    if (!entry) return undefined;
    return this.toWalletInfo(entry);
  }

  /**
   * Get all wallet entries (without private keys).
   */
  listWallets(): WalletInfo[] {
    return Array.from(this.wallets.values()).map(this.toWalletInfo);
  }

  /**
   * Decrypt and return the private key for a wallet.
   */
  getPrivateKey(id: string): Uint8Array {
    const entry = this.wallets.get(id);
    if (!entry) {
      throw new Error(`Wallet ${id} not found`);
    }
    if (entry.paused) {
      throw new Error(`Wallet ${id} is paused`);
    }

    const ciphertext = fromHex(entry.encryptedKey);
    const nonce = fromHex(entry.nonce);
    return decrypt(ciphertext, nonce, this.masterKey);
  }

  /**
   * Pause a wallet (freeze operations).
   */
  async pauseWallet(id: string): Promise<void> {
    const entry = this.wallets.get(id);
    if (!entry) {
      throw new Error(`Wallet ${id} not found`);
    }
    entry.paused = true;
    await this.save();
  }

  /**
   * Unpause a wallet.
   */
  async unpauseWallet(id: string): Promise<void> {
    const entry = this.wallets.get(id);
    if (!entry) {
      throw new Error(`Wallet ${id} not found`);
    }
    entry.paused = false;
    await this.save();
  }

  /**
   * Delete a wallet from the vault.
   */
  async deleteWallet(id: string): Promise<void> {
    if (!this.wallets.has(id)) {
      throw new Error(`Wallet ${id} not found`);
    }
    this.wallets.delete(id);
    await this.save();
  }

  /**
   * Export vault data as encrypted JSON (for backup/transfer).
   */
  async exportVault(): Promise<string> {
    const data = JSON.stringify(Object.fromEntries(this.wallets), null, 2);
    const { ciphertext, nonce } = encrypt(Buffer.from(data), this.masterKey);
    
    const envelope: VaultEnvelope = {
      data: toHex(ciphertext),
      nonce: toHex(nonce),
      version: VAULT_VERSION,
    };
    
    return JSON.stringify(envelope, null, 2);
  }

  /**
   * Import vault data from encrypted JSON.
   */
  async importVault(encryptedData: string): Promise<number> {
    const envelope: VaultEnvelope = JSON.parse(encryptedData);
    
    if (envelope.version !== VAULT_VERSION) {
      throw new Error(`Unsupported vault version: ${envelope.version}`);
    }

    const ciphertext = fromHex(envelope.data);
    const nonce = fromHex(envelope.nonce);
    const plaintext = decrypt(ciphertext, nonce, this.masterKey);
    
    const wallets: Record<string, WalletEntry> = JSON.parse(plaintext.toString("utf-8"));
    
    let imported = 0;
    for (const [id, entry] of Object.entries(wallets)) {
      if (!this.wallets.has(id)) {
        this.wallets.set(id, entry);
        imported++;
      }
    }
    
    await this.save();
    return imported;
  }

  // ── Persistence ──────────────────────────────────────────────────

  private get vaultFile(): string {
    return join(this.storePath, "wallets.enc.json");
  }

  private async save(): Promise<void> {
    const data = JSON.stringify(Object.fromEntries(this.wallets), null, 2);
    const { ciphertext, nonce } = encrypt(Buffer.from(data), this.masterKey);

    const envelope: VaultEnvelope = {
      data: toHex(ciphertext),
      nonce: toHex(nonce),
      version: VAULT_VERSION,
    };

    await writeFile(this.vaultFile, JSON.stringify(envelope, null, 2), { mode: 0o600 });
  }

  private async load(): Promise<void> {
    try {
      const raw = await readFile(this.vaultFile, "utf-8");
      const envelope: VaultEnvelope = JSON.parse(raw);

      if (envelope.version !== VAULT_VERSION) {
        console.warn(`[VAULT] ⚠️  Vault version mismatch: ${envelope.version} != ${VAULT_VERSION}`);
      }

      const ciphertext = fromHex(envelope.data);
      const nonce = fromHex(envelope.nonce);
      const plaintext = decrypt(ciphertext, nonce, this.masterKey);

      const wallets: Record<string, WalletEntry> = JSON.parse(plaintext.toString("utf-8"));
      this.wallets = new Map(Object.entries(wallets));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`[VAULT] ⚠️  No existing vault data: ${(err as Error).message}`);
      }
    }
  }

  private toWalletInfo(entry: WalletEntry): WalletInfo {
    return {
      id: entry.id,
      label: entry.label,
      chainType: entry.chainType,
      chainId: entry.chainId,
      address: entry.address,
      createdAt: entry.createdAt,
      paused: entry.paused,
    };
  }
}