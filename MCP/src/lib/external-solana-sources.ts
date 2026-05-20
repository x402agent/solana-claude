/**
 * External Solana Ecosystem Sources Registry
 *
 * Mirrors the Official Solana MCP server's sources taxonomy:
 *   - 21-tag closed section taxonomy (core → vm)
 *   - ~35 key doc sources with llms.txt-compatible primary URLs
 *   - use_cases strings for routing by list_sections
 *
 * Ported from: solana-mcp-official-main/lib/sources.types.ts + sources.yaml
 */

// ─── Section taxonomy (21 tags — closed set) ─────────────────────────────────

export type SectionId =
  | "core"
  | "programs"
  | "frameworks"
  | "clients"
  | "tokens"
  | "nft"
  | "defi"
  | "liquid-staking"
  | "oracles"
  | "infra"
  | "data"
  | "wallets"
  | "mobile"
  | "governance"
  | "testing"
  | "tooling"
  | "zk"
  | "bridges"
  | "identity"
  | "examples"
  | "vm";

export const SECTION_IDS: readonly SectionId[] = [
  "core", "programs", "frameworks", "clients", "tokens", "nft", "defi",
  "liquid-staking", "oracles", "infra", "data", "wallets", "mobile",
  "governance", "testing", "tooling", "zk", "bridges", "identity", "examples", "vm",
] as const;

export const SECTION_DESCRIPTIONS: Readonly<Record<SectionId, string>> = {
  core: "Solana protocol fundamentals (accounts, txs, fees, rent, sysvars).",
  programs: "Writing on-chain programs (any framework).",
  frameworks: "Anchor, Pinocchio, Steel, native program patterns.",
  clients: "RPC, signers, tx building, off-chain SDKs.",
  tokens: "SPL token, token-2022, ATA, token metadata.",
  nft: "NFT standards, marketplaces, compressed NFTs.",
  defi: "AMMs, perps, lending, aggregators, yield.",
  "liquid-staking": "Stake pools, LST routers, restaking.",
  oracles: "Price feeds, randomness, off-chain data.",
  infra: "RPC providers, validators, block engines.",
  data: "Explorers, indexers, on-chain analytics.",
  wallets: "Wallet adapters, MWA, multisig signers.",
  mobile: "Solana Mobile, MWA, dApp store.",
  governance: "DAOs, multisig, voting, treasury.",
  testing: "Local validators, simulation harnesses.",
  tooling: "CLI, IDL gen, codama, helpers, dev utilities.",
  zk: "ZK compression, light protocol, ZK programs.",
  bridges: "Cross-chain bridges, token portals.",
  identity: "Attestation, proof-of-identity, on-chain records.",
  examples: "Tutorial repos, reference programs.",
  vm: "Sealevel, sBPF asm, firedancer internals.",
};

// ─── Source type ──────────────────────────────────────────────────────────────

export interface ExternalSource {
  readonly id: string;
  readonly name: string;
  readonly kind: "github" | "web" | "openapi";
  readonly enabled: boolean;
  readonly primary_url: string;
  readonly sections: readonly SectionId[];
  readonly use_cases: string;
}

// ─── Sources registry (~35 key Solana ecosystem sources) ─────────────────────

