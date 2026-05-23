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
import { hydrateSecretsFromBitwarden } from "./secrets/bitwarden.js";

// Pull secrets from Bitwarden Secrets Manager when configured (no-op otherwise).
// Existing env vars always win, so `bws run` injection and explicit env take
// precedence over this fallback path.
hydrateSecretsFromBitwarden();

const server = await createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
