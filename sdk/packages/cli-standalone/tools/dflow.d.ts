import type { ToolResult } from "../types/index.js";
/**
 * DFlow integration: Trading API (swaps, prediction-market init, priority fees)
 * and Metadata API (events, markets, orderbooks, trades, live data,
 * series, tags, sports, search for Kalshi/Polymarket-style prediction markets).
 */
export declare class DFlowTool {
    private apiKey;
    private trading;
    private metadata;
    constructor();
    private requireKey;
    private req;
    getTokens(): Promise<ToolResult>;
    getTokensWithDecimals(): Promise<ToolResult>;
    getVenues(): Promise<ToolResult>;
    getPriorityFees(): Promise<ToolResult>;
    getPredictionMarketInit(payer: string, outcomeMint: string): Promise<ToolResult>;
    /**
     * Imperative swap: DFlow returns a built transaction to sign & send.
     * Endpoint per DFlow docs: /quote + /swap-instructions, or /swap for v0 txn.
     */
    getSwapQuote(params: {
        userPublicKey: string;
        inputMint: string;
        outputMint: string;
        amount: string | number;
        slippageBps?: number;
        swapMode?: "ExactIn" | "ExactOut";
        venues?: string[];
    }): Promise<ToolResult>;
    buildSwap(body: {
        userPublicKey: string;
        quote: any;
        priorityFeeMicroLamports?: number;
        computeUnitLimit?: number;
    }): Promise<ToolResult>;
    submitIntentSwap(body: {
        userPublicKey: string;
        inputMint: string;
        outputMint: string;
        amount: string | number;
        slippageBps?: number;
        swapMode?: "ExactIn" | "ExactOut";
    }): Promise<ToolResult>;
    getOrder(orderId: string): Promise<ToolResult>;
    getOrderStatus(orderId: string): Promise<ToolResult>;
    getEvent(eventTicker: string): Promise<ToolResult>;
    getEvents(params?: Record<string, any>): Promise<ToolResult>;
    getMarket(ticker: string): Promise<ToolResult>;
    getMarkets(params?: Record<string, any>): Promise<ToolResult>;
    getOrderbook(marketTicker: string): Promise<ToolResult>;
    getOrderbookByMint(mintAddress: string): Promise<ToolResult>;
    getTrades(params?: Record<string, any>): Promise<ToolResult>;
    getTradesByMint(mintAddress: string, params?: Record<string, any>): Promise<ToolResult>;
    getOnchainTrades(params?: Record<string, any>): Promise<ToolResult>;
    getOnchainTradesByEvent(eventTicker: string, params?: Record<string, any>): Promise<ToolResult>;
    getOnchainTradesByMarket(marketTicker: string, params?: Record<string, any>): Promise<ToolResult>;
    getLiveData(milestoneIds: string[]): Promise<ToolResult>;
    getLiveDataByEvent(eventTicker: string, params?: Record<string, any>): Promise<ToolResult>;
    getLiveDataByMint(mintAddress: string, params?: Record<string, any>): Promise<ToolResult>;
    getSeries(params?: Record<string, any>): Promise<ToolResult>;
    getSeriesByTicker(ticker: string): Promise<ToolResult>;
    getTagsByCategories(): Promise<ToolResult>;
    getFiltersBySports(): Promise<ToolResult>;
    searchEvents(query: string, params?: Record<string, any>): Promise<ToolResult>;
    /**
     * Subscribe to the DFlow priority-fees websocket stream. Collects `samples` updates
     * (default 1) and returns them as JSON. Used for one-shot checks; long-running
     * subscriptions should call this with more samples or drive WS directly.
     */
    streamPriorityFees(samples?: number, timeoutMs?: number): Promise<ToolResult>;
    getCandlesticks(marketTicker: string, params?: Record<string, any>): Promise<ToolResult>;
    getForecastHistory(marketTicker: string, params?: Record<string, any>): Promise<ToolResult>;
}
