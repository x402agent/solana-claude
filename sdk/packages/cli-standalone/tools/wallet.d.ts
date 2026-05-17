import { Connection, Keypair } from "@solana/web3.js";
import type { ToolResult } from "../types/index.js";
/**
 * Wallet helper: loads a Solana keypair from SOLANA_PRIVATE_KEY (base58 or JSON array),
 * signs and sends transactions built by DFlow / PumpPortal / Bags.
 */
export declare class WalletTool {
    private connection;
    private keypair;
    private loadError;
    constructor();
    private loadKeypair;
    getPublicKey(): ToolResult;
    getBalance(): Promise<ToolResult>;
    /**
     * Signs and sends a base64-encoded transaction (versioned or legacy).
     * DFlow /swap and /prediction-market-init and PumpPortal /trade-local
     * all return this format.
     */
    signAndSend(base64Tx: string, extraSigners?: Keypair[]): Promise<ToolResult>;
    getKeypair(): Keypair | null;
    getConnection(): Connection;
    airdrop(solAmount: number): Promise<ToolResult>;
}
export declare function pubkeyValid(s: string): boolean;
