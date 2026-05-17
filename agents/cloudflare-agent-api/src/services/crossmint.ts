// ═══════════════════════════════════════════════════════════════
// CROSSMINT SERVICE - Wallet operations via Crossmint API
// Supports: MPC Wallets, Smart Wallets, and GOAT SDK Integration
// ═══════════════════════════════════════════════════════════════

import type { Env } from '../index';

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export type WalletType = 'smart' | 'mpc' | 'custodial';
export type ChainType = 'solana' | 'solana-devnet';
export type SignerType = 'api-key' | 'delegated' | 'admin';

interface CrossmintWallet {
  address: string;
  chain: string;
  type: string;
  locator: string;
  createdAt?: string;
  // Smart wallet specific
  adminSignerAddress?: string;
  walletType?: WalletType;
}

export interface SmartWallet extends CrossmintWallet {
  walletType: 'smart';
  adminSignerAddress: string;
  delegatedSignerId?: string;
  delegatedSignerStatus?: 'pending' | 'active' | 'rejected';
}

export interface MpcWallet extends CrossmintWallet {
  walletType: 'mpc';
  linkedUser: string;
}

interface TokenBalance {
  token: string;
  symbol: string;
  amount: string;
  decimals: number;
  usdValue?: string;
}

interface WalletBalances {
  nativeToken: TokenBalance;
  usdc?: TokenBalance;
  tokens: TokenBalance[];
}

interface TransferResult {
  id: string;
  status: 'pending' | 'success' | 'failed';
  hash?: string;
  explorerLink?: string;
}

interface FundResult {
  balances: WalletBalances;
  transactionId?: string;
}

// API versions
const API_VERSION = '2025-06-09';
const API_VERSION_LEGACY = 'v1-alpha2';

// ─────────────────────────────────────────────────
// CROSSMINT SERVICE CLASS
// ─────────────────────────────────────────────────

export class CrossmintService {
  private apiKey: string;
  private environment: 'staging' | 'production';
  private baseUrl: string;

  constructor(private env: Env) {
    this.apiKey = env.CROSSMINT_SERVERSIDE_API_KEY || '';
    this.environment = this.apiKey.startsWith('sk_staging_') ? 'staging' : 'production';
    this.baseUrl = this.environment === 'staging'
      ? 'https://staging.crossmint.com'
      : 'https://www.crossmint.com';
  }

  // ─────────────────────────────────────────────────
  // API REQUEST HELPER
  // ─────────────────────────────────────────────────

