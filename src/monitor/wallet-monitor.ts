/**
 * WalletMonitor — Unified real-time Solana wallet & token monitoring
 *
 * Orchestrates 3 data sources in parallel:
 *  1. Helius WebSocket (Enhanced)  — wallet account changes, transaction logs, enhanced tx stream
 *  2. Birdeye WebSocket           — token price updates, trade events, token metadata
 *  3. Solana Tracker DataStream   — trades, new tokens, wallet activity, pool updates
 *
 * Plus a Helius HTTP poller fallback for getSignaturesForAddress.
 *
 * All events are normalized and re-emitted through a single EventEmitter interface.
 *
 * Usage:
 *   const monitor = new WalletMonitor({
 *     walletAddress: process.env.WALLET_ADDRESS!,
 *     tokenAddress: process.env.TOKEN_ADDRESS,
 *   });
 *   monitor.on("event", (e) => console.log(e.source, e.type, e));
 *   await monitor.start();
 */

import { EventEmitter } from "node:events";
import { HeliusListener } from "../helius/onchain-listener.js";
import { HeliusClient } from "../helius/helius-client.js";
import { BirdeyeStream, createBirdeyeStream } from "./birdeye-stream.js";
import { SolanaTrackerStream, createSolanaTrackerStream } from "./solana-tracker-stream.js";

import type { AccountNotification, LogsNotification, TransactionNotification } from "../helius/onchain-listener.js";
import type { BirdeyeEvent } from "./birdeye-stream.js";
import type { SolanaTrackerEvent } from "./solana-tracker-stream.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WalletMonitorConfig {
  /** The Solana wallet address to monitor */
  walletAddress: string;
  /** Optional token address to track price/trades for */
  tokenAddress?: string;
  /** Helius API key (defaults to HELIUS_API_KEY env) */
  heliusApiKey?: string;
  /** Birdeye API key (defaults to BIRDEYE_API_KEY env) */
  birdeyeApiKey?: string;
  /** Solana Tracker Data API key (defaults to SOLANA_TRACKER_DATA_API_KEY env) */
  solanaTrackerApiKey?: string;
  /** Enable Helius polling fallback (default: true) */
  enablePolling?: boolean;
  /** Polling interval in ms (default: 10_000) */
  pollingIntervalMs?: number;
  /** Commitment level (default: "confirmed") */
  commitment?: "processed" | "confirmed" | "finalized";
  /** Subscribe to new token launches via Solana Tracker (default: false) */
  watchNewTokens?: boolean;
}

/** Unified event envelope emitted by WalletMonitor */
export interface MonitorEvent {
  source: "helius" | "birdeye" | "solana-tracker" | "helius-poller";
  type: string;
  timestamp: number;
  data: unknown;
}

export interface MonitorStatus {
  helius: { connected: boolean; subscriptions: number };
  birdeye: { connected: boolean; subscriptions: number } | null;
  solanaTracker: { connected: boolean; subscriptions: number } | null;
  poller: { active: boolean };
  uptime: number;
  eventsReceived: number;
}

// ── WalletMonitor ──────────────────────────────────────────────────────────────

export class WalletMonitor extends EventEmitter {
  private heliusListener: HeliusListener | null = null;
  private heliusClient: HeliusClient | null = null;
  private birdeyeStream: BirdeyeStream | null = null;
  private solanaTrackerStream: SolanaTrackerStream | null = null;
  private pollerTimer: ReturnType<typeof setInterval> | null = null;
  private lastSignature: string | null = null;
  private startedAt = 0;
  private eventCount = 0;
  private destroyed = false;

  private readonly config: Required<
    Pick<WalletMonitorConfig, "walletAddress" | "enablePolling" | "pollingIntervalMs" | "commitment" | "watchNewTokens">
  > & Pick<WalletMonitorConfig, "tokenAddress" | "heliusApiKey" | "birdeyeApiKey" | "solanaTrackerApiKey">;

