import WebSocket from 'ws';
import { EventEmitter } from 'events';

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY ?? '';
const BIRDEYE_WSS_BASE = process.env.BIRDEYE_WSS_URL ?? 'wss://public-api.birdeye.so/socket/solana';

type BirdeyeEventType =
  | 'PRICE_DATA'
  | 'TXS_DATA'
  | 'TOKEN_NEW_LISTING_DATA'
  | 'NEW_PAIR_DATA'
  | 'TXS_LARGE_TRADE_DATA'
  | 'WALLET_TXS_DATA'
  | 'BASE_QUOTE_PRICE_DATA';

// ---------------------------------------------------------------------------
// Birdeye WebSocket client with auto-reconnect and ping/pong
// ---------------------------------------------------------------------------
export class BirdeyeWS extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private subscriptions: Array<Record<string, unknown>> = [];
  private connected = false;

  constructor(apiKey?: string) {
    super();
    const key = apiKey ?? BIRDEYE_API_KEY;
    if (!key) {
      this.wsUrl = '';
      console.warn('[BirdeyeWS] No BIRDEYE_API_KEY set — WebSocket disabled');
      return;
    }
    this.wsUrl = `${BIRDEYE_WSS_BASE}?x-api-key=${key}`;
  }

  connect(): void {
    if (!this.wsUrl) return;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }

    this.ws = new WebSocket(this.wsUrl, 'echo-protocol', {
      headers: {
        Origin: 'ws://public-api.birdeye.so',
      },
    });

    this.ws.on('open', () => {
      console.log('[BirdeyeWS] Connected');
      this.connected = true;
      this.reconnectDelay = 2000;
      this.startPing();
      // Re-subscribe to all active subscriptions
      for (const sub of this.subscriptions) {
        this.ws!.send(JSON.stringify(sub));
      }
      this.emit('connected');
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.emit('message', msg);
        if (msg.type) {
          this.emit(msg.type as BirdeyeEventType, msg.data);
        }
      } catch {}
    });

    this.ws.on('ping', () => {
      this.ws?.pong();
    });

    this.ws.on('close', () => {
      console.log('[BirdeyeWS] Disconnected — reconnecting...');
      this.connected = false;
      this.stopPing();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[BirdeyeWS] Error:', err.message);
    });
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    setTimeout(() => this.doConnect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }

  private send(msg: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  // ---------------------------------------------------------------------------
  // Subscription helpers
  // ---------------------------------------------------------------------------

  /** Subscribe to real-time price (OHLCV) for a token */
  subscribePrice(address: string, chartType = '1m', currency = 'usd'): void {
    const sub = {
      type: 'SUBSCRIBE_PRICE',
      data: { queryType: 'simple', chartType, address, currency },
    };
    this.subscriptions.push(sub);
    this.send(sub);
  }

  /** Subscribe to transactions for a token */
  subscribeTxs(address: string, txsType = 'all'): void {
    const sub = {
      type: 'SUBSCRIBE_TXS',
      data: { queryType: 'simple', address, txsType },
    };
    this.subscriptions.push(sub);
    this.send(sub);
  }

  /** Subscribe to new token listings */
  subscribeNewListings(minLiquidity?: number, sources?: string[]): void {
    const sub: Record<string, unknown> = { type: 'SUBSCRIBE_TOKEN_NEW_LISTING' };
    if (minLiquidity) sub.min_liquidity = minLiquidity;
    if (sources) sub.sources = sources;
    this.subscriptions.push(sub);
    this.send(sub);
  }

  /** Subscribe to new pairs */
  subscribeNewPairs(minLiquidity?: number, maxLiquidity?: number): void {
    const sub: Record<string, unknown> = { type: 'SUBSCRIBE_NEW_PAIR' };
    if (minLiquidity) sub.min_liquidity = minLiquidity;
    if (maxLiquidity) sub.max_liquidity = maxLiquidity;
    this.subscriptions.push(sub);
    this.send(sub);
  }

  /** Subscribe to large trades */
  subscribeLargeTrades(minVolume: number, maxVolume?: number): void {
    const sub: Record<string, unknown> = {
      type: 'SUBSCRIBE_LARGE_TRADE_TXS',
      min_volume: minVolume,
    };
    if (maxVolume) sub.max_volume = maxVolume;
    this.subscriptions.push(sub);
    this.send(sub);
  }

  /** Subscribe to wallet transactions */
  subscribeWalletTxs(address: string): void {
    const sub = {
      type: 'SUBSCRIBE_WALLET_TXS',
      data: { address },
    };
    this.subscriptions.push(sub);
    this.send(sub);
  }

  /** Unsubscribe from a specific event type */
  unsubscribe(type: string): void {
    const unsubType = type.replace('SUBSCRIBE_', 'UNSUBSCRIBE_');
    this.send({ type: unsubType });
    this.subscriptions = this.subscriptions.filter(s => s.type !== type);
  }

  /** Clear all subscriptions */
  clearSubscriptions(): void {
    this.subscriptions = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  close(): void {
    this.stopPing();
    this.clearSubscriptions();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Birdeye REST API helpers
// ---------------------------------------------------------------------------
const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

async function birdeyeGet(path: string): Promise<unknown> {
  if (!BIRDEYE_API_KEY) throw new Error('No BIRDEYE_API_KEY configured');
  const resp = await fetch(`${BIRDEYE_API_BASE}${path}`, {
    headers: {
      'X-API-KEY': BIRDEYE_API_KEY,
      'x-chain': 'solana',
    },
  });
  if (!resp.ok) throw new Error(`Birdeye API ${resp.status}: ${resp.statusText}`);
  return resp.json();
}

export async function getTokenPrice(address: string): Promise<unknown> {
  return birdeyeGet(`/defi/price?address=${address}`);
}

export async function getTokenOverview(address: string): Promise<unknown> {
  return birdeyeGet(`/defi/token_overview?address=${address}`);
}

export async function getTokenSecurity(address: string): Promise<unknown> {
  return birdeyeGet(`/defi/token_security?address=${address}`);
}

export async function searchTokens(keyword: string): Promise<unknown> {
  return birdeyeGet(`/defi/v3/search?keyword=${encodeURIComponent(keyword)}&chain=solana&target=token`);
}
