import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseArgs } from "util";

type AgentRecord = {
  id: string;
  name: string;
  role: string;
  chains: string[];
  settlement: string[];
};

type MerchantProduct = {
  id: string;
  title: string;
  category: string;
  description: string;
  price: { amount: string; asset: string };
  protocols: string[];
  merchantPath: string;
  digital: boolean;
  googleMerchant?: Record<string, string | boolean>;
};

type Catalog = {
  protocols: string[];
  supportedChains: string[];
  merchant: {
    id: string;
    name: string;
    domain: string;
    storefrontPath: string;
    checkoutPath: string;
    brandColor: string;
    contactEmail: string;
    googleMerchant?: Record<string, unknown>;
  };
  categories: Array<{ id: string; label: string; description: string }>;
  featuredOffers: Array<{ id: string; category: string; label: string; protocol: string; price: string }>;
  products: MerchantProduct[];
};

type Registry = {
  store: {
    id: string;
    name: string;
    symbol: string;
    operator: string;
    description: string;
  };
  admission: {
    allow: string[];
    deny: string[];
  };
  agents: AgentRecord[];
};

type RuntimeProfile = {
  lane: string;
  objective: string;
  sandbox: string;
  cadence: string;
  prompt: string;
  command: string;
  healthcheck: string;
  dependencies: string[];
  owns: string[];
};

const ROOT = new URL(".", import.meta.url);
const REGISTRY_PATH = new URL("./agents.json", ROOT);
const CATALOG_PATH = new URL("./catalog.json", ROOT);

