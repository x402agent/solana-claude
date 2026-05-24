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
const SKILLS_DIR = path.join(ROOT, "skills");
const SKILL_SCHEMA_FILE = path.join(SKILLS_DIR, "skill-schema.v1.json");
const OUTPUT = path.join(ROOT, "agents-catalog.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const PUBLIC_API_DIR = path.join(PUBLIC_DIR, "api", "agents");
const PUBLIC_CATALOG_DIR = path.join(PUBLIC_API_DIR, "catalog");
const PUBLIC_TEMPLATES_DIR = path.join(PUBLIC_API_DIR, "templates");
const PUBLIC_REGISTRY_DIR = path.join(PUBLIC_API_DIR, "registry");
const PUBLIC_SKILLS_DIR = path.join(PUBLIC_DIR, "api", "skills");
const WELL_KNOWN_DIR = path.join(PUBLIC_DIR, ".well-known");
const GALLERY_DIR = path.join(PUBLIC_DIR, "agents");
const HOST = "https://x402.wtf";
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
    const variables = raw.variables || [];
    const tags = raw.agent?.meta?.tags || [];
    return {
      templateId: raw.templateId,
      templateName: raw.templateName,
      templateDescription: raw.templateDescription,
      templateCategory: raw.templateCategory,
      templateAvatar: raw.templateAvatar || "🧩",
      variableCount: variables.length,
      requiredVariables: variables.filter((v) => v.required).map((v) => v.name),
      optionalVariables: variables.filter((v) => !v.required).map((v) => v.name),
      variables,
      path: `templates/${f}`,
      schemaVersion: raw.agent?.schemaVersion || 1,
      tags,
      verified: raw.registry?.verified === true,
      sasProgram: raw.registry?.attestation_service || null,
      verifierUI: raw.registry?.attestation_service ? "https://attest.solana.com" : null,
      schemas: raw.schemas
        ? {
            skill: raw.schemas.skill?.name || null,
            agentIdentity: raw.schemas.agent_identity?.name || null,
          }
        : null,
      deploy: {
        template: `/api/agents/templates/${encodeURIComponent(raw.templateId)}.json`,
        create: `/agents/mint?fromTemplate=${encodeURIComponent(raw.templateId)}`,
      },
    };
  });
}

function parseFrontMatter(raw) {
  if (!raw.startsWith("---\n")) return { attributes: {}, body: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { attributes: {}, body: raw };
  const frontMatter = raw.slice(4, end);
  const body = raw.slice(end + 5);
  return { attributes: parseSimpleYaml(frontMatter), body };
}

function parseSimpleYaml(source) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = source.split("\n");

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1].value;

    if (trimmed.startsWith("- ")) {
      const item = coerceYamlScalar(trimmed.slice(2).trim());
      if (!Array.isArray(current)) continue;
      current.push(item);
      continue;
    }

    const sep = trimmed.indexOf(":");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const rawValue = trimmed.slice(sep + 1).trim();

    if (rawValue === "") {
      const nextMeaningful = findNextMeaningfulLine(lines, lines.indexOf(line) + 1);
      const child = nextMeaningful && nextMeaningful.trim().startsWith("- ") ? [] : {};
      current[key] = child;
      stack.push({ indent, value: child });
      continue;
    }

    current[key] = coerceYamlScalar(rawValue);
  }

  return root;
}

function findNextMeaningfulLine(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i += 1) {
    if (lines[i].trim() && !lines[i].trim().startsWith("#")) return lines[i];
  }
  return null;
}

