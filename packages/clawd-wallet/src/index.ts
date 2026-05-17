/**
 * @openclawd/wallet
 *
 * Privy-embedded Solana wallet + AI-gated trading via Grok + Jupiter swap aggregator.
 *
 * Packages:
 *   ClawdWallet   — low-level Privy wallet wrapper (sign, send, balance)
 *   AgenticWallet — permission-gated agentic trading (Grok 4.20 Beta screening)
 *   SwapService   — Jupiter aggregator integration for token swaps
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type WalletChain = "mainnet" | "devnet" | "testnet";
export type PermissionLevel = "deny" | "ask" | "allow";
export type TransactionStatus = "pending" | "confirmed" | "failed" | "rejected";
export type TransactionType = "swap" | "transfer" | "sign" | "stake";

export interface ClawdWalletInfo {
  address: string;
  chain: WalletChain;
  ready: boolean;
  walletClientType: "privy" | "phantom" | "backpack" | "solflare" | "unknown";
  createdAt: string;
}

export interface AgentPermissions {
  /** Maximum swap value in USD (default: $50) */
  maxSwapUsd: number;
  /** Maximum SOL transfer amount (default: 0.5) */
  maxTransferSol: number;
  /** How to gate token swaps */
  swap: PermissionLevel;
  /** How to gate message signing */
  signMessage: PermissionLevel;
  /** How to gate SOL/token transfers */
  transfer: PermissionLevel;
  /** Auto-confirm swaps below this price impact % */
  autoConfirmBelowPriceImpact: number;
}

export interface AgenticTransaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  network: WalletChain;
  signature?: string;
  explorerUrl?: string;
  requestedAt: number;
  settledAt?: number;
  metadata?: Record<string, unknown>;
}

export interface PendingTransaction {
  id: string;
  type: TransactionType;
  description: string;
  network: WalletChain;
  estimatedCostUsd?: number;
  metadata?: Record<string, unknown>;
}

export interface AgenticWalletConfig {
  privyAppId: string;
  grokApiKey?: string;
  permissions: Partial<AgentPermissions>;
  onPendingTransaction?: (tx: PendingTransaction) => Promise<boolean>;
  onTransactionStatus?: (tx: AgenticTransaction) => void;
}

export interface SwapQuoteParams {
  inputToken: string;
  outputToken: string;
  amount: string;
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  minimumReceivedAmount: string;
  priceImpactPct: string;
  routeLabel?: string;
}

export interface SwapResult {
  signature: string;
  explorerUrl: string;
  inputAmount: string;
  outputAmount: string;
}

// ── Default permissions ─────────────────────────────────────────────────────

export const DEFAULT_PERMISSIONS: AgentPermissions = {
  maxSwapUsd: 50,
  maxTransferSol: 0.5,
  swap: "ask",
  signMessage: "deny",
  transfer: "ask",
  autoConfirmBelowPriceImpact: 1.0,
};

// ── ClawdWallet ─────────────────────────────────────────────────────────────

interface PrivyWallet {
  address?: string;
  walletClientType?: string;
  signTransaction?: (tx: unknown) => Promise<unknown>;
  sendTransaction?: (tx: unknown) => Promise<string>;
}

export class ClawdWallet {
  readonly ready: boolean;
  readonly address: string;
  readonly chain: WalletChain;
  readonly walletClientType: string;

  private readonly _wallet: PrivyWallet;
  private readonly _rpcUrl: string;

  constructor(
    privyWallet: PrivyWallet,
    opts: { chain?: WalletChain; rpcUrl?: string } = {},
  ) {
    this._wallet = privyWallet;
    this.chain = opts.chain ?? "mainnet";
    this._rpcUrl =
      opts.rpcUrl ??
      (this.chain === "devnet"
        ? "https://api.devnet.solana.com"
        : "https://api.mainnet-beta.solana.com");
    this.address = privyWallet.address ?? "";
    this.walletClientType = privyWallet.walletClientType ?? "privy";
    this.ready = Boolean(this.address);
  }

  canSign(): boolean {
    return typeof this._wallet.signTransaction === "function";
  }

  async getBalance(): Promise<bigint> {
    const res = await fetch(this._rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [this.address],
      }),
    });
    const data = (await res.json()) as { result: { value: number } };
    return BigInt(data.result.value);
  }

  async getBalanceInSOL(): Promise<number> {
    const lamports = await this.getBalance();
    return Number(lamports) / 1e9;
  }

  async signAndSendTransaction(txBytes: Uint8Array): Promise<string> {
    if (!this._wallet.sendTransaction) {
      throw new Error("Wallet does not support sendTransaction");
    }
    return this._wallet.sendTransaction(txBytes) as Promise<string>;
  }

  explorerUrlForSignature(signature: string): string {
    const cluster = this.chain !== "mainnet" ? `?cluster=${this.chain}` : "";
    return `https://solscan.io/tx/${signature}${cluster}`;
  }

  async waitForSignature(
    signature: string,
    timeoutMs = 60_000,
  ): Promise<"confirmed" | "failed"> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const res = await fetch(this._rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignatureStatuses",
          params: [[signature]],
        }),
      });
      const data = (await res.json()) as {
        result: { value: Array<{ confirmationStatus?: string; err?: unknown } | null> };
      };
      const status = data.result.value[0];
      if (status?.err) return "failed";
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        return "confirmed";
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
    return "failed";
  }

  info(): ClawdWalletInfo {
    return {
      address: this.address,
      chain: this.chain,
      ready: this.ready,
      walletClientType: this.walletClientType as ClawdWalletInfo["walletClientType"],
      createdAt: new Date().toISOString(),
    };
  }
}

