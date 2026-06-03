// Birdeye API client. Uses BIRDEYE_API_KEY from config/env.
// All requests target the Solana chain by default.

const BASE = 'https://public-api.birdeye.so';
const DEFAULT_CHAIN = 'solana';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface BirdeyeOptions {
  apiKey: string;
  chain?: string;
  timeoutMs?: number;
}

export class BirdeyeError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export class BirdeyeClient {
  private readonly apiKey: string;
  private readonly chain: string;
  private readonly timeoutMs: number;

  constructor(opts: BirdeyeOptions) {
    if (!opts.apiKey) throw new BirdeyeError('BIRDEYE_API_KEY is not set');
    this.apiKey = opts.apiKey;
    this.chain = opts.chain ?? DEFAULT_CHAIN;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async get<T>(path: string, params: Record<string, unknown> = {}, chain?: string): Promise<T> {
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const res = await fetch(url.toString(), {
        signal: ctl.signal,
        headers: {
          accept: 'application/json',
          'x-chain': chain ?? this.chain,
          'X-API-KEY': this.apiKey,
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new BirdeyeError(`${res.status} ${res.statusText} ${body.slice(0, 200)}`, res.status);
      }
      const json = (await res.json()) as { success?: boolean; data?: T; message?: string };
      if (json.success === false) {
        throw new BirdeyeError(json.message ?? 'Birdeye request failed');
      }
      return (json.data ?? (json as unknown as T));
    } finally {
      clearTimeout(t);
    }
  }

  tokenOverview(address: string, frames?: string): Promise<TokenOverview> {
    return this.get<TokenOverview>('/defi/token_overview', {
      address,
      ui_amount_mode: 'scaled',
      ...(frames ? { frames } : {}),
    });
  }

  tokenMetadata(address: string): Promise<TokenMetadata> {
    return this.get<TokenMetadata>('/defi/v3/token/meta-data/single', { address });
  }

  tokenMarketData(address: string): Promise<TokenMarketData> {
    return this.get<TokenMarketData>('/defi/v3/token/market-data', {
      address,
      ui_amount_mode: 'scaled',
    });
  }

  tokenTradeData(address: string, frames?: string): Promise<TokenTradeData> {
    return this.get<TokenTradeData>('/defi/v3/token/trade-data/single', {
      address,
      ui_amount_mode: 'scaled',
      ...(frames ? { frames } : {}),
    });
  }

  tokenSecurity(address: string): Promise<Record<string, unknown>> {
    return this.get('/defi/token_security', { address });
  }

  search(keyword: string, limit = 10): Promise<SearchResponse> {
    return this.get<SearchResponse>('/defi/v3/search', {
      keyword,
      target: 'token',
      sort_by: 'volume_24h_usd',
      sort_type: 'desc',
      offset: 0,
      limit,
    });
  }

  trending(limit = 20): Promise<TrendingResponse> {
    return this.get<TrendingResponse>('/defi/token_trending', {
      sort_by: 'rank',
      sort_type: 'asc',
      offset: 0,
      limit,
    });
  }

  walletPortfolio(wallet: string): Promise<WalletPortfolio> {
    return this.get<WalletPortfolio>('/v1/wallet/token_list', { wallet });
  }
}

export interface TokenOverview {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price: number;
  marketCap?: number;
  fdv?: number;
  liquidity?: number;
  holder?: number;
  priceChange1hPercent?: number;
  priceChange24hPercent?: number;
  v24hUSD?: number;
  vBuy24hUSD?: number;
  vSell24hUSD?: number;
  trade24h?: number;
  uniqueWallet24h?: number;
  extensions?: {
    coingeckoId?: string;
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
    description?: string;
  };
}

export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo_uri?: string;
  extensions?: Record<string, string | null | undefined>;
}

export interface TokenMarketData {
  address: string;
  price: number;
  liquidity: number;
  total_supply: number;
  circulating_supply: number;
  market_cap: number;
  fdv: number;
  holder?: number;
}

export interface TokenTradeData {
  address: string;
  price: number;
  holder?: number;
  market?: number;
  last_trade_human_time?: string;
  price_change_1h_percent?: number;
  price_change_24h_percent?: number;
  unique_wallet_24h?: number;
  trade_24h?: number;
  buy_24h?: number;
  sell_24h?: number;
  volume_24h_usd?: number;
  volume_buy_24h_usd?: number;
  volume_sell_24h_usd?: number;
}

export interface SearchTokenItem {
  address: string;
  symbol?: string;
  name?: string;
  price?: number;
  liquidity?: number;
  volume_24h_usd?: number;
  market_cap?: number;
  fdv?: number;
  decimals?: number;
  network?: string;
  logo_uri?: string;
  price_change_24h_percent?: number;
}

export interface SearchResponse {
  items?: Array<{
    type: string;
    result?: SearchTokenItem[];
  }>;
}

export interface TrendingResponseItem {
  address: string;
  symbol: string;
  name: string;
  rank: number;
  price?: number;
  price24hChangePercent?: number;
  volume24hUSD?: number;
  liquidity?: number;
  marketcap?: number;
  fdv?: number;
}

export interface TrendingResponse {
  updateUnixTime?: number;
  tokens?: TrendingResponseItem[];
}

export interface WalletPortfolioItem {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: number;
  uiAmount?: number;
  chainId?: string;
  logoURI?: string;
  priceUsd?: number;
  valueUsd?: number;
}

export interface WalletPortfolio {
  wallet: string;
  totalUsd?: number;
  items?: WalletPortfolioItem[];
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaAddress(s: string): boolean {
  return BASE58.test(s);
}
