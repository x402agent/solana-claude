// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Birdeye WebSocket Service
// Real-time streaming data from Birdeye WebSocket API
// ═══════════════════════════════════════════════════════════════════════════════

import WebSocket from 'ws';
import { EventEmitter } from 'events';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface BirdeyeWSConfig {
    apiKey: string;
    wssUrl?: string;
    chain?: string;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    heartbeatInterval?: number;
}

export interface PriceUpdate {
    type: 'PRICE_UPDATE';
    address: string;
    symbol?: string;
    price: number;
    priceChange24h?: number;
    volume24h?: number;
    timestamp: number;
}

export interface TradeUpdate {
    type: 'TRADE_UPDATE';
    txType: 'buy' | 'sell' | 'swap';
    txHash: string;
    address: string;
    symbol?: string;
    price: number;
    volume: number;
    volumeUsd: number;
    owner: string;
    timestamp: number;
    source: string;
}

export interface OHLCVUpdate {
    type: 'OHLCV_UPDATE';
    address: string;
    symbol?: string;
    timeframe: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export type BirdeyeWSMessage = PriceUpdate | TradeUpdate | OHLCVUpdate;

type SubscriptionType = 'PRICE' | 'TOKEN_TRADE' | 'TOKEN_OHLCV' | 'PAIR_OHLCV' | 'TOKEN_NEW_LISTING';

interface Subscription {
    type: SubscriptionType;
    address?: string;
    timeframe?: string;
    queryKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BIRDEYE WEBSOCKET CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export class BirdeyeWebSocket extends EventEmitter {
    private ws: WebSocket | null = null;
    private config: Required<BirdeyeWSConfig>;
    private subscriptions: Map<string, Subscription> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isConnected = false;
    private isConnecting = false;

    constructor(config: BirdeyeWSConfig) {
        super();

        this.config = {
            apiKey: config.apiKey,
            wssUrl: config.wssUrl || `wss://public-api.birdeye.so/socket/solana?x-api-key=${config.apiKey}`,
            chain: config.chain || 'solana',
            autoReconnect: config.autoReconnect ?? true,
            reconnectInterval: config.reconnectInterval || 5000,
            heartbeatInterval: config.heartbeatInterval || 30000,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONNECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    async connect(): Promise<void> {
        if (this.isConnected || this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.wssUrl);

                this.ws.on('open', () => {
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;

                    console.log('[BIRDEYE WS] Connected');
                    this.emit('connected');

                    // Start heartbeat
                    this.startHeartbeat();

                    // Resubscribe to all active subscriptions
                    this.resubscribeAll();

                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) => {
                    this.handleMessage(data);
                });

                this.ws.on('close', (code, reason) => {
                    console.log(`[BIRDEYE WS] Disconnected: ${code} - ${reason.toString()}`);
                    this.isConnected = false;
                    this.stopHeartbeat();
                    this.emit('disconnected', { code, reason: reason.toString() });

                    if (this.config.autoReconnect) {
                        this.scheduleReconnect();
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('[BIRDEYE WS] Error:', error.message);
                    this.emit('error', error);

                    if (!this.isConnected) {
                        this.isConnecting = false;
                        reject(error);
                    }
                });

                this.ws.on('ping', () => {
                    this.ws?.pong();
                });

            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    disconnect(): void {
        this.config.autoReconnect = false;
        this.stopHeartbeat();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
        this.subscriptions.clear();
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[BIRDEYE WS] Max reconnection attempts reached');
            this.emit('maxReconnectAttempts');
            return;
        }

        const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        console.log(`[BIRDEYE WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect().catch((err) => {
                console.error('[BIRDEYE WS] Reconnection failed:', err.message);
            });
        }, delay);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected && this.ws) {
                // Send ping to keep connection alive
                this.ws.ping();
            }
        }, this.config.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MESSAGE HANDLING
    // ═══════════════════════════════════════════════════════════════════════════

    private handleMessage(data: WebSocket.Data): void {
        try {
            const message = JSON.parse(data.toString());

            // Handle different message types
            if (message.type === 'PRICE_DATA') {
                this.handlePriceData(message);
            } else if (message.type === 'TXS_DATA') {
                this.handleTradeData(message);
            } else if (message.type === 'OHLCV_DATA') {
                this.handleOHLCVData(message);
            } else if (message.type === 'NEW_TOKEN' || message.type === 'NEW_LISTING') {
                this.handleNewListing(message);
            } else if (message.type === 'SUBSCRIBE_SUCCESS') {
                console.log('[BIRDEYE WS] Subscribed:', message.queryKey);
                this.emit('subscribed', message.queryKey);
            } else if (message.type === 'UNSUBSCRIBE_SUCCESS') {
                console.log('[BIRDEYE WS] Unsubscribed:', message.queryKey);
                this.emit('unsubscribed', message.queryKey);
            } else if (message.type === 'ERROR') {
                console.error('[BIRDEYE WS] Server error:', message.message);
                this.emit('serverError', message);
            }
        } catch (error) {
            console.error('[BIRDEYE WS] Message parse error:', error);
        }
    }

    private handlePriceData(message: any): void {
        const data = message.data;
        if (!data) return;

        const priceUpdate: PriceUpdate = {
            type: 'PRICE_UPDATE',
            address: data.address || message.address,
            symbol: data.symbol,
            price: data.v || data.price || data.value,
            priceChange24h: data.priceChange24h,
            volume24h: data.volume24h,
            timestamp: data.unixTime || Date.now(),
        };

        this.emit('price', priceUpdate);
        this.emit('message', priceUpdate);
    }

    private handleTradeData(message: any): void {
        const data = message.data;
        if (!data) return;

        // Can be an array of trades
        const trades = Array.isArray(data) ? data : [data];

        for (const trade of trades) {
            const tradeUpdate: TradeUpdate = {
                type: 'TRADE_UPDATE',
                txType: trade.txType || trade.side || 'swap',
                txHash: trade.txHash || trade.signature,
                address: trade.address || message.address,
                symbol: trade.symbol,
                price: trade.price,
                volume: trade.volume || trade.amount,
                volumeUsd: trade.volumeUsd || trade.volume_usd,
                owner: trade.owner || trade.wallet,
                timestamp: trade.blockUnixTime || trade.unixTime || Date.now(),
                source: trade.source || 'unknown',
            };

            this.emit('trade', tradeUpdate);
            this.emit('message', tradeUpdate);
        }
    }

    private handleOHLCVData(message: any): void {
        const data = message.data;
        if (!data) return;

        const ohlcvUpdate: OHLCVUpdate = {
            type: 'OHLCV_UPDATE',
            address: data.address || message.address,
            symbol: data.symbol,
            timeframe: data.type || message.timeframe || '1m',
            open: data.o || data.open,
            high: data.h || data.high,
            low: data.l || data.low,
            close: data.c || data.close,
            volume: data.v || data.volume,
            timestamp: data.unixTime || Date.now(),
        };

        this.emit('ohlcv', ohlcvUpdate);
        this.emit('message', ohlcvUpdate);
    }

    private handleNewListing(message: any): void {
        const data = message.data;
        if (!data) return;

        this.emit('newListing', {
            type: 'NEW_LISTING',
            address: data.address,
            symbol: data.symbol,
            name: data.name,
            timestamp: data.unixTime || Date.now(),
            ...data
        });
        this.emit('message', { type: 'NEW_LISTING', ...data });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUBSCRIPTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    private send(message: object): void {
        if (!this.isConnected || !this.ws) {
            console.warn('[BIRDEYE WS] Cannot send message - not connected');
            return;
        }

        this.ws.send(JSON.stringify(message));
    }

    private resubscribeAll(): void {
        for (const [key, sub] of this.subscriptions) {
            this.sendSubscription(sub, 'SUBSCRIBE');
        }
    }

    private sendSubscription(sub: Subscription, action: 'SUBSCRIBE' | 'UNSUBSCRIBE'): void {
        const message: any = {
            type: action,
            data: {
                type: sub.type,
                ...(sub.address && { address: sub.address }),
                ...(sub.timeframe && { timeframe: sub.timeframe }),
            },
        };

        this.send(message);
    }

    /**
     * Subscribe to real-time price updates for a token
     */
    subscribeToPrices(addresses: string | string[]): void {
        const addrs = Array.isArray(addresses) ? addresses : [addresses];

        for (const address of addrs) {
            const queryKey = `PRICE:${address}`;
            const sub: Subscription = {
                type: 'PRICE',
                address,
                queryKey,
            };

            this.subscriptions.set(queryKey, sub);

            if (this.isConnected) {
                this.sendSubscription(sub, 'SUBSCRIBE');
            }
        }
    }

    /**
     * Subscribe to real-time trades for a token
     */
    subscribeToTrades(addresses: string | string[]): void {
        const addrs = Array.isArray(addresses) ? addresses : [addresses];

        for (const address of addrs) {
            const queryKey = `TOKEN_TRADE:${address}`;
            const sub: Subscription = {
                type: 'TOKEN_TRADE',
                address,
                queryKey,
            };

            this.subscriptions.set(queryKey, sub);

            if (this.isConnected) {
                this.sendSubscription(sub, 'SUBSCRIBE');
            }
        }
    }

    /**
     * Subscribe to OHLCV updates for a token
     */
    subscribeToOHLCV(address: string, timeframe: string = '1m'): void {
        const queryKey = `TOKEN_OHLCV:${address}:${timeframe}`;
        const sub: Subscription = {
            type: 'TOKEN_OHLCV',
            address,
            timeframe,
            queryKey,
        };

        this.subscriptions.set(queryKey, sub);

        if (this.isConnected) {
            this.sendSubscription(sub, 'SUBSCRIBE');
        }
    }

    /**
     * Subscribe to new token listings
     */
    subscribeToNewListings(): void {
        const queryKey = 'TOKEN_NEW_LISTING';
        const sub: Subscription = {
            type: 'TOKEN_NEW_LISTING',
            queryKey,
        };

        this.subscriptions.set(queryKey, sub);

        if (this.isConnected) {
            this.sendSubscription(sub, 'SUBSCRIBE');
        }
    }

    /**
     * Unsubscribe from a specific subscription
     */
    unsubscribe(queryKey: string): void {
        const sub = this.subscriptions.get(queryKey);
        if (sub) {
            if (this.isConnected) {
                this.sendSubscription(sub, 'UNSUBSCRIBE');
            }
            this.subscriptions.delete(queryKey);
        }
    }

    /**
     * Unsubscribe from price updates
     */
    unsubscribeFromPrices(addresses: string | string[]): void {
        const addrs = Array.isArray(addresses) ? addresses : [addresses];
        for (const address of addrs) {
            this.unsubscribe(`PRICE:${address}`);
        }
    }

    /**
     * Unsubscribe from trade updates
     */
    unsubscribeFromTrades(addresses: string | string[]): void {
        const addrs = Array.isArray(addresses) ? addresses : [addresses];
        for (const address of addrs) {
            this.unsubscribe(`TOKEN_TRADE:${address}`);
        }
    }

    /**
     * Get connection status
     */
    getStatus(): { connected: boolean; subscriptions: number } {
        return {
            connected: this.isConnected,
            subscriptions: this.subscriptions.size,
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

let wsInstance: BirdeyeWebSocket | null = null;

export function getBirdeyeWebSocket(config?: BirdeyeWSConfig): BirdeyeWebSocket {
    const apiKey = config?.apiKey || process.env.BIRDEYE_API_KEY;
    const wssUrl = config?.wssUrl || process.env.BIRDEYE_WSS_URL;

    if (!apiKey) {
        throw new Error('BIRDEYE_API_KEY is required');
    }

    if (!wsInstance) {
        wsInstance = new BirdeyeWebSocket({
            apiKey,
            wssUrl,
            ...config,
        });
    }

    return wsInstance;
}

export default BirdeyeWebSocket;
