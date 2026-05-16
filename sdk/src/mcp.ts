/**
 * sdk/src/mcp.ts — MCP client integration for @solanaclawd/sdk
 *
 * Connects to the solana-clawd MCP server and exposes a typed interface
 * for calling MCP tools from the leviathan agent or any SDK consumer.
 */

import type { MCPClientConfig, MCPToolResult } from './types.js';

// ─── MCPClient ────────────────────────────────────────────────────────────────

export class MCPClient {
  private readonly config: Required<MCPClientConfig>;

  constructor(config: MCPClientConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      apiKey: config.apiKey ?? process.env['MCP_API_KEY'] ?? '',
      sessionId: config.sessionId ?? crypto.randomUUID(),
      timeoutMs: config.timeoutMs ?? 30_000,
    };
  }

  /** List all tools available on the MCP server. */
  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: unknown }>> {
    const resp = await this.request('tools/list', {});
    return (resp as { tools: Array<{ name: string; description: string; inputSchema: unknown }> }).tools ?? [];
  }

  /** Call an MCP tool by name and return the structured result. */
  async callTool(name: string, input: Record<string, unknown>): Promise<MCPToolResult> {
    const start = Date.now();
    try {
      const result = await this.request('tools/call', { name, arguments: input });
      return {
        toolName: name,
        input,
        output: result,
        success: true,
        latencyMs: Date.now() - start,
      };
    } catch (e) {
      return {
        toolName: name,
        input,
        output: e instanceof Error ? e.message : String(e),
        success: false,
        latencyMs: Date.now() - start,
      };
    }
  }

  /** Ping the MCP server to check connectivity. */
  async ping(): Promise<boolean> {
    try {
      await this.request('ping', {});
      return true;
    } catch {
      return false;
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Session-Id': this.config.sessionId,
    };
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

    const resp = await fetch(`${this.config.serverUrl}/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!resp.ok) {
      throw new Error(`MCP ${method} → ${resp.status}: ${resp.statusText}`);
    }
    return resp.json();
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create an MCP client connected to the solana-clawd MCP server.
 * Server URL defaults to CONVEX_URL env var or localhost:3001.
 */
export function createMCPClient(config: Partial<MCPClientConfig> = {}): MCPClient {
  const serverUrl =
    config.serverUrl ??
    process.env['MCP_SERVER_URL'] ??
    process.env['CONVEX_URL'] ??
    'http://localhost:3001';
  return new MCPClient({ ...config, serverUrl });
}
