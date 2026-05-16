/**
 * sdk/src/mcp.ts — MCP integration for the Solana Clawd SDK
 *
 * Provides a lightweight HTTP client for the solana-clawd MCP server.
 * The MCP server exposes 31 tools (31 capabilities in MCP/src/) over
 * a JSON-RPC / REST interface.
 *
 * This module does NOT depend on the MCP SDK — it speaks raw HTTP so
 * SDK consumers can call MCP tools without extra dependencies.
 *
 * Upstream: https://github.com/x402agent/Solana-Clawd-SDK
 */

import type { MCPClientConfig, MCPToolResult } from './types.js';

// ─── Public interfaces ────────────────────────────────────────────────────────

/** Metadata for a tool exposed by the MCP server. */
export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * A connected MCP client handle.
 * Returned by createMCPClient().
 */
export interface MCPClient {
  /** List all tools available on the MCP server. */
  listTools(): Promise<MCPToolInfo[]>;

  /**
   * Call a tool by name with the given input.
   *
   * @param name  — tool name as returned by listTools()
   * @param input — tool input object
   * @returns MCPToolResult with output, success flag, and latency
   */
  callTool(name: string, input: Record<string, unknown>): Promise<MCPToolResult>;

  /** The resolved config this client was created with. */
  readonly config: Readonly<MCPClientConfig>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create an MCP client connected to the solana-clawd MCP server.
 *
 * The server URL should point to the running MCP instance, e.g.:
 *   http://localhost:3000   (local development)
 *   https://mcp.solanaclawd.com  (production)
 *
 * Authentication: pass apiKey in config or set MCP_API_KEY env var.
 * The key is sent as `Authorization: Bearer <apiKey>`.
 *
 * @example
 *   const mcp = createMCPClient({
 *     serverUrl: 'http://localhost:3000',
 *     apiKey: process.env.MCP_API_KEY,
 *   });
 *   const tools = await mcp.listTools();
 *   const result = await mcp.callTool('solana_balance', { address: '...' });
 */
export function createMCPClient(config: MCPClientConfig): MCPClient {
  const resolvedConfig: Required<MCPClientConfig> = {
    serverUrl: config.serverUrl.replace(/\/$/, ''), // strip trailing slash
    apiKey: config.apiKey ?? process.env['MCP_API_KEY'] ?? '',
    sessionId: config.sessionId ?? `mcp-sdk-${Date.now()}`,
    timeoutMs: config.timeoutMs ?? 30_000,
  };

  function _headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Session-Id': resolvedConfig.sessionId,
    };
    if (resolvedConfig.apiKey) {
      h['Authorization'] = `Bearer ${resolvedConfig.apiKey}`;
    }
    return h;
  }

  async function _post(path: string, body: unknown): Promise<unknown> {
    const url = `${resolvedConfig.serverUrl}${path}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(resolvedConfig.timeoutMs),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new MCPError(`MCP server returned ${resp.status}: ${text}`, resp.status);
    }
    return resp.json();
  }

  async function _get(path: string): Promise<unknown> {
    const url = `${resolvedConfig.serverUrl}${path}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: _headers(),
      signal: AbortSignal.timeout(resolvedConfig.timeoutMs),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new MCPError(`MCP server returned ${resp.status}: ${text}`, resp.status);
    }
    return resp.json();
  }

  const client: MCPClient = {
    config: Object.freeze(resolvedConfig),

    async listTools(): Promise<MCPToolInfo[]> {
      // MCP servers expose tools at /tools (GET) or via JSON-RPC tools/list.
      // We try the REST endpoint first, then fall back to JSON-RPC.
      try {
        const data = await _get('/tools') as { tools?: MCPToolInfo[] } | MCPToolInfo[];
        if (Array.isArray(data)) return data;
        return data.tools ?? [];
      } catch {
        // JSON-RPC fallback: { jsonrpc: '2.0', method: 'tools/list', params: {} }
        const rpc = await _post('/', {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }) as { result?: { tools?: MCPToolInfo[] } };
        return rpc.result?.tools ?? [];
      }
    },

    async callTool(
      name: string,
      input: Record<string, unknown>,
    ): Promise<MCPToolResult> {
      const start = Date.now();
      try {
        // Try REST endpoint: POST /tools/:name
        const data = await _post(`/tools/${encodeURIComponent(name)}`, input);
        return {
          toolName: name,
          input,
          output: data,
          success: true,
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        if (err instanceof MCPError && err.statusCode === 404) {
          // Fall back to JSON-RPC: tools/call
          const rpc = await _post('/', {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: { name, arguments: input },
          }) as {
            result?: { content?: unknown };
            error?: { message: string; code?: number };
          };

          if (rpc.error) {
            return {
              toolName: name,
              input,
              output: { error: rpc.error.message },
              success: false,
              latencyMs: Date.now() - start,
            };
          }

          return {
            toolName: name,
            input,
            output: rpc.result?.content ?? rpc.result,
            success: true,
            latencyMs: Date.now() - start,
          };
        }

        // Re-throw non-404 errors as a failed result (don't crash the caller).
        return {
          toolName: name,
          input,
          output: { error: String(err) },
          success: false,
          latencyMs: Date.now() - start,
        };
      }
    },
  };

  return client;
}

// ─── MCPError ─────────────────────────────────────────────────────────────────

/** Thrown for HTTP-level errors communicating with the MCP server. */
export class MCPError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'MCPError';
    this.statusCode = statusCode;
  }
}
