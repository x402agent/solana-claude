#!/usr/bin/env node
import process from "node:process";

const DEFAULT_P_TOKEN_PROGRAM_ID = "ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF";

const HELP = `p-token launch planner

Usage:
  node scripts/ptoken-launch-planner.mjs plan --symbol PFOO --name "P Foo"
  node scripts/ptoken-launch-planner.mjs quote --virtual-sol 30 --virtual-token 1073000000 --sol 1

Commands:
  plan      Print an unsigned p-token launch plan and config stub.
  quote     Simulate a constant-product bonding curve buy or sell quote.

Options:
  --symbol <symbol>              Token symbol for plan output.
  --name <name>                  Token display name for plan output.
  --uri <uri>                    Metadata URI.
  --decimals <number>            Mint decimals. Default: 9.
  --supply <number>              Human supply. Default: 1000000000.
  --network <name>               solana-mainnet or solana-devnet. Default: solana-devnet.
  --p-token-program-id <id>      p-token program id. Default: ${DEFAULT_P_TOKEN_PROGRAM_ID}
  --virtual-sol <number>         Virtual SOL reserve for quote. Default: 30.
  --virtual-token <number>       Virtual token reserve for quote. Default: 1073000000.
  --real-sol <number>            Real SOL reserve for quote. Default: 0.
  --real-token <number>          Real token reserve for quote. Default: 793100000.
  --sol <number>                 SOL amount for a buy quote.
  --tokens <number>              Token amount for a sell quote.
  --fee-bps <number>             Fee basis points. Default: 100.
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
  return `${whole}${padded}`.replace(/^0+(?=\d)/, "");
}

function buyQuote({ virtualSol, virtualToken, solIn, feeBps }) {
  if (solIn <= 0) throw new Error("--sol must be greater than zero for a buy quote");
  const fee = solIn * feeBps / 10_000;
  const netSolIn = solIn - fee;
  const k = virtualSol * virtualToken;
  const newVirtualSol = virtualSol + netSolIn;
  const newVirtualToken = k / newVirtualSol;
  const tokensOut = Math.max(0, virtualToken - newVirtualToken);
  return {
    side: "buy",
    solIn,
    fee,
    netSolIn,
    tokensOut,
    spotPriceBefore: virtualSol / virtualToken,
    spotPriceAfter: newVirtualSol / newVirtualToken,
    virtualSolAfter: newVirtualSol,
    virtualTokenAfter: newVirtualToken,
  };
}

function sellQuote({ virtualSol, virtualToken, tokensIn, feeBps }) {
  if (tokensIn <= 0) throw new Error("--tokens must be greater than zero for a sell quote");
  const k = virtualSol * virtualToken;
  const newVirtualToken = virtualToken + tokensIn;
  const newVirtualSol = k / newVirtualToken;
  const grossSolOut = Math.max(0, virtualSol - newVirtualSol);
  const fee = grossSolOut * feeBps / 10_000;
  return {
    side: "sell",
    tokensIn,
    grossSolOut,
    fee,
    netSolOut: grossSolOut - fee,
    spotPriceBefore: virtualSol / virtualToken,
    spotPriceAfter: newVirtualSol / newVirtualToken,
    virtualSolAfter: newVirtualSol,
    virtualTokenAfter: newVirtualToken,
  };
}

function launchPlan(args) {
  const decimals = numberArg(args, "decimals", 9);
  const supply = numberArg(args, "supply", 1_000_000_000);
  const virtualSol = numberArg(args, "virtualSol", 30);
  const virtualToken = numberArg(args, "virtualToken", 1_073_000_000);
  const realToken = numberArg(args, "realToken", 793_100_000);
  const realSol = numberArg(args, "realSol", 0);
  const symbol = String(args.symbol ?? "PFOO").toUpperCase();
  const name = String(args.name ?? "Example p-token");
  const uri = String(args.uri ?? "https://example.com/metadata.json");
  const network = String(args.network ?? "solana-devnet");
  const pTokenProgramId = String(args.pTokenProgramId ?? DEFAULT_P_TOKEN_PROGRAM_ID);
  return {
    unsigned: true,
    warning: "This is a planning artifact. It does not sign transactions or deploy a program.",
    network,
    tokenProgram: "p-token",
    pTokenProgramId,
    metadata: { name, symbol, uri, decimals },
    supply: {
      human: supply,
      baseUnits: tokenAmount(supply, decimals),
    },
    bondingCurve: {
      type: "constant-product",
      virtualSol,
      virtualToken,
      realSol,
      realToken,
      feeBps: numberArg(args, "feeBps", 100),
      spotPrice: virtualSol / virtualToken,
      graduation: {
        trigger: "real-sol-reserve",
        targetSol: numberArg(args, "graduationSol", 85),
        actions: [
          "freeze launch buys and sells",
          "seed AMM liquidity from curve reserves",
          "register mint in data/ptokens.json",
          "enable x402 P_TOKEN_PROGRAM_ID or USE_P_TOKEN routing",
        ],
      },
    },
    checklist: [
      "scaffold the p-token launcher template",
      "audit PDA seeds, authority handoff, and close paths",
      "create mint and metadata with the selected p-token program",
      "wire curve account checks before accepting buys or sells",
      "run ptoken:inspect against the mint",
      "run ptoken:add after launch verification",
    ],
    commands: {
      scaffold: `npm run pinocchio:scaffold -- --template p-token-launcher --name ${symbol.toLowerCase()}-launch --out ./programs/${symbol.toLowerCase()}-launch`,
      inspect: "npm run ptoken:inspect -- --mint <mint>",
      register: `npm run ptoken:add -- --mint <mint> --symbol ${symbol} --name "${name}" --p-token-program-id ${pTokenProgramId}`,
      quote: `npm run ptoken:curve-quote -- --virtual-sol ${virtualSol} --virtual-token ${virtualToken} --sol 1`,
    },
  };
}

function quote(args) {
  const virtualSol = numberArg(args, "virtualSol", 30);
  const virtualToken = numberArg(args, "virtualToken", 1_073_000_000);
  const feeBps = numberArg(args, "feeBps", 100);
  if (args.tokens !== undefined) {
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
