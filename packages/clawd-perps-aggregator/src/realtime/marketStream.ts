/**
 * Realtime market stream.
 *
 * Wraps Imperial's `/ws/market` socket. Maintains an in-memory cache keyed
 * by (symbol, venue) and emits typed events. Auto-reconnects with exponential
 * backoff; supports both browser-native WebSocket and Node's `ws` package.
 */

import type {
  FundingRate,
  MarkPrice,
  OrderbookLevel,
  OrderbookSnapshot,
  VenueId,
} from "../types.js";
import { VENUE_FROM_UNDERWRITER, VENUE_IDS } from "../types.js";

type Listener<T> = (data: T) => void;

interface RawFundingEvent {
  type: "funding_rate_update";
  symbol: string;
  venue: string;
  source: string;
  longFundingRatePerHourPercent: number | null;
  shortFundingRatePerHourPercent: number | null;
  longBorrowRatePerHourPercent: number | null;
  shortBorrowRatePerHourPercent: number | null;
}
interface RawMarkEvent {
  type: "mark_price_update";
  symbol: string;
  venue: string;
  source: string;
  price: number;
  fetchedAtUnixMs: number;
}
interface RawDepthEvent {
  type: "phoenix_depth_update";
  symbol: string;
  snapshot: { bids: [number, number][]; asks: [number, number][] };
}
type RawEvent = RawFundingEvent | RawMarkEvent | RawDepthEvent | { type: "pong" };

export interface MarketStreamEvents {
  funding: FundingRate;
  mark: MarkPrice;
  depth: OrderbookSnapshot;
  connected: void;
  disconnected: { code: number; reason: string };
  error: Error;
}

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
  const NativeWs = (globalThis as unknown as { WebSocket?: new (url: string) => WsLike }).WebSocket;
  if (NativeWs) return new NativeWs(url);
  try {
    const mod = (await import("ws" as string)) as { WebSocket: new (url: string) => WsLike };
    return new mod.WebSocket(url);
  } catch {
    throw new Error("No WebSocket implementation available. Install 'ws' or run in a browser/Bun.");
  }
}

function venueFromString(name: string): VenueId | null {
  const lc = name.toLowerCase() as VenueId;
  return VENUE_IDS.includes(lc) ? lc : null;
}

export interface MarketCacheSnapshot {
  marks: MarkPrice[];
  funding: FundingRate[];
  books: OrderbookSnapshot[];
  lastUpdatedMs: number;
}

export class MarketStream {
  private ws: WsLike | null = null;
  private stopped = false;
  private reconnectDelay = 1000;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners: { [K in keyof MarketStreamEvents]?: Listener<MarketStreamEvents[K]>[] } = {};

  readonly marks = new Map<string, MarkPrice>(); // key `${symbol}:${venue}`
  readonly funding = new Map<string, FundingRate>();
  readonly books = new Map<string, OrderbookSnapshot>(); // key symbol (Phoenix-only for now)
  lastUpdatedMs = 0;

  constructor(
    private readonly wsUrl: string,
    private readonly symbols?: string[],
  ) {}

  on<K extends keyof MarketStreamEvents>(event: K, fn: Listener<MarketStreamEvents[K]>): this {
    const arr = (this.listeners[event] ??= []) as Listener<MarketStreamEvents[K]>[];
    arr.push(fn);
    return this;
  }

  off<K extends keyof MarketStreamEvents>(event: K, fn: Listener<MarketStreamEvents[K]>): this {
    const arr = this.listeners[event];
    if (arr) {
      const idx = (arr as Listener<MarketStreamEvents[K]>[]).indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    }
    return this;
  }

  private emit<K extends keyof MarketStreamEvents>(event: K, data: MarketStreamEvents[K]): void {
    const arr = this.listeners[event] as Listener<MarketStreamEvents[K]>[] | undefined;
    if (arr) for (const fn of arr) fn(data);
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
      this.emit("connected", undefined as never);
      this.subscribe();
      this.startPing();
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as RawEvent;
        this.handleMessage(msg);
      } catch {
        /* ignore */
      }
    };

    this.ws.onerror = (ev) => {
      this.emit("error", ev instanceof Error ? ev : new Error("WS error"));
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
        ...(this.symbols ? { symbols: this.symbols } : {}),
      }),
    );
  }

  private handleMessage(msg: RawEvent): void {
    if (msg.type === "pong") return;
    this.lastUpdatedMs = Date.now();
    if (msg.type === "funding_rate_update") {
      const venue = venueFromString(msg.venue);
      if (!venue) return;
      const rec: FundingRate = {
        symbol: msg.symbol.toUpperCase(),
        venue,
        source: msg.source,
        longPerHourPct: msg.longFundingRatePerHourPercent,
        shortPerHourPct: msg.shortFundingRatePerHourPercent,
        longBorrowPerHourPct: msg.longBorrowRatePerHourPercent,
        shortBorrowPerHourPct: msg.shortBorrowRatePerHourPercent,
      };
      this.funding.set(`${rec.symbol}:${rec.venue}`, rec);
      this.emit("funding", rec);
    } else if (msg.type === "mark_price_update") {
      const venue = venueFromString(msg.venue);
      if (!venue) return;
      const rec: MarkPrice = {
        symbol: msg.symbol.toUpperCase(),
        venue,
        source: msg.source,
        price: msg.price,
        fetchedAtUnixMs: msg.fetchedAtUnixMs,
      };
      this.marks.set(`${rec.symbol}:${rec.venue}`, rec);
      this.emit("mark", rec);
    } else if (msg.type === "phoenix_depth_update") {
      const sym = msg.symbol.toUpperCase();
      const bids: OrderbookLevel[] = msg.snapshot.bids.map(([p, s]) => ({ price: p, size: s }));
      const asks: OrderbookLevel[] = msg.snapshot.asks.map(([p, s]) => ({ price: p, size: s }));
      const snap: OrderbookSnapshot = {
        symbol: sym,
        venue: "phoenix",
        bids,
        asks,
        fetchedAtUnixMs: this.lastUpdatedMs,
      };
      this.books.set(sym, snap);
      this.emit("depth", snap);
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
    const d = this.reconnectDelay;
    this.reconnectDelay = Math.min(d * 2, 30_000);
    setTimeout(() => this.connect(), d);
  }

  disconnect(): void {
    this.stopped = true;
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  getMark(symbol: string, venue: VenueId): number | null {
    return this.marks.get(`${symbol.toUpperCase()}:${venue}`)?.price ?? null;
  }

  getFunding(symbol: string, venue: VenueId): FundingRate | null {
    return this.funding.get(`${symbol.toUpperCase()}:${venue}`) ?? null;
  }

  getBook(symbol: string): OrderbookSnapshot | null {
    return this.books.get(symbol.toUpperCase()) ?? null;
  }

  /** Snapshot the entire cache. */
  snapshotCache(): MarketCacheSnapshot {
    return {
      marks: [...this.marks.values()],
      funding: [...this.funding.values()],
      books: [...this.books.values()],
      lastUpdatedMs: this.lastUpdatedMs,
    };
  }
}

export function createMarketStream(
  imperialBase: string,
  symbols?: string[],
): MarketStream {
  const wsBase = imperialBase.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
  return new MarketStream(`${wsBase}/ws/market`, symbols);
}

export { VENUE_FROM_UNDERWRITER };
