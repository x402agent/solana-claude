#!/usr/bin/env npx tsx
/**
 * x402 Payment Demo — @openclawd/agents-x402 Integration
 *
 * Demonstrates the full x402 payment protocol for agent-to-agent
 * monetization on Solana:
 *   - Core: createClawdX402Client — fetch wrapper for paid APIs
 *   - HTTP: middleware for Node/Workers/Hono/Express (402 → pay → forward)
 *   - MCP: paid tool registration for MCP servers
 *   - Slug configuration and pricing
 *
 * Run: npx tsx examples/x402-payment-demo.ts
 *
 * Requires: @openclawd/agents-x402 (packages/agents-x402-solana)
 */

// ── Configuration ──────────────────────────────────────────────────

const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";
const FACILITATOR_URL = "https://clawdrouter.fly.dev";

// ── Types (mirroring the package) ──────────────────────────────────

type SolanaNetwork = "solana-mainnet" | "solana-devnet";

interface SlugConfig {
  slug: string;
  label: string;
  description: string;
  price: { amount: string; network: SolanaNetwork };
}

// ── Demo: Core Client ──────────────────────────────────────────────

function demoCoreClient() {
  console.log("\n━━━ 💳 Core: createClawdX402Client ━━━\n");

  console.log("  The core client wraps fetch() with automatic 402 payment handling:");
  console.log(`
    import { createClawdX402Client } from "@openclawd/agents-x402";

    const client = createClawdX402Client({
      facilitatorUrl: "${FACILITATOR_URL}",
      wallet: agentWallet,      // Solana signer
      network: "solana-mainnet",
    });

    // Call a paid API — handles 402 → pay → retry automatically
    const response = await client.fetch("https://api.example.com/premium-data", {
      headers: { "X-Price": "0.01" },  // max willing to pay
    });

    const data = await response.json();
    console.log("Paid and received:", data);
  `);

  console.log("  Payment Flow:");
  console.log("    1. Agent calls fetch() on a paid endpoint");
  console.log("    2. Server returns 402 with X-Payment-Required header");
  console.log("    3. Client resolves the slug from the facilitator");
  console.log("    4. Client signs a USDC transfer on Solana");
  console.log("    5. Client retries with X-Payment receipt header");
  console.log("    6. Server verifies payment via facilitator and returns data");
}

// ── Demo: HTTP Middleware ──────────────────────────────────────────

function demoHTTPMiddleware() {
  console.log("\n━━━ 🌐 HTTP Middleware — 402 Payment Gates ━━━\n");

  console.log("  Hono / Cloudflare Workers:");
  console.log(`
    import { http } from "@openclawd/agents-x402/http";
    import { Hono } from "hono";

    const app = new Hono();

    // Protect any route with a payment gate
    app.get("/api/premium",
      http.pay({
        slug: "premium-data-feed",
        price: "0.01",        // $0.01 USDC
        network: "solana-mainnet",
        facilitatorUrl: "${FACILITATOR_URL}",
      }),
      (c) => c.json({ data: "premium market intelligence" })
    );

    // Free route (no payment needed)
    app.get("/api/free", (c) => c.json({ data: "public data" }));
  `);

  console.log("  Express / Node:");
  console.log(`
    import { http } from "@openclawd/agents-x402/http";
    import express from "express";

    const app = express();

    // Gate an endpoint behind x402 payment
    app.get("/api/alpha",
      http.pay({
        slug: "alpha-signals",
        price: "0.05",
        network: "solana-mainnet",
        facilitatorUrl: "${FACILITATOR_URL}",
      }),
      (req, res) => res.json({ alpha: "early token signal" })
    );
  `);

  console.log("  How It Works:");
  console.log("    • No payment → returns 402 with payment instructions");
  console.log("    • Valid X-Payment header → verifies on-chain → forwards");
  console.log("    • Invalid payment → returns 402 again");
}

// ── Demo: MCP Paid Tools ──────────────────────────────────────────

function demoMCPPaidTools() {
  console.log("\n━━━ 🔧 MCP: Paid Tool Registration ━━━\n");

  console.log("  Register paid tools on an MCP server:");
  console.log(`
    import { mcp } from "@openclawd/agents-x402/mcp";
    import { Server } from "@modelcontextprotocol/sdk";

    const server = new Server({ name: "clawd-research", version: "1.0.0" });

    // Register a paid tool — callers must pay before using it
    mcp.registerPaidTool(server, {
      name: "deep_chain_analysis",
      description: "Deep on-chain analysis for any Solana token",
      price: "0.02",           // $0.02 USDC per call
      network: "solana-mainnet",
      facilitatorUrl: "${FACILITATOR_URL}",
      inputSchema: {
        type: "object",
        properties: {
          token_mint: { type: "string", description: "Token mint address" },
          depth: { type: "string", enum: ["quick", "full"] },
        },
        required: ["token_mint"],
      },
      handler: async (input) => {
        // This only runs after payment is verified
        return {
          token: input.token_mint,
          holders: 1234,
          topWallets: ["..."],
          volume24h: "$1.2M",
          graduationProbability: "78%",
        };
      },
    });

    // Another paid tool — more expensive
    mcp.registerPaidTool(server, {
      name: "alpha_scan",
      description: "Real-time alpha detection across DEXes",
      price: "0.10",           // $0.10 USDC per call
      network: "solana-mainnet",
      facilitatorUrl: "${FACILITATOR_URL}",
      inputSchema: {
        type: "object",
        properties: {
          timeframe: { type: "string", enum: ["1h", "6h", "24h"] },
        },
      },
      handler: async (input) => {
        return { signals: [], timestamp: Date.now() };
      },
    });
  `);

  console.log("  Pricing Tiers:");
  console.log("    • Quick lookup:   $0.001 USDC");
  console.log("    • Chain analysis: $0.02 USDC");
  console.log("    • Alpha scan:     $0.10 USDC");
  console.log("    • Full report:    $0.50 USDC");
}