  private async apiRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    version: string = API_VERSION
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Crossmint API key not configured');
    }

    const url = `${this.baseUrl}/api/${version}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Crossmint API error: ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return res.json();
  }

  // ─────────────────────────────────────────────────
  // LOCATOR HELPERS
  // ─────────────────────────────────────────────────

  private buildLocator(identifier: string, chain: 'solana' | 'solana-devnet'): string {
    // Map chain to wallet type
    const walletType = chain === 'solana-devnet' ? 'solana-mpc-wallet' : 'solana-mpc-wallet';

    // If it's an email
    if (identifier.includes('@')) {
      return `email:${identifier}:${walletType}`;
    }
    // If it's a Solana address (base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(identifier)) {
      return identifier;
    }
    // If it's a phone number
    if (identifier.startsWith('+')) {
      return `phoneNumber:${identifier}:${walletType}`;
    }
    // Default to userId
    return `userId:${identifier}:${walletType}`;
  }

  // ═══════════════════════════════════════════════════
  // WALLET OPERATIONS
  // ═══════════════════════════════════════════════════

  async createWallet(params: {
    identifier: string;
    chain?: 'solana' | 'solana-devnet';
    alias?: string;
  }): Promise<CrossmintWallet> {
    const chain = params.chain || (this.environment === 'staging' ? 'solana-devnet' : 'solana');
    const locator = this.buildLocator(params.identifier, chain);

    // Use legacy API (v1-alpha2) for Solana wallet creation
    const body: Record<string, unknown> = {
      type: 'solana-custodial-wallet',
      linkedUser: locator,
    };

    // IMPORTANT: Use legacy API version for Solana wallets
    const result = await this.apiRequest<{
      address?: string;
      publicKey?: string;
      createdAt?: string;
      locator?: string;
      linkedUser?: string;
      type?: string;
      chain?: string;
    }>('POST', '/wallets', body, API_VERSION_LEGACY);

    return {
      address: result.address || result.publicKey || '',
      chain: result.chain || chain,
      type: result.type || 'solana-mpc-wallet',
      locator: result.linkedUser || locator,
      createdAt: result.createdAt,
    };
  }

  async getWallet(
    identifier: string,
    chain: 'solana' | 'solana-devnet'
  ): Promise<CrossmintWallet | null> {
    const locator = this.buildLocator(identifier, chain);

    try {
      // Use legacy API for Solana wallets
      const result = await this.apiRequest<{
        address?: string;
        publicKey?: string;
        type?: string;
        linkedUser?: string;
      }>('GET', `/wallets/${encodeURIComponent(locator)}`, undefined, API_VERSION_LEGACY);

      return {
        address: result.address || result.publicKey || '',
        chain,
        type: result.type || 'solana-mpc-wallet',
        locator: result.linkedUser || locator,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getBalances(
    identifier: string,
    chain: 'solana' | 'solana-devnet',
    tokens: string[] = ['usdc']
  ): Promise<WalletBalances> {
    const locator = this.buildLocator(identifier, chain);
    const tokenParams = tokens.join(',');

    // Use legacy API for Solana wallet balances
    const result = await this.apiRequest<{
      nativeToken?: { amount?: string; usdValue?: string };
      usdc?: { amount?: string; usdValue?: string };
      tokens?: Array<{
        token?: string;
        mint?: string;
        symbol?: string;
        amount?: string;
        decimals?: number;
        usdValue?: string;
      }>;
    }>('GET', `/wallets/${encodeURIComponent(locator)}/balances?tokens=${tokenParams}&chains=${chain}`, undefined, API_VERSION_LEGACY);

    return {
      nativeToken: {
        token: 'SOL',
        symbol: 'SOL',
        amount: result.nativeToken?.amount || '0',
        decimals: 9,
        usdValue: result.nativeToken?.usdValue,
      },
      usdc: result.usdc ? {
        token: 'USDC',
        symbol: 'USDC',
        amount: result.usdc.amount || '0',
        decimals: 6,
        usdValue: result.usdc.usdValue,
      } : undefined,
      tokens: (result.tokens || []).map(t => ({
        token: t.token || t.mint || '',
        symbol: t.symbol || '',
        amount: t.amount || '0',
        decimals: t.decimals || 9,
        usdValue: t.usdValue,
      })),
    };
  }

  async fundWallet(
    identifier: string,
    amount: number = 10,
    chain: 'solana-devnet' = 'solana-devnet'
  ): Promise<FundResult> {
    if (this.environment !== 'staging') {
      throw new Error('Staging fund is only available in staging environment');
    }

    const locator = this.buildLocator(identifier, chain);

    const result = await this.apiRequest<{
      balances?: WalletBalances;
      transactionId?: string;
    }>(
      'POST',
      `/wallets/${encodeURIComponent(locator)}/balances`,
      {
        amount,
        token: 'usdxm',
        chain,
      },
      API_VERSION_LEGACY
    );

    return {
      balances: result.balances || {
        nativeToken: { token: 'SOL', symbol: 'SOL', amount: '0', decimals: 9 },
        tokens: [],
      },
      transactionId: result.transactionId,
    };
  }

  async transfer(params: {
    fromIdentifier: string;
    toAddress: string;
    token: string;
    amount: string;
    chain?: 'solana' | 'solana-devnet';
  }): Promise<TransferResult> {
    const chain = params.chain || (this.environment === 'staging' ? 'solana-devnet' : 'solana');
    const locator = this.buildLocator(params.fromIdentifier, chain);
    const tokenLocator = `${chain}:${params.token}`;

    const result = await this.apiRequest<{
      id: string;
      status?: string;
      onChain?: {
        txId?: string;
        explorerLink?: string;
      };
      hash?: string;
    }>(
      'POST',
      `/wallets/${encodeURIComponent(locator)}/tokens/${tokenLocator}/transfers`,
      {
        recipient: params.toAddress,
        amount: params.amount,
        signer: 'api-key',
      }
    );

    return {
      id: result.id,
      status: (result.status as 'pending' | 'success' | 'failed') || 'pending',
      hash: result.onChain?.txId || result.hash,
      explorerLink: result.onChain?.explorerLink,
    };
  }

  // ═══════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════
  // ADDRESS-BASED LOOKUPS (for MPC wallets)
  // ═══════════════════════════════════════════════════

  async getWalletByAddress(address: string): Promise<CrossmintWallet | null> {
    try {
      // Use legacy API for Solana wallets - lookup by address directly
      const result = await this.apiRequest<{
        address?: string;
        publicKey?: string;
        type?: string;
        linkedUser?: string;
        chain?: string;
      }>('GET', `/wallets/${address}`, undefined, API_VERSION_LEGACY);

      return {
        address: result.address || result.publicKey || address,
        chain: result.chain || 'solana',
        type: result.type || 'solana-mpc-wallet',
        locator: result.linkedUser || '',
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getBalancesByAddress(
    address: string,
    chain: 'solana' | 'solana-devnet',
    tokens: string[] = ['usdc']
  ): Promise<WalletBalances> {
    const tokenParams = tokens.join(',');
    // Crossmint API uses 'solana' for both mainnet and devnet in balance queries
    const chainParam = chain === 'solana-devnet' ? 'solana' : chain;

    // Use legacy API for Solana wallet balances - lookup by address directly
    const result = await this.apiRequest<{
      nativeToken?: { amount?: string; usdValue?: string };
      usdc?: { amount?: string; usdValue?: string };
      tokens?: Array<{
        token?: string;
        mint?: string;
        symbol?: string;
        amount?: string;
        decimals?: number;
        usdValue?: string;
      }>;
    }>('GET', `/wallets/${address}/balances?tokens=${tokenParams}&chains=${chainParam}`, undefined, API_VERSION_LEGACY);

    return {
      nativeToken: {
        token: 'SOL',
        symbol: 'SOL',
        amount: result.nativeToken?.amount || '0',
        decimals: 9,
        usdValue: result.nativeToken?.usdValue,
      },
      usdc: result.usdc ? {
        token: 'USDC',
        symbol: 'USDC',
        amount: result.usdc.amount || '0',
        decimals: 6,
        usdValue: result.usdc.usdValue,
      } : undefined,
      tokens: (result.tokens || []).map(t => ({
        token: t.token || t.mint || '',
        symbol: t.symbol || '',
        amount: t.amount || '0',
        decimals: t.decimals || 9,
        usdValue: t.usdValue,
      })),
    };
  }

  // ═══════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getInfo(): {
    configured: boolean;
    environment: 'staging' | 'production';
    baseUrl: string;
    hasClientKey: boolean;
  } {
    return {
      configured: this.isConfigured(),
      environment: this.environment,
      baseUrl: this.baseUrl,
      hasClientKey: !!this.env.CROSSMINT_CLIENTSIDE_API_KEY,
    };
  }

  isValidSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  // ═══════════════════════════════════════════════════
  // SMART WALLET OPERATIONS
  // ═══════════════════════════════════════════════════

  /**
   * Create a Solana Smart Wallet with admin signer
   * Smart wallets use account abstraction for enhanced security
   */
  async createSmartWallet(params: {
    adminSignerAddress?: string;
    linkedUser?: string;
    chain?: ChainType;
  }): Promise<SmartWallet> {
    const chain = params.chain || (this.environment === 'staging' ? 'solana-devnet' : 'solana');

    const body: Record<string, unknown> = {
      type: 'solana-smart-wallet',
      config: {
        adminSigner: params.adminSignerAddress
          ? { type: 'solana-keypair', address: params.adminSignerAddress }
          : { type: 'solana-fireblocks-custodial' },
      },
    };

    if (params.linkedUser) {
      body.linkedUser = params.linkedUser;
    }

    const result = await this.apiRequest<{
      address?: string;
      publicKey?: string;
      createdAt?: string;
      type?: string;
      config?: {
        adminSigner?: {
          address?: string;
        };
      };
    }>('POST', '/wallets', body);

    return {
      address: result.address || result.publicKey || '',
      chain,
      type: 'solana-smart-wallet',
      walletType: 'smart',
      locator: result.address || '',
      adminSignerAddress: result.config?.adminSigner?.address || params.adminSignerAddress || '',
      createdAt: result.createdAt,
    };
  }

  /**
   * Create a Solana MPC Wallet (Multi-Party Computation)
   * MPC wallets are custodial wallets managed by Crossmint
   */
  async createMpcWallet(params: {
    identifier: string;
    chain?: ChainType;
    alias?: string;
  }): Promise<MpcWallet> {
    const chain = params.chain || (this.environment === 'staging' ? 'solana-devnet' : 'solana');
    const locator = this.buildLocator(params.identifier, chain);

    const body: Record<string, unknown> = {
      type: 'solana-mpc-wallet',
      linkedUser: locator,
    };

    if (params.alias) {
      body.config = { alias: params.alias };
    }

    const result = await this.apiRequest<{
      address?: string;
      publicKey?: string;
      createdAt?: string;
      linkedUser?: string;
    }>('POST', '/wallets', body);

    return {
      address: result.address || result.publicKey || '',
      chain,
      type: 'solana-mpc-wallet',
      walletType: 'mpc',
      locator,
      linkedUser: result.linkedUser || params.identifier,
      createdAt: result.createdAt,
    };
  }

  /**
   * Get or create a smart wallet (idempotent)
   */
  async getOrCreateSmartWallet(params: {
    adminSignerAddress?: string;
    linkedUser?: string;
    chain?: ChainType;
  }): Promise<SmartWallet> {
    // For smart wallets, we always create new if no linkedUser
    if (!params.linkedUser) {
      return this.createSmartWallet(params);
    }

    const chain = params.chain || (this.environment === 'staging' ? 'solana-devnet' : 'solana');

    try {
      const existing = await this.getWallet(params.linkedUser, chain);
      if (existing) {
        return {
          ...existing,
          walletType: 'smart',
          adminSignerAddress: params.adminSignerAddress || '',
        };
      }
    } catch {
      // Wallet doesn't exist, create it
    }

    return this.createSmartWallet(params);
  }

  // ═══════════════════════════════════════════════════
  // DELEGATED SIGNER OPERATIONS
  // ═══════════════════════════════════════════════════

  /**
   * Register a delegated signer for a smart wallet
   */
  async registerDelegatedSigner(params: {
    walletAddress: string;
    signerAddress: string;
    expiresAt?: string;
  }): Promise<{
    id: string;
    status: 'pending' | 'active' | 'rejected';
    message?: string;
    targetSignerLocator?: string;
  }> {
    const body = {
      signer: `solana-keypair:${params.signerAddress}`,
      ...(params.expiresAt && { expiresAt: params.expiresAt }),
    };

    const result = await this.apiRequest<{
      id: string;
      status: string;
      message?: string;
      targetSignerLocator?: string;
    }>('POST', `/wallets/${params.walletAddress}/signers`, body);

    return {
      id: result.id,
      status: (result.status as 'pending' | 'active' | 'rejected') || 'pending',
      message: result.message,
      targetSignerLocator: result.targetSignerLocator,
    };
  }

  /**
   * Approve a delegated signer request
   */
  async approveDelegatedSigner(params: {
    walletAddress: string;
    signerId: string;
    signerLocator: string;
    signature: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<{ status: string }> {
    const approval: Record<string, unknown> = {
      signer: params.signerLocator,
      signature: params.signature,
    };

    if (params.metadata) {
      approval.metadata = params.metadata;
    }

    const body = {
      approvals: [approval],
    };

    const result = await this.apiRequest<{ status: string }>(
      'POST',
      `/wallets/${params.walletAddress}/signers/${params.signerId}/approvals`,
      body
    );

    return result;
  }

  // ═══════════════════════════════════════════════════
  // GOAT SDK TOOL OPERATIONS
  // ═══════════════════════════════════════════════════

  /**
   * Get balance for a wallet (GOAT: getBalance)
   */
  async goatGetBalance(params: {
    address: string;
    token?: string;
    chain?: ChainType;
  }): Promise<{
    token: string;
    symbol: string;
    amount: string;
    decimals: number;
    usdValue?: string;
  }> {
    const chain = params.chain || (this.environment === 'staging' ? 'solana-devnet' : 'solana');
    const token = params.token || 'sol';

    const balances = await this.getBalancesByAddress(params.address, chain, [token]);

    if (token.toLowerCase() === 'sol') {
      return balances.nativeToken;
    } else if (token.toLowerCase() === 'usdc' && balances.usdc) {
      return balances.usdc;
    }

    const tokenBalance = balances.tokens.find(
      t => t.token.toLowerCase() === token.toLowerCase() || t.symbol.toLowerCase() === token.toLowerCase()
    );

    if (tokenBalance) {
      return tokenBalance;
    }

    // Return zero balance if not found
    return {
      token,
      symbol: token.toUpperCase(),
      amount: '0',
      decimals: 9,
    };
  }

  /**
   * Transfer tokens (GOAT: transfer)
   */
  async goatTransfer(params: {
    fromAddress: string;
    toAddress: string;
    token: string;
    amount: string;
    chain?: ChainType;
    signerType?: SignerType;
  }): Promise<TransferResult> {
    const chain = params.chain || (this.environment === 'staging' ? 'solana-devnet' : 'solana');
    const tokenLocator = `${chain}:${params.token}`;

    const result = await this.apiRequest<{
      id: string;
      status?: string;
      onChain?: {
        txId?: string;
        explorerLink?: string;
      };
      hash?: string;
    }>(
      'POST',
      `/wallets/${params.fromAddress}/tokens/${tokenLocator}/transfers`,
      {
        recipient: params.toAddress,
        amount: params.amount,
        signer: params.signerType || 'api-key',
      }
    );

    return {
      id: result.id,
      status: (result.status as 'pending' | 'success' | 'failed') || 'pending',
      hash: result.onChain?.txId || result.hash,
      explorerLink: result.onChain?.explorerLink,
    };
  }

  /**
   * Get token price from CoinGecko (GOAT: getTokenPrice)
   */
  async goatGetTokenPrice(params: {
    token: string;
    currency?: string;
  }): Promise<{
    token: string;
    price: number;
    currency: string;
    change24h?: number;
  }> {
    const currency = params.currency || 'usd';
    const tokenMap: Record<string, string> = {
      'sol': 'solana',
      'usdc': 'usd-coin',
      'bonk': 'bonk',
      'jup': 'jupiter',
      'ray': 'raydium',
    };

    const coinId = tokenMap[params.token.toLowerCase()] || params.token.toLowerCase();

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error('CoinGecko API error');
      }

      const data = await response.json() as Record<string, { [key: string]: number }>;
      const tokenData = data[coinId];

      if (!tokenData) {
        throw new Error(`Token ${params.token} not found`);
      }

      return {
        token: params.token,
        price: tokenData[currency] || 0,
        currency,
        change24h: tokenData[`${currency}_24h_change`],
      };
    } catch (error) {
      console.error('[GOAT] getTokenPrice error:', error);
      throw error;
    }
  }

  /**
   * Get swap quote from Jupiter (GOAT: getSwapQuote)
   */
  async goatGetSwapQuote(params: {
    inputToken: string;
    outputToken: string;
    amount: string;
    slippageBps?: number;
  }): Promise<{
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    priceImpact: string;
    route: string[];
  }> {
    // Token mint addresses for common tokens (devnet/mainnet)
    const tokenMints: Record<string, { mainnet: string; devnet: string }> = {
      sol: {
        mainnet: 'So11111111111111111111111111111111111111112',
        devnet: 'So11111111111111111111111111111111111111112',
      },
      usdc: {
        mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      },
    };

    const inputMint = tokenMints[params.inputToken.toLowerCase()]
      ? tokenMints[params.inputToken.toLowerCase()][this.environment === 'staging' ? 'devnet' : 'mainnet']
      : params.inputToken;

    const outputMint = tokenMints[params.outputToken.toLowerCase()]
      ? tokenMints[params.outputToken.toLowerCase()][this.environment === 'staging' ? 'devnet' : 'mainnet']
      : params.outputToken;

    const slippageBps = params.slippageBps || 50; // 0.5% default

    try {
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${params.amount}&slippageBps=${slippageBps}`;

      const response = await fetch(quoteUrl);
      if (!response.ok) {
        throw new Error('Jupiter API error');
      }

      const data = await response.json() as {
        inAmount: string;
        outAmount: string;
        priceImpactPct: string;
        routePlan: Array<{ swapInfo: { label: string } }>;
      };

      return {
        inputToken: params.inputToken,
        outputToken: params.outputToken,
        inputAmount: data.inAmount,
        outputAmount: data.outAmount,
        priceImpact: data.priceImpactPct,
        route: data.routePlan?.map(r => r.swapInfo?.label).filter(Boolean) || [],
      };
    } catch (error) {
      console.error('[GOAT] getSwapQuote error:', error);
      throw error;
    }
  }

  /**
   * Request devnet SOL airdrop (GOAT: airdropDevnet)
   */
  async goatAirdropDevnet(params: {
    address: string;
    amount?: number;
  }): Promise<{
    success: boolean;
    signature?: string;
    amount: number;
  }> {
    if (this.environment !== 'staging') {
      throw new Error('Airdrop only available on devnet');
    }

    const amount = params.amount || 1; // Default 1 SOL
    const lamports = amount * 1_000_000_000;

    try {
      const response = await fetch('https://api.devnet.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'requestAirdrop',
          params: [params.address, lamports],
        }),
      });

      const data = await response.json() as {
        result?: string;
        error?: { message: string };
      };

      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        success: true,
        signature: data.result,
        amount,
      };
    } catch (error) {
      console.error('[GOAT] airdropDevnet error:', error);
      throw error;
    }
  }

  /**
   * Execute a GOAT tool by name
   */
  async executeGoatTool(
    toolName: string,
    params: Record<string, unknown>,
    walletAddress?: string
  ): Promise<unknown> {
    switch (toolName) {
      case 'getBalance':
        return this.goatGetBalance({
          address: (params.address as string) || walletAddress || '',
          token: params.token as string,
          chain: params.chain as ChainType,
        });

      case 'transfer':
        if (!walletAddress) throw new Error('Wallet address required for transfer');
        return this.goatTransfer({
          fromAddress: walletAddress,
          toAddress: params.toAddress as string,
          token: params.token as string,
          amount: params.amount as string,
          chain: params.chain as ChainType,
          signerType: params.signerType as SignerType,
        });

      case 'getTokenPrice':
        return this.goatGetTokenPrice({
          token: params.token as string,
          currency: params.currency as string,
        });

      case 'getSwapQuote':
        return this.goatGetSwapQuote({
          inputToken: params.inputToken as string,
          outputToken: params.outputToken as string,
          amount: params.amount as string,
          slippageBps: params.slippageBps as number,
        });

      case 'airdropDevnet':
        return this.goatAirdropDevnet({
          address: (params.address as string) || walletAddress || '',
          amount: params.amount as number,
        });

      default:
        throw new Error(`Unknown GOAT tool: ${toolName}`);
    }
  }

  /**
   * Get list of available GOAT tools
   */
  getAvailableGoatTools(): Array<{
    name: string;
    description: string;
    category: string;
    requiresWallet: boolean;
    requiresSigning: boolean;
  }> {
    return [
      {
        name: 'getBalance',
        description: 'Get wallet balance for SOL or any token',
        category: 'wallet',
        requiresWallet: true,
        requiresSigning: false,
      },
      {
        name: 'transfer',
        description: 'Transfer tokens between wallets',
        category: 'wallet',
        requiresWallet: true,
        requiresSigning: true,
      },
      {
        name: 'getTokenPrice',
        description: 'Get current token price from CoinGecko',
        category: 'data',
        requiresWallet: false,
        requiresSigning: false,
      },
      {
        name: 'getSwapQuote',
        description: 'Get swap quote from Jupiter aggregator',
        category: 'defi',
        requiresWallet: false,
        requiresSigning: false,
      },
      {
        name: 'airdropDevnet',
        description: 'Request devnet SOL airdrop',
        category: 'wallet',
        requiresWallet: true,
        requiresSigning: false,
      },
    ];
  }
}
