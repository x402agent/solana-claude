/**
 * Imperial WebSocket Client
 *
 * Two persistent connections:
 *   /ws        — wallet-scoped invalidation (positions_updated, orders_updated)
 *   /ws/market — public market data stream (funding, marks, depth)
 *
 * Typed event emitter with automatic ping/pong keepalive and exponential-backoff
 * reconnect. Works in both Node (ws package) and browser (native WebSocket).
 */

type Listener<T> = (data: T) => void;

// ─── Event payload types ──────────────────────────────────────────────────────

export interface FundingUpdateEvent {
  type: "funding_rate_update";
  symbol: string;
  venue: string;
  source: string;
  longFundingRatePerHourPercent: number | null;
  shortFundingRatePerHourPercent: number | null;
  longBorrowRatePerHourPercent: number | null;
  shortBorrowRatePerHourPercent: number | null;
}

export interface MarkPriceUpdateEvent {
  type: "mark_price_update";
  symbol: string;
  venue: string;
  source: string;
  price: number;
  fetchedAtUnixMs: number;
}

export interface DepthUpdateEvent {
  type: "phoenix_depth_update";
  symbol: string;
  snapshot: {
    bids: [number, number][];
    asks: [number, number][];
  };
}

export interface WalletEvent {
  type: "positions_updated" | "orders_updated";
}

export type MarketEvent = FundingUpdateEvent | MarkPriceUpdateEvent | DepthUpdateEvent;

// ─── In-memory market cache ───────────────────────────────────────────────────

export interface MarketCache {
  funding: Map<string, FundingUpdateEvent>;       // key: `${symbol}:${venue}`
  markPrices: Map<string, MarkPriceUpdateEvent>;  // key: `${symbol}:${venue}`
  depth: Map<string, DepthUpdateEvent["snapshot"]>; // key: symbol
  lastUpdated: number;
}

export function createMarketCache(): MarketCache {
  return {
    funding: new Map(),
    markPrices: new Map(),
    depth: new Map(),
    lastUpdated: 0,
  };
}

// ─── Simple typed event emitter ───────────────────────────────────────────────

class TypedEmitter<Events extends object> {
  private listeners: Partial<{ [K in keyof Events]: Listener<Events[K]>[] }> = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): this {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Listener<Events[K]>[]).push(listener);
    return this;
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): this {
    const arr = this.listeners[event] as Listener<Events[K]>[] | undefined;
    if (arr) {
      const idx = arr.indexOf(listener);
      if (idx >= 0) arr.splice(idx, 1);
    }
    return this;
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const arr = this.listeners[event] as Listener<Events[K]>[] | undefined;
    if (arr) {
      for (const fn of arr) fn(data);
    }
  }
}

// ─── Market WS events ─────────────────────────────────────────────────────────

interface MarketWsEventMap {
  funding: FundingUpdateEvent;
  mark: MarkPriceUpdateEvent;
  depth: DepthUpdateEvent;
  connected: void;
  disconnected: { code: number; reason: string };
  error: Error;
}

// ─── WebSocket factory (Node ws or browser native) ────────────────────────────

