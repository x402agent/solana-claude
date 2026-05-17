#!/usr/bin/env node
// Aggregates every agent in src/*.json and template in templates/*.template.json
// into a single agents-catalog.json that the /agents page consumes.
//
// Run: node build-catalog.cjs
// Output: agents-catalog.json (sibling of this script)

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, "src");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const OUTPUT = path.join(ROOT, "agents-catalog.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const PUBLIC_API_DIR = path.join(PUBLIC_DIR, "api", "agents");
const PUBLIC_CATALOG_DIR = path.join(PUBLIC_API_DIR, "catalog");
const PUBLIC_TEMPLATES_DIR = path.join(PUBLIC_API_DIR, "templates");
const PUBLIC_REGISTRY_DIR = path.join(PUBLIC_API_DIR, "registry");
const WELL_KNOWN_DIR = path.join(PUBLIC_DIR, ".well-known");
const HOST = "https://www.x402.wtf";
const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
};

function loadAgents() {
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((f) => {
    const raw = readJson(path.join(SRC_DIR, f));
    const id = raw.identifier || path.basename(f, ".json");
    const capabilities = raw.solana?.capabilities || [];
    const metaplexSkills = raw.solana?.metaplexSkills || deriveMetaplexSkills(capabilities, raw.meta?.tags || []);
    const agent = {
      identifier: id,
      title: raw.meta?.title || id,
      description: raw.meta?.description || "",
      avatar: raw.meta?.avatar || "🤖",
      tags: raw.meta?.tags || [],
      category: raw.meta?.category || "defi",
      author: raw.author || "solana-clawd",
      createdAt: raw.createdAt || null,
      oneShot: raw.oneShot === true,
      featured: raw.featured === true,
      openingMessage: raw.config?.openingMessage || null,
      openingQuestions: raw.config?.openingQuestions || [],
      tokenUsage: raw.tokenUsage || null,
      capabilities,
      metaplexSkills,
      payment: raw.payment || null,
      agentToken: raw.agentToken || null,
      // Deploy URLs (consumed by AgentGallery deploy buttons)
      deploy: {
        json: `/api/agents/catalog/${encodeURIComponent(id)}.json`,
        chat: `/agents/chat?agent=${encodeURIComponent(id)}`,
        mint: `/agents/mint?template=${encodeURIComponent(id)}`,
        mcp: `/api/agents/catalog/${encodeURIComponent(id)}.json`,
        registration: `/api/agents/registry/${encodeURIComponent(id)}.json`,
      },
    };
    Object.defineProperty(agent, "sourceFile", { value: f, enumerable: false });
    return agent;
  });
}

// Heuristic: infer Metaplex skill badges from capabilities + tags so older
// agents (without explicit solana.metaplexSkills) still surface correctly.
function deriveMetaplexSkills(capabilities, tags) {
  const skills = new Set();
  const has = (x) => capabilities.includes(x) || tags.includes(x);
  if (has("metaplex-mint-agent") || has("metaplex-register-identity")) skills.add("agent-registry");
  if (has("metaplex-launch-token-genesis") || has("metaplex-launch-bonding-curve") || tags.includes("genesis")) skills.add("genesis");
  if (has("metaplex-mint-core-nft") || tags.includes("mpl-core")) skills.add("core");
  if (has("metaplex-token-metadata")) skills.add("token-metadata");
  if (has("metaplex-mint-cnft") || tags.includes("bubblegum") || tags.includes("cnft")) skills.add("bubblegum");
  if (has("metaplex-deploy-candy-machine") || tags.includes("candy-machine")) skills.add("candy-machine");
  return Array.from(skills);
}

function loadTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  const files = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith(".template.json"))
    .sort();

  return files.map((f) => {
    const raw = readJson(path.join(TEMPLATES_DIR, f));
    return {
      templateId: raw.templateId,
      name: raw.templateName,
      description: raw.templateDescription,
      category: raw.templateCategory,
      avatar: raw.templateAvatar || "🧩",
      variables: raw.variables || [],
      deploy: {
        template: `/api/agents/templates/${encodeURIComponent(raw.templateId)}.json`,
        create: `/agents/mint?fromTemplate=${encodeURIComponent(raw.templateId)}`,
      },
    };
  });
}

function countByCategory(agents) {
  const map = {};
  for (const a of agents) {
    map[a.category] = (map[a.category] || 0) + 1;
  }
  return map;
}

