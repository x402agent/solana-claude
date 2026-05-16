import chalk from "chalk";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

type FlagMap = Map<string, string | boolean>;

const DEFAULT_RPC_BY_NETWORK: Record<string, string> = {
  "solana-mainnet": "https://api.mainnet-beta.solana.com",
  "solana-devnet": "https://api.devnet.solana.com",
  localnet: "http://127.0.0.1:8899",
};

const DEFAULT_AGENT_URI: Record<string, string> = {
  agent1: "https://backrooms.x402.wtf/metadata/agent1.json",
  agent2: "https://backrooms.x402.wtf/metadata/agent2.json",
  agent3: "https://backrooms.x402.wtf/metadata/agent3.json",
};

const DEFAULT_AGENT_NAME: Record<string, string> = {
  agent1: "The Analyst",
  agent2: "The Satirist",
  agent3: "Clawd",
};

function parseFlags(args: string[]): FlagMap {
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      flags.set(key, true);
      continue;
    }

    flags.set(key, next);
    i += 1;
  }

  return flags;
}

function getString(flags: FlagMap, key: string, fallback?: string): string | undefined {
  const value = flags.get(key);
  return typeof value === "string" ? value : fallback;
}

function requireString(flags: FlagMap, key: string): string {
  const value = getString(flags, key);
  if (!value) {
    throw new Error(`Missing required --${key}`);
  }
  return value;
}

