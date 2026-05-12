import express from "express";
import { execFile } from "child_process";
import { existsSync, readFileSync } from "fs";
import { promisify } from "util";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(__dirname, "public");
const MANIFEST_PATH = join(ROOT, "generated", "openclawd.agent-store.json");
const CATALOG_PATH = join(ROOT, "catalog.json");
const FRONTIER_PATH = join(ROOT, "frontier-inspirations.json");

loadEnvFile(join(__dirname, ".env.local"));

const app = express();
const port = Number(process.env.PORT || 4318);

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: "openclawd-agent-storefront",
    secretsProtected: true,
  });
});

app.get("/api/config", (_req, res) => {
  const merchantSecretsPresent = [
    "MOONPAY_SECRET_KEY",
    "MOONPAY_WEBHOOK_KEY",
    "MOONPAY_SIGNING_SECRET",
    "MOONPAY_WEBHOOK_SECRET",
    "MERCHANT_PW",
  ].some((key) => hasRealValue(process.env[key]));

  res.json({
    public: {
      googleApiKey: process.env.GOOGLE_API_KEY || "",
      moonPayMerchantId: process.env.MOONPAY_MERCHANT_ID || "",
      moonPayWallet: process.env.MOONPAY_WALLET || "",
      moonPayApiKey: process.env.MOONPAY_API_KEY || "",
      merchantServer: process.env.MERCHANT_SERVER || "",
      merchantPort: process.env.MERCHANT_PORT || "",
      merchantBucket: process.env.MERCHANT_GOOGLE_CLOUD_BUCKET || "",
    },
    guards: {
      secretsProtected: true,
      googleKeyShouldBeRestricted: Boolean(process.env.GOOGLE_API_KEY),
      moonPaySecretsLoadedServerSide: merchantSecretsPresent,
    },
  });
});

app.get("/api/store", (_req, res) => {
  res.json({
    manifest: readJson(MANIFEST_PATH),
    catalog: readJson(CATALOG_PATH),
  });
});

app.get("/api/frontier", (_req, res) => {
  const frontier = readJson(FRONTIER_PATH) as {
    themes?: string[];
    companies?: Array<{
      name: string;
      cohort: string;
      theme: string;
      signal: string;
      adaptation: string;
    }>;
  };
  const companies = frontier.companies || [];
  const groups = Object.entries(
    companies.reduce<Record<string, typeof companies>>((acc, company) => {
      if (!acc[company.theme]) acc[company.theme] = [];
      acc[company.theme].push(company);
      return acc;
    }, {}),
  ).map(([theme, entries]) => ({
    theme,
    count: entries.length,
    companies: entries,
  }));

  res.json({
    themes: frontier.themes || [],
    totalCompanies: companies.length,
    groups,
    thesis: [
      "private-first agent commerce",
      "stablecoin and USDC-native monetization",
      "always-on agent infrastructure with sandbox execution",
      "judge-facing mapping to backed Solana startup patterns",
    ],
  });
});

app.get("/api/moonpay/capabilities", async (_req, res) => {
  const moonPayCli = await detectMoonPayCli();
  res.json({
    installed: moonPayCli.installed,
    version: moonPayCli.version,
    surfaces: ["checkout", "cli", "mcp", "rest"],
    safety: [
      "local wallet keys stay on the machine",
      "simulate before execute for server-side trading tools",
      "do not expose MoonPay secret keys to the browser",
    ],
    suggestedCommands: moonPayCli.installed
      ? [
          "mp login --email you@example.com",
          "mp wallet create --name main",
          "mp buy --token sol --amount 50 --wallet main --email you@example.com",
          "mp deposit create --name 'OpenClawd Deposit' --wallet main --chain solana --token USDC",
          "mp mcp",
        ]
      : [
          "npm install -g @moonpay/cli",
          "mp login --email you@example.com",
          "mp wallet create --name main",
          "mp mcp",
        ],
  });
});

app.post("/api/moonpay/buy-link", (req, res) => {
  const amount = cleanAmount(req.body?.amount, "50");
  const email = cleanString(req.body?.email);
  const walletAddress = process.env.MOONPAY_WALLET || "";
  const url = buildMoonPayUrl({
    apiKey: process.env.MOONPAY_API_KEY || "",
    merchantId: process.env.MOONPAY_MERCHANT_ID || "",
    walletAddress,
    amount,
    email,
  });

  res.json({
    ok: Boolean(url),
    url,
    mode: "checkout",
    walletAddress,
    amountUsd: amount,
  });
});

app.get("/api/moonpay/workbench", async (_req, res) => {
  const moonPayCli = await detectMoonPayCli();
  res.json({
    cliInstalled: moonPayCli.installed,
    version: moonPayCli.version,
    lanes: [
      {
        id: "fiat-onramp",
        title: "Fiat Onramp",
        actions: [
          "MoonPay checkout link for hackathon buyers",
          "MoonPay CLI buy flow for operators",
          "Virtual account onboarding after KYC",
        ],
      },
      {
        id: "agent-wallets",
        title: "Agent Wallets",
        actions: [
          "create HD wallets per operator or agent lane",
          "check token balances before settlement tasks",
          "register wallet for deposit or virtual-account flows",
        ],
      },
      {
        id: "agent-trading",
        title: "Agent Trading",
        actions: [
          "simulate swap or bridge before execution",
          "expose CLI or MCP only to trusted operator flows",
          "route final settlement back to HERMES and Apigee policy",
        ],
      },
    ],
    mcp: {
      command: "mp mcp",
      config: {
        mcpServers: {
          moonpay: {
            command: "mp",
            args: ["mcp"],
          },
        },
      },
    },
  });
});

app.get("*", (_req, res) => {
  res.sendFile(join(PUBLIC_DIR, "index.html"));
});

app.listen(port, () => {
  console.log(`OpenClawd storefront listening on http://127.0.0.1:${port}`);
});

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function hasRealValue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "replace_me" && normalized !== "missing";
}

async function detectMoonPayCli(): Promise<{ installed: boolean; version: string | null }> {
  try {
    const { stdout } = await execFileAsync("mp", ["--version"]);
    return { installed: true, version: stdout.trim() || "unknown" };
  } catch {
    return { installed: false, version: null };
  }
}

function buildMoonPayUrl(input: {
  apiKey: string;
  merchantId: string;
  walletAddress: string;
  amount: string;
  email: string;
}): string | null {
  if (!hasRealValue(input.apiKey) || !hasRealValue(input.walletAddress)) return null;
  const params = new URLSearchParams({
    apiKey: input.apiKey,
    walletAddress: input.walletAddress,
    currencyCode: "usdc_sol",
    baseCurrencyCode: "usd",
    baseCurrencyAmount: input.amount,
    showWalletAddressForm: "false",
    lockAmount: "false",
    externalCustomerId: "openclawd-hackathon",
  });
  if (hasRealValue(input.merchantId)) params.set("merchantId", input.merchantId);
  if (hasRealValue(input.email)) params.set("email", input.email);
  return `https://buy.moonpay.com?${params.toString()}`;
}

function cleanAmount(value: unknown, fallback: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return numeric.toFixed(2).replace(/\.00$/, "");
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
