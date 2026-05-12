import type { ToolResult } from "../types/index.js";
export declare class SolanaTool {
    private heliusRpcUrl;
    private heliusApiKey;
    private birdeyeApiKey;
    private birdeye;
    constructor();
    private requireBirdeye;
    private birdeyeGet;
    getAsset(assetId: string): Promise<ToolResult>;
    getPrice(tokenAddress: string): Promise<ToolResult>;
    getTokenOverview(address: string, frames?: string): Promise<ToolResult>;
    getTokenMetadata(address: string, chain?: string): Promise<ToolResult>;
    getTokenMetadataMulti(addresses: string[], chain?: string): Promise<ToolResult>;
    getTokenMarketData(address: string, chain?: string): Promise<ToolResult>;
    getTokenMarketDataMulti(addresses: string[], chain?: string): Promise<ToolResult>;
    getTokenTradeData(address: string, frames?: string, chain?: string): Promise<ToolResult>;
    getTokenTradeDataMulti(addresses: string[], frames?: string, chain?: string): Promise<ToolResult>;
    getTokenLiquidity(address: string, chain?: string): Promise<ToolResult>;
    getTokenLiquidityMulti(addresses: string[], chain?: string): Promise<ToolResult>;
    searchToken(keyword: string, chain?: string, limit?: number): Promise<ToolResult>;
    getTokenList(sort_by?: string, sort_type?: "asc" | "desc", offset?: number, limit?: number, chain?: string): Promise<ToolResult>;
    getTrending(sort_by?: string, sort_type?: "asc" | "desc", offset?: number, limit?: number, chain?: string): Promise<ToolResult>;
    getOhlcv(address: string, type_?: "1m" | "5m" | "15m" | "30m" | "1H" | "2H" | "4H" | "6H" | "8H" | "12H" | "1D" | "3D" | "1W" | "1M", time_from?: number, time_to?: number, chain?: string): Promise<ToolResult>;
    getWalletBalance(walletAddress: string): Promise<ToolResult>;
    getWalletPortfolio(walletAddress: string, chain?: string): Promise<ToolResult>;
}
