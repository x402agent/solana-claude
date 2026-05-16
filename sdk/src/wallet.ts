/**
 * sdk/src/wallet.ts — Wallet abstraction for the Solana Clawd SDK
 *
 * Provides a clean, safe interface to the agent keystore and Solana RPC.
 *
 * SECURITY INVARIANTS (never broken):
 *   - Private key bytes are NEVER returned from any method or property.
 *   - Only pubkey (string) is exposed as a public property.
 *   - Signing is handled inside the OpenShellVault; the raw secret never
 *     leaves the vault boundary.
 *   - callers who need to sign must call sign(msg) — they receive a
 *     base58-encoded signature, never the key material itself.
 *
 * Upstream: https://github.com/x402agent/Solana-Clawd-SDK
 */

import type { WalletConfig, TokenBalance, SolanaCluster } from './types.js';

// ─── AgentWallet ──────────────────────────────────────────────────────────────

/**
 * Safe wallet interface for leviathan agents.
 * Constructed via createWallet(). No private key is ever exposed.
 */
export class AgentWallet {
  /**
   * The agent's Solana public key (base58 string).
   * This is the ONLY key-related field exposed publicly.
   * Private key bytes are NEVER accessible through this class.
   */
  readonly pubkey: string;

  /** The Solana cluster this wallet is connected to. */
  readonly cluster: SolanaCluster;

  private readonly rpcUrl: string;

  /**
   * Internal signing callback.
   * Wraps vault.sign() — the raw secret key never crosses this boundary.
   * Buffer input = message bytes to sign; string output = base58 signature.
   */
  private readonly _sign: (msg: Buffer) => Promise<string>;

  /** @internal — use createWallet() factory instead */
  constructor(opts: {
    pubkey: string;
    cluster: SolanaCluster;
    rpcUrl: string;
    sign: (msg: Buffer) => Promise<string>;
  }) {
    this.pubkey = opts.pubkey;
    this.cluster = opts.cluster;
    this.rpcUrl = opts.rpcUrl;
    this._sign = opts.sign;
  }

  /**
   * Get SOL balance in lamports (raw on-chain units).
   * Use getSolBalanceSol() for human-readable SOL.
   */
  async getSolBalance(): Promise<bigint> {
    const response = await this._rpc('getBalance', [this.pubkey]);
    return BigInt(String(response));
  }

  /** Get SOL balance as a floating-point SOL value. */
  async getSolBalanceSol(): Promise<number> {
    const lamports = await this.getSolBalance();
    return Number(lamports) / 1e9;
  }

  /**
   * Get the combined SOL + USDC + $CLAWD balance summary.
   * Matches the shape returned by leviathan's wallet_brief tool.
   */
  async getBalance(): Promise<{ sol: number; usdc: number; clawd: number }> {
    const USDC_MINTS: Record<SolanaCluster, string> = {
      'devnet':       'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
      'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'testnet':      '',
    };
    const sol = await this.getSolBalanceSol();
    const usdcMint = USDC_MINTS[this.cluster];
    const usdcBalance = usdcMint ? await this.getTokenBalance(usdcMint) : null;
    return {
      sol,
      usdc: usdcBalance?.uiAmount ?? 0,
      clawd: 0, // $CLAWD mint TBD — update when deployed
    };
  }

  /**
   * Get SPL token balance for a given mint address.
   * Returns null if the wallet holds no account for this mint.
   */
  async getTokenBalance(mint: string): Promise<TokenBalance | null> {
    const tokenAccounts = await this._rpc('getTokenAccountsByOwner', [
      this.pubkey,
      { mint },
      { encoding: 'jsonParsed' },
    ]) as {
      value: Array<{
        account: {
          data: {
            parsed: {
              info: { tokenAmount: { amount: string; decimals: number; uiAmount: number } }
            }
          }
        }
      }>
    } | null;

    if (!tokenAccounts || tokenAccounts.value.length === 0) return null;
    const info = tokenAccounts.value[0]!.account.data.parsed.info;
    return {
      mint,
      symbol: mint.slice(0, 6), // short form — caller should resolve symbol separately
      amount: info.tokenAmount.amount,
      decimals: info.tokenAmount.decimals,
      uiAmount: info.tokenAmount.uiAmount,
    };
  }

  /**
   * Sign arbitrary bytes with the wallet's private key.
   * Returns the base58-encoded Ed25519 signature.
   *
   * SECURITY: The private key is NEVER exposed to callers.
   * Signing happens inside the OpenShellVault; only the signature bytes
   * cross the vault boundary.
   *
   * @param message — raw bytes to sign (e.g. a serialized transaction)
   * @returns base58-encoded signature string
   */
  async sign(message: Buffer): Promise<string> {
    return this._sign(message);
  }

  /**
   * A safe summary string for display/logging.
   * Contains only the pubkey and cluster — no private material.
   */
  brief(): string {
    return `pubkey=${this.pubkey} cluster=${this.cluster}`;
  }

  // ── Internal RPC helper ────────────────────────────────────────────────────

  private async _rpc(method: string, params: unknown[]): Promise<unknown> {
    const resp = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await resp.json()) as { result?: unknown; error?: { message: string } };
    if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
    return json.result;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function _rpcUrl(cluster: SolanaCluster, heliusApiKey?: string): string {
  if (heliusApiKey) {
    const net = cluster === 'mainnet-beta' ? 'mainnet' : cluster;
    return `https://${net}.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  if (cluster === 'mainnet-beta') return 'https://api.mainnet-beta.solana.com';
  if (cluster === 'devnet') return 'https://api.devnet.solana.com';
  return 'https://api.testnet.solana.com';
}

/**
 * Create an AgentWallet backed by the encrypted OpenShell keystore.
 *
 * Authentication priority:
 *   1. config.passphrase (explicit)
 *   2. VAULT_PASSPHRASE env var
 *   3. OPENCLAWD_PASSPHRASE env var
 *
 * @throws if the vault cannot be loaded or unlocked.
 *
 * @example
 *   const wallet = await createWallet({ cluster: 'devnet' });
 *   console.log('pubkey:', wallet.pubkey);
 *   const { sol, usdc } = await wallet.getBalance();
 */
export async function createWallet(config: WalletConfig = {}): Promise<AgentWallet> {
  const cluster: SolanaCluster = config.cluster ?? 'devnet';
  const heliusKey = process.env['HELIUS_API_KEY'];

  // Dynamically import vault so this module works even without the full vault
  // package present at import time (graceful dev experience).
  // TODO: link after build — import { OpenShellVault } from '../../openShell/vault.js';
  const { OpenShellVault } = await import('../../openShell/vault.js' as string) as {
    OpenShellVault: new () => {
      load(path?: string): Promise<void>;
      getPublicKey(): string;
      sign(msg: Buffer): Promise<string>;
    };
  };

  const vault = new OpenShellVault();
  await vault.load(config.keystorePath);

  const pubkey = vault.getPublicKey();
  const url = _rpcUrl(cluster, heliusKey ?? undefined);

  return new AgentWallet({
    pubkey,
    cluster,
    rpcUrl: url,
    sign: (msg) => vault.sign(msg),
  });
}
