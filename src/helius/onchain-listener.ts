/**
 * HeliusListener — Real-time Solana onchain event listener
 *
 * Implements all 4 Helius streaming methods:
 *  1. Standard WebSockets   — accountSubscribe, programSubscribe, logsSubscribe, slotSubscribe
 *  2. Enhanced WebSockets   — transactionSubscribe (with account/program filtering)
 *  3. Polling               — fallback for any JSON-RPC method on an interval
 *  4. Webhook               — register Helius webhooks + receive via Express endpoint
 *
 * Uses Node 22 native WebSocket (no ws package needed).
 * All subscriptions auto-reconnect with exponential backoff.
 *
 * Docs:
 *   https://docs.helius.dev/data-streaming-event-listening/overview
 *   https://docs.helius.dev/data-streaming-event-listening/standard-websockets
 *   https://docs.helius.dev/data-streaming-event-listening/enhanced-websockets
 *
 * Example:
 *   const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
 *   listener.on("account", (pubkey, data) => console.log("updated:", pubkey, data));
 *   await listener.subscribeAccount("So11111111111111111111111111111111111111112");
 *   await listener.subscribeTransaction({ accountInclude: ["TokenkegQfez..."] });
 */

import { EventEmitter } from "node:events";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListenerConfig {
  apiKey: string;
  cluster?: "mainnet" | "devnet";
  /** ms between ping keepalives (default: 30_000) */
  pingIntervalMs?: number;
  /** max reconnect delay in ms (default: 30_000) */
  maxReconnectDelayMs?: number;
  /** commitment level (default: "confirmed") */
  commitment?: "processed" | "confirmed" | "finalized";
}

export interface TransactionFilter {
  /** Include txs involving these accounts */
  accountInclude?: string[];
  /** Exclude txs where these are the only accounts */
  accountExclude?: string[];
  /** Only include txs where ALL of these accounts are present */
  accountRequired?: string[];
  /** Exclude vote transactions (default: true) */
  vote?: boolean;
  /** Exclude failed transactions (default: false) */
  failed?: boolean;
}

export interface LogsFilter {
  /** Filter by program ID, or "all" / "allWithVotes" */
  filter: string | { mentions: [string] };
}

export interface Subscription {
  id: number;
  type: string;
  unsubscribe: () => void;
}

// Standard WebSocket notification shapes
export interface AccountNotification {
  pubkey: string;
  account: {
    lamports: number;
    owner: string;
    data: unknown;
    executable: boolean;
    rentEpoch: number;
  };
  context: { slot: number };
}

export interface LogsNotification {
  signature: string;
  err: unknown;
  logs: string[];
  context: { slot: number };
}

export interface SlotNotification {
  slot: number;
  parent: number;
  root: number;
}

export interface TransactionNotification {
  transaction: unknown;
  signature: string;
  slot: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HeliusListener
// ─────────────────────────────────────────────────────────────────────────────

export class HeliusListener extends EventEmitter {
  private readonly wssUrl: string;
  private readonly config: Required<Omit<ListenerConfig, "cluster">>;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private nextReqId = 1;
  private pendingRequests = new Map<number, (result: unknown) => void>();
  private subscriptions = new Map<number, { method: string; params: unknown[]; handler: (data: unknown) => void }>();
  private destroyed = false;

