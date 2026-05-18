import { resolveTradingMode } from "./config.js";
import { ClawdPerpsRuntime } from "./marketMaker.js";

export interface PerpsFrontendCard {
  title: string;
  value: string;
  hint?: string;
}

export interface PerpsFrontendStatus {
  mode: string;
  walletConfigured: boolean;
  allowedSymbols: string[];
  trackedMarkets: unknown[];
  vulcan: unknown;
  cards: PerpsFrontendCard[];
}

export function buildPerpsFrontendCards(runtime: ClawdPerpsRuntime): PerpsFrontendCard[] {
  const mode = resolveTradingMode(runtime.config);
  return [
    { title: "Exchange", value: "Phoenix Perps", hint: "Rise SDK read plane" },
    { title: "Execution", value: mode, hint: "Observe/paper defaults to safe mode" },
    {
      title: "Fallback",
      value: "Vulcan CLI",
      hint: "Used for compatible paper/live route planning, not blind execution",
    },
    {
      title: "Risk",
      value: `${runtime.config.risk.maxNotionalUsd} USD cap`,
      hint: `Allowed: ${runtime.config.risk.allowedSymbols.join(", ")}`,
    },
    {
      title: "Agent Bridge",
      value: "Vulcan MCP + CLI",
      hint: "Catalog-backed routing for market, trade, position, paper, strategy, and TA flows",
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
  return {
    mode: resolveTradingMode(runtime.config),
    walletConfigured: Boolean(runtime.config.wallet),
    allowedSymbols: runtime.config.risk.allowedSymbols,
    trackedMarkets: markets,
    vulcan,
    cards: buildPerpsFrontendCards(runtime),
  };
}
