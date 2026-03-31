/**
 * SolanaOS CLI Layer
 *
 * Adapted from Claude Code's src/cli/ (handlers, transports, print.ts, structuredIO.ts)
 *
 * SolanaOS doesn't use Commander.js or React+Ink — the Go daemon handles the
 * terminal CLI. This layer provides:
 *
 *  - StructuredIO   : NDJSON stdio reader/writer (for headless/SDK mode via the gateway)
 *  - CLIOutput      : Console-friendly formatted output for any TS process
 *  - AutoModeConfig : Rule-based permission auto-approval (adapted from autoMode.ts / yoloClassifier)
 *  - CLITransport   : Connects to the SolanaOS gateway (SSE + POST) from a local TS process
 *  - ExitHandler    : Graceful exit with cleanup
 *
 * Usage:
 *   // In a local TS script or Lambda that needs to talk to SolanaOS headlessly:
 *   const cli = new CLITransport({ gatewayUrl: "http://localhost:8080", token: "..." });
 *   await cli.connect();
 *   const result = await cli.chat("What's BONK trading at?");
 */

import { EventEmitter } from "events";

// ─────────────────────────────────────────────────────────────────────────────
// Auto-mode config (adapted from Claude Code's autoMode.ts / yoloClassifier.ts)
// Controls which tool invocations are auto-approved without user prompt
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoModeRules {
  /** Patterns to auto-allow (no confirmation needed) */
  allow: string[];
  /** Patterns to block (require human confirmation) */
  soft_deny: string[];
  /** Environment context hints for the classifier */
  environment: string[];
}

export const DEFAULT_AUTO_MODE_RULES: AutoModeRules = {
  allow: [
    // Read-only Solana data is always safe
    "solana.price(*)",
    "solana.trending(*)",
    "solana.token_info(*)",
    "solana.search(*)",
    "memory.recall(*)",
    "memory.search(*)",
    "skill.list(*)",
    "task.list(*)",
    // Low-value reads
    "gateway.health(*)",
  ],
  soft_deny: [
    // Anything touching real funds must ask
    "trading.buy(*)",
    "trading.sell(*)",
    "trading.swap(*)",
    "trading.hl_open(*)",
    "trading.hl_close(*)",
    "trading.aster_open(*)",
    "trading.aster_close(*)",
    // Destructive memory ops
    "memory.forget(*)",
    // Shell / computer use
    "bash(*)",
    "computer.shell(*)",
    "browser.navigate(*)",
  ],
  environment: [
    "SolanaOS is a Solana trading and research runtime",
    "All trade operations should be treated with highest caution",
    "Memory reads/writes are generally safe",
    "Research and data gathering operations are always safe",
  ],
};

/** Rule-based (no LLM) auto-mode permission resolver */
export function resolveAutoMode(
  invocation: string,
  rules: AutoModeRules = DEFAULT_AUTO_MODE_RULES,
): "allow" | "deny" | "ask" {
  const lower = invocation.toLowerCase();

  for (const pattern of rules.soft_deny) {
    if (matchGlob(pattern, lower)) return "ask";
  }
  for (const pattern of rules.allow) {
    if (matchGlob(pattern, lower)) return "allow";
  }
  return "ask";
}

function matchGlob(pattern: string, subject: string): boolean {
  const escaped = pattern
    .toLowerCase()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(subject);
}

// ─────────────────────────────────────────────────────────────────────────────
// NDJSON safe stringify (adapted from Claude Code's ndjsonSafeStringify.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stringify a JSON message to a single-line NDJSON string.
 * Throws on circular references or non-serializable values.
 */
