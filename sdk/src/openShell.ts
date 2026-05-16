/**
 * sdk/src/openShell.ts — OpenShell integration for the Solana Clawd SDK
 *
 * Re-exports the core OpenShell classes and provides a factory that
 * sets up the full sandbox context:
 *   - CredentialProvider (layered API key discovery)
 *   - OpenShellVault (AES-256-GCM encrypted keypair store)
 *   - NemoClient (NVIDIA NeMo inference runtime — optional)
 *
 * OpenShell provides the NVIDIA GPU sandbox layer for compute-intensive
 * agent workloads (vector search, NeMo inference, GPU trading signals).
 *
 * SECURITY INVARIANT: CredentialProvider.get('SOLANA_PRIVATE_KEY') always
 * returns undefined. Private key material is only accessible via vault.sign().
 *
 * Upstream: https://github.com/x402agent/Solana-Clawd-SDK
 */

// TODO: link after build — import { OpenShellVault } from '../../openShell/vault.js';
// TODO: link after build — import { NemoClient } from '../../openShell/nemo.js';

// Re-export CredentialProvider from openShell (exists at provider.ts).
export type { CredentialName } from '../../openShell/provider.js';
export { CredentialProvider } from '../../openShell/provider.js';

// ─── OpenShellVault re-export ─────────────────────────────────────────────────

/**
 * OpenShellVault — AES-256-GCM encrypted keypair and credential store.
 *
 * Exposes:
 *   vault.load(path?)       — decrypt and load the keystore
 *   vault.isUnlocked()      — check lock state
 *   vault.getPublicKey()    — base58 pubkey (SAFE to expose)
 *   vault.sign(msg)         — Ed25519 sign, returns base58 signature
 *   vault.getCredential(k)  — retrieve a stored API credential by name
 *
 * Private key bytes are NEVER returned from any vault method.
 *
 * TODO: link after build — export { OpenShellVault } from '../../openShell/vault.js';
 */
export interface OpenShellVaultInterface {
  /** Load and decrypt the keystore from disk. */
  load(keystorePath?: string): Promise<void>;
  /** True if the vault has been successfully unlocked. */
  isUnlocked(): boolean;
  /** Return the agent's Solana public key (base58). NEVER the private key. */
  getPublicKey(): string;
  /**
   * Sign message bytes with the agent keypair.
   * Returns a base58-encoded Ed25519 signature.
   * The private key NEVER leaves the vault.
   */
  sign(message: Buffer): Promise<string>;
  /** Retrieve an API credential stored in the vault by name. */
  getCredential(name: string): Promise<string | undefined>;
}

// ─── NemoClient stub ──────────────────────────────────────────────────────────

/**
 * NemoClient — NVIDIA NeMo inference runtime adapter.
 *
 * Used by OpenShell for GPU-accelerated model inference (embedding,
 * reranking, and custom NeMo checkpoints).
 *
 * TODO: link after build — export { NemoClient } from '../../openShell/nemo.js';
 */
export interface NemoClientInterface {
  /** Base URL of the NeMo Inference Server. */
  readonly serverUrl: string;
  /** Run embedding inference for the given texts. */
  embed(texts: string[]): Promise<number[][]>;
  /** Rerank a query against candidate passages. */
  rerank(query: string, passages: string[]): Promise<Array<{ index: number; score: number }>>;
  /** Generate text via a NeMo model. */
  generate(prompt: string, maxTokens?: number): Promise<string>;
}

// ─── OpenShellConfig ──────────────────────────────────────────────────────────

/**
 * Configuration for the full OpenShell runtime context.
 */
export interface OpenShellConfig {
  /** Path to the encrypted keystore. Defaults to ~/.openclawd/keystore.json */
  keystorePath?: string;
  /**
   * AES-256-GCM passphrase for the keystore.
   * Falls back to VAULT_PASSPHRASE or OPENCLAWD_PASSPHRASE env vars.
   */
  passphrase?: string;
  /**
   * NVIDIA NeMo Inference Server URL.
   * Required if using NeMo embedding/reranking/generation.
   * Falls back to NEMO_SERVER_URL env var.
   */
  nemoServerUrl?: string;
  /**
   * Pre-built OpenShellVault instance.
   * If provided, keystorePath and passphrase are ignored.
   */
  vault?: OpenShellVaultInterface;
}

