import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

export type OnchainMmOptions = {
  market?: string;
  ticker?: string;
  rpcUrl?: string;
  keypairPath?: string;
  quoteEdgeBps?: number;
  quoteSize?: number;
  refreshMs?: number;
  priceImprovement?: string;
  postOnly?: boolean;
  release?: boolean;
  yes?: boolean;
};

const DEFAULT_SOL_USDC_MARKET = "HhHRvLFvZid6FD7C96H93F2MkASjYfYAx8Y2P8KMAr6b";

function repoCandidates(): string[] {
  const explicit = process.env.CLAWD_ONCHAIN_MM_ROOT;
  const cwd = process.cwd();
  return [
    ...(explicit ? [explicit] : []),
    resolve(cwd, "Perps", "phoenix-onchain-market-maker-master"),
    resolve(cwd, "..", "Perps", "phoenix-onchain-market-maker-master"),
    resolve(cwd, "..", "..", "Perps", "phoenix-onchain-market-maker-master"),
    resolve(cwd, "..", "..", "..", "Perps", "phoenix-onchain-market-maker-master"),
  ];
}

export function resolveOnchainMmRoot(): string {
  for (const candidate of repoCandidates()) {
    if (existsSync(resolve(candidate, "Cargo.toml")) && existsSync(resolve(candidate, "mm", "Cargo.toml"))) {
      return candidate;
    }
  }
  return process.env.CLAWD_ONCHAIN_MM_ROOT || resolve(process.cwd(), "Perps", "phoenix-onchain-market-maker-master");
}

function binPath(root: string, release = false): string {
  return resolve(root, "target", release ? "release" : "debug", "mm");
}

function numberOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

export function getOnchainMmStatus() {
  const root = resolveOnchainMmRoot();
  const release = process.env.CLAWD_ONCHAIN_MM_RELEASE === "true";
  const warnings = [
    "Reference implementation is unaudited.",
    "The mm runner signs transactions continuously while running.",
    "Use localnet/devnet first and require explicit operator confirmation for mainnet.",
  ];
  if (!existsSync(root)) warnings.push("Market-maker root not found. Set CLAWD_ONCHAIN_MM_ROOT.");
  if (!process.env.CLAWD_ONCHAIN_MM_MARKET) warnings.push("CLAWD_ONCHAIN_MM_MARKET not set; using bundled SOL/USDC localnet fixture.");

  return {
    root,
    exists: existsSync(root),
    cargoToml: existsSync(resolve(root, "Cargo.toml")),
    mmManifest: existsSync(resolve(root, "mm", "Cargo.toml")),
    binary: binPath(root, release),
    binaryBuilt: existsSync(binPath(root, release)),
    anchorToml: existsSync(resolve(root, "Anchor.toml")),
    defaultMarket: process.env.CLAWD_ONCHAIN_MM_MARKET || DEFAULT_SOL_USDC_MARKET,
    defaultTicker: process.env.CLAWD_ONCHAIN_MM_TICKER || "SOL-USD",
    defaultRpcUrl: process.env.CLAWD_ONCHAIN_MM_RPC_URL || process.env.SOLANA_RPC_URL || "local",
    liveEnabled: process.env.CLAWD_ONCHAIN_MM_LIVE === "true",
    operatorConfirmed: process.env.OPERATOR_CONFIRMED === "true",
    warnings,
  };
}

export function buildOnchainMmPlan(options: OnchainMmOptions = {}) {
  const status = getOnchainMmStatus();
  const release = Boolean(options.release);
  const args = [
    "run",
    ...(release ? ["--release"] : []),
    "-p",
    "mm",
    "--",
    options.market || status.defaultMarket,
    "--ticker",
    options.ticker || status.defaultTicker,
    "--url",
    options.rpcUrl || status.defaultRpcUrl,
    "--quote-edge-in-bps",
    String(numberOr(options.quoteEdgeBps, 3)),
    "--quote-size",
    String(numberOr(options.quoteSize, 100_000_000)),
    "--quote-refresh-frequency-in-ms",
    String(numberOr(options.refreshMs, 2000)),
    "--price-improvement-behavior",
    options.priceImprovement || "ignore",
    "--post-only",
    String(options.postOnly ?? true),
  ];
  if (options.keypairPath) args.push("--keypair-path", options.keypairPath);

  const warnings = [...status.warnings];
  if (!status.liveEnabled || !status.operatorConfirmed || !options.yes) {
    warnings.push("Run command is blocked until CLAWD_ONCHAIN_MM_LIVE=true, OPERATOR_CONFIRMED=true, and --yes are all present.");
  }

  return {
    mode: "run",
    command: "cargo",
    cwd: status.root,
    args,
    env: { RUST_BACKTRACE: process.env.RUST_BACKTRACE || "1" },
    warnings,
  };
}

export function buildOnchainMm(options: OnchainMmOptions = {}) {
  const status = getOnchainMmStatus();
  if (!status.exists || !status.mmManifest) {
    return { ok: false, status, error: "Phoenix on-chain market-maker workspace not found." };
  }
  mkdirSync(resolve(status.root, "target"), { recursive: true });
  const result = spawnSync("cargo", ["build", ...(options.release ? ["--release"] : []), "-p", "mm"], {
    cwd: status.root,
    env: process.env,
    stdio: "pipe",
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    status: getOnchainMmStatus(),
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error?.message,
  };
}

export function runOnchainMm(options: OnchainMmOptions = {}): never {
  const status = getOnchainMmStatus();
  if (!status.exists || !status.mmManifest) {
    console.error("error: Phoenix on-chain market-maker workspace not found. Set CLAWD_ONCHAIN_MM_ROOT.");
    process.exit(2);
  }
  if (!status.liveEnabled || !status.operatorConfirmed || !options.yes) {
    console.error(
      "error: on-chain market-maker run is gated. Set CLAWD_ONCHAIN_MM_LIVE=true, OPERATOR_CONFIRMED=true, and pass --yes.",
    );
    process.exit(3);
  }

  const plan = buildOnchainMmPlan(options);
  const result = spawnSync(plan.command, plan.args, {
    cwd: plan.cwd,
    env: { ...process.env, ...plan.env },
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`error: failed to run cargo: ${result.error.message}`);
    process.exit(127);
  }
  process.exit(typeof result.status === "number" ? result.status : 1);
}
