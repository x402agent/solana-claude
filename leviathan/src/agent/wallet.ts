/**
 * leviathan/src/agent/wallet.ts — AgenticWallet adapter
 *
 * Wraps @openclawd/wallet (Privy TEE-backed) when available.
 * Falls back to the leviathan's own keypair for signing.
 *
 * API mirrors AgenticWallet from the published package (once released):
 *   import { AgenticWallet } from '@openclawd/wallet';
 *
 * Until the package ships, this shim covers the surface the Leviathan needs.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loadPubkey, signMessage } from '../identity/index.js';

const USDC_DEVNET = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // devnet USDC

export interface WalletBrief {
  pubkey: string;
  solBalance: number;
  usdcBalance: number;
  cluster: string;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: string[];
}

export class AgenticWalletShim {
  private connection: Connection;
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env['SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com';
    this.connection = new Connection(this.rpcUrl, 'confirmed');
  }

  get pubkey(): string {
    return loadPubkey() ?? 'unknown';
  }

  async brief(): Promise<WalletBrief> {
    const pubkeyStr = this.pubkey;
    let solBalance = 0;
    let usdcBalance = 0;

    try {
      const pk = new PublicKey(pubkeyStr);
      const lamports = await this.connection.getBalance(pk);
      solBalance = lamports / LAMPORTS_PER_SOL;
    } catch { /* devnet may not have the account */ }

    return {
      pubkey: pubkeyStr,
      solBalance,
      usdcBalance,
      cluster: this.rpcUrl.includes('devnet') ? 'devnet' : 'mainnet-beta',
    };
  }

  async jupiterSwapQuote(opts: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
  }): Promise<SwapQuote | string> {
    try {
      const url = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${opts.inputMint}&outputMint=${opts.outputMint}&amount=${opts.amount}&slippageBps=${opts.slippageBps ?? 50}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return `Jupiter quote failed: ${res.status}`;
      const data = (await res.json()) as {
        inAmount: string;
        outAmount: string;
        priceImpactPct: string;
        routePlan?: Array<{ swapInfo?: { label?: string } }>;
      };
      return {
        inputMint: opts.inputMint,
        outputMint: opts.outputMint,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        priceImpactPct: data.priceImpactPct,
        routePlan: (data.routePlan ?? []).map((r) => r.swapInfo?.label ?? '?'),
      };
    } catch (e) {
      return String(e);
    }
  }

  sign(message: Uint8Array): string {
    return signMessage(message);
  }
}

export function getWallet(): AgenticWalletShim {
  return new AgenticWalletShim();
}
