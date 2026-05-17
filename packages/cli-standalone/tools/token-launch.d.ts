import type { ToolResult } from "../types/index.js";
import { WalletTool } from "./wallet.js";
/**
 * Token launch + trade via PumpPortal Local API.
 * Docs: https://pumpportal.fun/creation/ and /trade-local
 * No API key required for local signing (we sign ourselves).
 */
export declare class TokenLaunchTool {
    private wallet;
    constructor(wallet: WalletTool);
    /**
     * Launch a new pump.fun token. Uploads metadata to pump.fun IPFS,
     * then calls /trade-local to get a signed transaction.
     */
    launchPumpToken(args: {
        name: string;
        symbol: string;
        description: string;
        imageUrl?: string;
        twitter?: string;
        telegram?: string;
        website?: string;
        initialBuySol?: number;
        slippageBps?: number;
        priorityFeeSol?: number;
    }): Promise<ToolResult>;
    /**
     * Buy/sell a pump.fun or Raydium token via PumpPortal local signing.
     */
    pumpTrade(args: {
        mint: string;
        action: "buy" | "sell";
        amount: number;
        denominatedInSol?: boolean;
        slippageBps?: number;
        priorityFeeSol?: number;
        pool?: "pump" | "raydium" | "pump-amm" | "auto";
    }): Promise<ToolResult>;
}