export const EXTERNAL_SOURCES: readonly ExternalSource[] = [
  // ── Core Solana docs & SDKs ──────────────────────────────────────────────
  {
    id: "solana-docs",
    name: "Solana Docs (solana.com/docs)",
    kind: "web",
    enabled: true,
    primary_url: "https://solana.com/docs",
    sections: ["core", "clients", "programs"],
    use_cases: "Solana fundamentals, accounts model, transactions, fees, rent, PDAs, sysvars, RPC API, web3.js basics, intro tutorials",
  },
  {
    id: "anchor-docs",
    name: "Anchor Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://www.anchor-lang.com",
    sections: ["frameworks", "programs"],
    use_cases: "Anchor framework, accounts macro, IDL generation, derive macros, program builder, anchor test, anchor build",
  },
  {
    id: "solana-kit-docs",
    name: "Solana Kit (@solana/kit)",
    kind: "web",
    enabled: true,
    primary_url: "https://github.com/anza-xyz/solana-kit",
    sections: ["clients"],
    use_cases: "@solana/kit client SDK, RPC plugins, signers, transaction building, codama-generated clients, modern TypeScript Solana",
  },
  {
    id: "solana-cookbook",
    name: "Solana Cookbook",
    kind: "web",
    enabled: true,
    primary_url: "https://solanacookbook.com",
    sections: ["core", "examples"],
    use_cases: "Solana recipes, how-to guides, common patterns, token transfers, PDA derivation, NFT minting examples",
  },
  {
    id: "helius-docs",
    name: "Helius Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.helius.dev",
    sections: ["infra", "data"],
    use_cases: "Helius RPC, DAS API, enhanced transactions, webhooks, priority fees, staked connections, NFT indexing",
  },
  // ── Programs & Frameworks ────────────────────────────────────────────────
  {
    id: "pinocchio",
    name: "Pinocchio (anza-xyz/pinocchio)",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/anza-xyz/pinocchio",
    sections: ["frameworks", "programs"],
    use_cases: "Pinocchio framework, zero-copy programs, no-std Solana programs, minimal footprint programs",
  },
  {
    id: "steel-framework",
    name: "Steel Framework",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/regolith-labs/steel",
    sections: ["frameworks", "programs"],
    use_cases: "Steel framework, instruction handler, program entrypoint, discriminator patterns",
  },
  {
    id: "native-programs",
    name: "Solana Program (solana-program.com)",
    kind: "web",
    enabled: true,
    primary_url: "https://www.solana-program.com",
    sections: ["programs", "frameworks"],
    use_cases: "native Solana program development, account validation, instruction handling, zero-copy, raw program patterns",
  },
  // ── Tokens ────────────────────────────────────────────────────────────────
  {
    id: "spl-token-docs",
    name: "SPL Token Program",
    kind: "web",
    enabled: true,
    primary_url: "https://spl.solana.com/token",
    sections: ["tokens"],
    use_cases: "SPL token, mint, ATA, transfer, burn, approve, delegation, token-2022 extensions",
  },
  {
    id: "token-2022",
    name: "Token-2022 Extensions",
    kind: "web",
    enabled: true,
    primary_url: "https://spl.solana.com/token-2022",
    sections: ["tokens"],
    use_cases: "Token-2022, transfer fee, confidential transfers, interest-bearing, metadata pointer, permanent delegate, non-transferable",
  },
  {
    id: "metaplex-docs",
    name: "Metaplex Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.metaplex.com",
    sections: ["nft", "tokens"],
    use_cases: "NFT metadata, Metaplex standard, Core NFT, compressed NFTs (cNFTs), Umi, Bubblegum, Candy Machine, Token Metadata program",
  },
  // ── DeFi ─────────────────────────────────────────────────────────────────
  {
    id: "jupiter-docs",
    name: "Jupiter Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://dev.jup.ag",
    sections: ["defi", "clients"],
    use_cases: "Jupiter aggregator, swap API, route computation, slippage, price API, limit orders, DCA, portfolio rebalancing",
  },
  {
    id: "raydium-docs",
    name: "Raydium Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.raydium.io",
    sections: ["defi"],
    use_cases: "Raydium AMM, CLMM, constant product, liquidity pools, CPMM, swap routing, staking, farms",
  },
  {
    id: "orca-docs",
    name: "Orca Whirlpools",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.orca.so",
    sections: ["defi"],
    use_cases: "Orca Whirlpools, concentrated liquidity, CLMM, tick arrays, LP management, swap",
  },
  {
    id: "marinade-docs",
    name: "Marinade Finance",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.marinade.finance",
    sections: ["liquid-staking"],
    use_cases: "mSOL liquid staking, native staking, stake pools, unstaking, MSOL/SOL ratio, validator set",
  },
  {
    id: "pyth-docs",
    name: "Pyth Network Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.pyth.network",
    sections: ["oracles"],
    use_cases: "Pyth oracle, price feeds, pull oracle, push oracle, price confidence, Hermes API, on-demand pricing",
  },
  {
    id: "switchboard-docs",
    name: "Switchboard Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.switchboard.xyz",
    sections: ["oracles"],
    use_cases: "Switchboard oracle, randomness, VRF, data feeds, SGX attestation, custom oracles",
  },
  // ── Wallets ───────────────────────────────────────────────────────────────
  {
    id: "wallet-adapter",
    name: "Solana Wallet Adapter",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/anza-xyz/wallet-adapter",
    sections: ["wallets"],
    use_cases: "Wallet adapter, wallet-standard, React hooks, connect button, signTransaction, sendTransaction, multi-wallet",
  },
  {
    id: "wallet-standard",
    name: "Wallet Standard",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/wallet-standard/wallet-standard",
    sections: ["wallets"],
    use_cases: "Wallet Standard spec, wallet detection, account enumeration, sign message, connect events",
  },
  // ── Tooling ───────────────────────────────────────────────────────────────
  {
    id: "solana-cli",
    name: "Solana CLI Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.solanalabs.com/cli",
    sections: ["tooling"],
    use_cases: "Solana CLI, airdrop, deploy, keygen, stake, vote, validator commands, program upgrade authority",
  },
  {
    id: "codama-docs",
    name: "Codama",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/codama-idl/codama",
    sections: ["tooling", "clients"],
    use_cases: "Codama, IDL-to-client codegen, Kinobi replacement, typed client generation, Rust + TypeScript clients from IDL",
  },
  // ── Testing ───────────────────────────────────────────────────────────────
  {
    id: "litesvm",
    name: "LiteSVM",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/LiteSVM/litesvm",
    sections: ["testing"],
    use_cases: "LiteSVM, lightweight SVM, fast unit testing, program testing without validator, rust test harness",
  },
  {
    id: "mollusk",
    name: "Mollusk",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/buffalojoec/mollusk",
    sections: ["testing"],
    use_cases: "Mollusk, native program unit testing, instruction testing, syscall stubbing",
  },
  {
    id: "bankrun",
    name: "Solana Bankrun",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/kevinheavey/solana-bankrun",
    sections: ["testing"],
    use_cases: "bankrun, fast Solana test runtime, TypeScript testing, program deployment in tests",
  },
  // ── ZK ────────────────────────────────────────────────────────────────────
  {
    id: "zk-compression",
    name: "ZK Compression (Light Protocol)",
    kind: "web",
    enabled: true,
    primary_url: "https://www.zkcompression.com",
    sections: ["zk", "nft"],
    use_cases: "ZK compression, compressed accounts, compressed NFTs, light protocol, Photon, state compression, 1000x cheaper storage",
  },
  // ── Infrastructure ────────────────────────────────────────────────────────
  {
    id: "triton-rpc",
    name: "Triton One RPC Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.triton.one",
    sections: ["infra"],
    use_cases: "Triton RPC, dedicated nodes, geyser plugin, gRPC, yellowstone, slot subscription, account streaming",
  },
  {
    id: "solana-explorer",
    name: "Solana Explorer",
    kind: "web",
    enabled: true,
    primary_url: "https://explorer.solana.com",
    sections: ["data"],
    use_cases: "Solana Explorer, transaction lookup, account lookup, program accounts, block explorer",
  },
  // ── Mobile ───────────────────────────────────────────────────────────────
  {
    id: "solana-mobile-docs",
    name: "Solana Mobile Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.solanamobile.com",
    sections: ["mobile", "wallets"],
    use_cases: "Solana Mobile Stack, MWA, Mobile Wallet Adapter, dApp store, Android Solana apps, seed vault",
  },
  // ── Governance ───────────────────────────────────────────────────────────
  {
    id: "squads-docs",
    name: "Squads Multisig",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.squads.so",
    sections: ["governance", "wallets"],
    use_cases: "Squads multisig, multisig wallet, program authority management, treasury management, multisig transactions",
  },
  // ── Examples ─────────────────────────────────────────────────────────────
  {
    id: "program-examples",
    name: "Solana Program Examples",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/solana-developers/program-examples",
    sections: ["examples", "programs"],
    use_cases: "example programs, hello world, tokens, NFTs, DEX, oracles, reference implementations, Anchor + native examples",
  },
  {
    id: "solana-developers",
    name: "Solana Developers Hub",
    kind: "web",
    enabled: true,
    primary_url: "https://solana.com/developers",
    sections: ["examples", "core"],
    use_cases: "developer guides, quickstarts, courses, guides, bootcamp, tutorials, Solana developer resources",
  },
  // ── VM / Protocol ─────────────────────────────────────────────────────────
  {
    id: "firedancer-docs",
    name: "Firedancer Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.firedancer.io",
    sections: ["vm", "infra"],
    use_cases: "Firedancer validator, high performance Solana, sBPF, Frankendancer, validator operation, consensus",
  },
  // ── Identity ─────────────────────────────────────────────────────────────
  {
    id: "solana-attestation",
    name: "Solana Attestation Service",
    kind: "github",
    enabled: true,
    primary_url: "https://github.com/solana-foundation/solana-attestation-service",
    sections: ["identity"],
    use_cases: "attestation, on-chain claims, identity, proof-of-personhood, credential verification",
  },
  // ── Bridges ───────────────────────────────────────────────────────────────
  {
    id: "wormhole-docs",
    name: "Wormhole Docs",
    kind: "web",
    enabled: true,
    primary_url: "https://docs.wormhole.com",
    sections: ["bridges"],
    use_cases: "Wormhole cross-chain bridge, token portal, VAA, relayer, NTT (Native Token Transfers), cross-chain messaging",
  },
  // ── Pump.fun / Launch ─────────────────────────────────────────────────────
  {
    id: "pump-fun",
    name: "Pump.fun",
    kind: "web",
    enabled: true,
    primary_url: "https://pump.fun",
    sections: ["defi", "tokens"],
    use_cases: "pump.fun, bonding curve, token launch, meme coins, graduation, PumpSwap AMM, cashback, creator fees",
  },
];

