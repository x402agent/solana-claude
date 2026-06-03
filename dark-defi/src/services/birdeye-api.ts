// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Birdeye API Service (Enhanced v3)
// Full implementation of Birdeye Data Services APIs
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// TYPES - Token Data
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenMetadata {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    extensions?: {
        coingecko_id?: string;
        website?: string;
        twitter?: string;
        discord?: string;
        telegram?: string;
        medium?: string;
        description?: string;
    };
    logo_uri?: string;
}

export interface TokenMarketData {
    address: string;
    price: number;
    liquidity: number;
    total_supply: number;
    circulating_supply: number;
    market_cap: number;
    fdv: number;
    holder: number;
    is_scaled_ui_token?: boolean;
    multiplier?: number | null;
}

export interface TokenOverview extends TokenMetadata {
    marketCap: number;
    fdv: number;
    liquidity: number;
    lastTradeUnixTime: number;
    lastTradeHumanTime: string;
    price: number;
    // Price changes by timeframe
    history1mPrice?: number;
    priceChange1mPercent?: number;
    history5mPrice?: number;
    priceChange5mPercent?: number;
    history30mPrice?: number;
    priceChange30mPercent?: number;
    history1hPrice?: number;
    priceChange1hPercent?: number;
    history2hPrice?: number;
    priceChange2hPercent?: number;
    history4hPrice?: number;
    priceChange4hPercent?: number;
    history6hPrice?: number;
    priceChange6hPercent?: number;
    history8hPrice?: number;
    priceChange8hPercent?: number;
    history12hPrice?: number;
    priceChange12hPercent?: number;
    history24hPrice?: number;
    priceChange24hPercent?: number;
    // Unique wallets
    uniqueWallet1h?: number;
    uniqueWallet24h?: number;
    uniqueWallet30d?: number;
}

export interface TokenTradeData {
    address: string;
    holder: number;
    market: number;
    last_trade_unix_time: number;
    last_trade_human_time: string;
    price: number;
    // Price history
    history_1m_price: number;
    price_change_1m_percent: number;
    history_5m_price: number;
    price_change_5m_percent: number;
    history_30m_price: number;
    price_change_30m_percent: number;
    history_1h_price: number;
    price_change_1h_percent: number;
    history_24h_price: number;
    price_change_24h_percent: number;
    // Unique wallets
    unique_wallet_1h: number;
    unique_wallet_24h: number;
    // Trade volume
    volume_1h_usd: number;
    volume_24h_usd: number;
    trade_1h_count: number;
    trade_24h_count: number;
    buy_24h: number;
    sell_24h: number;
}

