/**
 * src/helius/index.ts
 *
 * Helius HTTP client + WebSocket listener for real-time Solana onchain data.
 *
 * HeliusClient  — REST: balances, enhanced transactions, priority fees
 * HeliusListener — WebSocket: accountSubscribe, transactionSubscribe, slotSubscribe
 *
 * Free API key: https://helius.dev
 */

import { EventEmitter } from "node:events";
import WebSocket from "ws";

// ── Types ──────────────────────────────────────────────────────────────────

export interface HeliusClientOpts {
  apiKey: string;
  cluster?: "mainnet-beta" | "devnet";
}

export interface TokenTransfer {
  mint: string;
  tokenAmount: number;
  fromUserAccount?: string;
  toUserAccount?: string;
}

export interface EnhancedTransaction {
  signature: string;
  timestamp: number;
  type: string;
  description?: string;
  tokenTransfers?: TokenTransfer[];
  nativeTransfers?: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
  fee?: number;
  slot?: number;
}

export interface PriorityFeeEstimate {
  min: number;
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
  recommended: number;
}

export interface Subscription {
  id: number;
  unsubscribe: () => void;
}

// ── HeliusClient ───────────────────────────────────────────────────────────

export class HeliusClient {
  readonly rpcUrl: string;
  private readonly apiKey: string;
  private readonly apiBase: string;