// ── SwapService ─────────────────────────────────────────────────────────────

const SOL_MINT = "So11111111111111111111111111111111111112";
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";

export class SwapService {
  private readonly chain: WalletChain;

  constructor(opts: { chain?: WalletChain } = {}) {
    this.chain = opts.chain ?? "mainnet";
  }

  async quote(params: SwapQuoteParams): Promise<SwapQuote> {
    const inputMint = params.inputToken === "SOL" ? SOL_MINT : params.inputToken;
    const outputMint = params.outputToken === "SOL" ? SOL_MINT : params.outputToken;

    const qs = new URLSearchParams({
      inputMint,
      outputMint,
      amount: params.amount,
      slippageBps: String(params.slippageBps ?? 50),
      ...(params.onlyDirectRoutes ? { onlyDirectRoutes: "true" } : {}),
    });

    const res = await fetch(`${JUPITER_QUOTE_API}/quote?${qs}`);
    if (!res.ok) throw new Error(`Jupiter quote ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {
      inAmount: string;
      outAmount: string;
      otherAmountThreshold: string;
      priceImpactPct: string;
      routePlan?: Array<{ swapInfo?: { label?: string } }>;
    };

    return {
      inputMint,
      outputMint,
      inAmount: data.inAmount,
      outAmount: data.outAmount,
      minimumReceivedAmount: data.otherAmountThreshold,
      priceImpactPct: data.priceImpactPct,
      routeLabel: data.routePlan?.[0]?.swapInfo?.label,
    };
  }

  async execute(wallet: ClawdWallet, params: SwapQuoteParams): Promise<SwapResult> {
    const quote = await this.quote(params);

    // Build swap transaction via Jupiter
    const swapRes = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet.address,
        wrapAndUnwrapSol: true,
      }),
    });

    if (!swapRes.ok) {
      throw new Error(`Jupiter swap tx ${swapRes.status}: ${await swapRes.text()}`);
    }

    const { swapTransaction } = (await swapRes.json()) as { swapTransaction: string };
    const txBytes = Buffer.from(swapTransaction, "base64");
    const signature = await wallet.signAndSendTransaction(txBytes);

    return {
      signature,
      explorerUrl: wallet.explorerUrlForSignature(signature),
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
    };
  }
}

// ── AgenticWallet ───────────────────────────────────────────────────────────

export class AgenticWallet {
  readonly wallet: ClawdWallet;
  readonly permissions: AgentPermissions;
  private readonly cfg: AgenticWalletConfig;
  private history: AgenticTransaction[] = [];
  private txId = 0;

  constructor(wallet: ClawdWallet, cfg: AgenticWalletConfig) {
    this.wallet = wallet;
    this.cfg = cfg;
    this.permissions = { ...DEFAULT_PERMISSIONS, ...cfg.permissions };
  }

  private newTxId(): string {
    return `atx_${Date.now()}_${++this.txId}`;
  }

  private async gate(
    type: TransactionType,
    description: string,
    meta: Record<string, unknown> = {},
  ): Promise<boolean> {
    const level = this.permissions[type as keyof AgentPermissions] as PermissionLevel | undefined;

    if (level === "deny") return false;
    if (level === "allow") return true;

    // "ask" — defer to onPendingTransaction callback
    if (this.cfg.onPendingTransaction) {
      const pending: PendingTransaction = {
        id: this.newTxId(),
        type,
        description,
        network: this.wallet.chain,
        metadata: meta,
      };
      return this.cfg.onPendingTransaction(pending);
    }

    return false; // no callback = deny by default
  }

  private record(tx: AgenticTransaction): void {
    this.history.push(tx);
    this.cfg.onTransactionStatus?.(tx);
  }

  async agentSwap(params: SwapQuoteParams): Promise<SwapResult> {
    const swap = new SwapService({ chain: this.wallet.chain });
    let quote: SwapQuote | undefined;

    try {
      quote = await swap.quote(params);
    } catch {
      // proceed without quote for permission check
    }

    const description = `Swap ${params.amount} ${params.inputToken} → ${params.outputToken}`;
    const approved = await this.gate("swap", description, { params, quote });

    const tx: AgenticTransaction = {
      id: this.newTxId(),
      type: "swap",
      status: approved ? "pending" : "rejected",
      description,
      network: this.wallet.chain,
      requestedAt: Date.now(),
    };

    if (!approved) {
      tx.settledAt = Date.now();
      this.record(tx);
      throw new Error(`AgenticWallet: swap rejected by permission gate`);
    }

    try {
      const result = await swap.execute(this.wallet, params);
      tx.status = "confirmed";
      tx.signature = result.signature;
      tx.explorerUrl = result.explorerUrl;
      tx.settledAt = Date.now();
      this.record(tx);
      return result;
    } catch (err) {
      tx.status = "failed";
      tx.settledAt = Date.now();
      this.record(tx);
      throw err;
    }
  }

  getHistory(): AgenticTransaction[] {
    return [...this.history];
  }

  summarizeActivity(): string {
    if (this.history.length === 0) return "No agentic transactions this session.";
    return this.history
      .map((tx) => {
        const emoji =
          tx.status === "confirmed" ? "✅" :
          tx.status === "rejected" ? "❌" :
          tx.status === "failed" ? "💀" : "⏳";
        const sig = tx.signature ? ` — ${tx.signature.slice(0, 8)}...` : "";
        return `[${emoji} ${tx.status.toUpperCase()}] ${tx.description}${sig}`;
      })
      .join("\n");
  }
}
