/**
 * @agentwallet/core — Type definitions
 */

/** Supported blockchain families */
export type ChainType = "solana" | "evm";

/** Encrypted wallet record stored in the vault */
export interface WalletEntry {
  id: string;
  label: string;
  chainType: ChainType;
  chainId: number;
  address: string;
  encryptedKey: string; // AES-256-GCM hex-encoded ciphertext
  nonce: string; // GCM nonce hex
  createdAt: string; // ISO-8601
  paused: boolean;
}

/** Public wallet info (no private key material) */
export interface WalletInfo {
  id: string;
  label: string;
  chainType: ChainType;
  chainId: number;
  address: string;
  createdAt: string;
  paused: boolean;
}

/** Vault configuration */
export interface VaultConfig {
  /** Directory path for vault data persistence */
  storePath: string;
  /** Master encryption passphrase */
  passphrase: string;
}

/** Server configuration */
export interface ServerConfig {
  /** Port to listen on (default: 9099) */
  port: number;
  /** Hostname to bind (default: "0.0.0.0") */
  host: string;
  /** API bearer token for authentication (optional) */
  apiToken?: string;
  /** Enable CORS (default: true) */
  cors: boolean;
}

/** E2B sandbox deployment configuration */
export interface E2BSandboxConfig {
  /** E2B API key */
  apiKey: string;
  /** Sandbox template ID (optional — uses default Node.js template) */
  templateId?: string;
  /** Sandbox timeout in seconds (default: 300) */
  timeout?: number;
  /** Environment variables to inject */
  envVars?: Record<string, string>;
  /** Vault passphrase for the sandbox instance */
  vaultPassphrase?: string;
  /** Port to expose the vault server on inside sandbox */
  port?: number;
}

/** Cloudflare Workers deployment configuration */
export interface CloudflareConfig {
  /** Cloudflare API token */
  apiToken: string;
  /** Cloudflare account ID */
  accountId: string;
  /** Worker name (default: "agentwallet-vault") */
  workerName?: string;
  /** KV namespace binding name */
  kvNamespace?: string;
  /** Vault passphrase (stored as Worker secret) */
  vaultPassphrase?: string;
  /** Custom domain (optional) */
  customDomain?: string;
}

/** Sandbox instance info returned after deployment */
export interface SandboxInstance {
  provider: "e2b" | "cloudflare";
  id: string;
  url: string;
  status: "running" | "deployed" | "error";
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** Keypair result from generation functions */
export interface KeypairResult {
  publicKey: string;
  privateKey: Uint8Array;
  address: string;
}

/** Vault envelope — encrypted vault file format */
export interface VaultEnvelope {
  data: string; // hex-encoded AES-256-GCM ciphertext
  nonce: string; // hex-encoded nonce
  version: number;
}