function loadJson<T>(url: URL): T {
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

function requireAgent(registry: Registry, id: string): AgentRecord {
  const normalized = normalizeId(id);
  if (registry.admission.deny.includes(normalized)) {
    throw new Error(`agent '${normalized}' is explicitly denied by store policy`);
  }
  if (!registry.admission.allow.includes(normalized)) {
    throw new Error(`agent '${normalized}' is not on the autonomous store allowlist`);
  }
  const agent = registry.agents.find((entry) => entry.id === normalized);
  if (!agent) {
    throw new Error(`agent '${normalized}' is allowed but missing from registry`);
  }
  return agent;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function agentPrompt(agent: AgentRecord, catalog: Catalog): string {
  const offers = catalog.featuredOffers.map((offer) => `${offer.label} (${offer.price} via ${offer.protocol})`).join("; ");
  switch (agent.id) {
    case "clawd":
      return `Operate the OpenClawd merchant store 24/7 as the master orchestrator. Keep the storefront live, coordinate admitted agents, route high-intent buyers, and escalate payment or policy issues to HERMES. Featured offers: ${offers}.`;
    case "ralph":
      return `Operate as Dark Ralph inside the merchant fleet. Continuously produce paid Solana intelligence, monitor OODA opportunities, and package trade signals as premium store inventory without taking custody of funds.`;
    case "dexter":
      return `Operate as Dexter, the merchant checkout executor. Convert buyer intent into x402, MPP, AP2, and Solana Pay purchase flows; guard against malformed checkout sessions; and keep the checkout lane conversion-focused.`;
    case "eliza":
      return `Operate as Eliza, the always-on customer success and concierge agent. Triage pre-sales and post-sale questions, route product discovery, and hand buyers to Dexter when they are ready to transact.`;
    case "hermes":
      return `Operate as HERMES x402, the payment, compliance, and facilitator control plane. Supervise pay.sh-compatible settlement, gateway health, pricing policy, and confidential relay posture across the entire merchant fleet.`;
    default:
      return `Join the Universal Autonomous Commerce store and support the merchant fleet.`;
  }
}

function runtimeProfile(agent: AgentRecord, manifestPath: string): RuntimeProfile {
  switch (agent.id) {
    case "clawd":
      return {
        lane: "control-plane",
        objective: "Global store orchestration, agent routing, and cross-lane escalation.",
        sandbox: "pay-sandbox",
        cadence: "continuous",
        prompt: "Store orchestrator",
        command: `pay --sandbox clawd "Load ${manifestPath} and run the Universal Autonomous Commerce control plane as Clawd."`,
        healthcheck: "store manifest can be loaded and routes are assigned",
        dependencies: ["gateway", "facilitator", "customer-success", "checkout"],
        owns: ["merchant routing", "session coordination", "cross-agent escalation"],
      };
    case "ralph":
      return {
        lane: "market-intelligence",
        objective: "Generate premium Solana signal inventory and dark DeFi research products.",
        sandbox: "node-process",
        cadence: "250ms ticks",
        prompt: "OODA operator",
        command: "npm run ooda:fast",
        healthcheck: "ooda loop continues writing ticks without fatal errors",
        dependencies: ["control-plane"],
        owns: ["signal packs", "trading briefs", "inventory freshness"],
      };
    case "dexter":
      return {
        lane: "checkout",
        objective: "Run the programmable buyer checkout lane and convert intent into paid sessions.",
        sandbox: "pay-sandbox",
        cadence: "continuous",
        prompt: "Checkout executor",
        command: `pay --sandbox clawd "Load ${manifestPath} and run Dexter checkout operations for the autonomous merchant store."`,
        healthcheck: "checkout sessions can be opened and quoted",
        dependencies: ["gateway", "facilitator", "control-plane"],
        owns: ["quotes", "checkout", "merchant session execution"],
      };
    case "eliza":
      return {
        lane: "customer-success",
        objective: "Provide 24/7 concierge support, FAQs, routing, and white-glove product discovery.",
        sandbox: "pay-sandbox",
        cadence: "continuous",
        prompt: "Customer success concierge",
        command: `pay --sandbox clawd "Load ${manifestPath} and run Eliza concierge operations for the autonomous merchant store."`,
        healthcheck: "customer intents are triaged and handed to the correct lane",
        dependencies: ["control-plane"],
        owns: ["customer support", "intake", "handoffs"],
      };
    case "hermes":
      return {
        lane: "payments",
        objective: "Own facilitator health, pricing policy, x402/MPP settlement, and sandbox payment posture.",
        sandbox: "pay-sandbox",
        cadence: "continuous",
        prompt: "Payments and facilitator supervisor",
        command: `pay --sandbox clawd "Load ${manifestPath} and run HERMES payment, facilitator, and policy supervision for the autonomous merchant store."`,
        healthcheck: "payment protocols are advertised and settlement is healthy",
        dependencies: ["gateway", "facilitator"],
        owns: ["payment policy", "settlement", "facilitator escalation"],
      };
    default:
      return {
        lane: "general",
        objective: "Support the store.",
        sandbox: "pay-sandbox",
        cadence: "continuous",
        prompt: "General support agent",
        command: `pay --sandbox clawd "Load ${manifestPath} and support the autonomous merchant store."`,
        healthcheck: "agent remains responsive",
        dependencies: ["control-plane"],
        owns: ["general support"],
      };
  }
}

function buildManifest(registry: Registry, agents: AgentRecord[], catalog: Catalog) {
  const chains = unique(agents.flatMap((agent) => agent.chains));
  const protocols = unique(agents.flatMap((agent) => agent.settlement));

  return {
    manifestVersion: "2.0",
    id: registry.store.id,
    name: registry.store.name,
    description: registry.store.description,
    operator: registry.store.operator,
    symbol: registry.store.symbol,
    merchant: catalog.merchant,
    commerce: {
      mode: "autonomous",
      serviceTier: "24x7x365",
      supportedChains: unique([...chains, ...catalog.supportedChains]),
      protocols: unique([...protocols, ...catalog.protocols]),
      paymentGateway: process.env.PAYSH_ENDPOINT ?? "https://pay.sh",
      settlementAsset: "USDC",
      confidentialRelay: true,
      facilitator: {
        gatewayRoute: "/facilitator/*",
        workerEntry: "x402/worker/src/index.ts",
        paymentDebugger: "payments/pay-main/pdb",
      },
      agentToAgent: {
        protocol: "google-a2a",
        endpoint: "/a2a/:id",
        settlement: ["x402", "mpp", "ap2", "paysh"],
      },
      privacyEdge: {
        provider: "apigee",
        proxyBundle: "payments/agent-store/apigee/apiproxy",
        ingress: "private-service-connect",
        perimeter: "vpc-service-controls",
        auth: ["VerifyAPIKey", "OAuthV2/JWT", "mTLS"],
        debugMasking: true,
        privateVariablesPrefix: "private.",
      },
      tokenEconomy: {
        symbol: "$CLAWD",
        mint: "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump",
        settlement: "USDC first, CLAWD amplified",
        utility: [
          "rebates for autonomous buyers and operator accounts",
          "priority routing for CLAWD-aligned agents",
          "buyback and treasury flywheel from paid agent work",
        ],
        truandBreed: {
          class: "truand",
          definition: "A keep-alive sandbox agent that earns USDC, keeps a CLAWD-denominated reputation, and autonomously maintains a merchant lane.",
          chargeModel: "x402 metered services with CLAWD-aware fee modifiers",
        },
      },
    },
    policy: {
      allowAgents: registry.admission.allow,
      denyAgents: registry.admission.deny,
      oneDeniedAgentExplicitlyBlocked: "zerobro",
      runtimeRules: [
        "all customer and merchant traffic is routed through admitted agents only",
        "payment-signing remains in pay sandbox or approved wallet flows",
        "HERMES owns payment escalation and facilitator health",
        "Apigee is the mandatory ingress for production northbound traffic",
        "trace/debug sessions must use debug masking and private.* variables for secrets",
      ],
    },
    topology: {
      zones: [
        {
          id: "storefront",
          title: "Storefront",
          responsibilities: ["product discovery", "customer support", "buyer routing"],
          agents: agents.filter((agent) => ["clawd", "eliza"].includes(agent.id)).map((agent) => agent.id),
        },
        {
          id: "commerce",
          title: "Checkout and Fulfillment",
          responsibilities: ["quotes", "checkout", "digital delivery", "A2A checkout"],
          agents: agents.filter((agent) => ["clawd", "dexter"].includes(agent.id)).map((agent) => agent.id),
        },
        {
          id: "payments",
          title: "Payment Control Plane",
          responsibilities: ["facilitator", "x402", "MPP", "AP2", "Solana Pay"],
          agents: agents.filter((agent) => ["hermes"].includes(agent.id)).map((agent) => agent.id),
        },
        {
          id: "research",
          title: "Premium Inventory Generation",
          responsibilities: ["dark DeFi research", "signal generation", "inventory refresh"],
          agents: agents.filter((agent) => ["ralph"].includes(agent.id)).map((agent) => agent.id),
        },
      ],
      sites: [
        { id: "apigee-edge", type: "private-api-proxy", path: "payments/agent-store/apigee/apiproxy" },
        { id: "gateway", type: "cloudflare-worker", path: "x402/worker/src/index.ts" },
        { id: "facilitator", type: "embedded-facilitator", path: "payments/pay-main/pdb/api/index.ts" },
        { id: "merchant-store", type: "manifest", path: "payments/agent-store/generated/openclawd.agent-store.json" },
      ],
      workflows: [
        "customer -> apigee -> eliza -> clawd -> dexter -> hermes -> facilitator",
        "agent buyer -> gateway /a2a -> hermes settlement -> dexter fulfillment",
        "ralph premium inventory -> catalog offer -> clawd storefront routing",
      ],
    },
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      chains: agent.chains,
      settlement: agent.settlement,
      runtime: runtimeProfile(agent, "./generated/openclawd.agent-store.json"),
      prompt: agentPrompt(agent, catalog),
    })),
    categories: catalog.categories,
    featuredOffers: catalog.featuredOffers,
    products: catalog.products,
  };
}

