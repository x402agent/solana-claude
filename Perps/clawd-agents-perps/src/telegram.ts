import { ClawdPerpsRuntime } from "./marketMaker.js";
import { buildPerpsFrontendStatus } from "./frontend.js";

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
  { command: "/perps_vulcan", description: "Show integrated Vulcan CLI and MCP status" },
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

function joinLines(lines: string[]): string {
  return lines.filter(Boolean).join("\n");
}

function formatBlocking(blocking: string[]): string {
  return blocking.length > 0 ? blocking.join(" | ") : "no blocking conditions";
}

export async function handleTelegramPerpsCommand(
  runtime: ClawdPerpsRuntime,
  text: string,
): Promise<TelegramPerpsResponse> {
  const args = parseArgs(text);
  const command = args[0] ?? "/perps";

  switch (command) {
    case "/perps": {
      const [status, frontend] = await Promise.all([
        runtime.getRuntimeHealth(),
        buildPerpsFrontendStatus(runtime),
      ]);
      return {
        ok: true,
        text: joinLines([
          `${frontend.modeLabel} | ${status.trackedMarkets} markets in view`,
          frontend.headline,
          frontend.subheadline,
          `wallet=${status.walletConfigured ? "wired" : "missing"} | symbols=${status.allowedSymbols.join(", ")}`,
        ]),
        data: { ...status, frontend },
      };
    }
    case "/perps_vulcan": {
      const catalog = await runtime.getVulcanCatalogSummary();
      return {
        ok: true,
        text: joinLines([
          "Vulcan bridge is mounted and readable.",
          `cli=${catalog.cliVersion} | groups=${catalog.groupCount} | commands=${catalog.commandCount}`,
          `dangerous routes=${catalog.dangerousCommands} | MCP=${catalog.mcpServer ? "present" : "missing"}`,
        ]),
        data: catalog,
      };
    }
    case "/perps_markets": {
      const markets = await runtime.listMarkets();
      return {
        ok: true,
        text: joinLines([
          "Market tape is live.",
          `${markets.length} tracked symbols: ${markets.map((market) => market.symbol).join(", ")}`,
        ]),
        data: markets,
      };
    }
    case "/perps_positions": {
      const positions = await runtime.getPositions();
      return {
        ok: true,
        text: joinLines([
          "Current position snapshot loaded.",
          Array.isArray(positions) && positions.length > 0
            ? `${positions.length} position rows returned from the read plane.`
            : "No active position rows returned.",
        ]),
        data: positions,
      };
    }
    case "/perps_paper_long": {
      const preview = runtime.previewPaperTrade(readSymbol(args), "buy", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? joinLines([
              `Paper long route staged for ${preview.symbol}.`,
              `${preview.notionalUsd} USDC notional | adapter=${preview.route.adapter} | execution=${preview.execution}`,
              "This is rehearsal flow only. No real funds should move.",
            ])
          : joinLines([
              `Paper long route blocked for ${preview.symbol}.`,
              formatBlocking(preview.preflight.blocking),
            ]),
        data: preview,
      };
    }
    case "/perps_paper_short": {
      const preview = runtime.previewPaperTrade(readSymbol(args), "sell", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? joinLines([
              `Paper short route staged for ${preview.symbol}.`,
              `${preview.notionalUsd} USDC notional | adapter=${preview.route.adapter} | execution=${preview.execution}`,
              "The engine can rehearse the move without opening live exposure.",
            ])
          : joinLines([
              `Paper short route blocked for ${preview.symbol}.`,
              formatBlocking(preview.preflight.blocking),
            ]),
        data: preview,
      };
    }
    case "/perps_live_long": {
      const preview = runtime.previewLiveTrade(readSymbol(args), "buy", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? joinLines([
              `Live long preview is open for ${preview.symbol}.`,
              `${preview.notionalUsd} USDC notional cleared the current gate set.`,
              "This is still a preview path until signing and submission are wired.",
            ])
          : joinLines([
              `Live long remains blocked for ${preview.symbol}.`,
              formatBlocking(preview.preflight.blocking),
            ]),
        data: preview,
      };
    }
    case "/perps_live_short": {
      const preview = runtime.previewLiveTrade(readSymbol(args), "sell", readNotional(args));
      return {
        ok: preview.preflight.ok,
        text: preview.preflight.ok
          ? joinLines([
              `Live short preview is open for ${preview.symbol}.`,
              `${preview.notionalUsd} USDC notional cleared the current gate set.`,
              "Execution is described here, not blindly triggered here.",
            ])
          : joinLines([
              `Live short remains blocked for ${preview.symbol}.`,
              formatBlocking(preview.preflight.blocking),
            ]),
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
