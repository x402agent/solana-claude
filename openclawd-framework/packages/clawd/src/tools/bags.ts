import axios, { type AxiosInstance, isAxiosError } from "axios";
import { VersionedTransaction } from "@solana/web3.js";
import type { ToolResult } from "../types/index.js";
import { WalletTool } from "./wallet.js";

function wrap(err: unknown, prefix: string): ToolResult {
  if (isAxiosError(err)) {
    if (err.response) return { success: false, error: `${prefix}: ${err.response.status} ${JSON.stringify(err.response.data || {})}` };
    if (err.request) return { success: false, error: `${prefix}: network error` };
  }
  return { success: false, error: `${prefix}: ${err instanceof Error ? err.message : "unknown"}` };
}

/**
 * Bags.fm integration — launch Solana tokens with fee sharing,
 * claim accumulated fees, and swap. Requires BAGS_API_KEY.
 * Docs: https://bags.fm/api
 */
export class BagsTool {
  private api: AxiosInstance;
  private apiKey: string;
  private partnerConfigKey: string;
  private wallet: WalletTool;

  constructor(wallet: WalletTool) {
    this.apiKey = process.env.BAGS_API_KEY || "";
    this.partnerConfigKey = process.env.BAGS_PARTNER_CONFIG_KEY || "";
    this.wallet = wallet;
    this.api = axios.create({
      baseURL: "https://api.bags.fm/v1",
      headers: { "x-api-key": this.apiKey, "content-type": "application/json", accept: "application/json" },
      timeout: 30000,
    });
  }

  private requireKey(): ToolResult | null {
    if (!this.apiKey) return { success: false, error: "BAGS_API_KEY not set" };
    return null;
  }

  async launchToken(args: {
    name: string;
    symbol: string;
    description: string;
    imageUrl?: string;
    twitter?: string;
    website?: string;
    telegram?: string;
    initialBuySol?: number;
    feeRecipients?: { wallet: string; percentage: number }[];
  }): Promise<ToolResult> {
    const miss = this.requireKey();
    if (miss) return miss;
    const kp = this.wallet.getKeypair();
    if (!kp) return { success: false, error: "Wallet not configured (SOLANA_PRIVATE_KEY)" };
    try {
      const resp = await this.api.post("/launch/create", {
        creator: kp.publicKey.toBase58(),
        name: args.name,
        symbol: args.symbol,
        description: args.description,
        imageUrl: args.imageUrl,
        twitter: args.twitter,
        website: args.website,
        telegram: args.telegram,
        initialBuySol: args.initialBuySol ?? 0,
        partnerConfigKey: this.partnerConfigKey || undefined,
        feeRecipients: args.feeRecipients,
      });
      const b64 = resp.data?.transaction || resp.data?.tx;
      if (!b64) return { success: true, output: JSON.stringify(resp.data, null, 2) };
      const vtx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
      vtx.sign([kp]);
      const sig = await this.wallet.getConnection().sendTransaction(vtx, { skipPreflight: false });
      await this.wallet.getConnection().confirmTransaction(sig, "confirmed");
      return { success: true, output: JSON.stringify({ ...resp.data, signature: sig, explorer: `https://solscan.io/tx/${sig}` }, null, 2) };
    } catch (e) { return wrap(e, "bags launchToken"); }
  }

  async claimFees(positionKey?: string): Promise<ToolResult> {
    const miss = this.requireKey();
    if (miss) return miss;
    const kp = this.wallet.getKeypair();
    if (!kp) return { success: false, error: "Wallet not configured" };
    try {
      const resp = await this.api.post("/fees/claim", {
        wallet: kp.publicKey.toBase58(),
        positionKey,
        partnerConfigKey: this.partnerConfigKey || undefined,
      });
      const b64 = resp.data?.transaction;
      if (!b64) return { success: true, output: JSON.stringify(resp.data, null, 2) };
      return await this.wallet.signAndSend(b64);
    } catch (e) { return wrap(e, "bags claimFees"); }
  }

  async swap(args: { inputMint: string; outputMint: string; amount: string | number; slippageBps?: number }): Promise<ToolResult> {
    const miss = this.requireKey();
    if (miss) return miss;
    const kp = this.wallet.getKeypair();
    if (!kp) return { success: false, error: "Wallet not configured" };
    try {
      const resp = await this.api.post("/swap", {
        user: kp.publicKey.toBase58(),
        inputMint: args.inputMint,
        outputMint: args.outputMint,
        amount: String(args.amount),
        slippageBps: args.slippageBps ?? 100,
      });
      const b64 = resp.data?.transaction;
      if (!b64) return { success: true, output: JSON.stringify(resp.data, null, 2) };
      return await this.wallet.signAndSend(b64);
    } catch (e) { return wrap(e, "bags swap"); }
  }

  async listPositions(): Promise<ToolResult> {
    const miss = this.requireKey();
    if (miss) return miss;
    const kp = this.wallet.getKeypair();
    if (!kp) return { success: false, error: "Wallet not configured" };
    try {
      const resp = await this.api.get("/positions", { params: { wallet: kp.publicKey.toBase58() } });
      return { success: true, output: JSON.stringify(resp.data, null, 2) };
    } catch (e) { return wrap(e, "bags listPositions"); }
  }
}