export function ndjsonStringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { __type: "Error", message: value.message, stack: value.stack };
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof ArrayBuffer) return { __type: "ArrayBuffer", byteLength: (value as ArrayBuffer).byteLength };
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured IO (adapted from Claude Code's StructuredIO)
// Provides NDJSON stdin reader + stdout writer for headless operation
// ─────────────────────────────────────────────────────────────────────────────

export type StdinMessageType = "user" | "control_request" | "assistant" | "system";
export type StdoutMessageType = "assistant" | "result" | "tool_start" | "tool_end" | "activity" | "error" | "system";

export interface StdinMessage {
  type: StdinMessageType;
  session_id?: string;
  message?: { role: string; content: string | unknown[] };
  request?: {
    subtype: "can_use_tool" | "elicitation";
    tool_name?: string;
    input?: unknown;
    tool_use_id?: string;
  };
  request_id?: string;
}

export interface StdoutMessage {
  type: StdoutMessageType;
  uuid?: string;
  session_id?: string;
  content?: string | unknown;
  usage?: { input_tokens?: number; output_tokens?: number; cost_usd?: number };
}

export class StructuredIO extends EventEmitter {
  private buffer = "";
  private readonly input: NodeJS.ReadableStream;

  constructor(input: NodeJS.ReadableStream = process.stdin) {
    super();
    this.input = input;
    this.start();
  }

  private start(): void {
    this.input.setEncoding("utf-8");
    this.input.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.processBuffer();
    });
    this.input.on("end", () => {
      if (this.buffer.trim()) this.parseLine(this.buffer.trim());
      this.emit("end");
    });
  }

  private processBuffer(): void {
    let newline: number;
    while ((newline = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line) this.parseLine(line);
    }
  }

  private parseLine(line: string): void {
    try {
      const msg = JSON.parse(line) as StdinMessage;
      this.emit("message", msg);
      this.emit(`message:${msg.type}`, msg);
    } catch {
      // Non-JSON line — emit as raw
      this.emit("raw", line);
    }
  }

  write(message: StdoutMessage): void {
    process.stdout.write(ndjsonStringify(message) + "\n");
  }

  writeText(text: string): void {
    this.write({ type: "assistant", content: text });
  }

  writeError(error: string): void {
    this.write({ type: "error", content: error });
  }

  writeResult(opts: { usage?: StdoutMessage["usage"] }): void {
    this.write({ type: "result", usage: opts.usage });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Output (pretty-print for interactive sessions / scripts)
// Adapted from Claude Code's print.ts output helpers
// ─────────────────────────────────────────────────────────────────────────────

export class CLIOutput {
  private verbose: boolean;

  constructor(opts: { verbose?: boolean } = {}) {
    this.verbose = opts.verbose ?? false;
  }

  assistant(text: string): void {
    process.stdout.write(`\n${text}\n`);
  }

  toolStart(toolName: string, args?: unknown): void {
    if (!this.verbose) return;
    const displayArgs = args ? ` ← ${formatArgs(args)}` : "";
    process.stderr.write(`\x1b[36m⚡ ${toolName}${displayArgs}\x1b[0m\n`);
  }

  toolEnd(toolName: string, status: "ok" | "error", duration?: number): void {
    if (!this.verbose) return;
    const icon = status === "ok" ? "✓" : "✗";
    const color = status === "ok" ? "\x1b[32m" : "\x1b[31m";
    const time = duration ? ` (${duration}ms)` : "";
    process.stderr.write(`${color}${icon} ${toolName}${time}\x1b[0m\n`);
  }

  thinking(text: string): void {
    if (!this.verbose) return;
    const truncated = text.length > 200 ? text.slice(0, 200) + "…" : text;
    process.stderr.write(`\x1b[35m[thinking] ${truncated}\x1b[0m\n`);
  }

  error(message: string): void {
    process.stderr.write(`\x1b[31m✗ ${message}\x1b[0m\n`);
  }

  info(message: string): void {
    process.stderr.write(`\x1b[90m${message}\x1b[0m\n`);
  }

  usage(tokens: number, costUsd: number): void {
    process.stderr.write(
      `\x1b[90m[${tokens.toLocaleString()} tokens · $${costUsd.toFixed(4)}]\x1b[0m\n`,
    );
  }
}

function formatArgs(args: unknown): string {
  if (typeof args === "string") return args.slice(0, 80);
  const str = JSON.stringify(args);
  return str.length > 80 ? str.slice(0, 77) + "…" : str;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Transport
// Connects a local TS process to the SolanaOS gateway via SSE + POST
// Adapted from Claude Code's cli/transports/SSETransport.ts + ccrClient.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface CLITransportOptions {
  gatewayUrl: string;
  token?: string;
  surface?: string;
  onChunk?: (chunk: string) => void;
  onToolStart?: (name: string, args?: unknown) => void;
  onToolEnd?: (name: string) => void;
  verbose?: boolean;
}

export type CLIConnectionState = "disconnected" | "connecting" | "connected" | "error";

export class CLITransport extends EventEmitter {
  private opts: CLITransportOptions;
  private state: CLIConnectionState = "disconnected";
  private eventSource: EventSource | null = null;
  private clientId: string;

  constructor(opts: CLITransportOptions) {
    super();
    this.opts = opts;
    this.clientId = `cli-ts-${Date.now().toString(36)}`;
  }

  async connect(): Promise<void> {
    this.state = "connecting";
    this.emit("state", this.state);

    // In Node.js, use fetch with streaming for SSE
    // (EventSource is browser-only; use node-fetch or undici for Node)
    const url = new URL(`${this.opts.gatewayUrl}/api/v1/stream`);
    url.searchParams.set("clientId", this.clientId);
    url.searchParams.set("surface", this.opts.surface ?? "cli");

    // Basic validation
    try {
      await fetch(`${this.opts.gatewayUrl}/api/v1/health`, {
        headers: this.buildHeaders(),
      });
      this.state = "connected";
      this.emit("state", this.state);
    } catch (e) {
      this.state = "error";
      this.emit("state", this.state);
      throw new Error(`Cannot connect to SolanaOS gateway at ${this.opts.gatewayUrl}: ${e}`);
    }
  }

  async chat(prompt: string, opts?: { simMode?: boolean }): Promise<string> {
    const res = await fetch(`${this.opts.gatewayUrl}/api/v1/chat`, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
        clientId: this.clientId,
        simMode: opts?.simMode ?? false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Chat request failed: ${res.status} ${text}`);
    }

    const data = await res.json() as { response?: string; error?: string };
    if (data.error) throw new Error(data.error);
    return data.response ?? "";
  }

  async runAgent(prompt: string, opts?: {
    type?: string;
    simMode?: boolean;
    allowedTools?: string[];
  }): Promise<{ result: string; workerId: string }> {
    const res = await fetch(`${this.opts.gatewayUrl}/api/v1/coordinator/spawn`, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: prompt.slice(0, 80),
        type: opts?.type ?? "general",
        prompt,
        allowedTools: opts?.allowedTools,
      }),
    });

    if (!res.ok) {
      throw new Error(`Agent spawn failed: ${res.status}`);
    }

    return res.json() as Promise<{ result: string; workerId: string }>;
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.state = "disconnected";
    this.emit("state", this.state);
  }

  getState(): CLIConnectionState {
    return this.state;
  }

  private buildHeaders(): Record<string, string> {
    return this.opts.token
      ? { Authorization: `Bearer ${this.opts.token}` }
      : {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exit handler (adapted from Claude Code's cli/exit.ts)
// ─────────────────────────────────────────────────────────────────────────────

const _cleanupHandlers: Array<() => void | Promise<void>> = [];

export function registerCleanup(fn: () => void | Promise<void>): void {
  _cleanupHandlers.push(fn);
}

export async function gracefulExit(code = 0): Promise<never> {
  for (const handler of _cleanupHandlers) {
    try {
      await handler();
    } catch { /* ignore */ }
  }
  process.exit(code);
}

// Register SIGINT/SIGTERM cleanup
process.on("SIGINT", () => void gracefulExit(0));
process.on("SIGTERM", () => void gracefulExit(0));