/**
 * The full OpenShell runtime context returned by createOpenShellRuntime().
 */
export interface OpenShellRuntime {
  /** Credential provider for the agent stack. */
  credentials: import('./openShell.js').CredentialProvider;
  /**
   * Vault handle (if successfully loaded).
   * null if the keystore could not be decrypted (e.g., missing passphrase).
   */
  vault: OpenShellVaultInterface | null;
  /**
   * NeMo client (if nemoServerUrl is configured).
   * null if NeMo is not configured or the server is unreachable.
   */
  nemo: NemoClientInterface | null;
  /**
   * The agent's Solana public key, resolved from the vault.
   * 'UNSPAWNED' if no keystore exists yet.
   */
  agentPubkey: string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Set up the full OpenShell sandbox runtime context.
 *
 * This factory:
 *   1. Creates a CredentialProvider (discovers API keys from env + keystore + vault)
 *   2. Loads the OpenShellVault (if passphrase is available)
 *   3. Optionally initialises a NemoClient (if nemoServerUrl is set)
 *   4. Returns an OpenShellRuntime with all resolved handles
 *
 * The factory never throws — if any layer fails, it is null in the result.
 *
 * @example
 *   const shell = await createOpenShellRuntime({
 *     nemoServerUrl: process.env.NEMO_SERVER_URL,
 *   });
 *   console.log('Agent pubkey:', shell.agentPubkey);
 *   const apiKey = shell.credentials.get('ANTHROPIC_API_KEY');
 */
export async function createOpenShellRuntime(
  config: OpenShellConfig = {},
): Promise<OpenShellRuntime> {
  // ── Vault ───────────────────────────────────────────────────────────────
  let vault: OpenShellVaultInterface | null = config.vault ?? null;

  if (!vault) {
    try {
      // TODO: link after build — import { OpenShellVault } from '../../openShell/vault.js';
      // const v = new OpenShellVault();
      // await v.load(config.keystorePath);
      // vault = v;

      // Stub: attempt dynamic import so this works after build link.
      const mod = await import('../../openShell/vault.js' as string) as {
        OpenShellVault?: new () => OpenShellVaultInterface;
      };
      if (mod.OpenShellVault) {
        const v = new mod.OpenShellVault();
        await v.load(config.keystorePath);
        vault = v;
      }
    } catch {
      // Vault not available — continue without it.
      vault = null;
    }
  }

  // ── CredentialProvider ──────────────────────────────────────────────────
  const { CredentialProvider } = await import('./openShell.js');

  // Wrap vault in the interface expected by CredentialProvider.
  // CredentialProvider.create() accepts an OpenShellVault-compatible object.
  const vaultForProvider = vault as Parameters<typeof CredentialProvider.create>[0];
  const credentials = await CredentialProvider.create(vaultForProvider);

  // ── Agent pubkey ────────────────────────────────────────────────────────
  let agentPubkey = 'UNSPAWNED';
  if (vault?.isUnlocked()) {
    try {
      agentPubkey = vault.getPublicKey();
    } catch {
      agentPubkey = 'UNSPAWNED';
    }
  } else {
    // Try credentials provider path (reads state.json pubkey indirectly).
    const fromProvider = await credentials.getWalletPublicKey();
    if (fromProvider) agentPubkey = fromProvider;
  }

  // ── NemoClient ──────────────────────────────────────────────────────────
  let nemo: NemoClientInterface | null = null;
  const nemoUrl = config.nemoServerUrl ?? process.env['NEMO_SERVER_URL'];

  if (nemoUrl) {
    try {
      // TODO: link after build — import { NemoClient } from '../../openShell/nemo.js';
      const nemoMod = await import('../../openShell/nemo.js' as string) as {
        NemoClient?: new (url: string) => NemoClientInterface;
      };
      if (nemoMod.NemoClient) {
        nemo = new nemoMod.NemoClient(nemoUrl);
      }
    } catch {
      // NeMo module not yet available — nemo stays null.
      nemo = null;
    }
  }

  return { credentials, vault, nemo, agentPubkey };
}