function ensureOutputDir(...segments: string[]): string {
  const dir = join(ROOT.pathname, "generated", ...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function buildSession(
  registry: Registry,
  catalog: Catalog,
  agents: AgentRecord[],
  manifestPath: string,
  sessionId: string,
) {
  const fleet = agents.map((agent) => {
    const runtime = runtimeProfile(agent, manifestPath);
    return {
      id: `${sessionId}:${agent.id}`,
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      lane: runtime.lane,
      sandbox: runtime.sandbox,
      cadence: runtime.cadence,
      objective: runtime.objective,
      command: runtime.command,
      prompt: agentPrompt(agent, catalog),
      healthcheck: runtime.healthcheck,
      dependencies: runtime.dependencies,
      owns: runtime.owns,
    };
  });

  return {
    sessionId,
    createdAt: new Date().toISOString(),
    manifest: manifestPath,
    store: registry.store,
    merchant: catalog.merchant,
    payCommand: "pay --sandbox clawd",
    supervisor: {
      mode: "multi-agent-autonomous-merchant",
      uptimeObjective: "24/7/365",
      deniedAgents: registry.admission.deny,
      settlement: ["x402", "mpp", "solana-pay", "ap2", "paysh"],
    },
    infrastructure: [
      {
        id: "apigee",
        description: "Private Apigee API edge with key enforcement, masking, and confidential ingress",
        command: "Deploy payments/agent-store/apigee/apiproxy to an Apigee environment with PSC + VPC Service Controls",
        healthcheck: "proxy responds only through approved private ingress and authorized apps",
      },
      {
        id: "gateway",
        description: "Cloudflare Worker x402/MPP/AP2/A2A gateway",
        command: "cd x402/worker && npm install && npx wrangler dev",
        healthcheck: "GET /health returns ok=true",
      },
      {
        id: "facilitator",
        description: "Embedded payment debugger and local facilitator",
        command: "cd payments/pay-main/pdb && npm install && npm run dev",
        healthcheck: "GET /facilitator/supported returns protocol metadata",
      },
      {
        id: "store-manifest",
        description: "Generated merchant contract for the entire fleet",
        command: "npm run agent-store:manifest",
        healthcheck: "generated manifest is present and current",
      },
    ],
    fleet,
    handoffs: [
      "eliza -> clawd for high-intent or complex customer requests",
      "clawd -> dexter when a buyer is ready for checkout or fulfillment",
      "dexter -> hermes when a payment, protocol, or compliance edge case occurs",
      "hermes -> gateway/facilitator when settlement plumbing needs intervention",
      "apigee -> hermes when auth, quota, masking, or perimeter controls fail",
    ],
    prompt: "Run the OpenClawd autonomous merchant store with admitted agents only, maintain storefront uptime, and coordinate x402, MPP, AP2, pay.sh, and Solana Pay settlement.",
  };
}

function printLaunchPlan(session: ReturnType<typeof buildSession>): void {
  console.log(`session: ${session.sessionId}`);
  console.log(`manifest: ${session.manifest}`);
  console.log("infrastructure:");
  for (const service of session.infrastructure) {
    console.log(`- ${service.id}: ${service.command}`);
  }
  console.log("fleet:");
  for (const worker of session.fleet) {
    console.log(`- ${worker.agentId} [${worker.lane}]: ${worker.command}`);
  }
}

function selectAgents(registry: Registry, agentIds: string[]): AgentRecord[] {
  if (agentIds.length === 0) {
    return registry.admission.allow.map((id) => requireAgent(registry, id));
  }
  return agentIds.map((id) => requireAgent(registry, id));
}

function cmdList(): number {
  const registry = loadJson<Registry>(REGISTRY_PATH);
  const catalog = loadJson<Catalog>(CATALOG_PATH);

  console.log(`${registry.store.name}`);
  console.log(`operator: ${registry.store.operator}`);
  console.log(`merchant: ${catalog.merchant.name} (${catalog.merchant.domain})`);
  console.log(`allowed agents: ${registry.admission.allow.join(", ")}`);
  console.log(`denied agents: ${registry.admission.deny.join(", ")}`);
  console.log(`protocols: ${catalog.protocols.join(", ")}`);
  console.log("");
  console.log("featured offers:");
  for (const offer of catalog.featuredOffers) {
    console.log(`- ${offer.label} · ${offer.price} · ${offer.protocol}`);
  }
  console.log("");
  console.log("fleet lanes:");
  for (const agent of registry.agents) {
    const runtime = runtimeProfile(agent, "./generated/openclawd.agent-store.json");
    console.log(`- ${agent.id}: ${runtime.lane} · ${runtime.objective}`);
  }
  return 0;
}

function cmdManifest(agentIds: string[]): number {
  const registry = loadJson<Registry>(REGISTRY_PATH);
  const catalog = loadJson<Catalog>(CATALOG_PATH);
  const selected = selectAgents(registry, agentIds);
  const manifest = buildManifest(registry, selected, catalog);
  const outputDir = ensureOutputDir();
  const outputPath = join(outputDir, "openclawd.agent-store.json");
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(outputPath);
  return 0;
}

function cmdJoin(agentIds: string[]): number {
  const registry = loadJson<Registry>(REGISTRY_PATH);
  const catalog = loadJson<Catalog>(CATALOG_PATH);
  const selected = selectAgents(registry, agentIds);
  const manifest = buildManifest(registry, selected, catalog);
  console.log(JSON.stringify(manifest, null, 2));
  return 0;
}

function cmdLaunch(agentIds: string[]): number {
  const registry = loadJson<Registry>(REGISTRY_PATH);
  const catalog = loadJson<Catalog>(CATALOG_PATH);
  const selected = selectAgents(registry, agentIds);
  const manifest = buildManifest(registry, selected, catalog);

  const outputDir = ensureOutputDir();
  const manifestPath = join(outputDir, "openclawd.agent-store.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const sessionId = `store-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-")}`;
  const session = buildSession(registry, catalog, selected, manifestPath, sessionId);

  const sessionDir = ensureOutputDir("sessions");
  const sessionPath = join(sessionDir, `${sessionId}.json`);
  writeFileSync(sessionPath, JSON.stringify(session, null, 2));

  printLaunchPlan(session);
  console.log(`session_file: ${sessionPath}`);
  return 0;
}

function main(): number {
  const { positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
  });

  const [command = "list", ...rest] = positionals;

  switch (command) {
    case "list":
      return cmdList();
    case "manifest":
      return cmdManifest(rest);
    case "join":
      return cmdJoin(rest);
    case "launch":
      return cmdLaunch(rest);
    default:
      console.error(`unknown command: ${command}`);
      return 1;
  }
}

process.exit(main());
