import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createFallbackConnection, parseEndpoints } from "@nirholas/pump-sdk";
import { registerPromptHandlers } from "./handlers/prompts.js";
import { registerResourceHandlers } from "./handlers/resources.js";
import { registerToolHandlers } from "./handlers/tools.js";
import { MCP_VERSION, type ServerState } from "./types.js";

export class SolanaWalletMCPServer {
  private server: Server;
  private state: ServerState;

  constructor() {
    this.state = {
      initialized: false,
      generatedKeypairs: new Map(),
    };

    this.server = new Server(
      {
        name: "pump-fun-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: false, listChanged: true },
          prompts: { listChanged: true },
        },
      },
    );

    this.registerHandlers();
    this.setupErrorHandling();
  }

  private registerHandlers(): void {
    const getConnection = () => {
      const endpoints = parseEndpoints(
        process.env.SOLANA_RPC_URLS ?? process.env.SOLANA_RPC_URL,
        "https://api.mainnet-beta.solana.com",
      );
      return createFallbackConnection(endpoints, { commitment: "confirmed" });
    };

    registerToolHandlers(this.server, this.state, getConnection);
    registerResourceHandlers(this.server, this.state);
    registerPromptHandlers(this.server, this.state);
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.shutdown();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await this.shutdown();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.state.initialized = true;
    console.error("Pump Fun MCP Server started (stdio)");
    console.error(`Protocol version: ${MCP_VERSION}`);
    console.error(`Tools: 53 (wallet, quoting, trading, fees, analytics, AMM, social, metadata, incentives)`);
  }

  async startHttp(port = 3001): Promise<void> {
    // Stateless mode — each request gets its own transport so the Next.js
    // proxy can call us without maintaining a persistent session.
    const httpServer = createHttpServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        // CORS — allow calls from the Next.js dev server and production origin
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.url === "/health" && req.method === "GET") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, tools: 53 }));
          return;
        }

        if (req.url !== "/mcp") {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        // Parse body for POST
        let body: unknown;
        if (req.method === "POST") {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          try {
            body = JSON.parse(Buffer.concat(chunks).toString());
          } catch {
            res.writeHead(400);
            res.end("Invalid JSON");
            return;
          }
        }

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            console.error(`[MCP HTTP] session ${sessionId}`);
          },
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, body);
      },
    );

    await new Promise<void>((resolve) => httpServer.listen(port, resolve));
    this.state.initialized = true;
    console.error(`Pump Fun MCP Server started (HTTP) on port ${port}`);
    console.error(`Protocol version: ${MCP_VERSION}`);
    console.error(`Endpoint: http://localhost:${port}/mcp`);
  }

  async shutdown(): Promise<void> {
    for (const [, keypair] of this.state.generatedKeypairs) {
      keypair.secretKey.fill(0);
    }
    this.state.generatedKeypairs.clear();
    console.error("Pump Fun MCP Server shutdown — keys zeroized");
  }

  getState(): ServerState {
    return this.state;
  }
}

export function createServer(): SolanaWalletMCPServer {
  return new SolanaWalletMCPServer();
}
