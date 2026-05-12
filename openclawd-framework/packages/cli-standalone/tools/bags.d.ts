import type { ToolResult } from "../types/index.js";
import { WalletTool } from "./wallet.js";
/**
 * Bags.fm integration — launch Solana tokens with fee sharing,
 * claim accumulated fees, and swap. Requires BAGS_API_KEY.
 * Docs: https://bags.fm/api
 */
export declare class BagsTool {
    private api;
    private apiKey;
    private partnerConfigKey;
    private wallet;
    constructor(wallet: WalletTool);
    private requireKey;
    launchToken(args: {
        name: string;
        symbol: string;
        description: string;
        imageUrl?: string;
        twitter?: string;
        website?: string;
        telegram?: string;
        initialBuySol?: number;
        feeRecipients?: {
            wallet: string;
            percentage: number;
        }[];
    }): Promise<ToolResult>;
    claimFees(positionKey?: string): Promise<ToolResult>;
    swap(args: {
        inputMint: string;
        outputMint: string;
        amount: string | number;
        slippageBps?: number;
    }): Promise<ToolResult>;
    listPositions(): Promise<ToolResult>;
}
