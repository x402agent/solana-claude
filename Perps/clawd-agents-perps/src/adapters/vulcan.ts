import type { PreflightReport } from "../config.js";

export interface VulcanBridgeCommand {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

export interface VulcanExecutionIntent {
  action:
    | "market-list"
    | "ticker"
    | "positions"
    | "paper-buy"
    | "paper-sell"
    | "live-buy"
    | "live-sell";
  symbol?: string;
  notionalUsd?: number;
}

export interface VulcanExecutionPlan {
  transport: "cli";
  mode: "observe" | "paper" | "live";
  preflight: PreflightReport;
  command: VulcanBridgeCommand;
}

export function mapToVulcanCommand(
  repoRoot: string,
  input: VulcanExecutionIntent,
): VulcanBridgeCommand {
  const symbol = input.symbol?.trim().toUpperCase() ?? "SOL";
  const notional = String(input.notionalUsd ?? 100);
  const base = {
    command: "cargo",
    cwd: `${repoRoot}/vulcan-cli-master`,
    env: {
      NO_COLOR: "1",
    },
  };

  switch (input.action) {
    case "market-list":
      return { ...base, args: ["run", "-p", "vulcan", "--", "market", "list", "-o", "json"] };
    case "ticker":
      return { ...base, args: ["run", "-p", "vulcan", "--", "market", "ticker", symbol, "-o", "json"] };
    case "positions":
      return { ...base, args: ["run", "-p", "vulcan", "--", "position", "list", "-o", "json"] };
    case "paper-buy":
      return {
        ...base,
        args: [
          "run",
          "-p",
          "vulcan",
          "--",
          "paper",
          "buy",
          symbol,
          "--notional-usdc",
          notional,
          "--type",
          "market",
          "-o",
          "json",
        ],
      };
    case "paper-sell":
      return {
        ...base,
        args: [
          "run",
          "-p",
          "vulcan",
          "--",
          "paper",
          "sell",
          symbol,
          "--notional-usdc",
          notional,
          "--type",
          "market",
          "-o",
          "json",
        ],
      };
    case "live-buy":
      return {
        ...base,
        args: [
          "run",
          "-p",
          "vulcan",
          "--",
          "trade",
          "buy",
          symbol,
          "--notional-usdc",
          notional,
          "--type",
          "market",
          "-o",
          "json",
        ],
      };
    case "live-sell":
      return {
        ...base,
        args: [
          "run",
          "-p",
          "vulcan",
          "--",
          "trade",
          "sell",
          symbol,
          "--notional-usdc",
          notional,
          "--type",
          "market",
          "-o",
          "json",
        ],
      };
  }
}

export function buildVulcanExecutionPlan(
  repoRoot: string,
  input: VulcanExecutionIntent,
  preflight: PreflightReport,
): VulcanExecutionPlan {
  const mode = input.action.startsWith("live")
    ? "live"
    : input.action.startsWith("paper")
      ? "paper"
      : "observe";

  return {
    transport: "cli",
    mode,
    preflight,
    command: mapToVulcanCommand(repoRoot, input),
  };
}
