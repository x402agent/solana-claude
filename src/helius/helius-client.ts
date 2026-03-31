/**
 * HeliusClient — base HTTP client for Helius RPC, DAS, and webhook APIs
 *
 * No private key required for read-only methods.
 * Requires HELIUS_API_KEY for enhanced endpoints.
 *
 * Docs: https://docs.helius.dev
 */

export interface HeliusConfig {
  apiKey: string;
  /** defaults to mainnet */
  cluster?: "mainnet" | "devnet";
}

export interface PriorityFeeEstimate {
  min: number;
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
  unsafeMax: number;
  /** Helius recommended — optimized for staked connections */
  recommended: number;
}

export interface HeliusWebhookConfig {
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType?: "enhanced" | "raw" | "discord";
  authHeader?: string;
}

export interface DASAsset {
  id: string;
  interface: string;
  content?: Record<string, unknown>;
  authorities?: unknown[];
  compression?: unknown;
  grouping?: unknown[];
  royalty?: unknown;
  creators?: unknown[];
  ownership?: unknown;
  supply?: unknown;
  mutable?: boolean;
}

export interface EnhancedTransaction {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers?: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData?: unknown[];
  events?: Record<string, unknown>;
}

export class HeliusClient {
  readonly rpcUrl: string;
  readonly wssUrl: string;
  readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(config: HeliusConfig) {
    this.apiKey = config.apiKey;
    const cluster = config.cluster ?? "mainnet";
    this.rpcUrl =
      process.env.HELIUS_RPC_URL ??
      `https://${cluster}.helius-rpc.com/?api-key=${config.apiKey}`;
    this.wssUrl =
      process.env.HELIUS_WSS_URL ??
      `wss://${cluster}.helius-rpc.com/?api-key=${config.apiKey}`;
    this.apiBaseUrl =
      cluster === "mainnet"
        ? `https://api-mainnet.helius-rpc.com`
        : `https://api-devnet.helius-rpc.com`;
  }

  // ── JSON-RPC ─────────────────────────────────────────────────────────────

