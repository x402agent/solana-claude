import type { ToolResult } from "../types/index.js";
/**
 * Kalshi direct API with RSA-PSS request signing.
 * Env:
 *   KALSHI_KEY_ID         — API key UUID
 *   KALSHI_PRIVATE_KEY    — RSA PEM (use \n for newlines or provide path via KALSHI_PRIVATE_KEY_FILE)
 *   KALSHI_ENV            — 'prod' (default) or 'demo'
 * Docs: https://trading-api.readme.io/reference/
 */
export declare class KalshiTool {
    private api;
    private keyId;
    private privateKey;
    constructor();
    private requireAuth;
    private sign;
    private req;
    getBalance(): Promise<ToolResult>;
    getPositions(params?: Record<string, unknown>): Promise<ToolResult>;
    getOrders(params?: Record<string, unknown>): Promise<ToolResult>;
    getFills(params?: Record<string, unknown>): Promise<ToolResult>;
    placeOrder(order: {
        ticker: string;
        side: "yes" | "no";
        action: "buy" | "sell";
        count: number;
        type: "limit" | "market";
        yes_price?: number;
        no_price?: number;
        time_in_force?: "GTC" | "IOC";
        client_order_id?: string;
    }): Promise<ToolResult>;
    cancelOrder(orderId: string): Promise<ToolResult>;
    getMarkets(params?: Record<string, unknown>): Promise<ToolResult>;
    getMarket(ticker: string): Promise<ToolResult>;
    getMarketOrderbook(ticker: string, depth?: number): Promise<ToolResult>;
}
