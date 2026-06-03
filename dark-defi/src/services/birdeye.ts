// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Birdeye API Service
// Solana Token Data, Prices, Trending, OHLCV, Wallet Portfolio
// ═══════════════════════════════════════════════════════════════════════════════

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  liquidity?: number;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  mc?: number; // Market cap
}

export interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  rank: number;
}

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WalletPortfolio {
  totalUsd: number;
  items: PortfolioItem[];
}

export interface PortfolioItem {
  address: string;
  symbol: string;
  name: string;
  balance: number;
  uiAmount: number;
  valueUsd: number;
  price: number;
  priceChange24h: number;
}

export interface TradeData {
  signature: string;
  blockTime: number;
  side: 'buy' | 'sell';
  price: number;
  volume: number;
  source: string;
  owner: string;
}

export class BirdeyeService {
  private apiKey: string;
  private baseUrl = 'https://public-api.birdeye.so';
  private chain = 'solana';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        headers: {
          'X-API-KEY': this.apiKey,
          'x-chain': this.chain,
        },
      });

      if (!response.ok) {
        throw new Error(`Birdeye API error: ${response.status}`);
      }

      const data = (await response.json()) as { data?: T } & T;
      return (data.data ?? data) as T;
    } catch (error) {
      console.error('[BIRDEYE] API error:', error);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Token Information
  // ─────────────────────────────────────────────────────────────────────────────

  async getTokenInfo(address: string): Promise<TokenInfo | null> {
    return this.fetch<TokenInfo>('/defi/token_overview', { address });
  }

  async getTokenPrice(address: string): Promise<{ value: number; updateTime: number } | null> {
    return this.fetch('/defi/price', { address });
  }

  async getMultipleTokenPrices(addresses: string[]): Promise<Record<string, number>> {
    const result = await this.fetch<any>('/defi/multi_price', {
      list_address: addresses.join(','),
    });
    return result || {};
  }

  async searchTokens(keyword: string, limit = 10): Promise<TokenInfo[]> {
    const result = await this.fetch<{ items: TokenInfo[] }>('/defi/v2/tokens/search', {
      keyword,
      limit,
    });
    return result?.items || [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Trending & Market Data
  // ─────────────────────────────────────────────────────────────────────────────

  async getTrendingTokens(limit = 20): Promise<TrendingToken[]> {
    const result = await this.fetch<{ tokens: TrendingToken[] }>('/defi/tokenlist', {
      sort_by: 'v24hUSD',
      sort_type: 'desc',
      offset: 0,
      limit,
    });
    return result?.tokens || [];
  }

  async getGainersLosers(type: 'gainers' | 'losers' = 'gainers', limit = 10): Promise<TokenInfo[]> {
    const result = await this.fetch<{ items: TokenInfo[] }>('/defi/v2/tokens/top_traders', {
      type,
      limit,
    });
    return result?.items || [];
  }

  async getNewListings(limit = 20): Promise<TokenInfo[]> {
    const result = await this.fetch<{ items: TokenInfo[] }>('/defi/v2/tokens/new_listing', {
      limit,
    });
    return result?.items || [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OHLCV & Price History
  // ─────────────────────────────────────────────────────────────────────────────

  async getOHLCV(
    address: string,
    timeframe: '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' = '1H',
    timeFrom?: number,
    timeTo?: number
  ): Promise<OHLCVData[]> {
    const now = Math.floor(Date.now() / 1000);
    const result = await this.fetch<{ items: OHLCVData[] }>('/defi/ohlcv', {
      address,
      type: timeframe,
      time_from: timeFrom || now - 86400, // Default: last 24h
      time_to: timeTo || now,
    });
    return result?.items || [];
  }

  async getPriceHistory(address: string, timeframe: '24h' | '7d' | '30d' = '24h'): Promise<Array<{ timestamp: number; value: number }>> {
    const intervals: Record<string, string> = {
      '24h': '15m',
      '7d': '1H',
      '30d': '4H',
    };

    const timeframes: Record<string, number> = {
      '24h': 86400,
      '7d': 604800,
      '30d': 2592000,
    };

    const now = Math.floor(Date.now() / 1000);
    const result = await this.fetch<{ items: Array<{ unixTime: number; value: number }> }>('/defi/history_price', {
      address,
      address_type: 'token',
      type: intervals[timeframe],
      time_from: now - timeframes[timeframe],
      time_to: now,
    });

    return (result?.items || []).map((item) => ({
      timestamp: item.unixTime,
      value: item.value,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Wallet Portfolio
  // ─────────────────────────────────────────────────────────────────────────────

  async getWalletPortfolio(walletAddress: string): Promise<WalletPortfolio> {
    const result = await this.fetch<any>('/v1/wallet/token_list', {
      wallet: walletAddress,
    });

    if (!result) {
      return { totalUsd: 0, items: [] };
    }

    const items: PortfolioItem[] = (result.items || []).map((item: any) => ({
      address: item.address,
      symbol: item.symbol || 'Unknown',
      name: item.name || 'Unknown Token',
      balance: item.balance || 0,
      uiAmount: item.uiAmount || 0,
      valueUsd: item.valueUsd || 0,
      price: item.priceUsd || 0,
      priceChange24h: item.priceChange24h || 0,
    }));

    return {
      totalUsd: result.totalUsd || items.reduce((sum, item) => sum + item.valueUsd, 0),
      items,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Trade Data
  // ─────────────────────────────────────────────────────────────────────────────

  async getRecentTrades(address: string, limit = 50): Promise<TradeData[]> {
    const result = await this.fetch<{ items: any[] }>('/defi/txs/token', {
      address,
      limit,
    });

    return (result?.items || []).map((item) => ({
      signature: item.txHash,
      blockTime: item.blockUnixTime,
      side: item.side,
      price: item.price,
      volume: item.volume,
      source: item.source,
      owner: item.owner,
    }));
  }

  async getWhaleTransactions(address: string, minValueUsd = 10000, limit = 20): Promise<TradeData[]> {
    const trades = await this.getRecentTrades(address, 100);
    return trades.filter((trade) => trade.volume * trade.price >= minValueUsd).slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Market Stats
  // ─────────────────────────────────────────────────────────────────────────────

  async getMarketOverview(): Promise<any> {
    return this.fetch('/defi/market_overview');
  }

  async getTokenSecurityInfo(address: string): Promise<any> {
    return this.fetch('/defi/token_security', { address });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.fetch('/defi/price', {
        address: 'So11111111111111111111111111111111111111112', // SOL
      });
      return result !== null;
    } catch {
      return false;
    }
  }

  formatPrice(price: number): string {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
  }

  formatVolume(volume: number): string {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  }

  formatPercentage(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }
}

export default BirdeyeService;
