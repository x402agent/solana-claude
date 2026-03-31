/**
 * SolanaOS Gateway Integration Layer
 *
 * Wires together:
 *  - GatewaySSETransport (adapted from Claude Code's bridge/SSETransport)
 *  - DeviceAuthPayload (existing src/gateway/device-auth.ts)
 *  - GatewayEventName   (existing src/gateway/events.ts)
 *  - ClientInfo         (existing src/gateway/protocol/client-info.ts)
 *  - ConnectErrorDetailCodes (existing src/gateway/protocol/connect-error-details.ts)
 *
 * This module is the single place where the new SSE transport plugs into
 * the existing SolanaOS gateway protocol stack.
 *
 * Gateway architecture:
 *
 *   Client (web/android/macos/extension/seeker)
 *       │
 *       │  SSE stream   (GET /api/v1/stream)
 *       │  POST message (POST /api/v1/gateway/message)
 *       │
 *   GatewaySSETransport   ◄── GatewayEventRouter (this file)
 *       │                               │
 *       │  emit("message:user")         ▼
 *       │  emit("message:control_request")
 *       │                     QueryEngine / Coordinator
 *       │                               │
 *       └── broadcast(assistant, result, tool_start, ...)
 */

import { EventEmitter } from "events";
import {
  GatewaySSETransport,
  SSEConnection,
  InboundMessage,
  OutboundMessage,
  ControlRequest,
} from "./sse-transport.js";
import { validateDeviceAuth, DeviceAuthPayload } from "./device-auth.js";
import {
  GatewayEventName,
  isGatewayEventName,
  GATEWAY_EVENT_CHAT_MESSAGE,
  GATEWAY_EVENT_CHAT_STREAM,
  GATEWAY_EVENT_TOOL_STREAM,
  GATEWAY_EVENT_SESSION_REFRESH,
  GATEWAY_EVENT_EXEC_APPROVAL,
  GATEWAY_EVENT_AGENT,
  GATEWAY_EVENT_AGENT_REQUEST,
  GATEWAY_EVENT_HEALTH,
} from "./events.js";
import { parseClientInfo, ClientInfo, GatewayClientName } from "./protocol/client-info.js";
import {
  ConnectErrorDetailCodes,
  readConnectErrorDetailCode,
  readConnectErrorRecoveryAdvice,
} from "./protocol/connect-error-details.js";

export {
  validateDeviceAuth,
  DeviceAuthPayload,
  GatewayEventName,
  isGatewayEventName,
  parseClientInfo,
  ClientInfo,
  ConnectErrorDetailCodes,
  readConnectErrorDetailCode,
  readConnectErrorRecoveryAdvice,
};

// ─────────────────────────────────────────────────────────────────────────────
// Gateway session state
// ─────────────────────────────────────────────────────────────────────────────

export interface GatewaySession {
  id: string;
  clientId: string;
  surface: GatewayClientName;
  clientInfo: ClientInfo;
  deviceAuth?: DeviceAuthPayload;
  authenticated: boolean;
  connectedAt: Date;
  lastMessageAt: Date;
  activeQueryId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gateway Event Router
// Adapted from Claude Code's bridge inboundMessages.ts routing pattern
// ─────────────────────────────────────────────────────────────────────────────

export type GatewayEventPayload =
  | { event: typeof GATEWAY_EVENT_CHAT_MESSAGE; content: string; sessionId: string; role: "user" }
  | { event: typeof GATEWAY_EVENT_CHAT_STREAM; chunk: string; queryId: string }
  | { event: typeof GATEWAY_EVENT_TOOL_STREAM; toolName: string; status: "start" | "end"; data?: unknown }
  | { event: typeof GATEWAY_EVENT_EXEC_APPROVAL; toolName: string; args: unknown; requestId: string; approved: boolean }
  | { event: typeof GATEWAY_EVENT_AGENT; agentId: string; action: "spawn" | "stop" | "message"; payload?: unknown }
  | { event: typeof GATEWAY_EVENT_AGENT_REQUEST; description: string; prompt: string; workerId?: string }
  | { event: typeof GATEWAY_EVENT_SESSION_REFRESH; reason: string }
  | { event: typeof GATEWAY_EVENT_HEALTH; uptime: number; version: string };

export class GatewayEventRouter extends EventEmitter {
  private transport: GatewaySSETransport;
  private sessions = new Map<string, GatewaySession>();

  constructor(transport: GatewaySSETransport) {
    super();
    this.transport = transport;

    // Wire inbound messages from transport to event-specific emitters
    transport.on("message:user", (msg: InboundMessage, clientId: string) => {
      this.routeInbound(msg, clientId);
    });
    transport.on("message:control_request", (msg: InboundMessage, clientId: string) => {
      this.routeControlRequest(msg, clientId);
    });
    transport.on("message:ping", (_msg: InboundMessage, clientId: string) => {
      this.transport.broadcast({ type: "pong", payload: { clientId } });
    });
    transport.on("connection:removed", (clientId: string) => {
      this.clearSession(clientId);
    });
  }

