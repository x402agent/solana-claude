/**
 * SolanaTrackerStream — WebSocket client for Solana Tracker real-time data
 *
 * Connects to the Solana Tracker DataStream WebSocket endpoint for:
 *  - New token events (launches, graduations)
 *  - Trade/swap events on tracked tokens
 *  - Wallet activity monitoring
 *  - Pool updates
 *
 * DataStream endpoint: wss://datastream.solanatracker.io/:apiKey
 * Also supports the RPC WebSocket for account subscriptions.
 *
 * Auto-reconnects with exponential backoff.
 */

import { EventEmitter } from "node:events";
import WebSocket from "ws";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SolanaTrackerStreamConfig {
  /** Solana Tracker Data API key */
  dataApiKey: string;
  /** Override the DataStream WSS URL */
  wssUrl?: string;
  /** Override the RPC WSS URL (for account subscriptions) */
  rpcWssUrl?: string;
  /** ms between pings (default: 30_000) */
  pingIntervalMs?: number;
  /** max reconnect delay in ms (default: 30_000) */
  maxReconnectDelayMs?: number;
}

export interface SolanaTrackerTradeEvent {
  type: "trade";
  token: string;
  tokenSymbol?: string;
  tokenName?: string;
  side: "buy" | "sell";
  price: number;
  priceUsd: number;
  amount: number;
  amountUsd: number;
  maker: string;
  pool: string;
  dex: string;
  txHash: string;
  timestamp: number;
  source: "solana-tracker";
}

export interface SolanaTrackerNewTokenEvent {
  type: "new_token";
  token: string;
  name: string;
  symbol: string;
  decimals: number;
  pool?: string;
  dex?: string;
  initialLiquidity?: number;
  timestamp: number;
  source: "solana-tracker";
}

export interface SolanaTrackerPoolUpdate {
  type: "pool_update";
  pool: string;
  token: string;
  liquidity: number;
  volume24h?: number;
  priceUsd?: number;
  timestamp: number;
  source: "solana-tracker";
}

export interface SolanaTrackerWalletActivity {
  type: "wallet_activity";
  wallet: string;
  action: string;
  token?: string;
  amount?: number;
  amountUsd?: number;
  txHash: string;
  timestamp: number;
  source: "solana-tracker";
}

export type SolanaTrackerEvent =
  | SolanaTrackerTradeEvent
  | SolanaTrackerNewTokenEvent
  | SolanaTrackerPoolUpdate
  | SolanaTrackerWalletActivity;

// ── SolanaTrackerStream ────────────────────────────────────────────────────────

