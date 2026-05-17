#!/usr/bin/env node

import { SolanaWalletMCPServer } from "./server.js";

async function main(): Promise<void> {
  const server = new SolanaWalletMCPServer();
  const useHttp = process.argv.includes("--http");
  const portArg = process.argv.find((a) => a.startsWith("--port="));
  const port = portArg ? parseInt(portArg.split("=")[1], 10) : 3001;

  try {
    if (useHttp) {
      await server.startHttp(port);
    } else {
      await server.start();
    }
  } catch (err) {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  }
}

main();
