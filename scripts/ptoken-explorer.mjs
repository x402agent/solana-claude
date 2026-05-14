#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const DEFAULT_REGISTRY = resolve(repoRoot, "data/ptokens.json");
const DEFAULT_RPC = process.env.SOLANA_RPC_URL ?? process.env.HELIUS_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const [command, ...rawArgs] = process.argv.slice(2);
const args = parseArgs(rawArgs);

async function main() {
  switch (command) {
    case "add":
      await addToken(required("mint"), args);
      break;
    case "inspect":
      await inspectToken(required("mint"), args);
      break;
    case "list":
      listTokens(args);
      break;
    case "show":
      showToken(required("mint"), args);
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

async function inspectToken(mint, options) {
  const token = await fetchMintProfile(mint, options);
  printToken(token);
}

async function addToken(mint, options) {
  const registryPath = resolve(options.registry ?? DEFAULT_REGISTRY);
  const registry = readRegistry(registryPath);
  const token = await fetchMintProfile(mint, options);
  const now = new Date().toISOString();
  const entry = {
    ...token,
    tags: parseCsv(options.tags),
    addedAt: now,
    updatedAt: now,
  };

  const idx = registry.tokens.findIndex((t) => t.mint === mint);
  if (idx >= 0) {
    registry.tokens[idx] = { ...registry.tokens[idx], ...entry, addedAt: registry.tokens[idx].addedAt ?? now };
  } else {
    registry.tokens.push(entry);
  }
  registry.tokens.sort((a, b) => (a.symbol || a.mint).localeCompare(b.symbol || b.mint));
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(`added ${entry.symbol} ${entry.mint}`);
  printToken(entry);
}

function listTokens(options) {
  const registry = readRegistry(resolve(options.registry ?? DEFAULT_REGISTRY));
  if (registry.tokens.length === 0) {
    console.log("No p-tokens registered yet.");
    return;
  }
  for (const token of registry.tokens) {
    console.log(`${(token.symbol ?? "?").padEnd(12)} ${token.mint} ${token.network} ${token.tokenProgram}`);
  }
}

function showToken(mint, options) {
  const registry = readRegistry(resolve(options.registry ?? DEFAULT_REGISTRY));
  const token = registry.tokens.find((t) => t.mint === mint || t.symbol?.toLowerCase() === mint.toLowerCase());
  if (!token) throw new Error(`token not found in registry: ${mint}`);
  printToken(token);
}

async function fetchMintProfile(mint, options) {
  const rpcUrl = options.rpc ?? DEFAULT_RPC;
  const network = options.network ?? inferNetwork(rpcUrl);
  const pTokenProgramId = options.pTokenProgramId ?? process.env.P_TOKEN_PROGRAM_ID;
  const account = await rpc(rpcUrl, "getAccountInfo", [
    mint,
    { encoding: "base64", commitment: "confirmed" },
  ]);
  if (!account.value) throw new Error(`mint account not found: ${mint}`);

  const ownerProgram = account.value.owner;
  const data = Buffer.from(account.value.data[0], "base64");
  const mintLayout = parseMintLayout(data);
  const supply = await rpc(rpcUrl, "getTokenSupply", [mint]).catch(() => null);
  const metadata = await fetchDasMetadata(rpcUrl, mint);
  const tokenProgram = classifyTokenProgram(ownerProgram, pTokenProgramId, options.tokenProgram);
  const symbol = options.symbol ?? metadata?.symbol ?? shortSymbol(mint, tokenProgram);
  const name = options.name ?? metadata?.name ?? `${symbol} p-token`;

  return {
    mint,
    symbol,
    name,
    network,
    tokenProgram,
    ownerProgram,
    pTokenProgramId: tokenProgram === "p-token" ? ownerProgram : undefined,
    decimals: supply?.value?.decimals ?? mintLayout.decimals,
    supply: supply?.value?.amount ?? mintLayout.supply,
    uiSupply: supply?.value?.uiAmountString ?? formatUiAmount(mintLayout.supply, mintLayout.decimals),
    isInitialized: mintLayout.isInitialized,
    mintAuthority: mintLayout.mintAuthority,
    freezeAuthority: mintLayout.freezeAuthority,
    links: explorerLinks(network, mint),
  };
}

function parseMintLayout(data) {
  if (data.length < 82) throw new Error(`account is too short for an SPL-compatible mint: ${data.length} bytes`);
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

async function fetchDasMetadata(rpcUrl, mint) {
  try {
    const asset = await rpc(rpcUrl, "getAsset", [{ id: mint }]);
    return {
      name: asset?.content?.metadata?.name,
      symbol: asset?.content?.metadata?.symbol,
    };
  } catch {
    return null;
  }
}

function classifyTokenProgram(ownerProgram, pTokenProgramId, explicit) {
  if (explicit && explicit !== "auto") return explicit;
  if (pTokenProgramId && ownerProgram === pTokenProgramId) return "p-token";
  if (ownerProgram === SPL_TOKEN_PROGRAM_ID) return "spl";
  return "custom";
}

async function rpc(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "ptoken-explorer", method, params }),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message ?? JSON.stringify(json.error)}`);
  return json.result;
}

function readRegistry(path) {
  if (!existsSync(path)) return { version: 1, tokens: [] };
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return { version: parsed.version ?? 1, tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [] };
}

function parseArgs(values) {
  const out = {};
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = values[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function required(name) {
  const value = args[name];
  if (!value || value === true) throw new Error(`missing --${name}`);
  return value;
}

function inferNetwork(rpcUrl) {
  return rpcUrl.includes("devnet") ? "solana-devnet" : "solana-mainnet";
}

function shortSymbol(mint, tokenProgram) {
  return tokenProgram === "p-token" ? `P-${mint.slice(0, 4).toUpperCase()}` : mint.slice(0, 6).toUpperCase();
}

function explorerLinks(network, mint) {
  const cluster = network === "solana-devnet" ? "?cluster=devnet" : "";
  return {
    solanaExplorer: `https://explorer.solana.com/address/${mint}${cluster}`,
    solscan: `https://solscan.io/token/${mint}${network === "solana-devnet" ? "?cluster=devnet" : ""}`,
  };
}

function formatUiAmount(amount, decimals) {
  const raw = BigInt(amount);
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const frac = (raw % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function parseCsv(value) {
  if (!value || value === true) return [];
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

function printToken(token) {
  console.log(JSON.stringify(token, null, 2));
}

function printHelp() {
  console.log(`p-token explorer

Commands:
  add      --mint <mint> [--symbol PFOO] [--name "P Foo"] [--p-token-program-id <program>]
  inspect  --mint <mint> [--rpc <url>] [--p-token-program-id <program>]
  list     [--registry data/ptokens.json]
  show     --mint <mint-or-symbol>

Options:
  --rpc                 Solana RPC URL. Defaults to SOLANA_RPC_URL, HELIUS_RPC_URL, then mainnet.
  --registry            Registry file path. Defaults to data/ptokens.json.
  --network             solana-mainnet or solana-devnet. Inferred from RPC when omitted.
  --token-program       auto, spl, p-token, or custom. Defaults to auto.
  --p-token-program-id  Program id used to classify p-token mints.
  --tags                Comma-separated registry tags.
`);
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
    if (byte === 0) encoded = "1" + encoded;
    else break;
  }
  return encoded || "1";
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
