#!/usr/bin/env node
/**
 * solana-clawd MCP Server — STDIO entrypoint
 * For Claude Desktop, Cursor (local), VS Code
 *
 * Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "solana-clawd": {
 *       "command": "node",
 *       "args": ["/absolute/path/to/solana-clawd/MCP/dist/index.js"]
 *     }
 *   }
 * }
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
