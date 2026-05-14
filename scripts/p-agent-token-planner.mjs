#!/usr/bin/env node
import process from "node:process";

const DEFAULT_P_TOKEN_PROGRAM_ID = "ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF";

const HELP = `p-agent-token planner

Usage:
  node scripts/p-agent-token-planner.mjs plan --symbol PCLAWD --name "Clawd Agent Token" --agent-name "Clawd"
  node scripts/p-agent-token-planner.mjs quote --virtual-sol 30 --virtual-token 1073000000 --sol 1

Commands:
  plan      Print an unsigned p-agent-token launch plan.
  quote     Simulate a constant-product launch curve buy or sell quote.

Options:
  --symbol <symbol>              Agent token symbol. Default: PAGENT
  --name <name>                  Token display name. Default: P-Agent Token
  --agent-name <name>            Agent identity display name. Default: Clawd Agent
  --agent-uri <uri>              Agent metadata URI.
  --agent-asset <pubkey>         Existing MPL Core asset to bind, or omit for create-new plan.
  --executive <pubkey>           Optional delegated off-chain executive wallet.
  --owner <pubkey>               Owner/update authority.
  --uri <uri>                    Token metadata URI.
  --decimals <number>            Mint decimals. Default: 9.
  --supply <number>              Human supply. Default: 1000000000.
  --network <name>               solana-mainnet or solana-devnet. Default: solana-devnet.
  --p-token-program-id <id>      p-token program id. Default: ${DEFAULT_P_TOKEN_PROGRAM_ID}
  --virtual-sol <number>         Virtual SOL reserve. Default: 30.
  --virtual-token <number>       Virtual token reserve. Default: 1073000000.
  --real-sol <number>            Real SOL reserve. Default: 0.
  --real-token <number>          Real token reserve. Default: 793100000.
  --sol <number>                 SOL amount for a buy quote.
  --tokens <number>              Token amount for a sell quote.
  --fee-bps <number>             Trade fee basis points. Default: 100.
  --creator-fee-bps <number>     Creator/agent fee basis points. Default: 500.
`;

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const args = { command };
  for (let i = 0; i < rest.length; i += 1) {
    const item = rest[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function numberArg(args, key, fallback) {
  const raw = args[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid --${key}: ${raw}`);
  return value;
}

function tokenAmount(humanAmount, decimals) {
  const [whole, frac = ""] = String(humanAmount).split(".");
  const padded = `${frac}${"0".repeat(decimals)}`.slice(0, decimals);
  return `${whole}${padded}`.replace(/^0+(?=\d)/, "") || "0";
}

function buyQuote({ virtualSol, virtualToken, solIn, feeBps }) {
  if (solIn <= 0) throw new Error("--sol must be greater than zero for a buy quote");
  const fee = solIn * feeBps / 10_000;
  const netSolIn = solIn - fee;
  const k = virtualSol * virtualToken;
  const virtualSolAfter = virtualSol + netSolIn;
  const virtualTokenAfter = k / virtualSolAfter;
  return {
    unsigned: true,
    side: "buy",
    solIn,
    fee,
    netSolIn,
    tokensOut: Math.max(0, virtualToken - virtualTokenAfter),
    spotPriceBefore: virtualSol / virtualToken,
    spotPriceAfter: virtualSolAfter / virtualTokenAfter,
    virtualSolAfter,
    virtualTokenAfter,
  };
}

function sellQuote({ virtualSol, virtualToken, tokensIn, feeBps }) {
  if (tokensIn <= 0) throw new Error("--tokens must be greater than zero for a sell quote");
  const k = virtualSol * virtualToken;
  const virtualTokenAfter = virtualToken + tokensIn;
  const virtualSolAfter = k / virtualTokenAfter;
  const grossSolOut = Math.max(0, virtualSol - virtualSolAfter);
  const fee = grossSolOut * feeBps / 10_000;
  return {
    unsigned: true,
    side: "sell",
    tokensIn,
    grossSolOut,
    fee,
    netSolOut: grossSolOut - fee,
    spotPriceBefore: virtualSol / virtualToken,
    spotPriceAfter: virtualSolAfter / virtualTokenAfter,
    virtualSolAfter,
    virtualTokenAfter,
  };
}

function launchPlan(args) {
  const decimals = numberArg(args, "decimals", 9);
  const supply = numberArg(args, "supply", 1_000_000_000);
  const virtualSol = numberArg(args, "virtualSol", 30);
  const virtualToken = numberArg(args, "virtualToken", 1_073_000_000);
  const realSol = numberArg(args, "realSol", 0);
  const realToken = numberArg(args, "realToken", 793_100_000);
  const feeBps = numberArg(args, "feeBps", 100);
  const symbol = String(args.symbol ?? "PAGENT").trim().toUpperCase();
  const name = String(args.name ?? "P-Agent Token").trim();
  const agentName = String(args.agentName ?? "Clawd Agent").trim();
  const network = String(args.network ?? "solana-devnet");
  const pTokenProgramId = String(args.pTokenProgramId ?? DEFAULT_P_TOKEN_PROGRAM_ID);
  return {
    unsigned: true,
    standard: "p-agent-token-v1",
    warning: "Planning artifact only. It does not sign, deploy, create mints, register agents, or move funds.",
    network,
    tokenProgram: "p-token",
    pTokenProgramId,
    computeModel: {
      source: "Febo p-token benchmark notes supplied in repo docs",
      expectedSavings: {
        initializeMint: "352 CU vs 2,906 CU SPL",
        transfer: "1,188 CU vs 4,736 CU SPL",
        mintTo: "849 CU vs 4,301 CU SPL",
        burn: "849 CU vs 4,219 CU SPL",
      },
      design: [
        "Pinocchio AccountInfo points into the input buffer",
        "token mint/account state is read by reference",
        "no owned Borsh token-account deserialization in hot paths",
      ],
    },
    token: {
      name,
      symbol,
      uri: String(args.uri ?? "https://example.com/p-agent-token.json"),
      decimals,
      supply: {
        human: supply,
        baseUnits: tokenAmount(supply, decimals),
      },
    },
    agentIdentity: {
      name: agentName,
      uri: String(args.agentUri ?? "https://example.com/agent.json"),
      owner: String(args.owner ?? "<owner-wallet-or-multisig>"),
      executive: args.executive ? String(args.executive) : null,
      coreAsset: args.agentAsset ? String(args.agentAsset) : "create-new-core-agent-asset",
      compatibility: [
        "MPL Core asset can act as the agent identity shell",
        "Agent Registry can index identity and delegated execution",
        "p-agent-token binding mirrors the irreversible set-agent-token concept",
      ],
    },
    pinocchioProgram: {
      template: "pinocchio/templates/p-agent-token",
      instructions: [
        "initialize_agent",
        "initialize_agent_mint",
        "bind_agent_token",
        "delegate_executor",
        "buy",
        "sell",
        "graduate",
      ],
      pdaSeeds: [
        "agent:<agent_pubkey>",
        "agent_mint:<mint_pubkey>",
        "curve:<mint_pubkey>",
        "vault:<mint_pubkey>",
      ],
      accountRules: [
        "validate mint owner equals configured p-token program id",
        "validate curve and vault PDAs with canonical bumps",
        "separate creator fees, curve reserves, and agent operating balances",
        "make the agent-token binding one-way once finalized",
      ],
    },
    bondingCurve: {
      type: "constant-product",
      virtualSol,
      virtualToken,
      realSol,
      realToken,
      feeBps,
      creatorFeeBps: numberArg(args, "creatorFeeBps", 500),
      spotPrice: virtualSol / virtualToken,
      graduation: {
        trigger: "real-sol-reserve",
        targetSol: numberArg(args, "graduationSol", 85),
        postGraduation: "seed external AMM liquidity after audited migration instruction",
      },
    },
    commands: {
      scaffold: `npm run pinocchio:scaffold -- --template p-agent-token --name ${symbol.toLowerCase()}-agent-token --out ./programs/${symbol.toLowerCase()}-agent-token`,
      plan: `npm run pagent:plan -- --symbol ${symbol} --name "${name}" --agent-name "${agentName}"`,
      quote: `npm run pagent:quote -- --virtual-sol ${virtualSol} --virtual-token ${virtualToken} --sol 1`,
      inspect: "npm run ptoken:inspect -- --mint <mint>",
      register: `npm run ptoken:add -- --mint <mint> --symbol ${symbol} --name "${name}" --p-token-program-id ${pTokenProgramId}`,
    },
    checklist: [
      "create or select the MPL Core agent asset and metadata JSON",
      "scaffold p-agent-token and fill in CPI/account enforcement",
      "unit-test zero-copy state loads and malformed account data",
      "verify signer, PDA, authority handoff, fee, and graduation paths",
      "launch on devnet and inspect the p-token mint owner",
      "register the verified mint in data/ptokens.json",
      "only bind the token to the agent after final review because binding is one-way",
    ],
  };
}

function quote(args) {
  const virtualSol = numberArg(args, "virtualSol", 30);
  const virtualToken = numberArg(args, "virtualToken", 1_073_000_000);
  const feeBps = numberArg(args, "feeBps", 100);
  if (args.tokens !== undefined || args.side === "sell") {
    return sellQuote({ virtualSol, virtualToken, tokensIn: numberArg(args, "tokens", 0), feeBps });
  }
  return buyQuote({ virtualSol, virtualToken, solIn: numberArg(args, "sol", 1), feeBps });
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || args.help) {
    console.log(HELP);
  } else if (args.command === "plan") {
    console.log(JSON.stringify(launchPlan(args), null, 2));
  } else if (args.command === "quote") {
    console.log(JSON.stringify(quote(args), null, 2));
  } else {
    throw new Error(`Unknown command: ${args.command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("");
  console.error(HELP);
  process.exit(1);
}
