// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Helius API Service
// Solana RPC, DAS API, Enhanced Transactions, Webhooks
// ═══════════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface HeliusAsset {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
      description?: string;
    };
    links?: {
      image?: string;
    };
  };
  ownership: {
    owner: string;
  };
  compression?: {
    compressed: boolean;
  };
}

export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  fee: number;
  feePayer: string;
  description?: string;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }>;
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  symbol?: string;
  name?: string;
}

export class HeliusService {
  private apiKey: string;
  private rpcUrl: string;
  private connection: Connection;
  private baseUrl = 'https://api.helius.xyz/v0';

  constructor(apiKey: string, rpcUrl?: string) {
    this.apiKey = apiKey;
    this.rpcUrl = rpcUrl || `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    this.connection = new Connection(this.rpcUrl, 'confirmed');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RPC Methods
  // ─────────────────────────────────────────────────────────────────────────────

  async getBalance(address: string): Promise<number> {
    try {
      const pubkey = new PublicKey(address);
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('[HELIUS] Balance fetch error:', error);
      return 0;
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    try {
      const pubkey = new PublicKey(address);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      return tokenAccounts.value.map((account) => {
        const info = account.account.data.parsed.info;
        return {
          mint: info.mint,
          amount: parseInt(info.tokenAmount.amount),
          decimals: info.tokenAmount.decimals,
          uiAmount: info.tokenAmount.uiAmount || 0,
        };
      });
    } catch (error) {
      console.error('[HELIUS] Token balances error:', error);
      return [];
    }
  }

  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    return blockhash;
  }

  async getSlot(): Promise<number> {
    return await this.connection.getSlot();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DAS API - Digital Asset Standard
  // ─────────────────────────────────────────────────────────────────────────────

  async getAssetsByOwner(owner: string, page = 1, limit = 100): Promise<HeliusAsset[]> {
    try {
      const response = await fetch(`${this.rpcUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'ralph-das',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: owner,
            page,
            limit,
          },
        }),
      });

      const data = (await response.json()) as { result?: { items?: HeliusAsset[] } };
      return data.result?.items || [];
    } catch (error) {
      console.error('[HELIUS] DAS getAssetsByOwner error:', error);
      return [];
    }
  }

  async getAsset(assetId: string): Promise<HeliusAsset | null> {
    try {
      const response = await fetch(`${this.rpcUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'ralph-das',
          method: 'getAsset',
          params: { id: assetId },
        }),
      });

      const data = (await response.json()) as { result?: HeliusAsset };
      return data.result || null;
    } catch (error) {
      console.error('[HELIUS] DAS getAsset error:', error);
      return null;
    }
  }

  async searchAssets(query: string, page = 1, limit = 20): Promise<HeliusAsset[]> {
    try {
      const response = await fetch(`${this.rpcUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'ralph-das',
          method: 'searchAssets',
          params: {
            nativeBalance: { min: 0 },
            page,
            limit,
          },
        }),
      });

      const data = (await response.json()) as { result?: { items?: HeliusAsset[] } };
      return data.result?.items || [];
    } catch (error) {
      console.error('[HELIUS] DAS searchAssets error:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Enhanced Transactions API
  // ─────────────────────────────────────────────────────────────────────────────

  async getEnhancedTransactions(address: string, limit = 10): Promise<HeliusTransaction[]> {
    try {
      const url = `${this.baseUrl}/addresses/${address}/transactions?api-key=${this.apiKey}&limit=${limit}`;
      const response = await fetch(url);
      const data = (await response.json()) as HeliusTransaction[];
      return data || [];
    } catch (error) {
      console.error('[HELIUS] Enhanced transactions error:', error);
      return [];
    }
  }

  async parseTransaction(signature: string): Promise<HeliusTransaction | null> {
    try {
      const url = `${this.baseUrl}/transactions?api-key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [signature] }),
      });

      const data = (await response.json()) as HeliusTransaction[];
      return data[0] || null;
    } catch (error) {
      console.error('[HELIUS] Parse transaction error:', error);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Token Metadata
  // ─────────────────────────────────────────────────────────────────────────────

  async getTokenMetadata(mintAddresses: string[]): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/token-metadata?api-key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mintAccounts: mintAddresses }),
      });

      return (await response.json()) as any[];
    } catch (error) {
      console.error('[HELIUS] Token metadata error:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Webhooks (for real-time monitoring)
  // ─────────────────────────────────────────────────────────────────────────────

  async createWebhook(webhookUrl: string, addresses: string[], transactionTypes: string[] = ['Any']): Promise<any> {
    try {
      const url = `${this.baseUrl}/webhooks?api-key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookURL: webhookUrl,
          transactionTypes,
          accountAddresses: addresses,
          webhookType: 'enhanced',
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('[HELIUS] Create webhook error:', error);
      return null;
    }
  }

  async listWebhooks(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/webhooks?api-key=${this.apiKey}`;
      const response = await fetch(url);
      return (await response.json()) as any[];
    } catch (error) {
      console.error('[HELIUS] List webhooks error:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Priority Fees
  // ─────────────────────────────────────────────────────────────────────────────

  async getPriorityFeeEstimate(accountKeys: string[]): Promise<number> {
    try {
      const response = await fetch(`${this.rpcUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'ralph-fee',
          method: 'getPriorityFeeEstimate',
          params: [{ accountKeys, options: { priorityLevel: 'High' } }],
        }),
      });

      const data = (await response.json()) as { result?: { priorityFeeEstimate?: number } };
      return data.result?.priorityFeeEstimate || 0;
    } catch (error) {
      console.error('[HELIUS] Priority fee error:', error);
      return 0;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  getConnection(): Connection {
    return this.connection;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const slot = await this.connection.getSlot();
      return slot > 0;
    } catch {
      return false;
    }
  }
}

export default HeliusService;
