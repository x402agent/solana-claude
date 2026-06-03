// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Services Index
// Export all services and utilities
// ═══════════════════════════════════════════════════════════════════════════════

// Birdeye API (Enhanced v3)
export {
    BirdeyeAPIClient,
    getBirdeyeClient,
    type TokenMetadata,
    type TokenMarketData,
    type TokenOverview,
    type TokenTradeData,
    type TokenPriceStats,
    type PairOverview,
    type TradeTransaction,
    type TokenListItem,
    type WalletToken,
    type WalletPortfolio,
    type OHLCVBar,
} from './birdeye-api.js';

// Birdeye WebSocket
export {
    BirdeyeWebSocket,
    getBirdeyeWebSocket,
    type BirdeyeWSConfig,
    type PriceUpdate,
    type TradeUpdate,
    type OHLCVUpdate,
    type BirdeyeWSMessage,
} from './birdeye-websocket.js';

// Market Data Provider
export {
    useMarketDataProvider,
    useMarketData,
    useTokenPrice,
    useTrendingTokens,
    useRecentTrades,
    useOHLCV,
    MarketDataContext,
    POPULAR_TOKENS,
    DEFAULT_TICKER_ADDRESSES,
    type MarketTicker,
    type MarketDataState,
    type MarketDataActions,
    type MarketDataContextValue,
} from './market-data-provider.js';

// Legacy Birdeye Service (for compatibility)
export { BirdeyeService, default as BirdeyeServiceDefault } from './birdeye.js';

// Helius Service
export { HeliusService, default as HeliusServiceDefault } from './helius.js';

// AI Providers
export { default as AIProviders } from './ai-providers.js';

// News Search
export { default as NewsSearch } from './news-search.js';

// Solana program clients
export {
    DARKDEFI_DEVNET_RPC_URL,
    DARKDEFI_PROGRAM_IDS,
    DARKDEFI_SOLSCAN_CLUSTER,
    createDarkDefiProgramConnection,
    deriveClawdStakePoolPda,
    deriveClawdStakePositionPda,
    deriveSolanaAiConfigPda,
    getDarkDefiProgramId,
    getDarkDefiProgramStatus,
    getDarkDefiProgramStatuses,
    getDarkDefiSolscanUrl,
    type DarkDefiProgramAccountStatus,
    type DarkDefiProgramName,
} from './solana-programs.js';