function coerceYamlScalar(value) {
  const unquoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
      ? value.slice(1, -1)
      : value;
  if (unquoted === "true") return true;
  if (unquoted === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
  return unquoted;
}

function inferSkillCategory(skillId) {
  if (skillId.startsWith("pump-security")) return "security";
  if (skillId.includes("wallet")) return "wallet";
  if (skillId.includes("ts-") || skillId.includes("typescript") || skillId.includes("sdk")) return "typescript";
  if (skillId.includes("solana")) return "solana-dev";
  return "pump-protocol";
}

function loadSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const entries = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries
    .filter((skillId) => fs.existsSync(path.join(SKILLS_DIR, skillId, "SKILL.md")))
    .map((skillId) => {
      const raw = fs.readFileSync(path.join(SKILLS_DIR, skillId, "SKILL.md"), "utf8");
      const { attributes } = parseFrontMatter(raw);
      const description = attributes.description || "";
      const openclaw = attributes.metadata?.openclaw || {};
      return {
        skillId,
        name: attributes.name || skillId,
        description,
        category: inferSkillCategory(skillId),
        path: `${skillId}/SKILL.md`,
        url: `${HOST}/api/skills/${encodeURIComponent(skillId)}`,
        tags: Array.from(
          new Set(
            [skillId.split("-")[0], "solana"]
              .concat(skillId.split("-"))
              .filter(Boolean)
          )
        ),
        requiredEnv: Array.isArray(openclaw.requires?.env) ? openclaw.requires.env : [],
        homepage: openclaw.homepage || null,
        attestation: {
          status: "pending",
          isFormallyVerified: false,
          attestationPda: null,
          verificationTimestamp: null,
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
  const skills = loadSkills();

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
  const templateIndex = buildTemplateIndex(templates, catalog.generatedAt);
  const skillsIndex = buildSkillsIndex(skills, catalog.generatedAt);

  writeJson(OUTPUT, catalog);
  writeJson(path.join(TEMPLATES_DIR, "index.json"), templateIndex);
  writeJson(path.join(SKILLS_DIR, "index.json"), skillsIndex);
  writeStaticApi(catalog, agents, templates, skills, templateIndex, skillsIndex, registrationDocs, acpRegistry);
  console.log(`✅ Wrote ${OUTPUT}`);
  console.log(`   ${agents.length} agents (${oneShots.length} one-shots, ${featured.length} featured)`);
  console.log(`   ${templates.length} templates`);
  console.log(`   ${skills.length} skills`);
  console.log(`   static API: ${path.relative(ROOT, PUBLIC_API_DIR)}`);
}

function buildTemplateIndex(templates, generatedAt) {
  const byCategory = {};
  for (const template of templates) {
    byCategory[template.templateCategory] = (byCategory[template.templateCategory] || 0) + 1;
  }

  return {
    $schema: "https://solanaclawd.com/schemas/agent-template-index.v1.json",
    apiVersion: "1.0",
    generatedAt,
    hub: {
      gallery: `${HOST}/agents/templates`,
      api: `${HOST}/api/agents/templates`,
      schema: "https://solanaclawd.com/schemas/agent-template.v1.json",
    },
    stats: {
      totalTemplates: templates.length,
      byCategory,
    },
    templates,
  };
}

function buildSkillsIndex(skills, generatedAt) {
  const byCategory = {};
  for (const skill of skills) {
    byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
  }

  return {
    $schema: "https://solanaclawd.com/schemas/skill-hub.v1.json",
    apiVersion: "1.0",
    generatedAt,
    hub: {
      gallery: `${HOST}/skills`,
      api: `${HOST}/api/skills`,
      attestation: "https://attest.solana.com",
      sasProgram: "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG",
      credentialAuthority: CLAWD_MINT,
    },
    formalVerification: {
      schema: "skill-schema.v1.json",
      sasSchema: "OpenClawdSkillAttestation",
      layoutBytes: [12, 32, 12, 8, 1],
      fieldNames: ["skill_id", "verifier_pubkey", "proof_hash", "verification_timestamp", "is_formally_verified"],
      verifierUI: "https://attest.solana.com",
      workflowDoc: `${HOST}/skills/verify`,
    },
    stats: {
      totalSkills: skills.length,
      verifiedSkills: skills.filter((skill) => skill.attestation.isFormallyVerified).length,
      pendingVerification: skills.filter((skill) => !skill.attestation.isFormallyVerified).length,
      byCategory,
    },
    skills,
    verificationFlow: [
      "1. build skill implementation and tests",
      "2. compute proof_hash from the audited skill artifact bundle",
      "3. issue OpenClawdSkillAttestation via the Solana Attestation Agent",
      "4. verify attestation on attest.solana.com",
      "5. attestation_pda recorded in skills/index.json, isFormallyVerified set to true",
    ],
  };
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
        website: "https://x402.wtf",
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

function writeStaticApi(catalog, agents, templates, skills, templateIndex, skillsIndex, registrationDocs, acpRegistry) {
  fs.rmSync(PUBLIC_API_DIR, { recursive: true, force: true });
  fs.rmSync(PUBLIC_SKILLS_DIR, { recursive: true, force: true });

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
  writeJson(path.join(PUBLIC_TEMPLATES_DIR, "index.json"), templateIndex);
  writeJson(path.join(PUBLIC_SKILLS_DIR, "index.json"), skillsIndex);
  if (fs.existsSync(SKILL_SCHEMA_FILE)) {
    writeJson(path.join(PUBLIC_SKILLS_DIR, "skill-schema.v1.json"), readJson(SKILL_SCHEMA_FILE));
  }
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

  for (const skill of skills) {
    const sourcePath = path.join(SKILLS_DIR, skill.skillId, "SKILL.md");
    if (!fs.existsSync(sourcePath)) continue;
    writeJson(path.join(PUBLIC_SKILLS_DIR, `${skill.skillId}.json`), {
      ...skill,
      markdown: fs.readFileSync(sourcePath, "utf8"),
    });
  }

  writeGallery(catalog);
}

// ---------- Static gallery pages served at x402.wtf/agents ----------

function htmlPage(title, bodyClass, inner) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="Solana Clawd agent catalog — discover, chat with, and mint Solana-native AI agents at x402.wtf/agents." />
<link rel="icon" href="/nich.jpg" />
<style>
  :root { --bg:#0a0b0f; --panel:#13151c; --line:#232633; --fg:#e7e9ee; --muted:#8b90a0; --accent:#ff5c00; --accent2:#14f195; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  a { color:var(--accent2); text-decoration:none; }
  a:hover { text-decoration:underline; }
  header.site { display:flex; align-items:center; gap:14px; padding:18px 24px; border-bottom:1px solid var(--line); position:sticky; top:0; background:rgba(10,11,15,.92); backdrop-filter:blur(8px); z-index:10; flex-wrap:wrap; }
  .brand { font-weight:800; letter-spacing:.3px; font-size:18px; }
  .brand span { color:var(--accent); }
  .nav { margin-left:auto; display:flex; gap:18px; font-size:14px; }
  .wrap { max-width:1100px; margin:0 auto; padding:28px 24px 80px; }
  h1 { font-size:28px; margin:.2em 0; }
  .lede { color:var(--muted); max-width:720px; }
  .controls { display:flex; gap:10px; margin:22px 0; flex-wrap:wrap; }
  input,select { background:var(--panel); border:1px solid var(--line); color:var(--fg); padding:10px 12px; border-radius:10px; font-size:14px; }
  input { flex:1; min-width:220px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; margin-top:8px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; }
  .card .top { display:flex; gap:10px; align-items:center; }
  .avatar { width:38px; height:38px; border-radius:10px; background:#000; display:grid; place-items:center; font-size:20px; border:1px solid var(--line); }
  .title { font-weight:700; }
  .cat { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
  .desc { color:#c4c8d4; font-size:13.5px; flex:1; }
  .tags { display:flex; gap:6px; flex-wrap:wrap; }
  .tag { font-size:11px; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:2px 8px; }
  .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
  .btn { font-size:12.5px; padding:7px 11px; border-radius:9px; border:1px solid var(--line); background:#0e0f15; color:var(--fg); cursor:pointer; }
  .btn.primary { background:var(--accent); border-color:var(--accent); color:#000; font-weight:700; }
  .btn.mint { background:var(--accent2); border-color:var(--accent2); color:#04140d; font-weight:700; }
  .count { color:var(--muted); font-size:13px; margin:6px 0 0; }
  code,pre { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  pre { background:#06070a; border:1px solid var(--line); border-radius:10px; padding:14px; overflow:auto; font-size:13px; }
  .pill { display:inline-block; background:#0e0f15; border:1px solid var(--line); border-radius:999px; padding:3px 10px; font-size:12px; color:var(--muted); }
  footer { border-top:1px solid var(--line); color:var(--muted); padding:24px; text-align:center; font-size:13px; }
</style>
</head>
<body class="${bodyClass}">
<header class="site">
  <div class="brand">Solana <span>Clawd</span> · Agents</div>
  <nav class="nav">
    <a href="/agents">Catalog</a>
    <a href="/agents/mint">Design &amp; Mint</a>
    <a href="/api/agents">API</a>
    <a href="https://github.com/x402agent/solana-clawd">GitHub</a>
  </nav>
</header>
${inner}
<footer>Solana Clawd · served at <strong>x402.wtf/agents</strong> · CLAWD <code>${CLAWD_MINT}</code></footer>
</body>
</html>
`;
}

function writeGallery(catalog) {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
  const stats = catalog.stats || {};

  // --- Catalog gallery (/agents) ---
  const galleryInner = `
<div class="wrap">
  <h1>Solana Clawd Agent Catalog</h1>
  <p class="lede">Every agent below is Solana-native, ships with the Solana Clawd shell + runtime, and exposes JSON, MCP, chat, and Metaplex/Google registration endpoints. Install the runtime and they are available immediately — or design and mint your own with the Solana Clawd Agent Kit.</p>
  <p><span class="pill">${stats.total || (catalog.agents || []).length} agents</span> <span class="pill">${stats.featured || 0} featured</span> <span class="pill">${stats.oneShots || 0} one-shot</span></p>
  <div class="controls">
    <input id="q" placeholder="Search agents (name, tag, capability)…" />
    <select id="cat"><option value="">All categories</option></select>
    <select id="sort"><option value="featured">Featured first</option><option value="az">A–Z</option></select>
  </div>
  <p class="count" id="count"></p>
  <div class="grid" id="grid"></div>
</div>
<script>
const CATALOG_URL = "/api/agents/agents-catalog.json";
let AGENTS = [];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function card(a) {
  const tags = (a.tags || []).slice(0, 5).map(t => '<span class="tag">' + esc(t) + '</span>').join("");
  return '<div class="card">'
    + '<div class="top"><div class="avatar">' + esc((a.avatar||"🤖").slice(0,2)) + '</div>'
    + '<div><div class="title">' + esc(a.title) + '</div><div class="cat">' + esc(a.category) + (a.featured?' · ★ featured':'') + '</div></div></div>'
    + '<div class="desc">' + esc(a.description) + '</div>'
    + '<div class="tags">' + tags + '</div>'
    + '<div class="actions">'
    + '<a class="btn primary" href="/agents/chat?agent=' + encodeURIComponent(a.identifier) + '">Chat</a>'
    + '<a class="btn mint" href="/agents/mint?template=' + encodeURIComponent(a.identifier) + '">Mint</a>'
    + '<a class="btn" href="' + esc(a.deploy.json) + '">JSON</a>'
    + '<a class="btn" href="' + esc(a.deploy.registration) + '">Registry</a>'
    + '</div></div>';
}
function render() {
  const q = document.getElementById("q").value.toLowerCase().trim();
  const cat = document.getElementById("cat").value;
  const sort = document.getElementById("sort").value;
  let list = AGENTS.filter(a => {
    if (cat && a.category !== cat) return false;
    if (!q) return true;
    const hay = (a.title + " " + a.description + " " + (a.tags||[]).join(" ") + " " + (a.capabilities||[]).join(" ")).toLowerCase();
    return hay.includes(q);
  });
  list.sort(sort === "az"
    ? (x,y) => x.title.localeCompare(y.title)
    : (x,y) => (y.featured?1:0)-(x.featured?1:0) || x.title.localeCompare(y.title));
  document.getElementById("grid").innerHTML = list.map(card).join("");
  document.getElementById("count").textContent = list.length + " agent" + (list.length===1?"":"s");
}
async function boot() {
  try {
    const res = await fetch(CATALOG_URL, { headers: { accept: "application/json" } });
    const data = await res.json();
    AGENTS = data.agents || [];
    const cats = [...new Set(AGENTS.map(a => a.category))].sort();
    const sel = document.getElementById("cat");
    for (const c of cats) { const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); }
    ["q","cat","sort"].forEach(id => document.getElementById(id).addEventListener("input", render));
    render();
  } catch (e) {
    document.getElementById("grid").innerHTML = '<p class="lede">Could not load the catalog. Fetch <a href="/api/agents/agents-catalog.json">/api/agents/agents-catalog.json</a> directly.</p>';
  }
}
boot();
</script>`;
  fs.writeFileSync(path.join(GALLERY_DIR, "index.html"), htmlPage("Solana Clawd · Agent Catalog", "gallery", galleryInner));

  // --- Chat launcher (/agents/chat) ---
  const chatInner = `
<div class="wrap">
  <h1 id="t">Chat with a Solana Clawd Agent</h1>
  <p class="lede" id="lede">Loading agent…</p>
  <div id="meta"></div>
  <h3>Run it in your shell + runtime</h3>
  <pre><code>curl -fsSL https://x402.wtf/install.sh | bash
clawd-tui                       # interactive shell — all agents available immediately
clawd-kit show <span id="idspan">AGENT_ID</span></code></pre>
  <h3>Or connect over MCP</h3>
  <pre><code id="mcp">GET /api/agents/catalog/AGENT_ID.json</code></pre>
  <p><a class="btn mint" id="mintlink" href="/agents/mint">Design &amp; mint your own →</a> <a class="btn" href="/agents">← Back to catalog</a></p>
</div>
<script>
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const id = new URLSearchParams(location.search).get("agent") || "";
async function boot() {
  if (!id) { document.getElementById("lede").textContent = "No agent specified."; return; }
  document.getElementById("idspan").textContent = id;
  document.getElementById("mcp").textContent = "GET /api/agents/catalog/" + id + ".json";
  document.getElementById("mintlink").href = "/agents/mint?template=" + encodeURIComponent(id);
  try {
    const a = await (await fetch("/api/agents/catalog/" + encodeURIComponent(id) + ".json")).json();
    document.getElementById("t").textContent = (a.meta?.avatar || "🤖") + "  " + (a.meta?.title || id);
    document.getElementById("lede").textContent = a.meta?.description || "";
    const opening = a.config?.openingMessage ? '<h3>Opening message</h3><pre>' + esc(a.config.openingMessage) + '</pre>' : "";
    const qs = (a.config?.openingQuestions || []).map(q => '<span class="tag">' + esc(q) + '</span>').join(" ");
    document.getElementById("meta").innerHTML = opening + (qs ? '<div class="tags">' + qs + '</div>' : "");
  } catch (e) { document.getElementById("lede").textContent = "Agent not found: " + id; }
}
boot();
</script>`;
  fs.mkdirSync(path.join(GALLERY_DIR, "chat"), { recursive: true });
  fs.writeFileSync(path.join(GALLERY_DIR, "chat", "index.html"), htmlPage("Solana Clawd · Chat", "chat", chatInner));

  // --- Design & mint (/agents/mint) ---
  const mintInner = `
<div class="wrap">
  <h1>Design &amp; Mint a Solana Clawd Agent</h1>
  <p class="lede">Use the <strong>Solana Clawd Agent Kit</strong> to scaffold an agent, then register and mint it on <strong>Metaplex</strong> (on-chain identity) or <strong>Google A2A</strong> (agent-to-agent discovery). No SOL gas required for the hosted path.</p>

  <h3>1 · Scaffold with the Agent Kit</h3>
  <pre><code>npm i -g @solana-clawd/agent-kit
clawd-kit new my-agent          # writes src/my-agent.json from the template
clawd-kit validate my-agent     # checks Solana Clawd ownership + schema</code></pre>

  <h3>2 · Build registration documents</h3>
  <pre><code>clawd-kit register my-agent --target metaplex   # ERC-8004 metaplex-agent-registry doc
clawd-kit register my-agent --target google     # Google A2A agent card</code></pre>

  <h3>3 · Mint on-chain (Metaplex)</h3>
  <pre><code>clawd-agent mint-free --network devnet --owner &lt;YOUR_SOLANA_PUBKEY&gt; \\
  --name "My Agent" --uri https://example.com/agent.json --service MCP=https://...</code></pre>
  <p class="lede">Or POST to the hosted gasless gateway:</p>
  <pre><code id="mintcurl">curl -X POST https://x402.wtf/api/mint/agent \\
  -H 'Content-Type: application/json' \\
  -d '{"templateId":"TEMPLATE_ID","ownerPubkey":"&lt;YOUR_SOLANA_PUBKEY&gt;"}'</code></pre>

  <p id="tpl"></p>
  <p><a class="btn" href="/agents">← Back to catalog</a> <a class="btn primary" href="https://github.com/x402agent/solana-clawd/tree/main/agent-kit">Agent Kit docs</a></p>
</div>
<script>
const tpl = new URLSearchParams(location.search).get("template");
if (tpl) {
  document.getElementById("mintcurl").textContent = document.getElementById("mintcurl").textContent.replace("TEMPLATE_ID", tpl);
  document.getElementById("tpl").innerHTML = 'Starting from template <span class="pill">' + tpl + '</span> — view its <a href="/api/agents/registry/' + encodeURIComponent(tpl) + '.json">registration document</a>.';
}
</script>`;
  fs.mkdirSync(path.join(GALLERY_DIR, "mint"), { recursive: true });
  fs.writeFileSync(path.join(GALLERY_DIR, "mint", "index.html"), htmlPage("Solana Clawd · Design & Mint", "mint", mintInner));
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