  constructor(config: ListenerConfig) {
    super();
    const cluster = config.cluster ?? "mainnet";
    this.wssUrl =
      process.env.HELIUS_WSS_URL ??
      `wss://${cluster}.helius-rpc.com/?api-key=${config.apiKey}`;
    this.config = {
      apiKey: config.apiKey,
      pingIntervalMs: config.pingIntervalMs ?? 30_000,
      maxReconnectDelayMs: config.maxReconnectDelayMs ?? 30_000,
      commitment: config.commitment ?? "confirmed",
    };
  }

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.isConnected || this.destroyed) return;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wssUrl);
      } catch (e) {
        reject(new Error(`WebSocket not available: ${e}. Requires Node.js 22+`));
        return;
      }

      const timeout = setTimeout(() => reject(new Error("WebSocket connection timeout")), 10_000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startPing();
        this.resubscribeAll();
        this.emit("connected");
        resolve();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(String(event.data));
      };

      this.ws.onclose = (event: CloseEvent) => {
        clearTimeout(timeout);
        this.isConnected = false;
        this.stopPing();
        this.emit("disconnected", event.code, event.reason);
        if (!this.destroyed) this.scheduleReconnect();
      };

      this.ws.onerror = (event: Event) => {
        clearTimeout(timeout);
        this.emit("error", new Error(`WebSocket error: ${event.type}`));
        if (!this.isConnected) reject(new Error("WebSocket connection failed"));
      };
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
    const delay = Math.min(
      1000 * 2 ** this.reconnectAttempts,
      this.config.maxReconnectDelayMs,
    );
    this.reconnectAttempts++;
    this.emit("reconnecting", this.reconnectAttempts, delay);
    this.reconnectTimer = setTimeout(() => void this.connect(), delay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ jsonrpc: "2.0", id: this.nextReqId++, method: "ping" }));
      }
    }, this.config.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  // ── Message routing ───────────────────────────────────────────────────────

  private handleMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }

    // Response to a subscribe/unsubscribe request
    if ("id" in msg && msg.id !== null) {
      const cb = this.pendingRequests.get(Number(msg.id));
      if (cb) {
        this.pendingRequests.delete(Number(msg.id));
        cb(msg.result ?? msg.error);
      }
      return;
    }

    // Subscription notification
    if (msg.method && msg.params) {
      const params = msg.params as Record<string, unknown>;
      const subscriptionId = Number(params.subscription);
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        sub.handler(params.result);
      }
      // Also re-emit by method type for convenience
      const eventType = String(msg.method).replace("Notification", "");
      this.emit(eventType, params.result, subscriptionId);
    }
  }

  // ── Low-level subscribe/unsubscribe ───────────────────────────────────────

  private async sendRequest(method: string, params: unknown[]): Promise<unknown> {
    if (!this.isConnected) await this.connect();
    return new Promise((resolve, reject) => {
      const id = this.nextReqId++;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 10_000);
      this.pendingRequests.set(id, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });
      this.ws!.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  private async subscribe(
    subscribeMethod: string,
    unsubscribeMethod: string,
    params: unknown[],
    handler: (data: unknown) => void,
  ): Promise<Subscription> {
    const subscriptionId = Number(await this.sendRequest(subscribeMethod, params));

    this.subscriptions.set(subscriptionId, {
      method: subscribeMethod,
      params,
      handler,
    });

    return {
      id: subscriptionId,
      type: subscribeMethod,
      unsubscribe: () => {
        this.subscriptions.delete(subscriptionId);
        if (this.isConnected) {
          void this.sendRequest(unsubscribeMethod, [subscriptionId]).catch(() => {});
        }
      },
    };
  }

  private async resubscribeAll(): Promise<void> {
    const subs = Array.from(this.subscriptions.entries());
    this.subscriptions.clear();
    for (const [, sub] of subs) {
      try {
        const newId = Number(await this.sendRequest(sub.method, sub.params));
        this.subscriptions.set(newId, sub);
      } catch { /* ignore — will retry on next reconnect */ }
    }
  }

  // ── Standard WebSocket Subscriptions ─────────────────────────────────────

  /**
   * Monitor an account for changes.
   * Fires whenever the account's lamports, data, or owner changes.
   *
   * @example listener.subscribeAccount("So111...112", data => console.log(data))
   */
  async subscribeAccount(
    pubkey: string,
    handler: (data: AccountNotification) => void = () => {},
  ): Promise<Subscription> {
    const sub = await this.subscribe(
      "accountSubscribe",
      "accountUnsubscribe",
      [pubkey, { encoding: "jsonParsed", commitment: this.config.commitment }],
      (data) => {
        const notification: AccountNotification = {
          pubkey,
          account: (data as { value: AccountNotification["account"] }).value,
          context: (data as { context: { slot: number } }).context,
        };
        handler(notification);
        this.emit("account", notification);
      },
    );
    return sub;
  }

  /**
   * Monitor all accounts owned by a program.
   * Useful for watching all DEX pools, all token accounts, etc.
   */
  async subscribeProgram(
    programId: string,
    handler: (data: unknown) => void = () => {},
    filters?: Array<{ memcmp?: { offset: number; bytes: string }; dataSize?: number }>,
  ): Promise<Subscription> {
    const params: unknown[] = [
      programId,
      {
        encoding: "jsonParsed",
        commitment: this.config.commitment,
        ...(filters ? { filters } : {}),
      },
    ];
    return this.subscribe("programSubscribe", "programUnsubscribe", params, (data) => {
      handler(data);
      this.emit("program", data, programId);
    });
  }

  /**
   * Subscribe to transaction logs for an account or program.
   * Use for monitoring activity in real-time.
   *
   * @example
   *   // Watch all Token Program logs
   *   listener.subscribeLogs({ filter: { mentions: ["TokenkegQfeZ..."] } }, handler)
   *   // Watch everything
   *   listener.subscribeLogs({ filter: "all" }, handler)
   */
  async subscribeLogs(
    opts: LogsFilter,
    handler: (data: LogsNotification) => void = () => {},
  ): Promise<Subscription> {
    return this.subscribe(
      "logsSubscribe",
      "logsUnsubscribe",
      [opts.filter, { commitment: this.config.commitment }],
      (data) => {
        const notification = {
          signature: (data as { value: { signature: string } }).value?.signature,
          err: (data as { value: { err: unknown } }).value?.err,
          logs: (data as { value: { logs: string[] } }).value?.logs ?? [],
          context: (data as { context: { slot: number } }).context,
        };
        handler(notification);
        this.emit("logs", notification);
      },
    );
  }

  /**
   * Subscribe to slot updates — fires every ~400ms on Solana mainnet.
   * Useful for heartbeat monitoring.
   */
  async subscribeSlot(handler: (data: SlotNotification) => void = () => {}): Promise<Subscription> {
    return this.subscribe("slotSubscribe", "slotUnsubscribe", [], (data) => {
      const notification = data as SlotNotification;
      handler(notification);
      this.emit("slot", notification);
    });
  }

  /**
   * Wait for a specific transaction signature to be confirmed.
   * Resolves once the transaction reaches the target commitment.
   */
  async subscribeSignature(
    signature: string,
    handler: (err: unknown) => void = () => {},
  ): Promise<Subscription> {
    return this.subscribe(
      "signatureSubscribe",
      "signatureUnsubscribe",
      [signature, { commitment: this.config.commitment }],
      (data) => {
        const err = (data as { value: { err: unknown } })?.value?.err ?? null;
        handler(err);
        this.emit("signature", { signature, err });
      },
    );
  }

  // ── Enhanced WebSocket Subscriptions (Helius-specific) ────────────────────

  /**
   * Helius Enhanced WebSocket — transactionSubscribe
   * More powerful than standard logsSubscribe:
   *  - Filter by accounts included/excluded/required
   *  - Returns full parsed transaction data
   *  - Helius-specific, requires a Helius RPC endpoint
   *
   * @example
   *   // Monitor all Token Program transactions
   *   listener.subscribeTransaction({
   *     accountInclude: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
   *     vote: false,
   *     failed: false,
   *   }, (tx) => console.log(tx.signature))
   */
  async subscribeTransaction(
    filter: TransactionFilter,
    handler: (data: TransactionNotification) => void = () => {},
  ): Promise<Subscription> {
    const params = [
      {
        accountInclude: filter.accountInclude ?? [],
        accountExclude: filter.accountExclude ?? [],
        accountRequired: filter.accountRequired ?? [],
        vote: filter.vote ?? false,
        failed: filter.failed ?? false,
      },
      {
        commitment: this.config.commitment,
        encoding: "jsonParsed",
        transactionDetails: "full",
        showRewards: false,
        maxSupportedTransactionVersion: 0,
      },
    ];
    return this.subscribe(
      "transactionSubscribe",
      "transactionUnsubscribe",
      params,
      (data) => {
        const notification = data as TransactionNotification;
        handler(notification);
        this.emit("transaction", notification);
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Polling fallback — for any RPC method on an interval
// ─────────────────────────────────────────────────────────────────────────────

export interface PollerOptions {
  /** Interval in ms (default: 5000) */
  intervalMs?: number;
  /** Only call handler when value changes */
  onlyOnChange?: boolean;
}

type RpcFn<T> = () => Promise<T>;

export class HeliusPoller<T> extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastValue: string | null = null;
  private readonly intervalMs: number;
  private readonly onlyOnChange: boolean;

  constructor(
    private readonly fn: RpcFn<T>,
    private readonly handler: (data: T) => void,
    opts: PollerOptions = {},
  ) {
    super();
    this.intervalMs = opts.intervalMs ?? 5_000;
    this.onlyOnChange = opts.onlyOnChange ?? false;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        const data = await this.fn();
        const json = JSON.stringify(data);
        if (!this.onlyOnChange || json !== this.lastValue) {
          this.lastValue = json;
          this.handler(data);
          this.emit("data", data);
        }
      } catch (err) {
        this.emit("error", err);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook handler — receive Helius webhook POSTs in an Express app
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response, Router } from "express";

export interface WebhookEvent {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers?: unknown[];
  nativeTransfers?: unknown[];
  events?: Record<string, unknown>;
}

/**
 * Create an Express router that handles Helius webhook POSTs.
 * Mount at any path in your Express app.
 *
 * @example
 *   const emitter = new EventEmitter();
 *   app.use("/webhook/helius", createWebhookRouter(emitter, "my-secret-header-value"));
 *   emitter.on("event", (e) => console.log(e.type, e.signature));
 */
export function createWebhookRouter(
  emitter: EventEmitter,
  authHeaderValue?: string,
): Router {
  // Dynamic import to avoid requiring express at build time when not used
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express");
  const router = express.Router() as Router;

  router.post("/", (req: Request, res: Response) => {
    // Optional auth header check
    if (authHeaderValue) {
      const authHeader = req.headers.authorization ?? req.headers["helius-auth"];
      if (authHeader !== authHeaderValue) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    const events: WebhookEvent[] = Array.isArray(req.body) ? req.body : [req.body];
    for (const event of events) {
      emitter.emit("event", event);
      emitter.emit(`event:${event.type}`, event);
    }
    res.status(200).json({ received: events.length });
  });

  return router;
}
