/**
 * SolanaOS Gateway SSE Transport
 *
 * Adapted from Claude Code's src/bridge/ SSETransport + bidirectional message patterns.
 *
 * Provides a bidirectional SSE-based transport layer for the SolanaOS gateway ↔ client
 * communication. Replaces the custom polling/WebSocket mix with a clean SSE stream
 * for reads and POST for writes — the same v2 "env-less" pattern from Claude Code.
 *
 * Used by: Chrome Extension, Android app, macOS menu bar, web Control UI
 *
 * Key patterns from Claude Code:
 *  - BoundedUUIDSet for message dedup (prevents replay / echo)
 *  - Inbound message classification (user | control_request | control_response)
 *  - Outbound message batching
 *  - Token refresh scheduling (maps to SolanaOS device auth token refresh)
 *  - State machine: ready → connected → reconnecting → failed
 */

import { EventEmitter } from "events";

// ─────────────────────────────────────────────────────────────────────────────
// BoundedUUIDSet (adapted from Claude Code's bridge dedup)
// ─────────────────────────────────────────────────────────────────────────────

export class BoundedUUIDSet {
  private set = new Set<string>();
  private queue: string[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  has(id: string): boolean {
    return this.set.has(id);
  }

  add(id: string): void {
    if (this.set.has(id)) return;
    if (this.queue.length >= this.maxSize) {
      const evicted = this.queue.shift()!;
      this.set.delete(evicted);
    }
    this.set.add(id);
    this.queue.push(id);
  }

  size(): number {
    return this.set.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transport Message Types (aligned with Claude Code's bridge protocol)
// ─────────────────────────────────────────────────────────────────────────────

export type InboundMessageType =
  | "user"              // User prompt from a connected client
  | "control_request"   // Control command (interrupt, set_model, set_permission_mode)
  | "ping";             // Keepalive

export type OutboundMessageType =
  | "assistant"         // Assistant response
  | "result"            // Turn completion
  | "tool_start"        // Tool invocation started
  | "tool_end"          // Tool invocation completed
  | "activity"          // Background activity update
  | "error"             // Error notification
  | "pong";             // Keepalive response

export interface InboundMessage {
  id: string;
  type: InboundMessageType;
  payload: unknown;
  timestamp: number;
}

export interface OutboundMessage {
  id: string;
  type: OutboundMessageType;
  payload: unknown;
  timestamp: number;
}

// Control request types (from Claude Code's bridge protocol)
export type ControlRequestType =
  | "interrupt"
  | "set_model"
  | "set_permission_mode"
  | "set_sim_mode"
  | "set_max_tokens";

export interface ControlRequest {
  type: ControlRequestType;
  value?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transport State
// ─────────────────────────────────────────────────────────────────────────────

export type TransportState = "ready" | "connected" | "reconnecting" | "failed" | "closed";

// ─────────────────────────────────────────────────────────────────────────────
// SSE Transport (server side — runs in the gateway)
// ─────────────────────────────────────────────────────────────────────────────

export interface SSEConnection {
  clientId: string;
  surface: "web" | "extension" | "android" | "macos" | "cli";
  connectedAt: Date;
  send(message: OutboundMessage): void;
  close(): void;
}

export class GatewaySSETransport extends EventEmitter {
  private connections = new Map<string, SSEConnection>();
  private seenIds = new BoundedUUIDSet(2000);
  private state: TransportState = "ready";

  // ── Connection management ──────────────────────────────────────────────────

  addConnection(conn: SSEConnection): void {
    this.connections.set(conn.clientId, conn);
    this.state = "connected";
    this.emit("connection:added", conn);
  }

  removeConnection(clientId: string): void {
    this.connections.delete(clientId);
    if (this.connections.size === 0) this.state = "ready";
    this.emit("connection:removed", clientId);
  }

  getConnection(clientId: string): SSEConnection | undefined {
    return this.connections.get(clientId);
  }

  listConnections(): SSEConnection[] {
    return Array.from(this.connections.values());
  }

  // ── Inbound message handling ───────────────────────────────────────────────

  /**
   * Process an inbound message from a client.
   * Applies dedup and routes to the appropriate handler.
   */
  handleInbound(raw: unknown, clientId: string): void {
    if (!isInboundMessage(raw)) return;

    // Dedup (adapted from Claude Code's BoundedUUIDSet replay guard)
    if (this.seenIds.has(raw.id)) return;
    this.seenIds.add(raw.id);

    this.emit(`message:${raw.type}`, raw, clientId);
    this.emit("message:inbound", raw, clientId);
  }

  // ── Outbound message batching (adapted from Claude Code bridge write batching) ──

  private outboundQueue: OutboundMessage[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Queue a message for batched delivery to all connected clients */
  queueOutbound(msg: Omit<OutboundMessage, "id" | "timestamp">): void {
    const message: OutboundMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      ...msg,
    };
    this.outboundQueue.push(message);
    this.scheduleFlush();
  }

  /** Broadcast immediately to all connected clients */
  broadcast(msg: Omit<OutboundMessage, "id" | "timestamp">): void {
    const message: OutboundMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      ...msg,
    };
    for (const conn of this.connections.values()) {
      try {
        conn.send(message);
      } catch {
        // Connection may have closed
        this.removeConnection(conn.clientId);
      }
    }
  }

  /** Flush queued messages to a specific client or all clients */
  flush(targetClientId?: string): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const messages = [...this.outboundQueue];
    this.outboundQueue = [];

    const targets = targetClientId
      ? [this.connections.get(targetClientId)].filter(Boolean) as SSEConnection[]
      : Array.from(this.connections.values());

    for (const conn of targets) {
      for (const msg of messages) {
        try {
          conn.send(msg);
        } catch {
          this.removeConnection(conn.clientId);
        }
      }
    }
  }

  private scheduleFlush(delayMs = 16): void {
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), delayMs);
    }
  }