export const ENABLED_EXTERNAL_SOURCES: readonly ExternalSource[] = EXTERNAL_SOURCES.filter(s => s.enabled);

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getExternalSourceById(id: string): ExternalSource | undefined {
  return EXTERNAL_SOURCES.find(s => s.id === id);
}

export function sourcesForExternalSection(section: SectionId): readonly ExternalSource[] {
  return ENABLED_EXTERNAL_SOURCES.filter(s => s.sections.includes(section));
}

export function distinctExternalSections(): readonly SectionId[] {
  const present = new Set<SectionId>();
  for (const s of ENABLED_EXTERNAL_SOURCES) {
    for (const tag of s.sections) present.add(tag);
  }
  return SECTION_IDS.filter(id => present.has(id));
}

/** Score a source against a keyword query using use_cases + name + id */
export function scoreExternalSource(source: ExternalSource, query: string): number {
  const q = query.toLowerCase();
  let score = 0;
  if (source.id.toLowerCase().includes(q)) score += 40;
  if (source.name.toLowerCase().includes(q)) score += 30;
  const useCases = source.use_cases.toLowerCase();
  const terms = q.split(/\s+/);
  for (const term of terms) {
    if (term.length < 3) continue;
    if (useCases.includes(term)) score += 20;
    if (source.sections.some(s => s.includes(term))) score += 15;
  }
  return score;
}

/** Return top-k external sources most relevant to a query */
export function findRelevantExternalSources(query: string, topK = 5): ExternalSource[] {
  return ENABLED_EXTERNAL_SOURCES
    .map(s => ({ source: s, score: scoreExternalSource(s, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(x => x.source);
}

/** Format the external Solana ecosystem sources as a list_sections response */
export function formatExternalListSections(): string {
  const sections = distinctExternalSections();
  const HEADER = `## Solana Ecosystem Sources (${ENABLED_EXTERNAL_SOURCES.length} sources, ${sections.length} sections)\n\nExternal Solana ecosystem documentation. Each source lists section tags + use_cases.\nCall \`get_documentation\` with a source id (e.g. "anchor-docs") or section id (e.g. "frameworks") to fetch docs.\n`;
  const sectionBlock = sections.map(id => {
    const srcs = sourcesForExternalSection(id);
    const srcLines = srcs.map(s => `  - id: ${s.id}, name: ${s.name}, use_cases: "${s.use_cases.slice(0, 80)}…"`);
    return [`### ${id} — ${SECTION_DESCRIPTIONS[id]}`, ...srcLines].join("\n");
  }).join("\n\n");
  return [HEADER, sectionBlock].join("\n");
}
