/**
 * OpenShell Provider Plugin — Credential Discovery
 *
 * Resolves credentials for the solana-clawd agent stack through a layered
 * discovery chain:
 *   1. Process environment variables
 *   2. ~/.openclawd/keystore.json (AES-256-GCM encrypted)
 *   3. OpenShell vault (via OpenShellVault)
 *   4. E2B sandbox injected vars
 *
 * SECURITY INVARIANT: SOLANA_PRIVATE_KEY is NEVER returned from this provider.
 * Private key material stays inside the vault; callers use vault.sign() only.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createDecipheriv, createHash, randomBytes } from "node:crypto";
import { OpenShellVault } from "./vault.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Credential names this provider resolves. */
export type CredentialName =
  | "HELIUS_API_KEY"
  | "HELIUS_RPC_URL"
  | "HELIUS_WSS_URL"
  | "ANTHROPIC_API_KEY"
  | "XAI_API_KEY"
  | "OPENROUTER_API_KEY"
  | "BIRDEYE_API_KEY"
  | "SOLANA_TRACKER_API_KEY"
  | "CONVEX_URL";

/** All credential names managed by this provider. */
const MANAGED_CREDENTIALS: ReadonlyArray<CredentialName> = [
  "HELIUS_API_KEY",
  "HELIUS_RPC_URL",
  "HELIUS_WSS_URL",
  "ANTHROPIC_API_KEY",
  "XAI_API_KEY",
  "OPENROUTER_API_KEY",
  "BIRDEYE_API_KEY",
  "SOLANA_TRACKER_API_KEY",
  "CONVEX_URL",
] as const;

/**
 * Plaintext keystore record (after decryption of keystore.json).
 * Only non-key credential fields are typed here; private key fields
 * are stripped before the record is surfaced to callers.
 */
type KeystoreRecord = {
  [K in CredentialName]?: string;
} & Record<string, unknown>;

// ---------------------------------------------------------------------------
// CredentialProvider
// ---------------------------------------------------------------------------

/**
 * Discovers and caches API credentials for the solana-clawd agent stack.
 *
 * Usage:
 *   const provider = await CredentialProvider.create();
 *   const key = provider.get("HELIUS_API_KEY");
 */
export class CredentialProvider {
  /** Resolved credential cache (populated during initialisation). */
  private readonly cache: Map<CredentialName, string> = new Map();

  /** The vault adapter — used for pubkey resolution only from this class. */
  private vault: OpenShellVault | undefined;

  private constructor() {}

  // ── Factory ─────────────────────────────────────────────────────────────

  /**
   * Build a fully-initialised CredentialProvider.
   * Never throws — returns a provider with whatever credentials were found.
   */
  static async create(vault?: OpenShellVault): Promise<CredentialProvider> {
    const provider = new CredentialProvider();
    provider.vault = vault;
    await provider.discover();
    return provider;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Return the value for the given credential name, or undefined if not found.
   *
   * SECURITY: Requesting "SOLANA_PRIVATE_KEY" always returns undefined.
   * Private key material must be accessed exclusively via vault.sign().
   */
  get(name: string): string | undefined {
    if (name === "SOLANA_PRIVATE_KEY") {
      // Hard block — private key is never surfaced through this provider.
      return undefined;
    }
    return this.cache.get(name as CredentialName);
  }

  /**
   * Return the Solana wallet public key from the vault without exposing the
   * private key.  Returns undefined if the vault is not loaded or locked.
   */
  async getWalletPublicKey(): Promise<string | undefined> {
    if (!this.vault || !this.vault.isUnlocked()) {
      return undefined;
    }
    return this.vault.getPublicKey();
  }

  /**
   * Return a list of credential names that have resolved values.
   * Values are never included — only the names.
   */
  listAvailable(): CredentialName[] {
    return Array.from(this.cache.keys());
  }

  // ── Discovery chain ──────────────────────────────────────────────────────

  /**
   * Run the full discovery chain, populating the cache.
   * Later layers overwrite earlier ones — environment variables win.
   */
  private async discover(): Promise<void> {
    // Layer 4 (lowest priority): E2B sandbox injected vars — same shape as
    // env vars but may arrive through a secondary injection mechanism.
    // We resolve these first so higher-priority layers can override.
    await this.discoverFromE2B();

    // Layer 3: OpenShell vault credentials store.
    await this.discoverFromVault();

    // Layer 2: Encrypted keystore.json on disk.
    await this.discoverFromKeystore();

    // Layer 1 (highest priority): Process environment variables.
    this.discoverFromEnv();
  }

  // ── Layer 1: Environment variables ───────────────────────────────────────

  private discoverFromEnv(): void {
    for (const name of MANAGED_CREDENTIALS) {
      const value = process.env[name];
      if (value) {
        this.cache.set(name, value);
      }
    }
  }

  // ── Layer 2: Encrypted keystore.json ─────────────────────────────────────

  private async discoverFromKeystore(): Promise<void> {
    const keystorePath = join(homedir(), ".openclawd", "keystore.json");
    try {
      const raw = await readFile(keystorePath, "utf-8");
      const envelope = JSON.parse(raw) as {
        data: string;
        nonce: string;
        version?: number;
      };

      const passphrase = process.env.VAULT_PASSPHRASE ?? process.env.OPENCLAWD_PASSPHRASE;
      if (!passphrase) {
        // Cannot decrypt without a passphrase — skip silently.
        return;
      }

      const key = createHash("sha256").update(passphrase).digest();
      const ciphertextBuf = Buffer.from(envelope.data, "hex");
      const nonce = Buffer.from(envelope.nonce, "hex");

      // AES-256-GCM: last 16 bytes are the auth tag.
      const encrypted = ciphertextBuf.subarray(0, ciphertextBuf.length - 16);
      const tag = ciphertextBuf.subarray(ciphertextBuf.length - 16);

      const decipher = createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAuthTag(tag);

      const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      const record = JSON.parse(plaintext.toString("utf-8")) as KeystoreRecord;

      for (const name of MANAGED_CREDENTIALS) {
        const value = record[name];
        if (typeof value === "string" && value) {
          this.cache.set(name, value);
        }
      }
    } catch {
      // File missing or decryption failure — silently skip this layer.
    }
  }

  // ── Layer 3: OpenShell vault ─────────────────────────────────────────────

  private async discoverFromVault(): Promise<void> {
    if (!this.vault || !this.vault.isUnlocked()) {
      return;
    }
    // The vault stores signed, encrypted credentials. We ask it for each
    // managed credential by name; it returns the plaintext value if present.
    for (const name of MANAGED_CREDENTIALS) {
      try {
        const value = await this.vault.getCredential(name);
        if (value) {
          this.cache.set(name, value);
        }
      } catch {
        // Individual credential miss — continue.
      }
    }
  }

  // ── Layer 4: E2B sandbox vars ────────────────────────────────────────────

  private async discoverFromE2B(): Promise<void> {
    // E2B injects a JSON blob at a well-known env var when running inside
    // a sandbox. Parse it and extract any matching credentials.
    const e2bJson = process.env.E2B_CREDENTIALS_JSON;
    if (!e2bJson) {
      return;
    }
    try {
      const record = JSON.parse(e2bJson) as Record<string, unknown>;
      for (const name of MANAGED_CREDENTIALS) {
        const value = record[name];
        if (typeof value === "string" && value) {
          this.cache.set(name, value);
        }
      }
    } catch {
      // Malformed JSON — skip.
    }
  }
}
