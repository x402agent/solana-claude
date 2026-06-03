// Helius DAS + Solana RPC client. Uses HELIUS_API_KEY (and optional
// HELIUS_RPC_URL override) from config/env. Handles JSON-RPC POST requests
// to the mainnet Helius endpoint by default.

const DEFAULT_BASE = 'https://mainnet.helius-rpc.com';
const DEFAULT_TIMEOUT_MS = 20_000;

export interface HeliusOptions {
  apiKey: string;
  rpcUrl?: string;
  timeoutMs?: number;
}

export class HeliusError extends Error {
  readonly code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

export class HeliusClient {
  private readonly url: string;
  private readonly timeoutMs: number;

  constructor(opts: HeliusOptions) {
    if (!opts.apiKey) throw new HeliusError('HELIUS_API_KEY is not set');
    const base = opts.rpcUrl?.replace(/\/$/, '') ?? DEFAULT_BASE;
    this.url = base.includes('api-key=') ? base : `${base}/?api-key=${opts.apiKey}`;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async rpc<T>(method: string, params: unknown): Promise<T> {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.url, {
        signal: ctl.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'clawd', method, params }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new HeliusError(`${res.status} ${res.statusText} ${body.slice(0, 200)}`, res.status);
      }
      const json = (await res.json()) as { result?: T; error?: { code?: number; message?: string } };
      if (json.error) throw new HeliusError(json.error.message ?? 'rpc error', json.error.code);
      return json.result as T;
    } finally {
      clearTimeout(t);
    }
  }

  // ── DAS ───────────────────────────────────────────────────────────────
  getAsset(id: string): Promise<DasAsset> {
    return this.rpc<DasAsset>('getAsset', { id });
  }

  getAssetBatch(ids: string[]): Promise<DasAsset[]> {
    return this.rpc<DasAsset[]>('getAssetBatch', { ids });
  }

  getAssetsByOwner(opts: {
    ownerAddress: string;
    page?: number;
    limit?: number;
    showFungible?: boolean;
    showNativeBalance?: boolean;
    showInscription?: boolean;
  }): Promise<DasAssetList> {
    const { ownerAddress, page = 1, limit = 100 } = opts;
    return this.rpc<DasAssetList>('getAssetsByOwner', {
      ownerAddress,
      page,
      limit,
      displayOptions: {
        showFungible: opts.showFungible ?? true,
        showNativeBalance: opts.showNativeBalance ?? true,
        showInscription: opts.showInscription ?? false,
      },
    });
  }

  searchAssets(params: SearchAssetsParams): Promise<DasAssetList> {
    return this.rpc<DasAssetList>('searchAssets', params);
  }

  getAssetsByGroup(groupValue: string, page = 1, limit = 100): Promise<DasAssetList> {
    return this.rpc<DasAssetList>('getAssetsByGroup', {
      groupKey: 'collection',
      groupValue,
      page,
      limit,
    });
  }

  getAssetsByCreator(creatorAddress: string, onlyVerified = true, page = 1, limit = 100) {
    return this.rpc<DasAssetList>('getAssetsByCreator', {
      creatorAddress,
      onlyVerified,
      page,
      limit,
    });
  }

  getSignaturesForAsset(id: string, page = 1, limit = 50): Promise<DasSignatures> {
    return this.rpc<DasSignatures>('getSignaturesForAsset', { id, page, limit });
  }

  // ── SPL token RPC ─────────────────────────────────────────────────────
  getTokenSupply(mint: string): Promise<RpcTokenAmountResult> {
    return this.rpc<RpcTokenAmountResult>('getTokenSupply', [mint]);
  }

  getTokenLargestAccounts(mint: string): Promise<RpcLargestAccountsResult> {
    return this.rpc<RpcLargestAccountsResult>('getTokenLargestAccounts', [mint]);
  }

  // ── Native SOL ────────────────────────────────────────────────────────
  getBalance(address: string): Promise<{ value: number }> {
    return this.rpc<{ value: number }>('getBalance', [address]);
  }
}

export interface DasAsset {
  id: string;
  interface?: string;
  content?: {
    metadata?: { name?: string; symbol?: string; description?: string };
    links?: { image?: string; external_url?: string };
  };
  authorities?: Array<{ address: string; scopes?: string[] }>;
  compression?: { compressed?: boolean; tree?: string; leaf_id?: number };
  grouping?: Array<{ group_key: string; group_value: string }>;
  royalty?: { basis_points?: number; percent?: number };
  creators?: Array<{ address: string; verified?: boolean; share?: number }>;
  ownership?: { owner?: string; frozen?: boolean; delegated?: boolean };
  burnt?: boolean;
  token_info?: {
    symbol?: string;
    balance?: number;
    supply?: number;
    decimals?: number;
    token_program?: string;
    associated_token_address?: string;
    price_info?: { price_per_token?: number; total_price?: number; currency?: string };
  };
  inscription?: { order?: number; size?: number; contentType?: string };
  spl20?: Record<string, unknown>;
}

export interface DasAssetList {
  total?: number;
  limit?: number;
  page?: number;
  cursor?: string;
  items: DasAsset[];
  nativeBalance?: { lamports?: number; price_per_sol?: number; total_price?: number };
  grand_total?: number;
}

export interface SearchAssetsParams {
  ownerAddress?: string;
  tokenType?: 'fungible' | 'nonFungible' | 'regularNft' | 'compressedNft' | 'all';
  grouping?: [string, string];
  compressed?: boolean;
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
  sortBy?: { sortBy: string; sortDirection: 'asc' | 'desc' };
  displayOptions?: {
    showNativeBalance?: boolean;
    showCollectionMetadata?: boolean;
    showGrandTotal?: boolean;
    showInscription?: boolean;
  };
}

export interface DasSignatures {
  total?: number;
  limit?: number;
  page?: number;
  items: Array<[string, string]>;
}

export interface RpcTokenAmountResult {
  context?: { slot: number };
  value: { amount: string; decimals: number; uiAmount: number; uiAmountString: string };
}

export interface RpcLargestAccountsResult {
  context?: { slot: number };
  value: Array<{ address: string; amount: string; decimals: number; uiAmount: number; uiAmountString: string }>;
}
