import type { ToolResult } from "../types/index.js";
/**
 * Polymarket integration — public read endpoints.
 * Gamma API: gamma-api.polymarket.com (events, markets, tags — no auth)
 * CLOB REST:  clob.polymarket.com (book, price, trades, market info — no auth for GETs)
 *
 * Placing orders requires L2 auth (EIP-712 signing with a Polygon private key)
 * and is out of scope for this wrapper — add POLYGON_PRIVATE_KEY + CLOB client
 * signer when you want to go beyond read-only.
 */
export declare class PolymarketTool {
    private gamma;
    private clob;
    constructor();
    private g;
    getEvents(params?: Record<string, unknown>): Promise<ToolResult>;
    getEvent(id: string): Promise<ToolResult>;
    getMarkets(params?: Record<string, unknown>): Promise<ToolResult>;
    getMarket(id: string): Promise<ToolResult>;
    searchEvents(query: string, limit?: number): Promise<ToolResult>;
    getTags(): Promise<ToolResult>;
    getTrending(limit?: number): Promise<ToolResult>;
    getBook(tokenId: string): Promise<ToolResult>;
    getPrice(tokenId: string, side?: "buy" | "sell"): Promise<ToolResult>;
    getMidpoint(tokenId: string): Promise<ToolResult>;
    getSpread(tokenId: string): Promise<ToolResult>;
    getTrades(market: string, limit?: number): Promise<ToolResult>;
    getLastTradePrice(tokenId: string): Promise<ToolResult>;
    getClobMarkets(params?: Record<string, unknown>): Promise<ToolResult>;
    getClobMarket(conditionId: string): Promise<ToolResult>;
    placeOrder(): Promise<ToolResult>;
}
