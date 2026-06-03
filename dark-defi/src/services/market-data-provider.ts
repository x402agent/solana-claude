// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Market Data Provider
// React hooks and context for real-time market data integration
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { BirdeyeAPIClient, getBirdeyeClient } from './birdeye-api.js';
import type { TokenListItem, TokenOverview, OHLCVBar, WalletPortfolio, TradeTransaction } from './birdeye-api.js';
import { BirdeyeWebSocket, getBirdeyeWebSocket } from './birdeye-websocket.js';
import type { PriceUpdate, TradeUpdate, OHLCVUpdate } from './birdeye-websocket.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketTicker {
    symbol: string;
    address: string;
    price: number;
    change: number;
    changePercent: number;
    volume24h: number;
    marketCap?: number;
    liquidity?: number;
    logoUri?: string;
}

export interface MarketDataState {
    // Ticker data
    tickers: MarketTicker[];

    // Featured token details
    featuredToken: TokenOverview | null;
    featuredOHLCV: OHLCVBar[];

    // Top movers
    topGainers: MarketTicker[];
    topLosers: MarketTicker[];

    // Recent trades
    recentTrades: TradeUpdate[];

    // Portfolio
    portfolio: WalletPortfolio | null;

    // Status
    isLoading: boolean;
    isConnected: boolean;
    lastUpdate: number;
    error: string | null;
}

export interface MarketDataActions {
    refreshTickers: () => Promise<void>;
    refreshTopMovers: () => Promise<void>;
    refreshPortfolio: () => Promise<void>;
    setFeaturedToken: (address: string) => Promise<void>;
    subscribeToPrices: (addresses: string[]) => void;
    subscribeToTrades: (addresses: string[]) => void;
}

