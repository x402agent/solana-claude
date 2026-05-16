import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";

export type VulcanMode = "paper" | "dry_run" | "confirm_each" | "auto_execute";

export interface VulcanMarket {
  symbol: string;
  markPrice: number;
  fundingRate: number;
  openInterest: number;
  volume24h?: number;
  change24h?: number;
}

export interface VulcanCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  json?: unknown;
}

const FALLBACK_MARKETS: VulcanMarket[] = [
  { symbol: "SOL", markPrice: 0, fundingRate: 0, openInterest: 0 },
  { symbol: "BTC", markPrice: 0, fundingRate: 0, openInterest: 0 },
  { symbol: "ETH", markPrice: 0, fundingRate: 0, openInterest: 0 },
];

export function resolveVulcanBinary(): string | null {
  const direct = spawnSync("vulcan", ["version"], { stdio: "ignore" });
  if (direct.status === 0) return "vulcan";

  const candidates = [
    path.resolve(process.cwd(), "vulcan-cli-master/target/debug/vulcan"),
    path.resolve(process.cwd(), "../../../vulcan-cli-master/target/debug/vulcan"),
    path.resolve(process.env.HOME || "", ".local/bin/vulcan"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function isVulcanInstalled(): boolean {
  return resolveVulcanBinary() !== null;
}

export function vulcanInstallHint(): string {
  return "curl -fsSL https://github.com/Ellipsis-Labs/vulcan-cli/releases/latest/download/install.sh | sh";
}

export function normalizeSymbol(symbol?: string): string {
  return (symbol || "SOL").replace(/-PERP$/i, "").toUpperCase();
}

export function runVulcanJson(args: string[], timeoutMs = 12_000): Promise<VulcanCommandResult> {
  const vulcan = resolveVulcanBinary();
  if (!vulcan) {
    return Promise.resolve({
      ok: false,
      stdout: "",
      stderr: "Vulcan CLI not installed",
      status: 127,
    });
  }

  const finalArgs = args.includes("-o") || args.includes("--output") ? args : [...args, "-o", "json"];

  return new Promise((resolve) => {
    const child = spawn(vulcan, finalArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (status) => {
      clearTimeout(timer);
      let json: unknown;
      try {
        json = stdout.trim() ? JSON.parse(stdout) : undefined;
      } catch {
        json = undefined;
      }
      resolve({ ok: status === 0, stdout, stderr, status, json });
    });
  });
}

export function spawnVulcanInherited(args: string[]) {
  const vulcan = resolveVulcanBinary();
  if (!vulcan) {
    throw new Error(`Vulcan CLI not installed. Install it with: ${vulcanInstallHint()}`);
  }
  return spawn(vulcan, args, { stdio: "inherit" });
}

export async function loadMarkets(): Promise<VulcanMarket[]> {
  const result = await runVulcanJson(["market", "list"]);
  if (!result.ok || !result.json) return FALLBACK_MARKETS;
  return normalizeMarkets(result.json);
}

export async function loadTraderSnapshot(symbol = "SOL"): Promise<{
  markets: VulcanMarket[];
  ticker?: unknown;
  portfolio?: unknown;
  positions?: unknown;
  health?: unknown;
  source: "live" | "fallback";
}> {
  const sym = normalizeSymbol(symbol);
  const [markets, ticker, portfolio, positions, health] = await Promise.all([
    loadMarkets(),
    runVulcanJson(["market", "ticker", sym]),
    runVulcanJson(["portfolio"]),
    runVulcanJson(["position", "list"]),
    runVulcanJson(["agent", "health"]),
  ]);

  return {
    markets,
    ticker: ticker.json,
    portfolio: portfolio.json,
    positions: positions.json,
    health: health.json,
    source: ticker.ok || portfolio.ok ? "live" : "fallback",
  };
}

export function mapPerpsArgs(subArgs: string[]): string[] {
  const [sub, ...rest] = subArgs;

  switch (sub) {
    case "markets": return ["market", "list", ...withOutput(rest)];
    case "ticker": return ["market", "ticker", normalizeSymbol(rest[0]), ...withOutput(rest.slice(1))];
    case "info": return ["market", "info", normalizeSymbol(rest[0]), ...withOutput(rest.slice(1))];
    case "book": return ["market", "orderbook", normalizeSymbol(rest[0]), ...withOutput(rest.slice(1))];
    case "candles": return ["market", "candles", normalizeSymbol(rest[0]), ...withOutput(rest.slice(1))];
    case "trades": return ["market", "trades", normalizeSymbol(rest[0]), ...withOutput(rest.slice(1))];
    case "funding": return ["market", "funding-rates", normalizeSymbol(rest[0]), ...withOutput(rest.slice(1))];

    case "health": return ["agent", "health", ...withOutput(rest)];
    case "preflight": return ["strategy", "preflight", ...withOutput(rest)];
    case "status": return ["portfolio", ...withOutput(rest)];
    case "positions": return ["position", "list", ...withOutput(rest)];
    case "orders": return ["trade", "orders", ...withOutput(rest)];
    case "history": return ["history", ...withOutput(rest)];
    case "paper": return ["paper", ...withOutput(rest)];

    case "long":
      return ["trade", "market-buy", normalizeSymbol(rest[0]), ...ensureYes(rest.slice(1))];
    case "short":
      return ["trade", "market-sell", normalizeSymbol(rest[0]), ...ensureYes(rest.slice(1))];
    case "close":
      return ["position", "close", normalizeSymbol(rest[0]), ...ensureYes(rest.slice(1))];
    case "tp-sl":
    case "tpsl":
      return ["trade", "set-tpsl", normalizeSymbol(rest[0]), ...ensureYes(rest.slice(1))];

    case "twap": return ["strategy", "twap", "start", "--symbol", normalizeSymbol(rest[0]), ...strategySafety(rest.slice(1))];
    case "grid": return ["strategy", "grid", "start", "--symbol", normalizeSymbol(rest[0]), ...strategySafety(rest.slice(1))];
    case "ta": return ["strategy", "ta", "start", "--symbol", normalizeSymbol(rest[0]), ...strategySafety(rest.slice(1))];
    case "runs": return ["strategy", "runs", ...withOutput(rest)];
    case "monitor": return ["strategy", "monitor", ...withOutput(rest)];
    case "wait-next-tick": return ["strategy", "wait-next-tick", ...withOutput(rest)];
    case "finalize": return ["strategy", "finalize", ...ensureYes(rest)];
    case "agent": return ["agent", ...withOutput(rest)];
    case "setup": return ["setup", ...rest];

    default: return withOutput([sub ?? "market", ...rest].filter(Boolean));
  }
}

function withOutput(args: string[]): string[] {
  return args.includes("-o") || args.includes("--output") ? args : [...args, "-o", "table"];
}

function ensureYes(args: string[]): string[] {
  return args.includes("--yes") || args.includes("--dry-run") ? args : [...args, "--yes"];
}

function strategySafety(args: string[]): string[] {
  const hasMode = args.includes("--mode");
  const mode = hasMode ? args[args.indexOf("--mode") + 1] : "paper";
  const withMode = hasMode ? args : [...args, "--mode", "paper"];
  if (mode === "auto_execute" || mode === "confirm_each") return ensureYes(withMode);
  return withMode;
}

function normalizeMarkets(payload: unknown): VulcanMarket[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as any)?.markets)
      ? (payload as any).markets
      : Array.isArray((payload as any)?.data)
        ? (payload as any).data
        : [];

  const markets = rows.map((row: any) => ({
    symbol: normalizeSymbol(row.symbol ?? row.market ?? row.name),
    markPrice: numberFrom(row.markPrice ?? row.mark_price ?? row.price ?? row.index_price),
    fundingRate: numberFrom(row.fundingRate ?? row.funding_rate ?? row.funding ?? 0),
    openInterest: numberFrom(row.openInterest ?? row.open_interest ?? row.oi ?? 0),
    volume24h: numberFrom(row.volume24h ?? row.volume_24h ?? row.volume),
    change24h: numberFrom(row.change24h ?? row.change_24h ?? row.price_change_24h),
  })).filter((row: VulcanMarket) => row.symbol !== "SOL" || row.markPrice !== 0);

  return markets.length > 0 ? markets : FALLBACK_MARKETS;
}

function numberFrom(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