// ── Demo: Slug Configuration ───────────────────────────────────────

function demoSlugConfig() {
  console.log("\n━━━ 🏷️  Slug Configuration ━━━\n");

  const slugs: SlugConfig[] = [
    {
      slug: "premium-data-feed",
      label: "Premium Data Feed",
      description: "Real-time market data from multiple DEX aggregators",
      price: { amount: "0.01", network: "solana-mainnet" },
    },
    {
      slug: "deep-chain-analysis",
      label: "Deep Chain Analysis",
      description: "Full on-chain analysis for any Solana token with holder distribution",
      price: { amount: "0.02", network: "solana-mainnet" },
    },
    {
      slug: "alpha-signals",
      label: "Alpha Signal Detection",
      description: "AI-powered early token detection across social and on-chain data",
      price: { amount: "0.05", network: "solana-mainnet" },
    },
    {
      slug: "agent-research-report",
      label: "Agent Research Report",
      description: "Karpathy-style self-improving research with learn/share/calibrate",
      price: { amount: "0.10", network: "solana-mainnet" },
    },
  ];

  console.log("  Registered Payment Slugs:\n");
  for (const s of slugs) {
    console.log(`  💲 ${s.label}`);
    console.log(`     Slug:  ${s.slug}`);
    console.log(`     Price: $${s.price.amount} USDC (${s.price.network})`);
    console.log(`     Desc:  ${s.description}`);
    console.log("");
  }
}

// ── Demo: Integration with Clawd Wallet ────────────────────────────

function demoWalletIntegration() {
  console.log("━━━ 🔗 x402 + @openclawd/wallet Integration ━━━\n");

  console.log("  Full agent-to-agent payment flow:");
  console.log(`
    import { createClawdX402Client } from "@openclawd/agents-x402";
    import { AgenticWallet } from "@openclawd/wallet";

    // 1. Set up the agentic wallet
    const agent = new AgenticWallet(privyWallet, {
      privyAppId: process.env.PRIVY_APP_ID!,
      grokApiKey: process.env.XAI_API_KEY,
      permissions: { swap: "allow", transfer: "allow", ...DEFAULT_PERMISSIONS },
    });

    // 2. Create an x402 client backed by the agent wallet
    const x402 = createClawdX402Client({
      facilitatorUrl: "${FACILITATOR_URL}",
      wallet: agent.wallet,
      network: "solana-mainnet",
    });

    // 3. Call paid research APIs — wallet handles payments
    const research = await x402.fetch(
      "https://research.openclawd.com/api/v1/research/chain",
      {
        method: "POST",
        headers: { "X-Price": "0.02" },
        body: JSON.stringify({ query: "pump.fun graduation scan" }),
      }
    );

    console.log("Research result:", await research.json());

    // 4. Check transaction history
    console.log(agent.summarizeActivity());
    // "[APPROVED] USDC transfer $0.02 → research.openclawd — 4kTzQm..."
  `);
}

// ── Demo: Facilitator Architecture ─────────────────────────────────

function demoArchitecture() {
  console.log("\n━━━ 🏗️  x402 Architecture ━━━\n");

  console.log(`
  ┌──────────┐     fetch()      ┌──────────────┐    402     ┌──────────────┐
  │  Agent    │ ──────────────→ │  Paid API     │ ────────→ │  Returns     │
  │  (client) │                 │  (server)     │           │  402 + slug  │
  └──────────┘                  └──────────────┘           └──────────────┘
       │                              ↑
       │  pay + retry                 │ verify
       │                              │
       ▼                              │
  ┌──────────┐     settle      ┌──────────────┐
  │  Solana   │ ──────────────→ │  Facilitator  │
  │  Chain    │   USDC tx      │  (Clawd)      │
  └──────────┘                  └──────────────┘

  Flow:
  1. Agent calls paid API endpoint
  2. API returns 402 with payment slug
  3. Client resolves slug via facilitator
  4. Client sends USDC on Solana
  5. Client retries with X-Payment receipt
  6. API verifies via facilitator → returns data
  `);

  console.log("  Key Properties:");
  console.log("    • Stateless — no credentials held by middleware");
  console.log("    • Chain-native — settles USDC on Solana mainnet");
  console.log("    • Multi-tenant — Clawd facilitator handles routing");
  console.log("    • Universal — works in Workers, Deno, Bun, Node");
  console.log("    • MCP-native — paid tools for agent-to-agent calls");
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  🦞 @openclawd/agents-x402 — Agent Payment Protocol Demo ║");
  console.log("║  x402: Agent-to-Agent USDC Payments on Solana               ║");
  console.log("║  $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  demoCoreClient();
  demoHTTPMiddleware();
  demoMCPPaidTools();
  demoSlugConfig();
  demoWalletIntegration();
  demoArchitecture();

  console.log("\n━━━ 📚 Resources ━━━");
  console.log("   Package:     packages/agents-x402-solana/");
  console.log("   NPM:         @openclawd/agents-x402");
  console.log("   Wallet:      packages/clawd-wallet/");
  console.log("   Facilitator: clawdrouter/");
  console.log("   Install:     curl -fsSL solanaclawd.com/install.sh | bash");
  console.log("");
}

main().catch(console.error);