  // ── State ──────────────────────────────────────────────────────────────────

  getState(): TransportState {
    return this.state;
  }

  isConnected(): boolean {
    return this.connections.size > 0;
  }

  close(): void {
    for (const conn of this.connections.values()) {
      try { conn.close(); } catch { /* ignore */ }
    }
    this.connections.clear();
    this.state = "closed";
    this.emit("transport:closed");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE Transport client side (runs in browser / extension / Android WebView)
// ─────────────────────────────────────────────────────────────────────────────

export interface SSEClientOptions {
  gatewayUrl: string;
  authToken?: string;
  surface: SSEConnection["surface"];
  onMessage: (message: InboundMessage) => void;
  onStateChange?: (state: TransportState) => void;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

export class SSEClient extends EventEmitter {
  private opts: SSEClientOptions;
  private eventSource: EventSource | null = null;
  private state: TransportState = "ready";
  private reconnectAttempts = 0;
  private clientId: string;

  constructor(opts: SSEClientOptions) {
    super();
    this.opts = opts;
    this.clientId = generateMessageId();
  }

  connect(): void {
    if (this.state === "connected") return;

    const url = new URL(`${this.opts.gatewayUrl}/api/v1/stream`);
    url.searchParams.set("clientId", this.clientId);
    url.searchParams.set("surface", this.opts.surface);

    // In browser environments use EventSource
    if (typeof EventSource !== "undefined") {
      this.eventSource = new EventSource(url.toString());
      this.eventSource.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (isInboundMessage(msg)) this.opts.onMessage(msg);
        } catch { /* ignore malformed */ }
      };
      this.eventSource.onerror = () => this.handleDisconnect();
      this.eventSource.onopen = () => {
        this.setState("connected");
        this.reconnectAttempts = 0;
      };
    }
  }

  async send(msg: Omit<OutboundMessage, "id" | "timestamp" | "type"> & { type: OutboundMessageType }): Promise<void> {
    const message: OutboundMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      ...msg,
    };
    await fetch(`${this.opts.gatewayUrl}/api/v1/gateway/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.opts.authToken ? { Authorization: `Bearer ${this.opts.authToken}` } : {}),
      },
      body: JSON.stringify(message),
    });
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.setState("closed");
  }

  getState(): TransportState {
    return this.state;
  }

  private handleDisconnect(): void {
    const maxAttempts = this.opts.maxReconnectAttempts ?? 5;
    if (this.reconnectAttempts >= maxAttempts) {
      this.setState("failed");
      return;
    }

    this.setState("reconnecting");
    this.reconnectAttempts++;
    const delay = (this.opts.reconnectDelayMs ?? 1000) * 2 ** (this.reconnectAttempts - 1);
    setTimeout(() => this.connect(), Math.min(delay, 30_000));
  }

  private setState(state: TransportState): void {
    this.state = state;
    this.opts.onStateChange?.(state);
    this.emit("state", state);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token refresh scheduler (adapted from Claude Code's createTokenRefreshScheduler)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeviceToken {
  token: string;
  expiresAt: number; // unix ms
}

export function scheduleTokenRefresh(
  getToken: () => Promise<DeviceToken>,
  onRefreshed: (token: DeviceToken) => void,
  bufferMs = 60_000,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = async () => {
    try {
      const token = await getToken();
      onRefreshed(token);
      const delay = Math.max(0, token.expiresAt - Date.now() - bufferMs);
      timer = setTimeout(schedule, delay);
    } catch {
      // Retry after 30s on failure
      timer = setTimeout(schedule, 30_000);
    }
  };

  schedule();

  return () => {
    if (timer) clearTimeout(timer);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let msgCounter = 0;

function generateMessageId(): string {
  return `${Date.now().toString(36)}-${(msgCounter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isInboundMessage(value: unknown): value is InboundMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "string" &&
    typeof (value as Record<string, unknown>).type === "string"
  );
}