function build() {
  const agents = loadAgents();
  const templates = loadTemplates();

  const oneShots = agents.filter((a) => a.oneShot);
  const featured = agents.filter((a) => a.featured);

  // Aggregate Metaplex skill coverage across the whole catalog so /agents can
  // render a single shared skill rail and surface per-agent badges.
  const metaplexSkillCounts = {};
  for (const a of agents) {
    for (const skill of a.metaplexSkills) {
      metaplexSkillCounts[skill] = (metaplexSkillCounts[skill] || 0) + 1;
    }
  }

  const metaplexSkill = {
    installCommand: "npx skills add metaplex-foundation/skill",
    mcpServerHint: {
      mcpServers: {
        metaplex: {
          type: "http",
          url: "https://modelcontextprotocol.name/mcp/metaplex",
        },
      },
    },
    programs: [
      { id: "agent-registry", label: "Agent Registry", icon: "🪪", description: "On-chain agent identity, delegation, and execution via MPL Core asset-signer PDAs." },
      { id: "genesis", label: "Genesis", icon: "🚀", description: "Token launches — launchpool (48h deposit window) or bonding curve auto-graduating to Raydium CPMM." },
      { id: "core", label: "Core", icon: "🎨", description: "Next-gen NFTs with plugins, royalty enforcement, attributes, and asset-signer execute hooks." },
      { id: "token-metadata", label: "Token Metadata", icon: "🪙", description: "Classic fungibles, NFTs, pNFTs, and editions." },
      { id: "bubblegum", label: "Bubblegum", icon: "🫧", description: "Compressed NFTs via Merkle trees — required for 10k+ mint scale. Needs DAS-enabled RPC." },
      { id: "candy-machine", label: "Candy Machine", icon: "🍬", description: "Core Candy Machine drops with allowlists, start/end dates, mint limits, and payment guards." },
    ],
    coverage: metaplexSkillCounts,
    ergonomics: [
      { label: "CLI", package: "@metaplex-foundation/cli", entry: "mplx" },
      { label: "Umi SDK", package: "@metaplex-foundation/umi" },
      { label: "Agent Registry SDK", package: "@metaplex-foundation/mpl-agent-registry" },
      { label: "Core SDK", package: "@metaplex-foundation/mpl-core" },
      { label: "Token Metadata SDK", package: "@metaplex-foundation/mpl-token-metadata" },
      { label: "Bubblegum SDK", package: "@metaplex-foundation/mpl-bubblegum" },
      { label: "Candy Machine SDK", package: "@metaplex-foundation/mpl-core-candy-machine" },
      { label: "Genesis SDK", package: "@metaplex-foundation/genesis" },
    ],
  };

  const catalog = {
    $schema: `${HOST}/schema/clawdAgentCatalog.v1.json`,
    apiVersion: "1.0",
    generatedAt: new Date().toISOString(),
    hub: {
      gallery: `${HOST}/agents`,
      mint: `${HOST}/agents/mint`,
      registry: `${HOST}/api/agents/registry`,
      api: `${HOST}/api/agents`,
    },
    stats: {
      totalAgents: agents.length,
      totalOneShots: oneShots.length,
      totalFeatured: featured.length,
      totalTemplates: templates.length,
      byCategory: countByCategory(agents),
      metaplexEnabledAgents: agents.filter((a) => a.metaplexSkills.length > 0).length,
      tradingCapableAgents: agents.filter((a) => a.capabilities.includes("swap-execution")).length,
      launchCapableAgents: agents.filter(
        (a) =>
          a.capabilities.includes("metaplex-launch-token-genesis") ||
          a.capabilities.includes("metaplex-launch-bonding-curve") ||
          a.capabilities.includes("metaplex-create-agent-token")
      ).length,
      mintCapableAgents: agents.filter(
        (a) =>
          a.capabilities.includes("metaplex-mint-core-nft") ||
          a.capabilities.includes("metaplex-mint-cnft") ||
          a.capabilities.includes("metaplex-deploy-candy-machine")
      ).length,
    },
    metaplexSkill,
    categories: [
      { id: "defi", label: "DeFi", icon: "💰" },
      { id: "trading", label: "Trading", icon: "📈" },
      { id: "nft", label: "NFT", icon: "🎨" },
      { id: "analytics", label: "Analytics", icon: "📊" },
      { id: "security", label: "Security", icon: "🛡️" },
      { id: "dev-tools", label: "Dev Tools", icon: "🛠️" },
      { id: "education", label: "Education", icon: "📚" },
      { id: "governance", label: "Governance", icon: "🗳️" },
      { id: "research", label: "Research", icon: "🔎" },
      { id: "infrastructure", label: "Infrastructure", icon: "🏗️" },
    ],
    deployPaths: [
      { id: "install", label: "Install", description: "Copy MCP config for Clawd Desktop / Cursor / ClawdOS" },
      { id: "chat", label: "Chat Now", description: "Open instant chat with the agent" },
      { id: "mint", label: "Mint On-chain", description: "Register as an MPL Core asset on Solana" },
      { id: "fork", label: "Fork", description: "Download the JSON, modify, and submit via PR" },
    ],
    oneShots,
    featured,
    agents,
    templates,
  };

  const registrationDocs = buildRegistrationDocs(agents, catalog.generatedAt);
  const acpRegistry = buildAcpRegistry(agents, templates, catalog, registrationDocs);

  writeJson(OUTPUT, catalog);
  writeStaticApi(catalog, agents, templates, registrationDocs, acpRegistry);
  console.log(`✅ Wrote ${OUTPUT}`);
  console.log(`   ${agents.length} agents (${oneShots.length} one-shots, ${featured.length} featured)`);
  console.log(`   ${templates.length} templates`);
  console.log(`   static API: ${path.relative(ROOT, PUBLIC_API_DIR)}`);
}