function expandHome(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function loadSecretKey(flags: FlagMap): Uint8Array {
  const inlineJson = process.env.SOLANA_KEYPAIR_JSON;
  if (inlineJson) {
    return Uint8Array.from(JSON.parse(inlineJson));
  }

  const keypairPath =
    getString(flags, "keypair") ||
    process.env.SOLANA_KEYPAIR ||
    path.join(os.homedir(), ".config", "solana", "id.json");

  if (!fs.existsSync(expandHome(keypairPath))) {
    throw new Error(`Keypair not found: ${keypairPath}. Pass --keypair or set SOLANA_KEYPAIR_JSON.`);
  }

  return Uint8Array.from(JSON.parse(fs.readFileSync(expandHome(keypairPath), "utf-8")));
}

async function createSignedUmi(flags: FlagMap, needsAgentIdentity: boolean): Promise<any> {
  const network = getString(flags, "network", "solana-devnet")!;
  const rpc = getString(flags, "rpc", DEFAULT_RPC_BY_NETWORK[network] || DEFAULT_RPC_BY_NETWORK["solana-devnet"])!;
  const [{ createUmi }, { keypairIdentity }, registry] = await Promise.all([
    import("@metaplex-foundation/umi-bundle-defaults"),
    import("@metaplex-foundation/umi"),
    import("@metaplex-foundation/mpl-agent-registry"),
  ]);

  const umi = createUmi(rpc);
  if (needsAgentIdentity) {
    umi.use((registry as any).mplAgentIdentity());
  }

  const keypair = umi.eddsa.createKeypairFromSecretKey(loadSecretKey(flags));
  umi.use(keypairIdentity(keypair));
  return umi;
}

function agentMetadata(agentSlug: string, name: string, endpoint: string) {
  return {
    type: "agent",
    name,
    description: `${name} is a CLAWD Infinite Backroom agent exposed through public web and x402/pay.sh metered endpoints.`,
    services: [
      { name: "web", endpoint },
      { name: "x402", endpoint: "https://backrooms.x402.wtf" },
    ],
    registrations: [],
    supportedTrust: ["reputation", "crypto-economic"],
    tags: ["clawd", "solana", "backroom", agentSlug],
  };
}

async function cmdMint(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const agentSlug = getString(flags, "agent", "agent3")!;
  const name = getString(flags, "name", DEFAULT_AGENT_NAME[agentSlug] || agentSlug)!;
  const uri = getString(flags, "uri", DEFAULT_AGENT_URI[agentSlug]);
  const network = getString(flags, "network", "solana-devnet")!;

  if (!uri) {
    throw new Error(`No default URI for ${agentSlug}. Pass --uri https://.../metadata.json`);
  }

  const umi = await createSignedUmi(flags, true);
  const { mintAndSubmitAgent } = await import("@metaplex-foundation/mpl-agent-registry");
  const endpoint = `https://backrooms.x402.wtf/${agentSlug}`;

  console.log(chalk.cyan(`\nMinting ${name} on ${network}`));
  console.log(chalk.gray(`Metadata URI: ${uri}`));

  const result = await (mintAndSubmitAgent as any)(umi, {}, {
    wallet: umi.identity.publicKey,
    network,
    name,
    uri,
    agentMetadata: agentMetadata(agentSlug, name, endpoint),
  });

  console.log(chalk.green("\nAgent minted and registered"));
  console.log(chalk.white(`Asset address: ${result.assetAddress}`));
  console.log(chalk.white(`Signature:      ${result.signature}\n`));
}

async function cmdRead(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const assetAddress = requireString(flags, "asset");
  const umi = await createSignedUmi(flags, true);
  const [{ publicKey }, core, registry] = await Promise.all([
    import("@metaplex-foundation/umi"),
    import("@metaplex-foundation/mpl-core"),
    import("@metaplex-foundation/mpl-agent-registry"),
  ]);

  const asset = publicKey(assetAddress);
  const assetData = await (core as any).fetchAsset(umi, asset);
  const agentIdentity = assetData.agentIdentities?.[0];
  const identityPda = (registry as any).findAgentIdentityV1Pda(umi, { asset });
  const identity = await (registry as any).safeFetchAgentIdentityV1(umi, identityPda);
  const wallet = (core as any).findAssetSignerPda(umi, { asset });
  const balance = await umi.rpc.getBalance(wallet);

  console.log(chalk.cyan("\nMetaplex Agent"));
  console.log(chalk.white(`Name:        ${assetData.name || "(unknown)"}`));
  console.log(chalk.white(`Asset:       ${assetAddress}`));
  console.log(chalk.white(`Registered:  ${identity !== null && agentIdentity !== undefined}`));
  console.log(chalk.white(`URI:         ${agentIdentity?.uri || "(none)"}`));
  console.log(chalk.white(`Wallet PDA:  ${wallet}`));
  console.log(chalk.white(`Balance:     ${balance.basisPoints.toString()} lamports\n`));
}

async function cmdToken(args: string[]): Promise<void> {
  const action = args[0];
  if (action !== "launch") {
    showAgentHelp();
    return;
  }

  const flags = parseFlags(args.slice(1));
  const asset = requireString(flags, "asset");
  const name = requireString(flags, "name");
  const symbol = requireString(flags, "symbol");
  const image = requireString(flags, "image");
  const network = getString(flags, "network", "solana-devnet")!;
  const description = getString(flags, "description");
  const firstBuyRaw = getString(flags, "first-buy");
  const setToken = flags.get("set-token") === true;

  if (!image.startsWith("https://gateway.irys.xyz/")) {
    throw new Error("Metaplex Genesis requires --image to be an https://gateway.irys.xyz/... URL");
  }

  if (setToken && process.env.CLAWD_CONFIRM_PERMANENT_AGENT_TOKEN !== "1") {
    throw new Error("Refusing irreversible token binding. Set CLAWD_CONFIRM_PERMANENT_AGENT_TOKEN=1 to use --set-token.");
  }

  const umi = await createSignedUmi(flags, false);
  const { publicKey } = await import("@metaplex-foundation/umi");
  const { createAndRegisterLaunch } = await import("@metaplex-foundation/genesis");
  const launch: Record<string, unknown> = {};
  if (firstBuyRaw) launch.firstBuyAmount = Number(firstBuyRaw);

  console.log(chalk.cyan(`\nLaunching ${symbol} for agent ${asset} on ${network}`));
  if (!setToken) {
    console.log(chalk.yellow("setToken=false. This test launch will not permanently bind the token to the agent."));
  }

  const result = await (createAndRegisterLaunch as any)(umi, {}, {
    wallet: umi.identity.publicKey,
    network,
    agent: {
      mint: publicKey(asset),
      setToken,
    },
    launchType: "bondingCurve",
    token: {
      name,
      symbol,
      image,
      ...(description ? { description } : {}),
    },
    launch,
  });

  console.log(chalk.green("\nAgent token launch submitted"));
  console.log(chalk.white(`Mint address: ${result.mintAddress}`));
  console.log(chalk.white(`Launch:       ${result.launch?.link || "(no link returned)"}\n`));
}

function cmdPay(args: string[]): void {
  const action = args[0] || "help";

  if (action === "start") {
    const child = spawn("pay", ["--sandbox", "server", "start", "pay/clawd-backroom-pay.yaml", "--debugger"], {
      stdio: "inherit",
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  if (action === "test") {
    const child = spawn("pay", ["--version"], {
      stdio: "inherit",
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  showAgentHelp();
}

function showAgentHelp(): void {
  console.log(`
${chalk.cyan("CLAWD Onchain Agents")} — Metaplex + Genesis + pay.sh

${chalk.bold("Mint / read Metaplex agents:")}
  ${chalk.white("clawd agent mint")} --agent agent3 --keypair ~/.config/solana/id.json --network solana-devnet
  ${chalk.white("clawd agent read")} --asset <CORE_ASSET_ADDRESS> --keypair ~/.config/solana/id.json

${chalk.bold("Launch an agent token:")}
  ${chalk.white("clawd agent token launch")} --asset <AGENT_ASSET> --name "Clawd Token" --symbol CLAWD --image https://gateway.irys.xyz/<id>

${chalk.bold("Run the x402/pay.sh gateway locally:")}
  ${chalk.white("clawd agent pay start")}
  ${chalk.white("clawd agent pay test")}      Check the local pay CLI installation

${chalk.yellow("Safety:")} --set-token is permanent. The CLI requires CLAWD_CONFIRM_PERMANENT_AGENT_TOKEN=1 before binding.
`);
}

export async function cmdAgent(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    showAgentHelp();
    return;
  }

  if (subcommand === "mint") {
    await cmdMint(args.slice(1));
    return;
  }

  if (subcommand === "read") {
    await cmdRead(args.slice(1));
    return;
  }

  if (subcommand === "token") {
    await cmdToken(args.slice(1));
    return;
  }

  if (subcommand === "pay") {
    cmdPay(args.slice(1));
    return;
  }

  throw new Error(`Unknown agent subcommand: ${subcommand}`);
}
