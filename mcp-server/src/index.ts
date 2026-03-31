#!/usr/bin/env node
/**
 * solana-claude MCP Server — STDIO entrypoint
 * For Claude Desktop, Cursor (local), VS Code
 *
 * Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "solana-claude": {
 *       "command": "node",
 *       "args": ["/absolute/path/to/solana-claude/mcp-server/dist/index.js"]
 *     }
 *   }
 * }
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
