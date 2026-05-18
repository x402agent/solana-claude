import { resolveTradingMode } from "./config.js";
import { ClawdPerpsRuntime } from "./marketMaker.js";

export interface PerpsFrontendCard {
  title: string;
  value: string;
  hint?: string;
  tone?: "live" | "safe" | "watch" | "infra";
}

export interface PerpsFrontendStatus {
  mode: string;
  modeLabel: string;
  headline: string;
  subheadline: string;
  walletConfigured: boolean;
  allowedSymbols: string[];
  trackedMarkets: unknown[];
  vulcan: unknown;
  cards: PerpsFrontendCard[];
}

function describeMode(mode: string): { modeLabel: string; headline: string; subheadline: string } {
  switch (mode) {
    case "live":
      return {
        modeLabel: "Live Circuit Armed",
        headline: "Phoenix reads are hot and the route to execution is open.",
        subheadline: "Every live path still depends on wallet presence, spread limits, and explicit operator intent.",
      };
    case "paper":
      return {
        modeLabel: "Paper Engine Spinning",
        headline: "The stack is animated, quoting, and rehearsing without touching real funds.",
        subheadline: "Rise drives the market picture while Vulcan-compatible routes stay ready for dry runs and previews.",
      };
    default:
      return {
        modeLabel: "Observe Mode",
        headline: "The perp stack is awake, watching the tape, and refusing reckless motion.",
        subheadline: "Safe-by-default reads, catalog-backed execution planning, and no blind live flow.",
      };
  }
}

export function buildPerpsFrontendCards(runtime: ClawdPerpsRuntime): PerpsFrontendCard[] {
  const mode = resolveTradingMode(runtime.config);
  return [
    {
      title: "Exchange Pulse",
      value: "Phoenix Perps",
      hint: "Rise SDK is the live read plane for tickers, positions, and market posture",
      tone: "live",
    },
    {
      title: "Execution Mood",
      value: mode,
      hint: "Observe and paper stay default; live only activates when the runtime is intentionally armed",
      tone: mode === "live" ? "watch" : "safe",
    },
    {
      title: "Fallback Rail",
      value: "Vulcan CLI",
      hint: "Used for compatible paper and live route planning, never as a blind fire-and-forget executor",
      tone: "infra",
    },
    {
      title: "Risk Envelope",
      value: `${runtime.config.risk.maxNotionalUsd} USD cap`,
      hint: `Allowed: ${runtime.config.risk.allowedSymbols.join(", ")}`,
      tone: "watch",
    },
    {
      title: "Agent Bridge",
      value: "Vulcan MCP + CLI",
      hint: "Catalog-backed routing for market, trade, position, paper, strategy, and TA command families",
      tone: "infra",
    },
    {
      title: "Operator Posture",
      value: runtime.config.wallet ? "Wallet Wired" : "Wallet Missing",
      hint: runtime.config.wallet
        ? "Runtime can price, preview, and prepare authenticated perp actions"
        : "Reads and previews still work, but live execution posture stays intentionally incomplete",
      tone: runtime.config.wallet ? "live" : "safe",
    },
  ];
}

export async function buildPerpsFrontendStatus(
  runtime: ClawdPerpsRuntime,
): Promise<PerpsFrontendStatus> {
  const [markets, vulcan] = await Promise.all([
    runtime.listMarkets(),
    runtime.getVulcanCatalogSummary(),
  ]);
  const mode = resolveTradingMode(runtime.config);
  const mood = describeMode(mode);
  return {
    mode,
    modeLabel: mood.modeLabel,
    headline: mood.headline,
    subheadline: mood.subheadline,
    walletConfigured: Boolean(runtime.config.wallet),
    allowedSymbols: runtime.config.risk.allowedSymbols,
    trackedMarkets: markets,
    vulcan,
    cards: buildPerpsFrontendCards(runtime),
  };
}