type WsLike = {
  onopen: (() => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  send(data: string): void;
  close(): void;
  readyState: number;
};

const WS_OPEN = 1;

async function openWs(url: string): Promise<WsLike> {
  // Try native global WebSocket first (browser / Bun)
  const NativeWs = (globalThis as unknown as { WebSocket?: new (url: string) => WsLike }).WebSocket;
  if (NativeWs) return new NativeWs(url);

  // Fall back to 'ws' package in Node
  try {
    const { WebSocket: NodeWs } = await import("ws" as string) as { WebSocket: new (url: string) => WsLike };
    return new NodeWs(url);
  } catch {
    throw new Error("No WebSocket implementation available. Install the 'ws' package.");
  }
}

// ─── ImperialMarketWs ─────────────────────────────────────────────────────────

export class ImperialMarketWs extends TypedEmitter<MarketWsEventMap> {
  private ws: WsLike | null = null;
  private stopped = false;
  private reconnectDelay = 1000;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  readonly cache: MarketCache = createMarketCache();

  constructor(
    private readonly wsUrl: string,
    private readonly subscribeSymbols?: string[],
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      this.ws = await openWs(this.wsUrl);
    } catch (err) {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.emit("connected", undefined);
      this.subscribe();
      this.startPing();
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as MarketEvent | { type: "pong" };
        this.handleMessage(msg);
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onerror = (ev) => {
      const err = ev instanceof Error ? ev : new Error("WebSocket error");
      this.emit("error", err);
    };

    this.ws.onclose = (ev) => {
      this.stopPing();
      this.emit("disconnected", { code: ev.code, reason: String(ev.reason ?? "") });
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WS_OPEN) return;
    this.ws.send(JSON.stringify({ type: "subscribe_funding_rates" }));
    this.ws.send(JSON.stringify({ type: "subscribe_mark_prices" }));
    this.ws.send(
      JSON.stringify({
        type: "subscribe_phoenix_depth",
        ...(this.subscribeSymbols ? { symbols: this.subscribeSymbols } : {}),
      }),
    );
  }

  private handleMessage(msg: MarketEvent | { type: "pong" }): void {
    switch (msg.type) {
      case "funding_rate_update": {
        const key = `${msg.symbol}:${msg.venue}`;
        this.cache.funding.set(key, msg);
        this.cache.lastUpdated = Date.now();
        this.emit("funding", msg);
        break;
      }
      case "mark_price_update": {
        const key = `${msg.symbol}:${msg.venue}`;
        this.cache.markPrices.set(key, msg);
        this.cache.lastUpdated = Date.now();
        this.emit("mark", msg);
        break;
      }
      case "phoenix_depth_update": {
        this.cache.depth.set(msg.symbol, msg.snapshot);
        this.cache.lastUpdated = Date.now();
        this.emit("depth", msg);
        break;
      }
    }
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WS_OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20_000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(delay * 2, 30_000);
    setTimeout(() => this.connect(), delay);
  }

  /** Get latest mark price for a symbol from cache. */
  getMarkPrice(symbol: string, venue = "phoenix"): number | null {
    return this.cache.markPrices.get(`${symbol}:${venue}`)?.price ?? null;
  }

  /** Get latest funding for a symbol+venue from cache. */
  getFunding(symbol: string, venue = "phoenix"): FundingUpdateEvent | null {
    return this.cache.funding.get(`${symbol}:${venue}`) ?? null;
  }

  /** Get latest depth snapshot for a symbol. */
  getDepth(symbol: string): DepthUpdateEvent["snapshot"] | null {
    return this.cache.depth.get(symbol) ?? null;
  }

  /** Best mid price from depth cache. */
  getMid(symbol: string): number | null {
    const d = this.getDepth(symbol);
    if (!d?.bids.length || !d?.asks.length) return null;
    const bid = d.bids[0]?.[0] ?? 0;
    const ask = d.asks[0]?.[0] ?? 0;
    return bid > 0 && ask > 0 ? (bid + ask) / 2 : null;
  }

  disconnect(): void {
    this.stopped = true;
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }
}

// ─── Wallet invalidation WS ───────────────────────────────────────────────────

interface WalletWsEventMap {
  positions_updated: void;
  orders_updated: void;
  connected: void;
  disconnected: { code: number; reason: string };
  error: Error;
}

export class ImperialWalletWs extends TypedEmitter<WalletWsEventMap> {
  private ws: WsLike | null = null;
  private stopped = false;
  private reconnectDelay = 1000;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly wsUrl: string,
    private readonly wallet: string,
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      this.ws = await openWs(this.wsUrl);
    } catch (err) {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.emit("connected", undefined);
      this.ws?.send(JSON.stringify({ type: "subscribe", wallet: this.wallet }));
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WS_OPEN) {
          this.ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20_000);
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WalletEvent | { type: "pong" };
        if (msg.type === "positions_updated") this.emit("positions_updated", undefined);
        if (msg.type === "orders_updated") this.emit("orders_updated", undefined);
      } catch {
        // ignore
      }
    };

    this.ws.onerror = (ev) => {
      this.emit("error", ev instanceof Error ? ev : new Error("WS error"));
    };

    this.ws.onclose = (ev) => {
      if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
      this.emit("disconnected", { code: ev.code, reason: String(ev.reason ?? "") });
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(delay * 2, 30_000);
    setTimeout(() => this.connect(), delay);
  }

  disconnect(): void {
    this.stopped = true;
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    this.ws?.close();
    this.ws = null;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createImperialMarketWs(
  base: string,
  symbols?: string[],
): ImperialMarketWs {
  const wsBase = base.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
  return new ImperialMarketWs(`${wsBase}/ws/market`, symbols);
}

export function createImperialWalletWs(base: string, wallet: string): ImperialWalletWs {
  const wsBase = base.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
  return new ImperialWalletWs(`${wsBase}/ws`, wallet);
}
