import { ClawdPerpsRuntime } from "./marketMaker.js";

export interface TelegramPerpsCommand {
  command: string;
  description: string;
}

export interface TelegramPerpsResponse {
  ok: boolean;
  text: string;
  data?: unknown;
}

export const TELEGRAM_PERPS_COMMANDS: TelegramPerpsCommand[] = [
  { command: "/perps", description: "Show runtime status and safety mode" },
  { command: "/perps_markets", description: "List tracked Phoenix perp markets" },
  { command: "/perps_positions", description: "Show current perp positions" },
  { command: "/perps_paper_long", description: "Preview a paper long route" },
  { command: "/perps_paper_short", description: "Preview a paper short route" },
  { command: "/perps_live_long", description: "Preview a blocked/allowed live long route" },
  { command: "/perps_live_short", description: "Preview a blocked/allowed live short route" },
];

function parseArgs(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function readSymbol(args: string[], fallback = "SOL"): string {
  return (args[1] ?? fallback).toUpperCase();
}

function readNotional(args: string[], fallback = 100): number {
  const value = Number(args[2] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function handleTelegramPerpsCommand(
  runtime: ClawdPerpsRuntime,
  text: string,
): Promise<TelegramPerpsResponse> {
  const args = parseArgs(text);
  const command = args[0] ?? "/perps";

  switch (command) {
    case "/perps": {
      const status = await runtime.getRuntimeHealth();
      return {
        ok: true,
        text: `Perps mode=${status.mode} walletConfigured=${status.walletConfigured} trackedMarkets=${status.trackedMarkets}`,
        data: status,
      };
    }
    case "/perps_markets": {
      const markets = await runtime.listMarkets();
      return {
        ok: true,
        text: `Tracked markets: ${markets.map((market) => market.symbol).join(", ")}`,
        data: markets,
      };
    }
    case "/perps_positions": {
      const positions = await runtime.getPositions();
      return {
        ok: true,
        text: "Current positions snapshot",
        data: positions,
      };
    }
    case "/perps_paper_long": {
      const preview = runtime.previewPaperTrade(readSymbol(args), "buy", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? `Paper long preview ready for ${preview.symbol} at ${preview.notionalUsd} USDC.`
          : `Paper long blocked: ${preview.preflight.blocking.join(" ")}`,
        data: preview,
      };
    }
    case "/perps_paper_short": {
      const preview = runtime.previewPaperTrade(readSymbol(args), "sell", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? `Paper short preview ready for ${preview.symbol} at ${preview.notionalUsd} USDC.`
          : `Paper short blocked: ${preview.preflight.blocking.join(" ")}`,
        data: preview,
      };
    }
    case "/perps_live_long": {
      const preview = runtime.previewLiveTrade(readSymbol(args), "buy", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? `Live long preview allowed for ${preview.symbol}.`
          : `Live long blocked: ${preview.preflight.blocking.join(" ")}`,
        data: preview,
      };
    }
    case "/perps_live_short": {
      const preview = runtime.previewLiveTrade(readSymbol(args), "sell", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? `Live short preview allowed for ${preview.symbol}.`
          : `Live short blocked: ${preview.preflight.blocking.join(" ")}`,
        data: preview,
      };
    }
    default:
      return {
        ok: false,
        text: `Unknown command ${command}. Supported: ${TELEGRAM_PERPS_COMMANDS.map((item) => item.command).join(", ")}`,
      };
  }
}
