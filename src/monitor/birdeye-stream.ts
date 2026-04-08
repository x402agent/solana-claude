/**
 * BirdeyeStream — WebSocket client for Birdeye real-time token data on Solana
 *
 * Streams:
 *  - Token price updates
 *  - Trade events (swaps)
 *  - Token overview / metadata changes
 *
 * Birdeye public WS endpoint: wss://public-api.birdeye.so/socket/solana
 * Requires BIRDEYE_API_KEY for authentication (sent as query param or header).
 *
 * Auto-reconnects with exponential backoff.
 */

import { EventEmitter } from "node:events";
import WebSocket from "ws";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BirdeyeStreamConfig {
  apiKey: string;
  /** Override the default WSS URL */
  wssUrl?: string;
  /** ms between pings (default: 25_000) */
  pingIntervalMs?: number;
  /** max reconnect delay in ms (default: 30_000) */
  maxReconnectDelayMs?: number;
}

export interface BirdeyePriceUpdate {
  type: "price";
  token: string;
  price: number;
  priceChange24h?: number;
  volume24h?: number;
  timestamp: number;
  source: "birdeye";
}

export interface BirdeyeTradeEvent {
  type: "trade";
  token: string;
  side: "buy" | "sell";
  price: number;
  amount: number;
  amountUsd: number;
  maker: string;
  txHash: string;
  timestamp: number;
  source: "birdeye";
}

export interface BirdeyeTokenOverview {
  type: "overview";
  token: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  liquidity?: number;
  mc?: number;
  holder?: number;
  timestamp: number;
  source: "birdeye";
}

export type BirdeyeEvent = BirdeyePriceUpdate | BirdeyeTradeEvent | BirdeyeTokenOverview;

// ── BirdeyeStream ──────────────────────────────────────────────────────────────