  constructor(opts: HeliusClientOpts) {
    this.apiKey = opts.apiKey;
    const cluster = opts.cluster ?? "mainnet-beta";
    const subdomain = cluster === "devnet" ? "devnet" : "mainnet-beta";
    this.rpcUrl = `https://rpc.helius.xyz/?api-key=${this.apiKey}`;
    this.apiBase = `https://api.helius.xyz`;
    void subdomain;
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!res.ok) throw new Error(`Helius RPC ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { result: T; error?: { message: string } };
    if (data.error) throw new Error(`Helius RPC error: ${data.error.message}`);
    return data.result;
  }

  async getBalance(address: string): Promise<number> {
    const result = await this.rpc<{ value: number }>("getBalance", [address]);
    return result.value / 1e9;
  }

  async getTransactionsForAddress(
    address: string,
    opts: { limit?: number; before?: string; until?: string } = {},
  ): Promise<EnhancedTransaction[]> {
    const params = new URLSearchParams({
      "api-key": this.apiKey,
      limit: String(opts.limit ?? 10),
    });
    if (opts.before) params.set("before", opts.before);
    if (opts.until) params.set("until", opts.until);

    const url = `${this.apiBase}/v0/addresses/${address}/transactions?${params}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Helius enhanced tx ${res.status}: ${await res.text()}`);
    return res.json() as Promise<EnhancedTransaction[]>;
  }

  async getPriorityFeeEstimate(accountKeys?: string[]): Promise<PriorityFeeEstimate> {
    const params: unknown[] = [
      {
        ...(accountKeys ? { accountKeys } : {}),
        options: { includeAllPriorityFeeLevels: true },
      },
    ];
    const result = await this.rpc<{
      priorityFeeLevels: Record<string, number>;
    }>("getPriorityFeeEstimate", params);

    const lvl = result.priorityFeeLevels;
    return {
      min: lvl.min ?? 0,
      low: lvl.low ?? 0,
      medium: lvl.medium ?? 0,
      high: lvl.high ?? 0,
      veryHigh: lvl.veryHigh ?? 0,
      recommended: lvl.medium ?? lvl.low ?? 0,
    };
  }

  async getTokenAccounts(owner: string): Promise<
    Array<{ mint: string; address: string; amount: string; decimals: number }>
  > {
    const url = `${this.apiBase}/v0/addresses/${owner}/balances?api-key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helius token accounts ${res.status}`);
    const data = (await res.json()) as {
      tokens?: Array<{ mint: string; tokenAccount: string; amount: string; decimals: number }>;
    };
    return (data.tokens ?? []).map((t) => ({
      mint: t.mint,
      address: t.tokenAccount,
      amount: t.amount,
      decimals: t.decimals,
    }));
  }
}

// ── HeliusListener (WebSocket) ─────────────────────────────────────────────

type WsMessage = {
  jsonrpc: "2.0";
  method?: string;
  id?: number;
  result?: unknown;
  params?: { subscription: number; result: unknown };
};

export class HeliusListener extends EventEmitter {
  private readonly apiKey: string;
  private readonly wsUrl: string;
  private ws: WebSocket | null = null;
  private rpcId = 1;
  private pendingRpc = new Map<number, (result: unknown) => void>();
  private subscriptions = new Map<number, (data: unknown) => void>();
  private reconnectHandle?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;

  constructor(opts: HeliusClientOpts) {
    super();
    this.apiKey = opts.apiKey;
    const cluster = opts.cluster ?? "mainnet-beta";
    this.wsUrl =
      cluster === "devnet"
        ? `wss://devnet.helius-rpc.com/?api-key=${this.apiKey}`
        : `wss://atlas-mainnet.helius-rpc.com/?api-key=${this.apiKey}`;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      ws.on("open", () => {
        this.reconnectAttempts = 0;
        this.emit("connected");
        resolve();
      });

      ws.on("message", (raw: WebSocket.Data) => {
        try {
          const msg = JSON.parse(raw.toString()) as WsMessage;
          // RPC response (subscribe call)
          if (msg.id !== undefined && msg.result !== undefined) {
            const cb = this.pendingRpc.get(msg.id);
            if (cb) {
              this.pendingRpc.delete(msg.id);
              cb(msg.result);
            }
            return;
          }
          // Subscription notification
          if (msg.method && msg.params) {
            const subId = msg.params.subscription;
            const cb = this.subscriptions.get(subId);
            if (cb) cb(msg.params.result);
          }
        } catch {
          // ignore malformed frames
        }
      });

      ws.on("error", (err: Error) => reject(err));

      ws.on("close", () => {
        this._scheduleReconnect();
      });
    });
  }

  private _scheduleReconnect(): void {
    if (this.reconnectHandle) return;
    this.reconnectAttempts++;
    const delay = Math.min(500 * this.reconnectAttempts, 30_000);
    this.emit("reconnecting", this.reconnectAttempts, delay);
    this.reconnectHandle = setTimeout(async () => {
      this.reconnectHandle = undefined;
      try {
        await this.connect();
      } catch {
        this._scheduleReconnect();
      }
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectHandle) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = undefined;
    }
    this.ws?.close();
    this.ws = null;
  }

  private _send(method: string, params: unknown[]): Promise<number> {
    if (!this.ws) throw new Error("HeliusListener: not connected");
    const id = this.rpcId++;
    return new Promise((resolve) => {
      this.pendingRpc.set(id, (result) => resolve(result as number));
      (this.ws as NonNullable<typeof this.ws>).send(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      );
    });
  }

  async subscribeAccount(
    address: string,
    callback: (data: { account: { lamports: number }; context: { slot: number } }) => void,
  ): Promise<Subscription> {
    const subId = await this._send("accountSubscribe", [
      address,
      { encoding: "base64", commitment: "confirmed" },
    ]);
    this.subscriptions.set(subId, callback as (d: unknown) => void);
    return {
      id: subId,
      unsubscribe: () => {
        this.subscriptions.delete(subId);
        this._send("accountUnsubscribe", [subId]).catch(() => {});
      },
    };
  }

  async subscribeTransaction(
    filter: { accountInclude?: string[]; vote?: boolean; failed?: boolean },
    callback: (data: { signature: string; slot: number }) => void,
  ): Promise<Subscription> {
    const subId = await this._send("transactionSubscribe", [
      filter,
      { commitment: "confirmed", encoding: "jsonParsed" },
    ]);
    this.subscriptions.set(subId, callback as (d: unknown) => void);
    return {
      id: subId,
      unsubscribe: () => {
        this.subscriptions.delete(subId);
        this._send("transactionUnsubscribe", [subId]).catch(() => {});
      },
    };
  }

  async subscribeSlot(
    callback: (slot: { slot: number; parent: number; root: number }) => void,
  ): Promise<Subscription> {
    const subId = await this._send("slotSubscribe", []);
    this.subscriptions.set(subId, callback as (d: unknown) => void);
    return {
      id: subId,
      unsubscribe: () => {
        this.subscriptions.delete(subId);
        this._send("slotUnsubscribe", [subId]).catch(() => {});
      },
    };
  }
}
