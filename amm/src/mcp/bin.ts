#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAmmMcpServer } from "./server.js";

const server = await createAmmMcpServer();
await server.connect(new StdioServerTransport());
