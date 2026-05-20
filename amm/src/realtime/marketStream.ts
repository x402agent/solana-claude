import { EventEmitter } from "node:events";
import type { MarkPrice } from "../types.js";

export interface MarketStreamEvent {
  type: "mark" | "raw" | "error" | "connected" | "closed";
  data?: unknown;
}

export class MarketStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private stopped = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly cache = new Map<string, MarkPrice>();

  constructor(private readonly wsBase: string, private readonly symbols: string[] = []) {
    super();
  }

  latest(symbol: string): MarkPrice | null {
    return this.cache.get(symbol) ?? null;
  }

  connect(): void {
    this.stopped = false;
    const url = new URL("/ws/market", this.wsBase);
    if (this.symbols.length) url.searchParams.set("symbols", this.symbols.join(","));

    this.ws = new WebSocket(url);
    this.ws.addEventListener("open", () => this.emit("event", { type: "connected" } satisfies MarketStreamEvent));
    this.ws.addEventListener("message", (event) => this.handleMessage(event.data));
    this.ws.addEventListener("error", (event) => this.emit("event", { type: "error", data: event } satisfies MarketStreamEvent));
    this.ws.addEventListener("close", () => {
      this.emit("event", { type: "closed" } satisfies MarketStreamEvent);
      this.scheduleReconnect();
    });
  }

  close(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private handleMessage(data: unknown): void {
    const text = typeof data === "string" ? data : data instanceof Blob ? "" : String(data);
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Keep raw text.
    }

    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const symbol = String(obj.symbol ?? "");
      const price = Number(obj.price ?? obj.markPrice);
      if (symbol && Number.isFinite(price)) {
        const mark: MarkPrice = {
          symbol,
          venue: "phoenix",
          price,
          source: "ws",
          timestamp: Date.now(),
        };
        this.cache.set(symbol, mark);
        this.emit("event", { type: "mark", data: mark } satisfies MarketStreamEvent);
        return;
      }
    }

    this.emit("event", { type: "raw", data: parsed } satisfies MarketStreamEvent);
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.stopped) this.connect();
    }, 1000);
  }
}