  async rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const data = await res.json() as { result?: T; error?: { message: string; code: number } };
    if (data.error) throw new Error(`RPC ${method}: [${data.error.code}] ${data.error.message}`);
    return data.result as T;
  }

  // ── Account data ─────────────────────────────────────────────────────────

  async getAccountInfo(pubkey: string, encoding: "base64" | "jsonParsed" = "jsonParsed"): Promise<unknown> {
    return this.rpc("getAccountInfo", [pubkey, { encoding, commitment: "confirmed" }]);
  }

  async getBalance(pubkey: string): Promise<number> {
    const result = await this.rpc<number>("getBalance", [pubkey, { commitment: "confirmed" }]);
    return result / 1e9; // lamports → SOL
  }

  async getTokenAccountsByOwner(wallet: string): Promise<unknown> {
    return this.rpc("getTokenAccountsByOwner", [
      wallet,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ]);
  }

  async getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    const result = await this.rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
      "getLatestBlockhash",
      [{ commitment: "confirmed" }],
    );
    return result.value;
  }

  async getBlockHeight(): Promise<number> {
    return this.rpc<number>("getBlockHeight", [{ commitment: "confirmed" }]);
  }

  async getSignatureStatuses(signatures: string[]): Promise<unknown> {
    return this.rpc("getSignatureStatuses", [signatures, { searchTransactionHistory: true }]);
  }

  // ── Priority fees ─────────────────────────────────────────────────────────

  /**
   * Get priority fee estimate. Pass a base64-encoded serialized transaction for
   * the most accurate estimate — or omit for a leveled quote (no private key needed).
   */
  async getPriorityFeeEstimate(opts: {
    transaction?: string;
    accountKeys?: string[];
    recommended?: boolean;
  } = {}): Promise<PriorityFeeEstimate> {
    const params: Record<string, unknown> = {};
    if (opts.transaction) params.transaction = opts.transaction;
    if (opts.accountKeys) params.accountKeys = opts.accountKeys;
    params.options = { includeAllPriorityFeeLevels: true, recommended: opts.recommended ?? true };

    const result = await this.rpc<{ priorityFeeEstimate: number; priorityFeeLevels: Record<string, number> }>(
      "getPriorityFeeEstimate",
      [params],
    );

    const levels = result.priorityFeeLevels ?? {};
    return {
      min: levels.min ?? 0,
      low: levels.low ?? 0,
      medium: levels.medium ?? 0,
      high: levels.high ?? 0,
      veryHigh: levels.veryHigh ?? 0,
      unsafeMax: levels.unsafeMax ?? 0,
      recommended: result.priorityFeeEstimate ?? levels.high ?? 0,
    };
  }

  // ── Enhanced Transactions API ─────────────────────────────────────────────

  /**
   * Get parsed, enhanced transactions for an address.
   * Returns human-readable descriptions, token transfers, NFT events, etc.
   * Free on Helius — no private key needed.
   */
  async getTransactionsForAddress(
    address: string,
    opts: { limit?: number; before?: string; until?: string; type?: string } = {},
  ): Promise<EnhancedTransaction[]> {
    const params = new URLSearchParams({
      "api-key": this.apiKey,
      limit: String(opts.limit ?? 10),
      ...(opts.before ? { before: opts.before } : {}),
      ...(opts.until ? { until: opts.until } : {}),
      ...(opts.type ? { type: opts.type } : {}),
    });
    const res = await fetch(
      `${this.apiBaseUrl}/v0/addresses/${encodeURIComponent(address)}/transactions?${params}`,
    );
    if (!res.ok) throw new Error(`getTransactionsForAddress: ${res.status}`);
    return res.json() as Promise<EnhancedTransaction[]>;
  }

  // ── Digital Asset Standard (DAS) ─────────────────────────────────────────

  async getAsset(mint: string): Promise<DASAsset> {
    const result = await this.rpc<DASAsset>("getAsset", [{ id: mint }]);
    return result;
  }

  async getAssetsByOwner(wallet: string, opts: { limit?: number } = {}): Promise<{ items: DASAsset[]; total: number }> {
    const result = await this.rpc<{ items: DASAsset[]; total: number }>("getAssetsByOwner", [{
      ownerAddress: wallet,
      page: 1,
      limit: opts.limit ?? 50,
    }]);
    return result;
  }

  async searchAssets(opts: {
    ownerAddress?: string;
    tokenType?: "fungible" | "nonFungible" | "regularNFT" | "compressedNFT";
    limit?: number;
  }): Promise<{ items: DASAsset[]; total: number }> {
    return this.rpc("searchAssets", [{
      ...opts,
      page: 1,
      limit: opts.limit ?? 50,
    }]);
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────

  async createWebhook(config: HeliusWebhookConfig): Promise<{ webhookID: string; url: string }> {
    const res = await fetch(`${this.apiBaseUrl}/v0/webhooks?api-key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`createWebhook: ${res.status} — ${text}`);
    }
    return res.json() as Promise<{ webhookID: string; url: string }>;
  }

  async listWebhooks(): Promise<Array<{ webhookID: string; webhookURL: string; accountAddresses: string[] }>> {
    const res = await fetch(`${this.apiBaseUrl}/v0/webhooks?api-key=${this.apiKey}`);
    if (!res.ok) throw new Error(`listWebhooks: ${res.status}`);
    return res.json() as Promise<Array<{ webhookID: string; webhookURL: string; accountAddresses: string[] }>>;
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    const res = await fetch(`${this.apiBaseUrl}/v0/webhooks/${webhookId}?api-key=${this.apiKey}`, {
      method: "DELETE",
    });
    return res.ok;
  }

  // ── Simulation (no private key needed — useful for CU estimation) ─────────

  /**
   * Simulate a base64-encoded serialized transaction.
   * Returns unitsConsumed for compute budget optimization.
   */
  async simulateTransaction(serializedBase64: string): Promise<{
    err: unknown;
    logs: string[];
    unitsConsumed: number;
  }> {
    const result = await this.rpc<{ value: { err: unknown; logs: string[]; unitsConsumed: number } }>(
      "simulateTransaction",
      [serializedBase64, { encoding: "base64", commitment: "confirmed", replaceRecentBlockhash: true }],
    );
    return result.value;
  }
}

/** Create a HeliusClient from environment variables */
export function createHeliusClient(apiKey?: string): HeliusClient | null {
  const key = apiKey ?? process.env.HELIUS_API_KEY;
  if (!key) return null;
  return new HeliusClient({ apiKey: key });
}
