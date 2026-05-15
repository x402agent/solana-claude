#!/usr/bin/env node
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const publicRoot = join(__dirname, "public");
const registryPath = resolve(repoRoot, "data/ptokens.json");

const PORT = Number(process.env.PORT ?? 8787);
const DEFAULT_RPC = process.env.SOLANA_RPC_URL ?? process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com";
const DEFAULT_P_TOKEN_PROGRAM_ID = process.env.P_TOKEN_PROGRAM_ID ?? "ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF";
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`p-token launcher workbench: http://localhost:${PORT}`);
});

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      unsigned: true,
      network: inferNetwork(DEFAULT_RPC),
      rpcConfigured: Boolean(process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL),
      pTokenProgramId: DEFAULT_P_TOKEN_PROGRAM_ID,
      adapters: ["wdk-intent", "browser-wallet", "agent-review", "human-review"],
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/registry") {
    sendJson(res, 200, readRegistry());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/examples") {
    sendJson(res, 200, {
      launchConfig: readJson(join(__dirname, "launch-config.example.json")),
      bondingCurve: readJson(join(__dirname, "bonding-curve.example.json")),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/launch-plan") {
    sendJson(res, 200, launchPlan(await readJsonBody(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/quote") {
    sendJson(res, 200, quote(await readJsonBody(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/rise-floor") {
    sendJson(res, 200, riseFloor(await readJsonBody(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/perp-plan") {
    sendJson(res, 200, perpPlan(await readJsonBody(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/wdk-intent") {
    sendJson(res, 200, wdkIntent(await readJsonBody(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/inspect") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await inspectMint(String(body.mint ?? ""), body));
    return;
  }

  sendJson(res, 404, { error: `No route for ${req.method} ${url.pathname}` });
}

function serveStatic(res, pathname) {
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const path = resolve(publicRoot, `.${normalized}`);
  if (!path.startsWith(publicRoot) || !existsSync(path)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  res.writeHead(200, { "content-type": mimeTypes[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readRegistry() {
  if (!existsSync(registryPath)) return { version: 1, tokens: [] };
  const parsed = readJson(registryPath);
  return { version: parsed.version ?? 1, tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [] };
}

function numberArg(input, key, fallback) {
  const raw = input[key];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key}: ${raw}`);
  return value;
}

function tokenAmount(humanAmount, decimals) {
  const [whole, frac = ""] = String(humanAmount).split(".");
  const padded = `${frac}${"0".repeat(decimals)}`.slice(0, decimals);
  return `${whole}${padded}`.replace(/^0+(?=\d)/, "") || "0";
}

function launchPlan(input) {
  const symbol = String(input.symbol ?? "PQC").trim().toUpperCase();
  const name = String(input.name ?? "Quantum Compute p-token").trim();
  const decimals = numberArg(input, "decimals", 9);
  const supply = numberArg(input, "supply", 1_000_000_000);
  const virtualSol = numberArg(input, "virtualSol", 30);
  const virtualToken = numberArg(input, "virtualToken", 1_073_000_000);
  const realSol = numberArg(input, "realSol", 0);
  const realToken = numberArg(input, "realToken", 793_100_000);
  const feeBps = numberArg(input, "feeBps", 100);
  const floor = riseFloor({ ...input, virtualSol, virtualToken, feeBps });
  return {
    unsigned: true,
    warning: "Planning artifact only. No deploy, signing, mint creation, transfers, borrows, or trades are executed.",
    network: String(input.network ?? "solana-devnet"),
    audience: ["agents", "humans", "quantum-compute operators"],
    tokenProgram: "p-token",
    pTokenProgramId: String(input.pTokenProgramId ?? DEFAULT_P_TOKEN_PROGRAM_ID),
    metadata: {
      name,
      symbol,
      uri: String(input.uri ?? "https://example.com/pqc.json"),
      decimals,
      thesis: String(input.thesis ?? "p-token launchpad for compute, agents, and human trading coordination."),
    },
    supply: {
      human: supply,
      baseUnits: tokenAmount(supply, decimals),
    },
    authorities: {
      mintAuthority: String(input.mintAuthority ?? "<wallet-or-pda>"),
      freezeAuthority: input.freezeAuthority ? String(input.freezeAuthority) : null,
      updateAuthority: String(input.updateAuthority ?? "<wallet-or-pda>"),
    },
    bondingCurve: {
      enabled: input.bondingCurve !== false,
      type: "constant-product",
      virtualSol,
      virtualToken,
      realSol,
      realToken,
      feeBps,
      spotPrice: virtualSol / virtualToken,
      graduation: {
        trigger: "real-sol-reserve",
        targetSol: numberArg(input, "graduationSol", 85),
        postGraduation: "seed-amm-liquidity",
      },
    },
    riseStyleFloor: floor,
    perpetuals: perpPlan(input),
    wdk: wdkIntent({ action: "launch-plan", ...input, symbol, name }),
    checklist: [
      "review p-token program id and target cluster",
      "lock PDA seeds, reserve custody, signer checks, and authority handoff in Pinocchio code",
      "simulate buy, sell, borrow, repay, loop, and graduation state transitions",
      "wire WDK/browser wallet signing only after human or policy approval",
      "inspect the mint over RPC before registry changes",
      "register verified mint in data/ptokens.json",
      "enable x402 P_TOKEN_PROGRAM_ID or USE_P_TOKEN routing only after verification",
    ],
  };
}

function quote(input) {
  const virtualSol = numberArg(input, "virtualSol", 30);
  const virtualToken = numberArg(input, "virtualToken", 1_073_000_000);
  const feeBps = numberArg(input, "feeBps", 100);
  if (input.side === "sell" || input.tokens !== undefined) {
    const tokensIn = numberArg(input, "tokens", 1_000_000);
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
  const solIn = numberArg(input, "sol", 1);
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

function riseFloor(input) {
  const virtualSol = numberArg(input, "virtualSol", 30);
  const virtualToken = numberArg(input, "virtualToken", 1_073_000_000);
  const athPrice = numberArg(input, "athPrice", virtualSol / virtualToken);
  const floorRatio = Math.min(numberArg(input, "floorRatio", 0.5), 0.95);
  const protocolSol = numberArg(input, "protocolSol", numberArg(input, "realSol", 0));
  const circulatingTokens = numberArg(input, "circulatingTokens", numberArg(input, "realToken", 793_100_000));
  const floorPrice = athPrice * floorRatio;
  const floorLiabilitySol = floorPrice * circulatingTokens;
  return {
    unsigned: true,
    model: "rise-style-floor-planning",
    note: "This models a protocol floor for planning. Program code must enforce reserve ownership, borrow caps, and repayment accounting.",
    athPrice,
    floorRatio,
    floorPrice,
    protocolSol,
    circulatingTokens,
    floorLiabilitySol,
    coverageRatio: floorLiabilitySol > 0 ? protocolSol / floorLiabilitySol : null,
    borrow: {
      maxLoanToFloorBps: numberArg(input, "maxLoanToFloorBps", 6500),
      originationFeeBps: numberArg(input, "originationFeeBps", 150),
      liquidation: "none-in-model",
    },
  };
}

function perpPlan(input) {
  const collateralSol = numberArg(input, "collateralSol", 1);
  const leverage = Math.max(1, numberArg(input, "leverage", 2));
  const markPrice = numberArg(input, "markPrice", numberArg(input, "virtualSol", 30) / numberArg(input, "virtualToken", 1_073_000_000));
  const maintenanceMarginBps = numberArg(input, "maintenanceMarginBps", 500);
  const notionalSol = collateralSol * leverage;
  return {
    unsigned: true,
    venue: "p-token-perpetual-planner",
    market: String(input.market ?? `${String(input.symbol ?? "PQC").toUpperCase()}-PERP`),
    side: String(input.perpSide ?? "long"),
    collateralSol,
    leverage,
    notionalSol,
    markPrice,
    baseSize: markPrice > 0 ? notionalSol / markPrice : 0,
    maintenanceMarginBps,
    liquidation: "planner-only; enforce in perp program or external venue",
    riskChecks: [
      "cap leverage by actor type",
      "require oracle freshness",
      "separate launch reserves from perp collateral",
      "reject agent trades without policy approval",
    ],
  };
}

function wdkIntent(input) {
  const actor = String(input.actor ?? "human-or-agent");
  const action = String(input.action ?? "launch-plan");
  return {
    unsigned: true,
    adapter: "wdk-intent",
    actor,
    action,
    chain: "solana",
    network: String(input.network ?? "solana-devnet"),
    walletModule: "@tetherto/wdk-wallet-solana",
    reviewRequired: true,
    instructions: [
      {
        label: "create-or-select-p-token-program",
        programId: String(input.pTokenProgramId ?? DEFAULT_P_TOKEN_PROGRAM_ID),
      },
      {
        label: "create-mint",
        symbol: String(input.symbol ?? "PQC").toUpperCase(),
        decimals: numberArg(input, "decimals", 9),
      },
      {
        label: "initialize-curve",
        virtualSol: numberArg(input, "virtualSol", 30),
        virtualToken: numberArg(input, "virtualToken", 1_073_000_000),
      },
      {
        label: "register-after-verification",
        registry: "data/ptokens.json",
      },
    ],
  };
}

async function inspectMint(mint, input) {
  if (!mint || mint.length < 32) throw new Error("mint is required");
  const rpcUrl = String(input.rpc ?? DEFAULT_RPC);
  const pTokenProgramId = String(input.pTokenProgramId ?? DEFAULT_P_TOKEN_PROGRAM_ID);
  const account = await rpc(rpcUrl, "getAccountInfo", [mint, { encoding: "base64", commitment: "confirmed" }]);
  if (!account.value) return { exists: false, mint, network: inferNetwork(rpcUrl) };
  const ownerProgram = account.value.owner;
  const data = Buffer.from(account.value.data[0], "base64");
  return {
    exists: true,
    mint,
    network: inferNetwork(rpcUrl),
    ownerProgram,
    tokenProgram: classifyTokenProgram(ownerProgram, pTokenProgramId),
    lamports: account.value.lamports,
    executable: account.value.executable,
    dataLen: data.length,
    mintLayout: data.length >= 82 ? parseMintLayout(data) : null,
  };
}

async function rpc(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "ptoken-launcher-workbench", method, params }),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message ?? JSON.stringify(json.error)}`);
  return json.result;
}

function parseMintLayout(data) {
  const mintAuthorityOption = data.readUInt32LE(0);
  const freezeAuthorityOption = data.readUInt32LE(46);
  return {
    mintAuthority: mintAuthorityOption ? base58(data.subarray(4, 36)) : null,
    supply: data.readBigUInt64LE(36).toString(),
    decimals: data[44],
    isInitialized: data[45] === 1,
    freezeAuthority: freezeAuthorityOption ? base58(data.subarray(50, 82)) : null,
  };
}

function classifyTokenProgram(ownerProgram, pTokenProgramId) {
  if (pTokenProgramId && ownerProgram === pTokenProgramId) return "p-token";
  if (ownerProgram === SPL_TOKEN_PROGRAM_ID) return "spl";
  return "custom";
}

function inferNetwork(rpcUrl) {
  return rpcUrl.includes("mainnet") ? "solana-mainnet" : "solana-devnet";
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(bytes) {
  let num = 0n;
  for (const byte of bytes) num = (num << 8n) + BigInt(byte);
  let encoded = "";
  while (num > 0n) {
    const rem = Number(num % 58n);
    num /= 58n;
    encoded = ALPHABET[rem] + encoded;
  }
  for (const byte of bytes) {
    if (byte === 0) encoded = `1${encoded}`;
    else break;
  }
  return encoded || "1";
}