export interface MarketDataContextValue {
    state: MarketDataState;
    actions: MarketDataActions;
    api: BirdeyeAPIClient | null;
    ws: BirdeyeWebSocket | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

export function useMarketData(): MarketDataContextValue {
    const context = useContext(MarketDataContext);
    if (!context) {
        throw new Error('useMarketData must be used within a MarketDataProvider');
    }
    return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Popular Solana Tokens
// ─────────────────────────────────────────────────────────────────────────────

export const POPULAR_TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
    RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    MNGO: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
    SAMO: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
};

export const DEFAULT_TICKER_ADDRESSES = [
    POPULAR_TOKENS.SOL,
    POPULAR_TOKENS.BONK,
    POPULAR_TOKENS.WIF,
    POPULAR_TOKENS.JUP,
    POPULAR_TOKENS.PYTH,
    POPULAR_TOKENS.JTO,
];

// ─────────────────────────────────────────────────────────────────────────────
// MARKET DATA HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useMarketDataProvider(config: {
    birdeyeKey?: string;
    walletAddress?: string;
    tickerAddresses?: string[];
    refreshInterval?: number;
    enableWebSocket?: boolean;
}): MarketDataContextValue {
    const apiRef = useRef<BirdeyeAPIClient | null>(null);
    const wsRef = useRef<BirdeyeWebSocket | null>(null);

    const [state, setState] = useState<MarketDataState>({
        tickers: [],
        featuredToken: null,
        featuredOHLCV: [],
        topGainers: [],
        topLosers: [],
        recentTrades: [],
        portfolio: null,
        isLoading: true,
        isConnected: false,
        lastUpdate: 0,
        error: null,
    });

    // Initialize API client
    useEffect(() => {
        if (config.birdeyeKey) {
            try {
                apiRef.current = getBirdeyeClient(config.birdeyeKey);
            } catch (error: any) {
                console.error('[MARKET DATA] Failed to initialize API:', error);
                setState(prev => ({ ...prev, error: error.message }));
            }
        }
    }, [config.birdeyeKey]);

    // Initialize WebSocket
    useEffect(() => {
        if (!config.birdeyeKey || config.enableWebSocket === false) return;

        try {
            wsRef.current = getBirdeyeWebSocket({ apiKey: config.birdeyeKey });

            // Set up event handlers
            wsRef.current.on('connected', () => {
                console.log('[MARKET DATA] WebSocket connected');
                setState(prev => ({ ...prev, isConnected: true }));

                // Subscribe to default tokens
                const addresses = config.tickerAddresses || DEFAULT_TICKER_ADDRESSES;
                wsRef.current?.subscribeToPrices(addresses);
            });

            wsRef.current.on('disconnected', () => {
                setState(prev => ({ ...prev, isConnected: false }));
            });

            wsRef.current.on('price', (update: PriceUpdate) => {
                setState(prev => ({
                    ...prev,
                    tickers: prev.tickers.map(t =>
                        t.address === update.address
                            ? { ...t, price: update.price, changePercent: update.priceChange24h || t.changePercent }
                            : t
                    ),
                    lastUpdate: Date.now(),
                }));
            });

            wsRef.current.on('trade', (trade: TradeUpdate) => {
                setState(prev => ({
                    ...prev,
                    recentTrades: [trade, ...prev.recentTrades.slice(0, 49)],
                    lastUpdate: Date.now(),
                }));
            });

            wsRef.current.on('error', (error: Error) => {
                console.error('[MARKET DATA] WebSocket error:', error);
            });

            // Connect
            wsRef.current.connect().catch(err => {
                console.error('[MARKET DATA] WebSocket connection failed:', err);
            });

        } catch (error: any) {
            console.error('[MARKET DATA] WebSocket init failed:', error);
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.disconnect();
            }
        };
    }, [config.birdeyeKey, config.enableWebSocket]);

    // ─────────────────────────────────────────────────────────────────────────────
    // Data Fetching Actions
    // ─────────────────────────────────────────────────────────────────────────────

    const refreshTickers = useCallback(async () => {
        if (!apiRef.current) return;

        try {
            setState(prev => ({ ...prev, isLoading: true }));

            const addresses = config.tickerAddresses || DEFAULT_TICKER_ADDRESSES;

            // Fetch market data for all tokens
            const marketData = await apiRef.current.getMultipleTokenMarketData(addresses);
            const metadata = await apiRef.current.getMultipleTokenMetadata(addresses);
            const tradeData = await apiRef.current.getMultipleTokenTradeData(addresses);

            if (marketData && metadata) {
                const tickers: MarketTicker[] = addresses.map(addr => {
                    const market = marketData[addr];
                    const meta = metadata[addr];
                    const trade = tradeData?.[addr];

                    if (!market) return null;

                    return {
                        address: addr,
                        symbol: meta?.symbol || 'UNKNOWN',
                        price: market.price,
                        change: trade?.price_change_24h_percent || 0,
                        changePercent: trade?.price_change_24h_percent || 0,
                        volume24h: trade?.volume_24h_usd || 0,
                        marketCap: market.market_cap,
                        liquidity: market.liquidity,
                        logoUri: meta?.logo_uri,
                    };
                }).filter(Boolean) as MarketTicker[];

                setState(prev => ({
                    ...prev,
                    tickers,
                    isLoading: false,
                    lastUpdate: Date.now(),
                    error: null,
                }));
            }
        } catch (error: any) {
            console.error('[MARKET DATA] Failed to refresh tickers:', error);
            setState(prev => ({ ...prev, isLoading: false, error: error.message }));
        }
    }, [config.tickerAddresses]);

    const refreshTopMovers = useCallback(async () => {
        if (!apiRef.current) return;

        try {
            const [gainersData, losersData] = await Promise.all([
                apiRef.current.getTopGainers(5),
                apiRef.current.getTopLosers(5),
            ]);

            const mapToTicker = (item: TokenListItem): MarketTicker => ({
                address: item.address,
                symbol: item.symbol,
                price: item.price,
                change: item.price_change_24h_percent,
                changePercent: item.price_change_24h_percent,
                volume24h: item.volume_24h_usd,
                marketCap: item.market_cap,
                liquidity: item.liquidity,
                logoUri: item.logo_uri,
            });

            setState(prev => ({
                ...prev,
                topGainers: gainersData.map(mapToTicker),
                topLosers: losersData.map(mapToTicker),
            }));
        } catch (error) {
            console.error('[MARKET DATA] Failed to refresh top movers:', error);
        }
    }, []);

    const refreshPortfolio = useCallback(async () => {
        if (!apiRef.current || !config.walletAddress) return;

        try {
            const portfolio = await apiRef.current.getWalletPortfolio(config.walletAddress);
            setState(prev => ({ ...prev, portfolio }));
        } catch (error) {
            console.error('[MARKET DATA] Failed to refresh portfolio:', error);
        }
    }, [config.walletAddress]);

    const setFeaturedToken = useCallback(async (address: string) => {
        if (!apiRef.current) return;

        try {
            const [overview, ohlcv] = await Promise.all([
                apiRef.current.getTokenOverview(address),
                apiRef.current.getOHLCV(address, { type: '1H' }),
            ]);

            setState(prev => ({
                ...prev,
                featuredToken: overview,
                featuredOHLCV: ohlcv,
            }));

            // Subscribe to real-time updates
            if (wsRef.current) {
                wsRef.current.subscribeToPrices([address]);
                wsRef.current.subscribeToOHLCV(address, '1m');
            }
        } catch (error) {
            console.error('[MARKET DATA] Failed to set featured token:', error);
        }
    }, []);

    const subscribeToPrices = useCallback((addresses: string[]) => {
        if (wsRef.current) {
            wsRef.current.subscribeToPrices(addresses);
        }
    }, []);

    const subscribeToTrades = useCallback((addresses: string[]) => {
        if (wsRef.current) {
            wsRef.current.subscribeToTrades(addresses);
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        if (apiRef.current) {
            refreshTickers();
            refreshTopMovers();
            if (config.walletAddress) {
                refreshPortfolio();
            }
            // Set SOL as featured token by default
            setFeaturedToken(POPULAR_TOKENS.SOL);
        }
    }, [refreshTickers, refreshTopMovers, refreshPortfolio, setFeaturedToken, config.walletAddress]);

    // Periodic refresh for REST data
    useEffect(() => {
        const interval = setInterval(() => {
            refreshTickers();
            refreshTopMovers();
        }, config.refreshInterval || 30000);

        return () => clearInterval(interval);
    }, [refreshTickers, refreshTopMovers, config.refreshInterval]);

    const actions: MarketDataActions = {
        refreshTickers,
        refreshTopMovers,
        refreshPortfolio,
        setFeaturedToken,
        subscribeToPrices,
        subscribeToTrades,
    };

    return {
        state,
        actions,
        api: apiRef.current,
        ws: wsRef.current,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET DATA PROVIDER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export { MarketDataContext };

// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to get token price with real-time updates
 */
export function useTokenPrice(address: string, apiKey?: string) {
    const [price, setPrice] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const api = getBirdeyeClient(apiKey);
                const data = await api.getTokenMarketData(address);
                if (data) {
                    setPrice(data.price);
                }
                setLoading(false);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 15000);
        return () => clearInterval(interval);
    }, [address, apiKey]);

    return { price, loading, error };
}