  // ── Session management ─────────────────────────────────────────────────────

  registerConnection(conn: SSEConnection & { clientInfo?: ClientInfo; deviceAuth?: DeviceAuthPayload; surface: GatewayClientName }): GatewaySession {
    const session: GatewaySession = {
      id: generateSessionId(),
      clientId: conn.clientId,
      surface: conn.surface,
      clientInfo: conn.clientInfo ?? parseClientInfo({}),
      deviceAuth: conn.deviceAuth,
      authenticated: !!conn.deviceAuth,
      connectedAt: new Date(),
      lastMessageAt: new Date(),
    };
    this.sessions.set(conn.clientId, session);
    this.transport.addConnection(conn);
    this.emit("session:registered", session);
    return session;
  }

  getSession(clientId: string): GatewaySession | undefined {
    return this.sessions.get(clientId);
  }

  listSessions(): GatewaySession[] {
    return Array.from(this.sessions.values());
  }

  private clearSession(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (session) {
      this.sessions.delete(clientId);
      this.emit("session:closed", session);
    }
  }

  // ── Outbound helpers (for QueryEngine / Coordinator to call) ──────────────

  /** Send an assistant text chunk to all connected clients */
  streamAssistant(chunk: string, queryId: string): void {
    this.transport.queueOutbound({
      type: "assistant",
      payload: {
        event: GATEWAY_EVENT_CHAT_STREAM,
        chunk,
        queryId,
      },
    });
  }

  /** Broadcast tool start event */
  toolStart(toolName: string, args?: unknown): void {
    this.transport.broadcast({
      type: "tool_start",
      payload: {
        event: GATEWAY_EVENT_TOOL_STREAM,
        toolName,
        status: "start",
        data: args,
      },
    });
  }

  /** Broadcast tool end event */
  toolEnd(toolName: string, result?: unknown): void {
    this.transport.broadcast({
      type: "tool_end",
      payload: {
        event: GATEWAY_EVENT_TOOL_STREAM,
        toolName,
        status: "end",
        data: result,
      },
    });
  }

  /** Broadcast turn completion */
  turnComplete(queryId: string, usage?: { tokens: number; costUsd: number }): void {
    this.transport.broadcast({
      type: "result",
      payload: { queryId, usage },
    });
  }

  /** Ask for exec approval — returns a promise that resolves when the client responds */
  async requestExecApproval(opts: {
    toolName: string;
    args: unknown;
    clientId?: string;
    timeoutMs?: number;
  }): Promise<boolean> {
    const requestId = generateSessionId();

    return new Promise((resolve) => {
      const timeout = setTimeout(
        () => {
          this.removeAllListeners(`approval:${requestId}`);
          resolve(false); // timeout = deny
        },
        opts.timeoutMs ?? 30_000,
      );

      this.once(`approval:${requestId}`, (approved: boolean) => {
        clearTimeout(timeout);
        resolve(approved);
      });

      this.transport.broadcast({
        type: "activity",
        payload: {
          event: GATEWAY_EVENT_EXEC_APPROVAL,
          requestId,
          toolName: opts.toolName,
          args: opts.args,
        },
      });
    });
  }

  /** Broadcast health status */
  broadcastHealth(uptime: number, version: string): void {
    this.transport.broadcast({
      type: "activity",
      payload: {
        event: GATEWAY_EVENT_HEALTH,
        uptime,
        version,
      },
    });
  }

  // ── Inbound routing ────────────────────────────────────────────────────────

  private routeInbound(msg: InboundMessage, clientId: string): void {
    const session = this.sessions.get(clientId);
    if (session) session.lastMessageAt = new Date();

    const payload = msg.payload as Record<string, unknown>;
    const event = (payload?.event as string) ?? msg.type;

    if (!isGatewayEventName(event)) {
      // Treat as a raw chat message
      this.emit(GATEWAY_EVENT_CHAT_MESSAGE, {
        event: GATEWAY_EVENT_CHAT_MESSAGE,
        content: typeof payload === "string" ? payload : (String((payload as any)?.content ?? JSON.stringify(payload))),
        sessionId: session?.id ?? clientId,
        role: "user",
      } satisfies GatewayEventPayload, session);
      return;
    }

    this.emit(event, payload, session);
  }

  private routeControlRequest(msg: InboundMessage, clientId: string): void {
    const payload = msg.payload as ControlRequest;
    const session = this.sessions.get(clientId);

    switch (payload?.type) {
      case "interrupt":
        this.emit("control:interrupt", session);
        break;
      case "set_model":
        this.emit("control:set_model", payload.value, session);
        break;
      case "set_permission_mode":
        this.emit("control:set_permission_mode", payload.value, session);
        break;
      case "set_sim_mode":
        this.emit("control:set_sim_mode", payload.value, session);
        break;
      default:
        this.emit("control:unknown", payload, session);
    }
  }

  getTransport(): GatewaySSETransport {
    return this.transport;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

let _idCounter = 0;
function generateSessionId(): string {
  return `sess-${Date.now().toString(36)}-${(_idCounter++).toString(36)}`;
}