export class SolanaTrackerStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private readonly wssUrl: string;
  private readonly dataApiKey: string;
  private readonly pingIntervalMs: number;
  private readonly maxReconnectDelayMs: number;

  /** Active subscriptions to restore on reconnect */
  private activeSubscriptions = new Map<string, Record<string, unknown>>();

  constructor(config: SolanaTrackerStreamConfig) {
    super();
    this.dataApiKey = config.dataApiKey;
    this.wssUrl =
      config.wssUrl ??
      process.env.WS_URL ??
      `wss://datastream.solanatracker.io/:${config.dataApiKey}`;
    this.pingIntervalMs = config.pingIntervalMs ?? 30_000;
    this.maxReconnectDelayMs = config.maxReconnectDelayMs ?? 30_000;
  }

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.isConnected || this.destroyed) return;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wssUrl);

      const timeout = setTimeout(() => reject(new Error("Solana Tracker WS connection timeout")), 15_000);

      this.ws.on("open", () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startPing();
        this.resubscribeAll();
        this.emit("connected");
        resolve();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on("close", (code: number, reason: Buffer) => {
        clearTimeout(timeout);
        this.isConnected = false;
        this.stopPing();
        this.emit("disconnected", code, reason.toString());
        if (!this.destroyed) this.scheduleReconnect();
      });

      this.ws.on("error", (err: Error) => {
        clearTimeout(timeout);
        this.emit("error", err);
        if (!this.isConnected) reject(err);
      });
    });
  }

  disconnect(): void {
    this.destroyed = true;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelayMs);
    this.reconnectAttempts++;
    this.emit("reconnecting", this.reconnectAttempts, delay);
    this.reconnectTimer = setTimeout(() => void this.connect().catch(() => {}), delay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  // ── Message handling ──────────────────────────────────────────────────────

  private handleMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }

    const eventType = (msg.event ?? msg.type ?? msg.method) as string | undefined;

    // Trade / swap events
    if (eventType === "trade" || eventType === "swap" || eventType === "TXS_DATA") {
      const d = (msg.data ?? msg) as Record<string, unknown>;
      const event: SolanaTrackerTradeEvent = {
        type: "trade",
        token: String(d.token ?? d.mint ?? d.address ?? ""),
        tokenSymbol: d.tokenSymbol != null ? String(d.tokenSymbol) : undefined,
        tokenName: d.tokenName != null ? String(d.tokenName) : undefined,
        side: d.side === "sell" || d.type === "sell" ? "sell" : "buy",
        price: Number(d.price ?? 0),
        priceUsd: Number(d.priceUsd ?? d.price_usd ?? 0),
        amount: Number(d.amount ?? d.tokenAmount ?? 0),
        amountUsd: Number(d.amountUsd ?? d.volume_usd ?? 0),
        maker: String(d.maker ?? d.wallet ?? d.owner ?? ""),
        pool: String(d.pool ?? d.poolAddress ?? ""),
        dex: String(d.dex ?? d.source ?? "unknown"),
        txHash: String(d.txHash ?? d.signature ?? d.tx ?? ""),
        timestamp: Number(d.timestamp ?? d.blockTime ?? Date.now() / 1000),
        source: "solana-tracker",
      };
      this.emit("trade", event);
      this.emit("data", event);
    }
    // New token launches
    else if (eventType === "new_token" || eventType === "token_created" || eventType === "TOKEN_CREATE") {
      const d = (msg.data ?? msg) as Record<string, unknown>;
      const event: SolanaTrackerNewTokenEvent = {
        type: "new_token",
        token: String(d.token ?? d.mint ?? d.address ?? ""),
        name: String(d.name ?? "Unknown"),
        symbol: String(d.symbol ?? "???"),
        decimals: Number(d.decimals ?? 9),
        pool: d.pool != null ? String(d.pool) : undefined,
        dex: d.dex != null ? String(d.dex) : undefined,
        initialLiquidity: d.initialLiquidity != null ? Number(d.initialLiquidity) : undefined,
        timestamp: Number(d.timestamp ?? Date.now() / 1000),
        source: "solana-tracker",
      };
      this.emit("new_token", event);
      this.emit("data", event);
    }
    // Pool updates
    else if (eventType === "pool_update" || eventType === "POOL_UPDATE") {
      const d = (msg.data ?? msg) as Record<string, unknown>;
      const event: SolanaTrackerPoolUpdate = {
        type: "pool_update",
        pool: String(d.pool ?? d.poolAddress ?? ""),
        token: String(d.token ?? d.mint ?? ""),
        liquidity: Number(d.liquidity ?? 0),
        volume24h: d.volume24h != null ? Number(d.volume24h) : undefined,
        priceUsd: d.priceUsd != null ? Number(d.priceUsd) : undefined,
        timestamp: Number(d.timestamp ?? Date.now() / 1000),
        source: "solana-tracker",
      };
      this.emit("pool_update", event);
      this.emit("data", event);
    }
    // Wallet activity (when subscribed to a wallet)
    else if (eventType === "wallet_activity" || eventType === "WALLET_DATA") {
      const d = (msg.data ?? msg) as Record<string, unknown>;
      const event: SolanaTrackerWalletActivity = {
        type: "wallet_activity",
        wallet: String(d.wallet ?? d.address ?? ""),
        action: String(d.action ?? d.type ?? "unknown"),
        token: d.token != null ? String(d.token) : undefined,
        amount: d.amount != null ? Number(d.amount) : undefined,
        amountUsd: d.amountUsd != null ? Number(d.amountUsd) : undefined,
        txHash: String(d.txHash ?? d.signature ?? ""),
        timestamp: Number(d.timestamp ?? Date.now() / 1000),
        source: "solana-tracker",
      };
      this.emit("wallet_activity", event);
      this.emit("data", event);
    }
    // Forward unknown for extensibility
    else {
      this.emit("raw", msg);
    }
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  /**
   * Subscribe to trade events for a specific token.
   */
  subscribeTokenTrades(tokenAddress: string): void {
    const sub = { method: "subscribe", type: "trade", token: tokenAddress };
    this.activeSubscriptions.set(`trade:${tokenAddress}`, sub);
    this.send(sub);
  }

  /**
   * Subscribe to all new token launches.
   */
  subscribeNewTokens(): void {
    const sub = { method: "subscribe", type: "new_token" };
    this.activeSubscriptions.set("new_tokens", sub);
    this.send(sub);
  }

  /**
   * Subscribe to wallet activity for a specific wallet address.
   */
  subscribeWallet(walletAddress: string): void {
    const sub = { method: "subscribe", type: "wallet", address: walletAddress };
    this.activeSubscriptions.set(`wallet:${walletAddress}`, sub);
    this.send(sub);
  }

  /**
   * Subscribe to pool updates for a specific pool or token.
   */
  subscribePoolUpdates(poolOrToken: string): void {
    const sub = { method: "subscribe", type: "pool", address: poolOrToken };
    this.activeSubscriptions.set(`pool:${poolOrToken}`, sub);
    this.send(sub);
  }

  /** Unsubscribe from a specific channel */
  unsubscribe(key: string): void {
    const sub = this.activeSubscriptions.get(key);
    if (sub) {
      this.activeSubscriptions.delete(key);
      this.send({ ...sub, method: "unsubscribe" });
    }
  }

  private resubscribeAll(): void {
    for (const [, sub] of this.activeSubscriptions) {
      this.send(sub);
    }
  }

  get connected(): boolean { return this.isConnected; }
  get subscriptionCount(): number { return this.activeSubscriptions.size; }
}

/** Create a SolanaTrackerStream from environment variables */
export function createSolanaTrackerStream(dataApiKey?: string): SolanaTrackerStream | null {
  const key = dataApiKey ?? process.env.SOLANA_TRACKER_DATA_API_KEY;
  if (!key) return null;
  return new SolanaTrackerStream({ dataApiKey: key });
}
