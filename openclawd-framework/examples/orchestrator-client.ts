#!/usr/bin/env npx tsx
/**
 * Orchestrator Client — OpenClawd API Integration Example
 *
 * Demonstrates how to connect to the OpenClawd Orchestrator API
 * for wallet management, agent launching, MCP tool calls, and
 * Metaplex Core asset operations.
 *
 * Run: npx tsx examples/orchestrator-client.ts
 *
 * Requires: Orchestrator running at http://localhost:8787
 * Start with: cd openclawd-stack && pnpm dev:orchestrator
 */

// ── Configuration ──────────────────────────────────────────────────

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://localhost:8787";
const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";

// ── Types ──────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  skills: string[];
}

interface WalletInfo {
  address: string;
  balance_sol: number;
  balance_usdc: number;
  tokens: { mint: string; symbol: string; balance: number }[];
}

interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

// ── API Client ─────────────────────────────────────────────────────

class OpenClawdClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request(path: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (!res.ok) {
      throw new Error(`Orchestrator ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  setToken(token: string) { this.token = token; }

  // Health
  async health() { return this.request("/healthz"); }

  // Auth
  async getMe() { return this.request("/api/v1/me"); }

  // Agents
  async listAgents(): Promise<{ agents: Agent[] }> {
    return this.request("/api/v1/agents");
  }

  async launchAgent(agentId: string, config?: Record<string, any>) {
    return this.request("/api/v1/launch", {
      method: "POST",
      body: JSON.stringify({ agent_id: agentId, ...config }),
    });
  }

  // Wallet
  async getWallets(): Promise<{ wallets: WalletInfo[] }> {
    return this.request("/api/v1/wallet");
  }

  async transfer(to: string, amount: number, mint?: string) {
    return this.request("/api/v1/wallet/transfer", {
      method: "POST",
      body: JSON.stringify({ to, amount, mint: mint || "SOL" }),
    });
  }

  // MCP Tools
  async listMCPTools(): Promise<{ tools: MCPTool[] }> {
    return this.request("/api/v1/mcp/tools");
  }

  async callMCPTool(toolName: string, args: Record<string, any> = {}) {
    return this.request("/api/v1/mcp/call", {
      method: "POST",
      body: JSON.stringify({ tool: toolName, arguments: args }),
    });
  }

  // Metaplex
  async mintAgentAsset(name: string, uri: string) {
    return this.request("/api/v1/metaplex/mint", {
      method: "POST",
      body: JSON.stringify({ name, uri }),
    });
  }

  async readAsset(assetId: string) {
    return this.request(`/api/v1/metaplex/read/${assetId}`);
  }

  async launchToken(name: string, symbol: string, metadata: Record<string, any>) {
    return this.request("/api/v1/metaplex/launch-token", {
      method: "POST",
      body: JSON.stringify({ name, symbol, metadata }),
    });
  }

  async getLobsterAgents() {
    return this.request("/api/v1/metaplex/lobster-agents");
  }

  async executeTrade(mint: string, side: "buy" | "sell", amount: number) {
    return this.request("/api/v1/metaplex/trade", {
      method: "POST",
      body: JSON.stringify({ mint, side, amount }),
    });
  }
}

// ── Demo Functions ─────────────────────────────────────────────────

async function demoHealthCheck(client: OpenClawdClient) {
  console.log("\n━━━ 🏥 Health Check ━━━\n");
  try {
    const health = await client.health();
    console.log(`  Status: ${health.status || "ok"}`);
    console.log(`  Orchestrator: ${ORCHESTRATOR_URL}`);
    console.log("  ✅ Connected!\n");
  } catch {
    console.log("  ⚠️  Orchestrator not running. Start with:");
    console.log("     cd openclawd-stack && pnpm dev:orchestrator\n");
    return false;
  }
  return true;
}

async function demoAgentCatalog(client: OpenClawdClient) {
  console.log("━━━ 🤖 Agent Catalog ━━━\n");
  try {
    const { agents } = await client.listAgents();
    console.log(`  Total agents: ${agents.length}\n`);

    // Group by category
    const categories: Record<string, Agent[]> = {};
    for (const agent of agents) {
      const cat = agent.category || "other";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(agent);
    }

    for (const [cat, catAgents] of Object.entries(categories)) {
      console.log(`  ${cat.toUpperCase()} (${catAgents.length}):`);
      for (const agent of catAgents.slice(0, 3)) {
        console.log(`    • ${agent.name}: ${agent.description?.slice(0, 60)}...`);
      }
      if (catAgents.length > 3) console.log(`    ... and ${catAgents.length - 3} more`);
      console.log("");
    }
  } catch (e: any) {
    console.log(`  ⚠️  ${e.message}\n`);
  }
}

async function demoMCPTools(client: OpenClawdClient) {
  console.log("━━━ 🔧 MCP Tools ━━━\n");
  try {
    const { tools } = await client.listMCPTools();
    console.log(`  Available tools: ${tools.length}\n`);
    for (const tool of tools.slice(0, 10)) {
      console.log(`  🔧 ${tool.name}`);
      console.log(`     ${tool.description?.slice(0, 80)}`);
    }
    if (tools.length > 10) console.log(`\n  ... and ${tools.length - 10} more tools`);
    console.log("");
  } catch (e: any) {
    console.log(`  ⚠️  ${e.message}\n`);
  }
}

async function demoWallet(client: OpenClawdClient) {
  console.log("━━━ 💰 Wallet ━━━\n");
  try {
    const { wallets } = await client.getWallets();
    for (const w of wallets) {
      console.log(`  Address: ${w.address}`);
      console.log(`  SOL: ${w.balance_sol}`);
      console.log(`  USDC: ${w.balance_usdc}`);
      if (w.tokens?.length > 0) {
        console.log("  Tokens:");
        for (const t of w.tokens) {
          console.log(`    ${t.symbol}: ${t.balance} (${t.mint})`);
        }
      }
      console.log("");
    }
  } catch (e: any) {
    console.log(`  ⚠️  ${e.message}\n`);
  }
}

async function demoLobsterAgents(client: OpenClawdClient) {
  console.log("━━━ 🦞 Lobster Agents (pump.fun) ━━━\n");
  try {
    const data = await client.getLobsterAgents();
    const agents = data.agents || data;
    console.log(`  Lobster agents with pump.fun integration:\n`);
    for (const agent of Array.isArray(agents) ? agents.slice(0, 5) : []) {
      console.log(`    🦞 ${agent.name || agent.id}`);
      console.log(`       Specialty: ${agent.specialty || "trading"}`);
      console.log(`       Programs: Pump, Mayhem, Metaplex`);
    }
    console.log("");
  } catch (e: any) {
    console.log(`  ⚠️  ${e.message}\n`);
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     🦞 OpenClawd Orchestrator Client — Integration Demo     ║");
  console.log("║     $CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const client = new OpenClawdClient(ORCHESTRATOR_URL);

  // Health check — bail if orchestrator not running
  const alive = await demoHealthCheck(client);
  if (!alive) {
    console.log("🦞 Start the orchestrator first, then re-run this example.");
    return;
  }

  // Run all demos
  await demoAgentCatalog(client);
  await demoMCPTools(client);
  await demoWallet(client);
  await demoLobsterAgents(client);

  console.log("🦞 Orchestrator client demo complete!");
  console.log("   Docs: openclawd-stack/orchestrator/README.md");
  console.log("   API:  http://localhost:8787/healthz");
}

main().catch(console.error);