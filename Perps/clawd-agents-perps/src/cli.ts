#!/usr/bin/env node
import "dotenv/config";
import { buildPerpsFrontendStatus } from "./frontend.js";
import { ClawdPerpsRuntime } from "./marketMaker.js";
import { handleTelegramPerpsCommand } from "./telegram.js";
import { ImperialClient } from "./imperialAgent.js";

type ParsedArgs = {
  command: string;
  rest: string[];
  options: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "status", ...tail] = argv;
  const rest: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let i = 0; i < tail.length; i++) {
    const item = tail[i];
    if (!item.startsWith("--")) {
      rest.push(item);
      continue;
    }

    const [rawKey, inlineValue] = item.slice(2).split("=", 2);
    const next = tail[i + 1];
    if (inlineValue !== undefined) {
      options[rawKey] = inlineValue;
    } else if (next && !next.startsWith("--")) {
      options[rawKey] = next;
      i++;
    } else {
      options[rawKey] = true;
    }
  }

  return { command, rest, options };
}

function repoRoot(): string {
  return process.env.CLAWD_REPO_ROOT || process.cwd();
}

function asNumber(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSymbols(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const symbols = value
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  return symbols.length ? symbols : undefined;
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function printHelp(): void {
  console.log(`clawd-agents-perps

Usage:
  clawd-agents-perps status
  clawd-agents-perps frontend
  clawd-agents-perps telegram "/perps"
  clawd-agents-perps vulcan
  clawd-agents-perps paper-long SOL --notional 100
  clawd-agents-perps paper-short SOL --notional 100
  clawd-agents-perps live-long SOL --notional 100 --leverage 2
  clawd-agents-perps live-short SOL --notional 100 --leverage 2
  clawd-agents-perps imperial-health
  clawd-agents-perps imperial-scan --symbols SOL,BTC,ETH --size 100
  clawd-agents-perps imperial-cycle SOL --size 100

Safety:
  Defaults are observe/paper. Live previews remain blocked unless the runtime
  is explicitly armed with LIVE_TRADING=true, OPERATOR_CONFIRMED=true, and
  PERPS_SIM_ONLY=false. Imperial order submission also requires IMPERIAL_LIVE=true.
`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const createRuntime = () => new ClawdPerpsRuntime(undefined, repoRoot());

  switch (parsed.command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    case "status":
    case "health": {
      const runtime = createRuntime();
      printJson(await runtime.getRuntimeHealth());
      return;
    }
    case "frontend": {
      const runtime = createRuntime();
      printJson(await buildPerpsFrontendStatus(runtime));
      return;
    }
    case "telegram": {
      const runtime = createRuntime();
      printJson(await handleTelegramPerpsCommand(runtime, parsed.rest.join(" ") || "/perps"));
      return;
    }
    case "vulcan": {
      const runtime = createRuntime();
      printJson(await runtime.getVulcanCatalogSummary());
      return;
    }
    case "paper-long": {
      const runtime = createRuntime();
      printJson(runtime.previewPaperTrade(parsed.rest[0] || "SOL", "buy", asNumber(parsed.options.notional, 100)));
      return;
    }
    case "paper-short": {
      const runtime = createRuntime();
      printJson(runtime.previewPaperTrade(parsed.rest[0] || "SOL", "sell", asNumber(parsed.options.notional, 100)));
      return;
    }
    case "live-long": {
      const runtime = createRuntime();
      printJson(
        runtime.previewLiveTrade(
          parsed.rest[0] || "SOL",
          "buy",
          asNumber(parsed.options.notional, 100),
          asNumber(parsed.options.leverage, 1),
        ),
      );
      return;
    }
    case "live-short": {
      const runtime = createRuntime();
      printJson(
        runtime.previewLiveTrade(
          parsed.rest[0] || "SOL",
          "sell",
          asNumber(parsed.options.notional, 100),
          asNumber(parsed.options.leverage, 1),
        ),
      );
      return;
    }
    case "imperial-health": {
      const client = new ImperialClient();
      printJson(await client.healthCheck());
      return;
    }
    case "imperial-scan": {
      const symbols = parseSymbols(parsed.options.symbols);
      const client = new ImperialClient(symbols ? { allowedSymbols: symbols } : undefined);
      printJson(
        await client.runScan({
          sizeUsd: asNumber(parsed.options.size, 100),
          autoRoute: Boolean(parsed.options["auto-route"]),
        }),
      );
      return;
    }
    case "imperial-cycle": {
      const client = new ImperialClient();
      printJson(
        await client.runCycle(parsed.rest[0] || "SOL", {
          sizeUsd: asNumber(parsed.options.size, 100),
          autoRoute: Boolean(parsed.options["auto-route"]),
        }),
      );
      return;
    }
    default:
      console.error(`Unknown command: ${parsed.command}`);
      printHelp();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
