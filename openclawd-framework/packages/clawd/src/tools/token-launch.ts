import axios, { isAxiosError } from "axios";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { ToolResult } from "../types/index.js";
import { WalletTool } from "./wallet.js";

/**
 * Token launch + trade via PumpPortal Local API.
 * Docs: https://pumpportal.fun/creation/ and /trade-local
 * No API key required for local signing (we sign ourselves).
 */
export class TokenLaunchTool {
  private wallet: WalletTool;

  constructor(wallet: WalletTool) {
    this.wallet = wallet;
  }

  /**
   * Launch a new pump.fun token. Uploads metadata to pump.fun IPFS,
   * then calls /trade-local to get a signed transaction.
   */
  async launchPumpToken(args: {
    name: string;
    symbol: string;
    description: string;
    imageUrl?: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    initialBuySol?: number; // creator dev buy
    slippageBps?: number;
    priorityFeeSol?: number;
  }): Promise<ToolResult> {
    const creator = this.wallet.getKeypair();
    if (!creator) return { success: false, error: "Wallet not configured (set SOLANA_PRIVATE_KEY)" };

    try {
      // Upload metadata
      const form = new FormData();
      form.append("name", args.name);
      form.append("symbol", args.symbol);
      form.append("description", args.description);
      form.append("twitter", args.twitter || "");
      form.append("telegram", args.telegram || "");
      form.append("website", args.website || "");
      form.append("showName", "true");
      if (args.imageUrl) {
        const img = await axios.get(args.imageUrl, { responseType: "arraybuffer" });
        const blob = new Blob([img.data]);
        form.append("file", blob, "image.png");
      }
      const metaResp = await axios.post("https://pump.fun/api/ipfs", form);
      const metadataUri: string = metaResp.data.metadataUri;

      // Generate mint keypair
      const mintKp = Keypair.generate();

      // Request unsigned transaction from PumpPortal
      const body = {
        publicKey: creator.publicKey.toBase58(),
        action: "create",
        tokenMetadata: {
          name: args.name,
          symbol: args.symbol,
          uri: metadataUri,
        },
        mint: mintKp.publicKey.toBase58(),
        denominatedInSol: "true",
        amount: args.initialBuySol ?? 0,
        slippage: (args.slippageBps ?? 500) / 100,
        priorityFee: args.priorityFeeSol ?? 0.0005,
        pool: "pump",
      };
      const txResp = await axios.post("https://pumpportal.fun/api/trade-local", body, { responseType: "arraybuffer" });
      const vtx = VersionedTransaction.deserialize(new Uint8Array(txResp.data));
      vtx.sign([mintKp, creator]);
      const sig = await this.wallet.getConnection().sendTransaction(vtx, { skipPreflight: false });
      await this.wallet.getConnection().confirmTransaction(sig, "confirmed");

      return {
        success: true,
        output: JSON.stringify({
          mint: mintKp.publicKey.toBase58(),
          signature: sig,
          pumpUrl: `https://pump.fun/coin/${mintKp.publicKey.toBase58()}`,
          explorer: `https://solscan.io/tx/${sig}`,
          metadataUri,
        }, null, 2),
      };
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        return { success: false, error: `launchPumpToken: ${e.response?.status} ${JSON.stringify(e.response?.data) || e.message}` };
      }
      return { success: false, error: `launchPumpToken: ${e instanceof Error ? e.message : "unknown"}` };
    }
  }

  /**
   * Buy/sell a pump.fun or Raydium token via PumpPortal local signing.
   */
  async pumpTrade(args: {
    mint: string;
    action: "buy" | "sell";
    amount: number;            // in SOL for buy (denominatedInSol=true) or token amount / percent
    denominatedInSol?: boolean;
    slippageBps?: number;
    priorityFeeSol?: number;
    pool?: "pump" | "raydium" | "pump-amm" | "auto";
  }): Promise<ToolResult> {
    const signer = this.wallet.getKeypair();
    if (!signer) return { success: false, error: "Wallet not configured (set SOLANA_PRIVATE_KEY)" };
    try {
      const body = {
        publicKey: signer.publicKey.toBase58(),
        action: args.action,
        mint: args.mint,
        amount: args.amount,
        denominatedInSol: String(args.denominatedInSol ?? true),
        slippage: (args.slippageBps ?? 500) / 100,
        priorityFee: args.priorityFeeSol ?? 0.0005,
        pool: args.pool ?? "auto",
      };
      const resp = await axios.post("https://pumpportal.fun/api/trade-local", body, { responseType: "arraybuffer" });
      const vtx = VersionedTransaction.deserialize(new Uint8Array(resp.data));
      vtx.sign([signer]);
      const sig = await this.wallet.getConnection().sendTransaction(vtx, { skipPreflight: false });
      await this.wallet.getConnection().confirmTransaction(sig, "confirmed");
      return { success: true, output: JSON.stringify({ signature: sig, explorer: `https://solscan.io/tx/${sig}` }, null, 2) };
    } catch (e: unknown) {
      if (isAxiosError(e)) return { success: false, error: `pumpTrade: ${e.response?.status} ${JSON.stringify(e.response?.data) || e.message}` };
      return { success: false, error: `pumpTrade: ${e instanceof Error ? e.message : "unknown"}` };
    }
  }
}
