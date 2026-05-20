#!/usr/bin/env node
/**
 * Standalone MCP server binary.
 */

import { startMcpServer } from "./server.js";

startMcpServer().catch((err) => {
  process.stderr.write(`[clawd-perps-aggregator] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
