#!/usr/bin/env node
/**
 * solana-clawd MCP Server — HTTP + SSE entrypoint
 * Deploy to Fly.io: fly launch --config MCP/fly.toml
 *
 * No private key, no wallet required.
 * PORT defaults to 3000 (Fly.io sets it automatically).
 * Set MCP_API_KEY to restrict access (optional — leave blank for open).
 */

import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const API_KEY = process.env.MCP_API_KEY;

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!API_KEY || req.path === "/health") return next();
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${API_KEY}`) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

function cors(_req: express.Request, res: express.Response, next: express.NextFunction): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  next();
}

async function main(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use(cors);
  app.use(authMiddleware);
  app.options("*", (_req, res) => res.sendStatus(204));

  app.get("/health", (_req, res) => res.json({
    status: "ok",
    server: "solana-clawd",
    version: "1.0.0",
    auth: API_KEY ? "enabled" : "open",
    docs: "https://github.com/x402agent/solana-clawd",
  }));

  // ── Streamable HTTP ──────────────────────────────────────────────────────
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sid = (req.headers["mcp-session-id"] as string) ?? undefined;
    let t = sid ? transports.get(sid) : undefined;
    if (!t) {
      const s = createServer();
      t = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
      await s.connect(t);
      t.onclose = () => { if (t!.sessionId) transports.delete(t!.sessionId); };
    }
    await t.handleRequest(req, res, req.body);
    if (t.sessionId && !transports.has(t.sessionId)) transports.set(t.sessionId, t);
  });

  app.get("/mcp", async (req, res) => {
    const sid = req.headers["mcp-session-id"] as string | undefined;
    if (!sid || !transports.has(sid)) { res.status(400).json({ error: "Invalid session" }); return; }
    await transports.get(sid)!.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sid = req.headers["mcp-session-id"] as string | undefined;
    if (sid && transports.has(sid)) { await transports.get(sid)!.close(); transports.delete(sid); }
    res.json({ ok: true });
  });

  // ── Legacy SSE ───────────────────────────────────────────────────────────
  const sseTransports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (_req, res) => {
    const s = createServer();
    const t = new SSEServerTransport("/messages", res);
    sseTransports.set(t.sessionId, t);
    t.onclose = () => sseTransports.delete(t.sessionId);
    await s.connect(t);
  });

  app.post("/messages", async (req, res) => {
    const sid = req.query.sessionId as string;
    const t = sseTransports.get(sid);
    if (!t) { res.status(400).json({ error: "Unknown session" }); return; }
    await t.handlePostMessage(req, res, req.body);
  });

  app.listen(PORT, () => {
    console.log(`\n🌊 solana-clawd MCP server on :${PORT}`);
    console.log(`   POST/GET http://0.0.0.0:${PORT}/mcp   (Streamable HTTP)`);
    console.log(`   GET      http://0.0.0.0:${PORT}/sse   (Legacy SSE)`);
    console.log(`   GET      http://0.0.0.0:${PORT}/health`);
    console.log(`   Auth: ${API_KEY ? "Bearer token required" : "open (no MCP_API_KEY set)"}`);
    console.log();
  });
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