/**
 * Hook to get trending tokens
 */
export function useTrendingTokens(limit: number = 20, apiKey?: string) {
    const [tokens, setTokens] = useState<TokenListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const api = getBirdeyeClient(apiKey);
                const data = await api.getTrendingTokens(limit);
                setTokens(data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch trending:', err);
                setLoading(false);
            }
        };

        fetchTrending();
        const interval = setInterval(fetchTrending, 60000);
        return () => clearInterval(interval);
    }, [limit, apiKey]);

    return { tokens, loading };
}

/**
 * Hook to get Recent Trades for a token
 */
export function useRecentTrades(address: string, limit: number = 20, apiKey?: string) {
    const [trades, setTrades] = useState<TradeTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const api = getBirdeyeClient(apiKey);
                const data = await api.getTokenTransactions(address, { limit });
                setTrades(data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch trades:', err);
                setLoading(false);
            }
        };

        fetchTrades();
        const interval = setInterval(fetchTrades, 30000);
        return () => clearInterval(interval);
    }, [address, limit, apiKey]);

    return { trades, loading };
}

/**
 * Hook to get OHLCV data for charts
 */
export function useOHLCV(address: string, timeframe: '1m' | '5m' | '15m' | '1H' | '4H' | '1D' = '1H', apiKey?: string) {
    const [candles, setCandles] = useState<OHLCVBar[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOHLCV = async () => {
            try {
                const api = getBirdeyeClient(apiKey);
                const data = await api.getOHLCV(address, { type: timeframe });
                setCandles(data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch OHLCV:', err);
                setLoading(false);
            }
        };

        fetchOHLCV();

        // Refresh based on timeframe
        const intervals: Record<string, number> = {
            '1m': 30000,
            '5m': 60000,
            '15m': 300000,
            '1H': 60000,
            '4H': 300000,
            '1D': 600000,
        };

        const interval = setInterval(fetchOHLCV, intervals[timeframe]);
        return () => clearInterval(interval);
    }, [address, timeframe, apiKey]);

    return { candles, loading };
}

export default useMarketDataProvider;