function buildRegistrationDocs(agents, generatedAt) {
  return agents.map((agent) => {
    const encodedId = encodeURIComponent(agent.identifier);
    const registrationId = `openclawd:${agent.identifier}`;

    return {
      schemaVersion: "erc-8004-agent-registration-v1",
      protocol: "metaplex-agent-registry",
      name: agent.title,
      description: agent.description,
      image: typeof agent.avatar === "string" && agent.avatar.startsWith("http") ? agent.avatar : `${HOST}/nich.jpg`,
      external_url: `${HOST}/agents/${encodedId}`,
      active: true,
      createdAt: agent.createdAt,
      updatedAt: generatedAt,
      tags: agent.tags,
      categories: [agent.category],
      owner: {
        organization: "OpenClawd",
        website: "https://www.x402.wtf",
        token: {
          symbol: "CLAWD",
          chain: "solana",
          mint: CLAWD_MINT,
        },
      },
      services: [
        {
          name: "web",
          endpoint: `${HOST}/agents/${encodedId}`,
        },
        {
          name: "A2A",
          endpoint: `${HOST}/api/agents/a2a`,
          version: "0.3.0",
        },
        {
          name: "catalog",
          endpoint: `${HOST}/api/agents/catalog/${encodedId}.json`,
        },
        {
          name: "registration",
          endpoint: `${HOST}/api/agents/registry/${encodedId}.json`,
        },
      ],
      registrations: [
        {
          agentId: registrationId,
          agentRegistry: "solana:mainnet:metaplex-agent-registry",
          status: "pending-onchain-registration",
          registrationUri: `${HOST}/api/agents/registry/${encodedId}.json`,
        },
      ],
      supportedTrust: ["reputation", "crypto-economic", "token-gated"],
      metaplex: {
        programs: agent.metaplexSkills,
        sdk: "@metaplex-foundation/mpl-agent-registry",
        expectedIdentity: {
          asset: null,
          agentIdentityPda: null,
          assetSignerPda: null,
          executiveProfilePda: null,
        },
        registrationFlow: [
          "mint MPL Core agent asset",
          "register AgentIdentity with this registrationUri",
          "optionally register an executive profile",
          "delegate execution only after operator review",
        ],
      },
      openclawd: {
        identifier: agent.identifier,
        capabilities: agent.capabilities,
        payment: agent.payment,
        agentToken: agent.agentToken,
      },
    };
  });
}

