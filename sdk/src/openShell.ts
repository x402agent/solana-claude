/**
 * sdk/src/openShell.ts — OpenShell integration re-exports for @solanaclawd/sdk
 *
 * Re-exports key classes from the openShell/ directory and provides a
 * factory that wires up the full OpenShell sandbox runtime context.
 */

export { OpenShellVault } from '../../openShell/vault.js';
export { CredentialProvider } from '../../openShell/provider.js';
export { NemoClient } from '../../openShell/nemo.js';
export type { CredentialName } from '../../openShell/provider.js';
export type {
  NemoStatus,
  NemoQueryResult,
  NemoEmbedResult,
  NemoPlanResult,
} from '../../openShell/nemo.js';

import { OpenShellVault } from '../../openShell/vault.js';
import { CredentialProvider } from '../../openShell/provider.js';
import { NemoClient } from '../../openShell/nemo.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpenShellRuntimeConfig {
  /** Path to the encrypted keystore. Default: ~/.openclawd/keystore.json */
  keystorePath?: string;
  /** AES-256-GCM passphrase. Falls back to VAULT_PASSPHRASE env var. */
  passphrase?: string;
}

export interface OpenShellRuntime {
  vault: OpenShellVault;
  credentials: CredentialProvider;
  nemo: typeof NemoClient;
  /** Wallet pubkey if vault is unlocked, else undefined. */
  walletPubkey: string | undefined;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create the full OpenShell sandbox runtime context:
 *   - AES-256-GCM vault (loads keypair, locks private key material)
 *   - CredentialProvider (layered discovery: env → keystore → vault → E2B)
 *   - NemoClient (nemoclawd CLI wrapper)
 *
 * The vault's private key is accessible only via vault.sign() — it is never
 * returned from this function or any of the returned objects.
 */
export async function createOpenShellRuntime(
  config: OpenShellRuntimeConfig = {},
): Promise<OpenShellRuntime> {
  const vault = new OpenShellVault();

  // Attempt to load the vault. If it fails (no passphrase, missing file),
  // continue with a locked vault — credentials can still be discovered from env.
  try {
    await vault.load(config.keystorePath);
  } catch {
    // Vault stays locked — credential provider will fall back to env vars
  }

  const credentials = await CredentialProvider.create(vault);

  const walletPubkey = vault.isUnlocked() ? vault.getPublicKey() : undefined;

  return {
    vault,
    credentials,
    nemo: NemoClient,
    walletPubkey,
  };
}
