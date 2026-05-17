import { Connection, Keypair, VersionedTransaction, Transaction, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import type { ToolResult } from "../types/index.js";

/**
 * Wallet helper: loads a Solana keypair from SOLANA_PRIVATE_KEY (base58 or JSON array),
 * signs and sends transactions built by DFlow / PumpPortal / Bags.
 */
export class WalletTool {
  private connection: Connection;
  private keypair: Keypair | null = null;
  private loadError: string | null = null;

  constructor() {
    const rpc = process.env.SOLANA_RPC_URL ||
      (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : "https://api.mainnet-beta.solana.com");
    this.connection = new Connection(rpc, "confirmed");
    this.loadKeypair();
  }

  private loadKeypair() {
    const raw = process.env.SOLANA_PRIVATE_KEY;
    if (!raw) { this.loadError = "SOLANA_PRIVATE_KEY not set"; return; }
    try {
      if (raw.trim().startsWith("[")) {
        const arr = JSON.parse(raw) as number[];
        this.keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
      } else {
        this.keypair = Keypair.fromSecretKey(bs58.decode(raw.trim()));
      }
    } catch (e: any) {
      this.loadError = `Failed to parse SOLANA_PRIVATE_KEY: ${e.message}`;
    }
  }

  getPublicKey(): ToolResult {
    if (!this.keypair) return { success: false, error: this.loadError || "No wallet loaded" };
    return { success: true, output: this.keypair.publicKey.toBase58() };
  }

  async getBalance(): Promise<ToolResult> {
    if (!this.keypair) return { success: false, error: this.loadError || "No wallet loaded" };
    try {
      const lamports = await this.connection.getBalance(this.keypair.publicKey);
      return { success: true, output: JSON.stringify({ address: this.keypair.publicKey.toBase58(), sol: lamports / 1e9, lamports }, null, 2) };
    } catch (e: any) {
      return { success: false, error: `getBalance: ${e.message}` };
    }
  }

  /**
   * Signs and sends a base64-encoded transaction (versioned or legacy).
   * DFlow /swap and /prediction-market-init and PumpPortal /trade-local
   * all return this format.
   */
  async signAndSend(base64Tx: string, extraSigners: Keypair[] = []): Promise<ToolResult> {
    if (!this.keypair) return { success: false, error: this.loadError || "No wallet loaded" };
    try {
      const buf = Buffer.from(base64Tx, "base64");
      let sig: string;
      try {
        const vtx = VersionedTransaction.deserialize(buf);
        vtx.sign([this.keypair, ...extraSigners]);
        sig = await this.connection.sendTransaction(vtx, { skipPreflight: false, maxRetries: 3 });
      } catch {
        const tx = Transaction.from(buf);
        tx.partialSign(this.keypair, ...extraSigners);
        sig = await this.connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
      }
      const conf = await this.connection.confirmTransaction(sig, "confirmed");
      if (conf.value.err) return { success: false, error: `Tx failed: ${JSON.stringify(conf.value.err)}`, output: sig };
      return { success: true, output: JSON.stringify({ signature: sig, explorer: `https://solscan.io/tx/${sig}` }, null, 2) };
    } catch (e: any) {
      return { success: false, error: `signAndSend: ${e.message}` };
    }
  }

  getKeypair(): Keypair | null { return this.keypair; }
  getConnection(): Connection { return this.connection; }

  async airdrop(solAmount: number): Promise<ToolResult> {
    if (!this.keypair) return { success: false, error: this.loadError || "No wallet loaded" };
    try {
      const sig = await this.connection.requestAirdrop(this.keypair.publicKey, Math.floor(solAmount * 1e9));
      await this.connection.confirmTransaction(sig, "confirmed");
      return { success: true, output: sig };
    } catch (e: any) {
      return { success: false, error: `airdrop: ${e.message}` };
    }
  }
}

export function pubkeyValid(s: string): boolean {
  try { new PublicKey(s); return true; } catch { return false; }
}