  constructor(config: WalletMonitorConfig) {
    super();
    this.config = {
      walletAddress: config.walletAddress,
      tokenAddress: config.tokenAddress,
      heliusApiKey: config.heliusApiKey,
      birdeyeApiKey: config.birdeyeApiKey,
      solanaTrackerApiKey: config.solanaTrackerApiKey,
      enablePolling: config.enablePolling ?? true,
      pollingIntervalMs: config.pollingIntervalMs ?? 10_000,
      commitment: config.commitment ?? "confirmed",
      watchNewTokens: config.watchNewTokens ?? false,
    };
  }

  // ── Start / Stop ──────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.startedAt = Date.now();
    this.destroyed = false;

    const results = await Promise.allSettled([
      this.startHelius(),
      this.startBirdeye(),
      this.startSolanaTracker(),
    ]);

    // Report which sources connected
    const labels = ["Helius", "Birdeye", "SolanaTracker"];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        this.emit("source:connected", labels[i]);
      } else {
        this.emit("source:error", labels[i], r.reason);
      }
    }

    // Start poller as fallback
    if (this.config.enablePolling) {
      this.startPoller();
    }

    this.emit("started", this.status());
  }

  async stop(): Promise<void> {
    this.destroyed = true;
    this.heliusListener?.disconnect();
    this.birdeyeStream?.disconnect();
    this.solanaTrackerStream?.disconnect();
    if (this.pollerTimer) { clearInterval(this.pollerTimer); this.pollerTimer = null; }
    this.emit("stopped");
  }

  // ── Helius WebSocket ──────────────────────────────────────────────────────

  private async startHelius(): Promise<void> {
    const apiKey = this.config.heliusApiKey ?? process.env.HELIUS_API_KEY;
    if (!apiKey) throw new Error("HELIUS_API_KEY not set");

    this.heliusClient = new HeliusClient({ apiKey });
    this.heliusListener = new HeliusListener({
      apiKey,
      commitment: this.config.commitment,
    });

    // Forward connection events
    this.heliusListener.on("connected", () => this.emit("helius:connected"));
    this.heliusListener.on("disconnected", (code: number) => this.emit("helius:disconnected", code));
    this.heliusListener.on("error", (err: Error) => this.emit("helius:error", err));

    await this.heliusListener.connect();

    // 1. Subscribe to wallet account changes (balance, token account updates)
    await this.heliusListener.subscribeAccount(
      this.config.walletAddress,
      (notification: AccountNotification) => {
        this.emitEvent({
          source: "helius",
          type: "account_change",
          timestamp: Date.now(),
          data: notification,
        });
      },
    );

    // 2. Subscribe to transaction logs mentioning the wallet
    await this.heliusListener.subscribeLogs(
      { filter: { mentions: [this.config.walletAddress] } },
      (notification: LogsNotification) => {
        this.emitEvent({
          source: "helius",
          type: "transaction_log",
          timestamp: Date.now(),
          data: notification,
        });
      },
    );

    // 3. Enhanced transaction stream — all txs involving the wallet
    await this.heliusListener.subscribeTransaction(
      {
        accountInclude: [this.config.walletAddress],
        vote: false,
        failed: false,
      },
      (notification: TransactionNotification) => {
        this.emitEvent({
          source: "helius",
          type: "transaction",
          timestamp: Date.now(),
          data: notification,
        });
      },
    );

    // 4. If a token address is specified, also watch its account + logs
    if (this.config.tokenAddress) {
      await this.heliusListener.subscribeAccount(this.config.tokenAddress, (n: AccountNotification) => {
        this.emitEvent({ source: "helius", type: "token_account_change", timestamp: Date.now(), data: n });
      });
      await this.heliusListener.subscribeLogs(
        { filter: { mentions: [this.config.tokenAddress] } },
        (n: LogsNotification) => {
          this.emitEvent({ source: "helius", type: "token_log", timestamp: Date.now(), data: n });
        },
      );
    }
  }

  // ── Birdeye WebSocket ─────────────────────────────────────────────────────

  private async startBirdeye(): Promise<void> {
    const apiKey = this.config.birdeyeApiKey ?? process.env.BIRDEYE_API_KEY;
    if (!apiKey) throw new Error("BIRDEYE_API_KEY not set");

    this.birdeyeStream = createBirdeyeStream(apiKey);
    if (!this.birdeyeStream) throw new Error("Failed to create Birdeye stream");

    this.birdeyeStream.on("connected", () => this.emit("birdeye:connected"));
    this.birdeyeStream.on("disconnected", (code: number) => this.emit("birdeye:disconnected", code));
    this.birdeyeStream.on("error", (err: Error) => this.emit("birdeye:error", err));

    // Forward all Birdeye events
    this.birdeyeStream.on("data", (event: BirdeyeEvent) => {
      this.emitEvent({
        source: "birdeye",
        type: event.type,
        timestamp: event.timestamp * 1000,
        data: event,
      });
    });

    await this.birdeyeStream.connect();

    // Subscribe to token price + trades if we have a token address
    if (this.config.tokenAddress) {
      this.birdeyeStream.subscribePriceUpdates(this.config.tokenAddress);
      this.birdeyeStream.subscribeTradeEvents(this.config.tokenAddress);
      this.birdeyeStream.subscribeTokenOverview(this.config.tokenAddress);
    }
  }

  // ── Solana Tracker DataStream ─────────────────────────────────────────────

  private async startSolanaTracker(): Promise<void> {
    const apiKey = this.config.solanaTrackerApiKey ?? process.env.SOLANA_TRACKER_DATA_API_KEY;
    if (!apiKey) throw new Error("SOLANA_TRACKER_DATA_API_KEY not set");

    this.solanaTrackerStream = createSolanaTrackerStream(apiKey);
    if (!this.solanaTrackerStream) throw new Error("Failed to create Solana Tracker stream");

    this.solanaTrackerStream.on("connected", () => this.emit("solana-tracker:connected"));
    this.solanaTrackerStream.on("disconnected", (code: number) => this.emit("solana-tracker:disconnected", code));
    this.solanaTrackerStream.on("error", (err: Error) => this.emit("solana-tracker:error", err));

    // Forward all Solana Tracker events
    this.solanaTrackerStream.on("data", (event: SolanaTrackerEvent) => {
      this.emitEvent({
        source: "solana-tracker",
        type: event.type,
        timestamp: event.timestamp * 1000,
        data: event,
      });
    });

    await this.solanaTrackerStream.connect();

    // Subscribe to wallet activity
    this.solanaTrackerStream.subscribeWallet(this.config.walletAddress);

    // Subscribe to token trades if we have a token address
    if (this.config.tokenAddress) {
      this.solanaTrackerStream.subscribeTokenTrades(this.config.tokenAddress);
    }

    // Optionally watch new token launches
    if (this.config.watchNewTokens) {
      this.solanaTrackerStream.subscribeNewTokens();
    }
  }

  // ── Helius HTTP Polling Fallback ──────────────────────────────────────────

  private startPoller(): void {
    if (!this.heliusClient || this.pollerTimer) return;

    this.pollerTimer = setInterval(async () => {
      try {
        const txs = await this.heliusClient!.getTransactionsForAddress(
          this.config.walletAddress,
          { limit: 5, ...(this.lastSignature ? { until: this.lastSignature } : {}) },
        );

        if (txs.length > 0) {
          this.lastSignature = txs[0].signature;
          for (const tx of txs) {
            this.emitEvent({
              source: "helius-poller",
              type: "enhanced_transaction",
              timestamp: tx.timestamp * 1000,
              data: tx,
            });
          }
        }
      } catch (err) {
        this.emit("poller:error", err);
      }
    }, this.config.pollingIntervalMs);
  }

  // ── Event emission ────────────────────────────────────────────────────────

  private emitEvent(event: MonitorEvent): void {
    if (this.destroyed) return;
    this.eventCount++;
    this.emit("event", event);
    this.emit(`event:${event.type}`, event);
    this.emit(`source:${event.source}`, event);
  }

  // ── Runtime methods ───────────────────────────────────────────────────────

  /**
   * Dynamically add a token to watch across all connected streams.
   */
  async watchToken(tokenAddress: string): Promise<void> {
    // Helius: subscribe to account + logs
    if (this.heliusListener) {
      await this.heliusListener.subscribeAccount(tokenAddress, (n: AccountNotification) => {
        this.emitEvent({ source: "helius", type: "token_account_change", timestamp: Date.now(), data: n });
      });
      await this.heliusListener.subscribeLogs(
        { filter: { mentions: [tokenAddress] } },
        (n: LogsNotification) => {
          this.emitEvent({ source: "helius", type: "token_log", timestamp: Date.now(), data: n });
        },
      );
    }

    // Birdeye: subscribe to price + trades + overview
    if (this.birdeyeStream?.connected) {
      this.birdeyeStream.subscribePriceUpdates(tokenAddress);
      this.birdeyeStream.subscribeTradeEvents(tokenAddress);
      this.birdeyeStream.subscribeTokenOverview(tokenAddress);
    }

    // Solana Tracker: subscribe to token trades
    if (this.solanaTrackerStream?.connected) {
      this.solanaTrackerStream.subscribeTokenTrades(tokenAddress);
    }
  }

  /**
   * Dynamically add a wallet to watch across all connected streams.
   */
  async watchWallet(walletAddress: string): Promise<void> {
    if (this.heliusListener) {
      await this.heliusListener.subscribeAccount(walletAddress, (n: AccountNotification) => {
        this.emitEvent({ source: "helius", type: "account_change", timestamp: Date.now(), data: n });
      });
      await this.heliusListener.subscribeLogs(
        { filter: { mentions: [walletAddress] } },
        (n: LogsNotification) => {
          this.emitEvent({ source: "helius", type: "transaction_log", timestamp: Date.now(), data: n });
        },
      );
      await this.heliusListener.subscribeTransaction(
        { accountInclude: [walletAddress], vote: false, failed: false },
        (n: TransactionNotification) => {
          this.emitEvent({ source: "helius", type: "transaction", timestamp: Date.now(), data: n });
        },
      );
    }

    if (this.solanaTrackerStream?.connected) {
      this.solanaTrackerStream.subscribeWallet(walletAddress);
    }
  }

  /** Get current connection status for all sources */
  status(): MonitorStatus {
    return {
      helius: {
        connected: this.heliusListener?.listenerCount("connected") !== undefined,
        subscriptions: this.heliusListener?.listenerCount("account") ?? 0,
      },
      birdeye: this.birdeyeStream
        ? { connected: this.birdeyeStream.connected, subscriptions: this.birdeyeStream.subscriptionCount }
        : null,
      solanaTracker: this.solanaTrackerStream
        ? { connected: this.solanaTrackerStream.connected, subscriptions: this.solanaTrackerStream.subscriptionCount }
        : null,
      poller: { active: this.pollerTimer !== null },
      uptime: this.startedAt ? Date.now() - this.startedAt : 0,
      eventsReceived: this.eventCount,
    };
  }
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create a WalletMonitor from environment variables.
 * Automatically picks up WALLET_ADDRESS, TOKEN_ADDRESS, and all API keys.
 */
export function createWalletMonitor(overrides: Partial<WalletMonitorConfig> = {}): WalletMonitor {
  const walletAddress =
    overrides.walletAddress ??
    process.env.WALLET_ADDRESS ??
    process.env.SOLANA_WALLET_PUBKEY;

  if (!walletAddress) {
    throw new Error("WALLET_ADDRESS or SOLANA_WALLET_PUBKEY must be set");
  }

  return new WalletMonitor({
    walletAddress,
    tokenAddress: overrides.tokenAddress ?? process.env.TOKEN_ADDRESS ?? undefined,
    heliusApiKey: overrides.heliusApiKey ?? process.env.HELIUS_API_KEY,
    birdeyeApiKey: overrides.birdeyeApiKey ?? process.env.BIRDEYE_API_KEY,
    solanaTrackerApiKey: overrides.solanaTrackerApiKey ?? process.env.SOLANA_TRACKER_DATA_API_KEY,
    enablePolling: overrides.enablePolling,
    pollingIntervalMs: overrides.pollingIntervalMs,
    commitment: overrides.commitment,
    watchNewTokens: overrides.watchNewTokens,
  });
}
