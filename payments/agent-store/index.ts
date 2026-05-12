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
  featuredOffers: Array<{ label: string; protocol: string; price: string }>;
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

const ROOT = new URL(".", import.meta.url);
const REGISTRY_PATH = new URL("./agents.json", ROOT);
const CATALOG_PATH = new URL("./catalog.json", ROOT);
const OUTPUT_DIR = new URL("./generated", ROOT);

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

function buildManifest(registry: Registry, agents: AgentRecord[], catalog: Catalog) {
  const chains = [...new Set(agents.flatMap((agent) => agent.chains))];
  const protocols = [...new Set(agents.flatMap((agent) => agent.settlement))];

  return {
    manifestVersion: "1.0",
    id: registry.store.id,
    name: registry.store.name,
    description: registry.store.description,
    operator: registry.store.operator,
    symbol: registry.store.symbol,
    merchant: catalog.merchant,
    commerce: {
      mode: "autonomous",
      supportedChains: [...new Set([...chains, ...catalog.supportedChains])],
      protocols: [...new Set([...protocols, ...catalog.protocols])],
      paymentGateway: process.env.PAYSH_ENDPOINT ?? "https://pay.sh",
      settlementAsset: "USDC",
      confidentialRelay: true
    },
    policy: {
      allowAgents: registry.admission.allow,
      denyAgents: registry.admission.deny,
      oneDeniedAgentExplicitlyBlocked: "zerobro"
    },
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      chains: agent.chains,
      settlement: agent.settlement
    })),
    categories: catalog.categories,
    products: catalog.products
  };
}

function ensureOutputDir(): string {
  const dir = join(ROOT.pathname, "generated");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cmdList(): number {
  const registry = loadJson<Registry>(REGISTRY_PATH);
  const catalog = loadJson<Catalog>(CATALOG_PATH);

  console.log(`${registry.store.name}`);
  console.log(`operator: ${registry.store.operator}`);
  console.log(`merchant: ${catalog.merchant.name} (${catalog.merchant.domain})`);
  console.log(`allowed agents: ${registry.admission.allow.join(", ")}`);
  console.log(`denied agents: ${registry.admission.deny.join(", ")}`);
  console.log("");
  console.log("featured offers:");
  for (const offer of catalog.featuredOffers) {
    console.log(`- ${offer.label} · ${offer.price} · ${offer.protocol}`);
  }
  return 0;
}

function cmdManifest(agentIds: string[]): number {
  const registry = loadJson<Registry>(REGISTRY_PATH);
  const catalog = loadJson<Catalog>(CATALOG_PATH);
  const selected = agentIds.length > 0 ? agentIds.map((id) => requireAgent(registry, id)) : registry.admission.allow.map((id) => requireAgent(registry, id));
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
  const selected = agentIds.map((id) => requireAgent(registry, id));
  const manifest = buildManifest(registry, selected, catalog);
  console.log(JSON.stringify(manifest, null, 2));
  return 0;
}

function main(): number {
  const { positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true
  });

  const [command = "list", ...rest] = positionals;

  switch (command) {
    case "list":
      return cmdList();
    case "manifest":
      return cmdManifest(rest);
    case "join":
      return cmdJoin(rest);
    default:
      console.error(`unknown command: ${command}`);
      return 1;
  }
}

process.exit(main());
