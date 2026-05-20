/**
 * Clawd Perps Aggregator — standalone MCP server.
 *
 * Exposes the aggregator's full surface (market data, routing, build/simulate
 * /execute, positions, risk, realtime) as MCP tools over stdio. Drop-in for
 * Claude Desktop, Claude Code, or any MCP client.
 *
 * Run via `clawd-perps-mcp` (bin entry) or
 *   node dist/mcp/bin.js
 *
 * Honours the same env contract as the existing clawd-perps CLI:
 *   IMPERIAL_API_BASE, IMPERIAL_JWT, IMPERIAL_WALLET, IMPERIAL_PROFILE_INDEX,
 *   IMPERIAL_LIVE, IMPERIAL_MAX_SIZE_USD, IMPERIAL_ALLOWED_SYMS, IMPERIAL_SLIPPAGE_BPS,
 *   PERPS_AGG_VENUES, PERPS_AGG_PAPER, PERPS_AGG_HOLD_SECONDS.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { PerpsAggregator } from "../sdk/client.js";
import { buildTools, type McpTool } from "./tools.js";

export interface StartServerOpts {
  aggregator?: PerpsAggregator;
  name?: string;
  version?: string;
}

export async function startMcpServer(opts: StartServerOpts = {}): Promise<void> {
  const agg = opts.aggregator ?? new PerpsAggregator();
  const tools = buildTools(agg);
  const toolMap = new Map<string, McpTool>(tools.map((t) => [t.name, t]));

  const server = new Server(
    {
      name: opts.name ?? "clawd-perps-aggregator",
      version: opts.version ?? "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const tool = toolMap.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `unknown tool: ${name}` }],
      };
    }
    try {
      const result = await tool.handler((req.params.arguments ?? {}) as Record<string, unknown>);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: `error in ${name}: ${msg}` }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr — stdout is reserved for MCP framing.
  process.stderr.write(
    `[clawd-perps-aggregator] MCP server listening on stdio. ${tools.length} tools registered. ` +
      `live=${agg.config.live} paper=${agg.config.paperMode} venues=${Object.keys(agg.adapters).join(",")}\n`,
  );
}