export class BirdeyeStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private readonly wssUrl: string;
  private readonly apiKey: string;
  private readonly pingIntervalMs: number;
  private readonly maxReconnectDelayMs: number;

  /** Active subscriptions to restore on reconnect */
  private activeSubscriptions = new Map<string, { type: string; token: string }>();

  constructor(config: BirdeyeStreamConfig) {
    super();
    this.apiKey = config.apiKey;
    this.wssUrl = config.wssUrl ?? process.env.BIRDEYE_WSS_URL ?? "wss://public-api.birdeye.so/socket/solana";
    this.pingIntervalMs = config.pingIntervalMs ?? 25_000;
    this.maxReconnectDelayMs = config.maxReconnectDelayMs ?? 30_000;
  }

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.isConnected || this.destroyed) return;
    return new Promise((resolve, reject) => {
      const url = `${this.wssUrl}?x-api-key=${this.apiKey}`;
      this.ws = new WebSocket(url, {
        headers: { "X-API-KEY": this.apiKey },
      });

      const timeout = setTimeout(() => reject(new Error("Birdeye WS connection timeout")), 15_000);

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

    const type = msg.type as string;
    const data = (msg.data ?? msg) as Record<string, unknown>;

    if (type === "PRICE_DATA" || type === "price") {
      const event: BirdeyePriceUpdate = {
        type: "price",
        token: String(data.address ?? data.token ?? ""),
        price: Number(data.value ?? data.price ?? 0),
        priceChange24h: data.priceChange24h != null ? Number(data.priceChange24h) : undefined,
        volume24h: data.v24hUSD != null ? Number(data.v24hUSD) : undefined,
        timestamp: Number(data.unixTime ?? Date.now() / 1000),
        source: "birdeye",
      };
      this.emit("price", event);
      this.emit("data", event);
    } else if (type === "TXS_DATA" || type === "trade") {
      const event: BirdeyeTradeEvent = {
        type: "trade",
        token: String(data.address ?? data.token ?? ""),
        side: data.side === "sell" ? "sell" : "buy",
        price: Number(data.price ?? 0),
        amount: Number(data.amount ?? data.tokenAmount ?? 0),
        amountUsd: Number(data.volumeUSD ?? data.amountUsd ?? 0),
        maker: String(data.owner ?? data.maker ?? ""),
        txHash: String(data.txHash ?? data.signature ?? ""),
        timestamp: Number(data.blockUnixTime ?? Date.now() / 1000),
        source: "birdeye",
      };
      this.emit("trade", event);
      this.emit("data", event);
    } else if (type === "TOKEN_OVERVIEW" || type === "overview") {
      const event: BirdeyeTokenOverview = {
        type: "overview",
        token: String(data.address ?? data.token ?? ""),
        name: data.name != null ? String(data.name) : undefined,
        symbol: data.symbol != null ? String(data.symbol) : undefined,
        decimals: data.decimals != null ? Number(data.decimals) : undefined,
        liquidity: data.liquidity != null ? Number(data.liquidity) : undefined,
        mc: data.mc != null ? Number(data.mc) : undefined,
        holder: data.holder != null ? Number(data.holder) : undefined,
        timestamp: Number(data.unixTime ?? Date.now() / 1000),
        source: "birdeye",
      };
      this.emit("overview", event);
      this.emit("data", event);
    } else {
      // Forward unknown events for extensibility
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
   * Subscribe to real-time price updates for a token.
   */
  subscribePriceUpdates(tokenAddress: string): void {
    const key = `price:${tokenAddress}`;
    this.activeSubscriptions.set(key, { type: "PRICE", token: tokenAddress });
    this.send({
      type: "SUBSCRIBE_PRICE",
      data: { queryType: "simple", chartType: "1m", address: tokenAddress, currency: "usd" },
    });
  }

  /**
   * Subscribe to real-time trade/swap events for a token.
   */
  subscribeTradeEvents(tokenAddress: string): void {
    const key = `trade:${tokenAddress}`;
    this.activeSubscriptions.set(key, { type: "TXS", token: tokenAddress });
    this.send({
      type: "SUBSCRIBE_TXS",
      data: { address: tokenAddress },
    });
  }

  /**
   * Subscribe to token overview updates (metadata, liquidity, holders).
   */
  subscribeTokenOverview(tokenAddress: string): void {
    const key = `overview:${tokenAddress}`;
    this.activeSubscriptions.set(key, { type: "TOKEN_OVERVIEW", token: tokenAddress });
    this.send({
      type: "SUBSCRIBE_TOKEN_OVERVIEW",
      data: { address: tokenAddress },
    });
  }

  /** Unsubscribe from a specific stream */
  unsubscribe(type: "PRICE" | "TXS" | "TOKEN_OVERVIEW", tokenAddress: string): void {
    const key = `${type.toLowerCase()}:${tokenAddress}`;
    this.activeSubscriptions.delete(key);
    this.send({
      type: `UNSUBSCRIBE_${type}`,
      data: { address: tokenAddress },
    });
  }

  private resubscribeAll(): void {
    for (const [, sub] of this.activeSubscriptions) {
      if (sub.type === "PRICE") {
        this.send({
          type: "SUBSCRIBE_PRICE",
          data: { queryType: "simple", chartType: "1m", address: sub.token, currency: "usd" },
        });
      } else if (sub.type === "TXS") {
        this.send({ type: "SUBSCRIBE_TXS", data: { address: sub.token } });
      } else if (sub.type === "TOKEN_OVERVIEW") {
        this.send({ type: "SUBSCRIBE_TOKEN_OVERVIEW", data: { address: sub.token } });
      }
    }
  }

  get connected(): boolean { return this.isConnected; }
  get subscriptionCount(): number { return this.activeSubscriptions.size; }
}

/** Create a BirdeyeStream from environment variables */
export function createBirdeyeStream(apiKey?: string): BirdeyeStream | null {
  const key = apiKey ?? process.env.BIRDEYE_API_KEY;
  if (!key) return null;
  return new BirdeyeStream({ apiKey: key });
}