function buildAcpRegistry(agents, templates, catalog, registrationDocs) {
  return {
    schemaVersion: "openclawd.acp.registry.v1",
    protocol: "Agent Commerce Protocol",
    generatedAt: catalog.generatedAt,
    host: HOST,
    discover: {
      catalog: `${HOST}/api/agents/catalog`,
      registry: `${HOST}/api/agents/registry`,
      templates: `${HOST}/api/agents/templates`,
      wellKnown: `${HOST}/.well-known/acp.json`,
    },
    chain: {
      namespace: "solana",
      cluster: "mainnet-beta",
      token: {
        symbol: "CLAWD",
        mint: CLAWD_MINT,
      },
      registry: "metaplex-agent-registry",
    },
    metaplex: catalog.metaplexSkill,
    stats: catalog.stats,
    agents: agents.map((agent) => {
      const encodedId = encodeURIComponent(agent.identifier);
      const registration = registrationDocs.find((doc) => doc.openclawd.identifier === agent.identifier);
      return {
        id: agent.identifier,
        title: agent.title,
        category: agent.category,
        capabilities: agent.capabilities,
        metaplexSkills: agent.metaplexSkills,
        oneShot: agent.oneShot,
        featured: agent.featured,
        endpoints: {
          catalog: `${HOST}/api/agents/catalog/${encodedId}.json`,
          registration: `${HOST}/api/agents/registry/${encodedId}.json`,
          a2a: `${HOST}/api/agents/a2a`,
          mint: `${HOST}/agents/mint?template=${encodedId}`,
        },
        registrations: registration.registrations,
      };
    }),
    templates: templates.map((template) => ({
      id: template.templateId,
      name: template.name,
      endpoint: `${HOST}/api/agents/templates/${encodeURIComponent(template.templateId)}.json`,
    })),
  };
}

function writeStaticApi(catalog, agents, templates, registrationDocs, acpRegistry) {
  writeJson(path.join(PUBLIC_API_DIR, "index.json"), {
    name: "OpenClawd Agents API",
    version: catalog.apiVersion,
    generatedAt: catalog.generatedAt,
    endpoints: {
      catalog: "/api/agents/catalog",
      registry: "/api/agents/registry",
      acp: "/api/agents/acp",
      templates: "/api/agents/templates",
    },
  });

  writeJson(path.join(PUBLIC_CATALOG_DIR, "index.json"), catalog);
  writeJson(path.join(PUBLIC_API_DIR, "agents-catalog.json"), catalog);
  writeJson(path.join(PUBLIC_API_DIR, "acp-registry.json"), acpRegistry);
  writeJson(path.join(WELL_KNOWN_DIR, "acp.json"), acpRegistry);
  copyStaticMetadata();

  for (const agent of agents) {
    const sourcePath = path.join(SRC_DIR, agent.sourceFile);
    if (fs.existsSync(sourcePath)) {
      const raw = readJson(sourcePath);
      writeJson(path.join(PUBLIC_CATALOG_DIR, `${agent.identifier}.json`), raw);
    }
  }

  writeJson(path.join(PUBLIC_REGISTRY_DIR, "index.json"), {
    schemaVersion: "openclawd.metaplex.registry.index.v1",
    generatedAt: catalog.generatedAt,
    registry: "metaplex-agent-registry",
    host: HOST,
    count: registrationDocs.length,
    agents: registrationDocs.map((doc) => ({
      id: doc.openclawd.identifier,
      name: doc.name,
      registrationUri: doc.registrations[0].registrationUri,
      agentRegistry: doc.registrations[0].agentRegistry,
      status: doc.registrations[0].status,
    })),
  });

  for (const doc of registrationDocs) {
    writeJson(path.join(PUBLIC_REGISTRY_DIR, `${doc.openclawd.identifier}.json`), doc);
  }

  for (const template of templates) {
    const sourcePath = path.join(TEMPLATES_DIR, `${template.templateId}.template.json`);
    if (fs.existsSync(sourcePath)) {
      writeJson(path.join(PUBLIC_TEMPLATES_DIR, `${template.templateId}.json`), readJson(sourcePath));
    }
  }
}

function copyStaticMetadata() {
  const files = [
    ["server.json", path.join(PUBLIC_DIR, "server.json")],
    ["robots.txt", path.join(PUBLIC_DIR, "robots.txt")],
    ["humans.txt", path.join(PUBLIC_DIR, "humans.txt")],
    [path.join(".well-known", "ai-plugin.json"), path.join(WELL_KNOWN_DIR, "ai-plugin.json")],
  ];

  for (const [from, to] of files) {
    const source = path.join(ROOT, from);
    if (!fs.existsSync(source)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(source, to);
  }
}

build();