export interface TokenPriceStats {
    address: string;
    is_scaled_ui_token: boolean;
    data: Array<{
        unix_time_update_price: number;
        time_frame: string;
        price: number;
        price_change_percent: number;
        high: number;
        low: number;
    }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES - Pair/Pool Data
// ─────────────────────────────────────────────────────────────────────────────

export interface PairToken {
    address: string;
    decimals: number;
    icon: string;
    symbol: string;
    is_scaled_ui_token: boolean;
    multiplier: number;
}

export interface PairOverview {
    address: string;
    base: PairToken;
    quote: PairToken;
    created_at: string;
    name: string;
    source: string;
    liquidity: number;
    liquidity_change_percentage_24h: number | null;
    price: number;
    trade_24h: number;
    trade_24h_change_percent: number;
    volume_24h: number;
    volume_24h_base: number;
    volume_24h_quote: number;
    volume_1h: number;
    volume_4h: number;
    unique_wallet_24h: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES - Transaction Data
// ─────────────────────────────────────────────────────────────────────────────

export interface TradeTransaction {
    tx_type: 'buy' | 'sell' | 'swap' | 'add' | 'remove';
    tx_hash: string;
    ins_index: number;
    inner_ins_index: number;
    block_unix_time: number;
    block_number: number;
    volume_usd: number;
    volume: number;
    owner: string;
    signers: string[];
    source: string;
    side?: 'buy' | 'sell';
    price_pair?: number;
    pool_id?: string;
    from: {
        symbol: string;
        address: string;
        decimals: number;
        price: number;
        amount: string;
        ui_amount: number;
        ui_change_amount: number;
    };
    to: {
        symbol: string;
        address: string;
        decimals: number;
        price: number;
        amount: string;
        ui_amount: number;
        ui_change_amount: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES - Token List
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenListItem {
    address: string;
    logo_uri: string;
    name: string;
    symbol: string;
    decimals: number;
    extensions?: Record<string, any>;
    market_cap: number;
    fdv: number;
    liquidity: number;
    price: number;
    holder: number;
    volume_1h_usd: number;
    volume_1h_change_percent: number;
    volume_24h_usd: number;
    volume_24h_change_percent: number;
    price_change_1h_percent: number;
    price_change_24h_percent: number;
    trade_1h_count: number;
    trade_24h_count: number;
    recent_listing_time: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES - Wallet & Portfolio
// ─────────────────────────────────────────────────────────────────────────────

export interface WalletToken {
    address: string;
    symbol: string;
    name: string;
    balance: number;
    uiAmount: number;
    valueUsd: number;
    priceUsd: number;
    priceChange24h: number;
    logoUri?: string;
}

export interface WalletPortfolio {
    totalUsd: number;
    tokens: WalletToken[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES - OHLCV Data
// ─────────────────────────────────────────────────────────────────────────────

export interface OHLCVBar {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API CLIENT CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class BirdeyeAPIClient {
    private apiKey: string;
    private baseUrl = 'https://public-api.birdeye.so';
    private chain: string;

    constructor(apiKey: string, chain: string = 'solana') {
        this.apiKey = apiKey;
        this.chain = chain;
    }

    private async fetch<T>(endpoint: string, options: {
        params?: Record<string, any>;
        method?: 'GET' | 'POST';
        body?: any;
    } = {}): Promise<T | null> {
        try {
            const { params = {}, method = 'GET', body } = options;

            // Build URL with query params
            const queryString = Object.entries(params)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&');

            const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                method,
                headers: {
                    'X-API-KEY': this.apiKey,
                    'x-chain': this.chain,
                    'Accept': 'application/json',
                    ...(body ? { 'Content-Type': 'application/json' } : {}),
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });

            if (!response.ok) {
                console.error(`[BIRDEYE API] Error ${response.status}: ${response.statusText}`);
                return null;
            }

            const data = await response.json() as { success: boolean; data: T };

            if (!data.success) {
                console.error('[BIRDEYE API] Request failed:', data);
                return null;
            }

            return data.data;
        } catch (error) {
            console.error('[BIRDEYE API] Fetch error:', error);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOKEN STATS ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Token Overview - Get comprehensive token stats
     */
    async getTokenOverview(address: string, frames?: string): Promise<TokenOverview | null> {
        return this.fetch<TokenOverview>('/defi/token_overview', {
            params: { address, frames, ui_amount_mode: 'scaled' }
        });
    }

    /**
     * Token Metadata (Single)
     */
    async getTokenMetadata(address: string): Promise<TokenMetadata | null> {
        return this.fetch<TokenMetadata>('/defi/v3/token/meta-data/single', {
            params: { address }
        });
    }

    /**
     * Token Metadata (Multiple) - Up to 50 addresses
     */
    async getMultipleTokenMetadata(addresses: string[]): Promise<Record<string, TokenMetadata> | null> {
        return this.fetch<Record<string, TokenMetadata>>('/defi/v3/token/meta-data/multiple', {
            params: { list_address: addresses.join(',') }
        });
    }

    /**
     * Token Market Data (Single)
     */
    async getTokenMarketData(address: string): Promise<TokenMarketData | null> {
        return this.fetch<TokenMarketData>('/defi/v3/token/market-data', {
            params: { address, ui_amount_mode: 'scaled' }
        });
    }

    /**
     * Token Market Data (Multiple) - Up to 20 addresses
     */
    async getMultipleTokenMarketData(addresses: string[]): Promise<Record<string, TokenMarketData> | null> {
        return this.fetch<Record<string, TokenMarketData>>('/defi/v3/token/market-data/multiple', {
            params: { list_address: addresses.join(','), ui_amount_mode: 'scaled' }
        });
    }

    /**
     * Token Trade Data (Single) - Volume, trades, unique wallets
     */
    async getTokenTradeData(address: string, frames?: string): Promise<TokenTradeData | null> {
        return this.fetch<TokenTradeData>('/defi/v3/token/trade-data/single', {
            params: { address, frames, ui_amount_mode: 'scaled' }
        });
    }

    /**
     * Token Trade Data (Multiple) - Up to 20 addresses
     */
    async getMultipleTokenTradeData(addresses: string[], frames?: string): Promise<Record<string, TokenTradeData> | null> {
        return this.fetch<Record<string, TokenTradeData>>('/defi/v3/token/trade-data/multiple', {
            params: { list_address: addresses.join(','), frames, ui_amount_mode: 'scaled' }
        });
    }

    /**
     * Price Stats (Single) - Price high/low/change by timeframe
     */
    async getPriceStats(address: string, timeframes?: string): Promise<TokenPriceStats[] | null> {
        return this.fetch<TokenPriceStats[]>('/defi/v3/price/stats/single', {
            params: { address, list_timeframe: timeframes, ui_amount_mode: 'raw' }
        });
    }

    /**
     * Price Stats (Multiple) - Up to 20 tokens
     */
    async getMultiplePriceStats(addresses: string[], timeframes?: string): Promise<TokenPriceStats[] | null> {
        return this.fetch<TokenPriceStats[]>('/defi/v3/price/stats/multiple', {
            method: 'POST',
            params: { list_timeframe: timeframes, ui_amount_mode: 'raw' },
            body: { list_address: addresses.join(',') }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAIR/POOL ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Pair Overview (Single)
     */
    async getPairOverview(address: string): Promise<PairOverview | null> {
        return this.fetch<PairOverview>('/defi/v3/pair/overview/single', {
            params: { address, ui_amount_mode: 'scaled' }
        });
    }

    /**
     * Pair Overview (Multiple) - Up to 20 addresses
     */
    async getMultiplePairOverview(addresses: string[]): Promise<Record<string, PairOverview> | null> {
        return this.fetch<Record<string, PairOverview>>('/defi/v3/pair/overview/multiple', {
            params: { list_address: addresses.join(','), ui_amount_mode: 'scaled' }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOKEN LIST ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Token List (V3) - Get filtered/sorted token list
     */
    async getTokenList(options: {
        sortBy?: string;
        sortType?: 'asc' | 'desc';
        minLiquidity?: number;
        minMarketCap?: number;
        minVolume24h?: number;
        minHolder?: number;
        offset?: number;
        limit?: number;
    } = {}): Promise<TokenListItem[]> {
        const result = await this.fetch<{ items: TokenListItem[] }>('/defi/v3/token/list', {
            params: {
                sort_by: options.sortBy || 'liquidity',
                sort_type: options.sortType || 'desc',
                min_liquidity: options.minLiquidity,
                min_market_cap: options.minMarketCap,
                min_volume_24h_usd: options.minVolume24h,
                min_holder: options.minHolder,
                offset: options.offset || 0,
                limit: options.limit || 50,
                ui_amount_mode: 'scaled'
            }
        });
        return result?.items || [];
    }

    /**
     * Trending Tokens - Get top tokens by volume
     */
    async getTrendingTokens(limit: number = 20): Promise<TokenListItem[]> {
        return this.getTokenList({
            sortBy: 'volume_24h_usd',
            sortType: 'desc',
            limit
        });
    }

    /**
     * Top Gainers - Get tokens with highest 24h price increase
     */
    async getTopGainers(limit: number = 10): Promise<TokenListItem[]> {
        return this.getTokenList({
            sortBy: 'price_change_24h_percent',
            sortType: 'desc',
            minLiquidity: 10000,
            minVolume24h: 10000,
            limit
        });
    }

    /**
     * Top Losers - Get tokens with lowest 24h price change
     */
    async getTopLosers(limit: number = 10): Promise<TokenListItem[]> {
        return this.getTokenList({
            sortBy: 'price_change_24h_percent',
            sortType: 'asc',
            minLiquidity: 10000,
            minVolume24h: 10000,
            limit
        });
    }

    /**
     * New Listings - Get recently listed tokens
     */
    async getNewListings(limit: number = 20): Promise<TokenListItem[]> {
        const now = Math.floor(Date.now() / 1000);
        const result = await this.fetch<{ items: TokenListItem[] }>('/defi/v3/token/list', {
            params: {
                sort_by: 'recent_listing_time',
                sort_type: 'desc',
                min_recent_listing_time: now - 86400 * 7, // Last 7 days
                limit,
                ui_amount_mode: 'scaled'
            }
        });
        return result?.items || [];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSACTION ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Token Transactions (V3)
     */
    async getTokenTransactions(address: string, options: {
        txType?: 'swap' | 'buy' | 'sell' | 'add' | 'remove' | 'all';
        limit?: number;
        offset?: number;
        beforeTime?: number;
        afterTime?: number;
    } = {}): Promise<TradeTransaction[]> {
        const result = await this.fetch<{ items: TradeTransaction[], hasNext: boolean }>('/defi/v3/token/txs', {
            params: {
                address,
                tx_type: options.txType || 'swap',
                limit: options.limit || 50,
                offset: options.offset || 0,
                before_time: options.beforeTime,
                after_time: options.afterTime,
                ui_amount_mode: 'scaled'
            }
        });
        return result?.items || [];
    }

    /**
     * All Recent Transactions (V3)
     */
    async getAllTransactions(options: {
        txType?: 'swap' | 'add' | 'remove' | 'all';
        limit?: number;
        offset?: number;
        owner?: string;
        poolId?: string;
    } = {}): Promise<TradeTransaction[]> {
        const result = await this.fetch<{ items: TradeTransaction[], hasNext: boolean }>('/defi/v3/txs', {
            params: {
                tx_type: options.txType || 'swap',
                limit: options.limit || 50,
                offset: options.offset || 0,
                owner: options.owner,
                pool_id: options.poolId,
                ui_amount_mode: 'scaled'
            }
        });
        return result?.items || [];
    }

    /**
     * Pair (Pool) Transactions
     */
    async getPairTransactions(pairAddress: string, options: {
        txType?: 'swap' | 'add' | 'remove' | 'all';
        limit?: number;
        sortType?: 'asc' | 'desc';
    } = {}): Promise<TradeTransaction[]> {
        const result = await this.fetch<{ items: TradeTransaction[], hasNext: boolean }>('/defi/txs/pair', {
            params: {
                address: pairAddress,
                tx_type: options.txType || 'swap',
                limit: options.limit || 50,
                sort_type: options.sortType || 'desc',
                ui_amount_mode: 'scaled'
            }
        });
        return result?.items || [];
    }

    /**
     * Trader Transactions - Get trades for a specific wallet
     */
    async getTraderTransactions(walletAddress: string, options: {
        txType?: 'swap' | 'add' | 'remove' | 'all';
        limit?: number;
        beforeTime?: number;
        afterTime?: number;
    } = {}): Promise<TradeTransaction[]> {
        const result = await this.fetch<{ items: TradeTransaction[], hasNext: boolean }>('/trader/txs/seek_by_time', {
            params: {
                address: walletAddress,
                tx_type: options.txType,
                limit: options.limit || 50,
                before_time: options.beforeTime,
                after_time: options.afterTime,
                ui_amount_mode: 'scaled'
            }
        });
        return result?.items || [];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OHLCV / PRICE HISTORY
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get OHLCV data for a token
     */
    async getOHLCV(address: string, options: {
        type?: '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W';
        timeFrom?: number;
        timeTo?: number;
    } = {}): Promise<OHLCVBar[]> {
        const now = Math.floor(Date.now() / 1000);
        const result = await this.fetch<{ items: any[] }>('/defi/ohlcv', {
            params: {
                address,
                type: options.type || '1H',
                time_from: options.timeFrom || now - 86400, // Default: 24h
                time_to: options.timeTo || now
            }
        });

        return (result?.items || []).map(item => ({
            timestamp: item.unixTime || item.timestamp,
            open: item.o || item.open,
            high: item.h || item.high,
            low: item.l || item.low,
            close: item.c || item.close,
            volume: item.v || item.volume
        }));
    }

    /**
     * Get price history for a token
     */
    async getPriceHistory(address: string, options: {
        type?: '15m' | '1H' | '4H' | '1D';
        timeFrom?: number;
        timeTo?: number;
    } = {}): Promise<Array<{ timestamp: number; value: number }>> {
        const now = Math.floor(Date.now() / 1000);
        const result = await this.fetch<{ items: Array<{ unixTime: number; value: number }> }>('/defi/history_price', {
            params: {
                address,
                address_type: 'token',
                type: options.type || '1H',
                time_from: options.timeFrom || now - 86400,
                time_to: options.timeTo || now
            }
        });

        return (result?.items || []).map(item => ({
            timestamp: item.unixTime,
            value: item.value
        }));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WALLET / PORTFOLIO
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get wallet token portfolio
     */
    async getWalletPortfolio(walletAddress: string): Promise<WalletPortfolio> {
        const result = await this.fetch<any>('/v1/wallet/token_list', {
            params: { wallet: walletAddress }
        });

        if (!result) {
            return { totalUsd: 0, tokens: [] };
        }

        const tokens: WalletToken[] = (result.items || []).map((item: any) => ({
            address: item.address,
            symbol: item.symbol || 'Unknown',
            name: item.name || 'Unknown Token',
            balance: item.balance || 0,
            uiAmount: item.uiAmount || 0,
            valueUsd: item.valueUsd || 0,
            priceUsd: item.priceUsd || 0,
            priceChange24h: item.priceChange24h || 0,
            logoUri: item.logoURI || item.logo_uri
        }));

        return {
            totalUsd: result.totalUsd || tokens.reduce((sum, t) => sum + t.valueUsd, 0),
            tokens
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Health check - verify API connection
     */
    async healthCheck(): Promise<boolean> {
        const result = await this.getTokenMarketData('So11111111111111111111111111111111111111112');
        return result !== null;
    }

    /**
     * Search tokens by keyword
     */
    async searchTokens(keyword: string, limit: number = 10): Promise<TokenListItem[]> {
        const result = await this.fetch<{ items: TokenListItem[] }>('/defi/v2/tokens/search', {
            params: { keyword, limit }
        });
        return result?.items || [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

let clientInstance: BirdeyeAPIClient | null = null;

export function getBirdeyeClient(apiKey?: string): BirdeyeAPIClient {
    const key = apiKey || process.env.BIRDEYE_API_KEY;
    if (!key) {
        throw new Error('BIRDEYE_API_KEY is required');
    }
    if (!clientInstance || apiKey) {
        clientInstance = new BirdeyeAPIClient(key);
    }
    return clientInstance;
}

export default BirdeyeAPIClient;
