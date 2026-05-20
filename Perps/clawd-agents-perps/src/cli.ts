#!/usr/bin/env node
import "dotenv/config";
import { buildPerpsFrontendStatus } from "./frontend.js";
import { ClawdPerpsRuntime } from "./marketMaker.js";
import { handleTelegramPerpsCommand } from "./telegram.js";
import { ImperialClient } from "./imperialAgent.js";
import {
  buildOnchainMarketMaker,
  buildOnchainMarketMakerPlan,
  getOnchainMarketMakerStatus,
  runOnchainMarketMaker,
} from "./onchainMarketMaker.js";
import {
  buildTwammAutomation,
  buildTwammBuildPlan,
  buildTwammCrankPlan,
  buildTwammTestPlan,
  getTwammAutomationStatus,
  runTwammCrank,
} from "./twammAutomation.js";
import { buildClawdOiCoreSignal, buildOiRiskGate, type SignalMode } from "./signals/oi-core.js";
import type { OiTick } from "./adapters/phoenix-rise.js";

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

function asBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value;
  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseSignalMode(value: string | boolean | undefined): SignalMode {
  if (typeof value !== "string") return "paper";
  if (["observe", "paper", "dry-run", "confirm-each", "auto-execute"].includes(value)) {
    return value as SignalMode;
  }
  return "paper";
}

function parseDurationMs(value: string | boolean | undefined, fallbackMs: number): number {
  if (typeof value !== "string") return fallbackMs;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "ms").toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;
  if (unit === "m") return Math.round(amount * 60_000);
  if (unit === "s") return Math.round(amount * 1000);
  return Math.round(amount);
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
  clawd-agents-perps signal oi SOL-PERP --rpc-url "$CLAWD_RPC_URL" --lookback 5m -o json
  clawd-agents-perps signal watch SOL-PERP --rpc-url "$CLAWD_RPC_URL" --interval 5s --mode paper
  clawd-agents-perps signal risk-gate SOL-PERP --notional 500 --side long
  clawd-agents-perps onchain-mm status
  clawd-agents-perps onchain-mm build
  clawd-agents-perps onchain-mm plan --market <pubkey> --ticker SOL-USD
  clawd-agents-perps onchain-mm run --market <pubkey> --yes
  clawd-agents-perps twamm status
  clawd-agents-perps twamm build
  clawd-agents-perps twamm crank-plan --token-a <mint> --token-b <mint>
  clawd-agents-perps twamm crank --token-a <mint> --token-b <mint> --yes

Safety:
  Defaults are observe/paper. Live previews remain blocked unless the runtime
  is explicitly armed with LIVE_TRADING=true, OPERATOR_CONFIRMED=true, and
  PERPS_SIM_ONLY=false. Imperial order submission also requires IMPERIAL_LIVE=true.
`);
}

function printSignalHelp(): void {
  console.log(`clawd-agents-perps signal

Usage:
  clawd-agents-perps signal oi <symbol> [--rpc-url <url>] [--api-url <url>] [--lookback 5m] [--mode paper] [-o json] [--mock]
  clawd-agents-perps signal watch <symbol> [--rpc-url <url>] [--interval 5s] [--mode paper] [--mock]
  clawd-agents-perps signal risk-gate <symbol> --notional 500 --side long [--mode paper] [--mock]

Safety:
  This is an observe/risk signal. It never submits orders. Modes only affect
  the suggested action payload and stay paper-first by default.
`);
}

function printTwammHelp(): void {
  console.log(`clawd-agents-perps twamm

Usage:
  clawd-agents-perps twamm status
  clawd-agents-perps twamm build [--skip-app-install]
  clawd-agents-perps twamm build-plan [--skip-app-install]
  clawd-agents-perps twamm test-plan [--cargo]
  clawd-agents-perps twamm crank-plan [--rpc-url <url>] [--token-a <mint>] [--token-b <mint>] [--wallet <path>] [--once]
  clawd-agents-perps twamm crank --token-a <mint> --token-b <mint> --yes

Environment:
  CLAWD_TWAMM_ROOT          Path to Perps/twamm-master
  CLAWD_TWAMM_RPC_URL       RPC alias/url, default SOLANA_RPC_URL/local
  CLAWD_TWAMM_TOKEN_A_MINT  Default first token mint
  CLAWD_TWAMM_TOKEN_B_MINT  Default second token mint
  CLAWD_TWAMM_LIVE=true and OPERATOR_CONFIRMED=true required for crank
`);
}

function printOnchainMmHelp(): void {
  console.log(`clawd-agents-perps onchain-mm

Usage:
  clawd-agents-perps onchain-mm status
  clawd-agents-perps onchain-mm build [--release]
  clawd-agents-perps onchain-mm plan [--market <pubkey>] [--ticker SOL-USD] [--rpc-url local]
  clawd-agents-perps onchain-mm run --market <pubkey> --yes

Environment:
  CLAWD_ONCHAIN_MM_ROOT    Path to Perps/phoenix-onchain-market-maker-master
  CLAWD_ONCHAIN_MM_MARKET  Phoenix market pubkey
  CLAWD_ONCHAIN_MM_TICKER  Coinbase ticker, default SOL-USD
  CLAWD_ONCHAIN_MM_RPC_URL RPC alias/url, default local/SOLANA_RPC_URL
  CLAWD_ONCHAIN_MM_LIVE=true and OPERATOR_CONFIRMED=true required for run
`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const createRuntime = () => new ClawdPerpsRuntime(undefined, repoRoot());

  if (parsed.command === "signal") {
    const subcommand = parsed.rest[0] || "oi";
    const symbol = parsed.rest[1] || "SOL-PERP";
    const signalOptions = {
      symbol,
      apiUrl: typeof parsed.options["api-url"] === "string" ? parsed.options["api-url"] : undefined,
      rpcUrl: typeof parsed.options["rpc-url"] === "string" ? parsed.options["rpc-url"] : undefined,
      mode: parseSignalMode(parsed.options.mode),
      maxSpreadBps: asNumber(parsed.options["max-spread-bps"], 25),
      maxFundingAbs: asNumber(parsed.options["max-funding-abs"], 0.0025),
      minDepthUsd: asNumber(parsed.options["min-depth-usd"], 25_000),
      mock: asBoolean(parsed.options.mock),
    };

    switch (subcommand) {
      case "help":
      case "--help":
      case "-h":
        printSignalHelp();
        return;
      case "oi": {
        printJson(await buildClawdOiCoreSignal(signalOptions));
        return;
      }
      case "risk-gate": {
        const signal = await buildClawdOiCoreSignal(signalOptions);
        printJson(
          buildOiRiskGate({
            signal,
            notionalUsdc: asNumber(parsed.options.notional, 500),
            side: parsed.options.side === "short" ? "short" : "long",
          }),
        );
        return;
      }
      case "watch": {
        const intervalMs = parseDurationMs(parsed.options.interval, 5000);
        const iterations = asNumber(parsed.options.iterations, Number.POSITIVE_INFINITY);
        let previous: OiTick | undefined;
        let count = 0;
        while (count < iterations) {
          const signal = await buildClawdOiCoreSignal({ ...signalOptions, previous });
          printJson(signal);
          previous = {
            ts: signal.ts,
            symbol: signal.symbol,
            markPrice: signal.market.markPrice,
            indexPrice: signal.market.indexPrice,
            openInterestUsd: signal.market.openInterestUsd,
            fundingRate: signal.market.fundingRate,
            depthUsd: signal.market.depthUsd,
            longOiUsd: signal.market.longOiUsd,
            shortOiUsd: signal.market.shortOiUsd,
          };
          count++;
          if (count >= iterations) return;
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
        return;
      }
      default:
        console.error(`Unknown signal command: ${subcommand}`);
        printSignalHelp();
        process.exitCode = 1;
        return;
    }
  }

  if (parsed.command === "onchain-mm") {
    const subcommand = parsed.rest[0] || "status";
    const runOptions = {
      market: typeof parsed.options.market === "string" ? parsed.options.market : undefined,
      ticker: typeof parsed.options.ticker === "string" ? parsed.options.ticker : undefined,
      rpcUrl: typeof parsed.options["rpc-url"] === "string" ? parsed.options["rpc-url"] : undefined,
      keypairPath: typeof parsed.options["keypair-path"] === "string" ? parsed.options["keypair-path"] : undefined,
      quoteEdgeBps: asNumber(parsed.options["quote-edge-bps"], 3),
      quoteSize: asNumber(parsed.options["quote-size"], 100_000_000),
      refreshMs: asNumber(parsed.options["refresh-ms"], 2000),
      priceImprovement: typeof parsed.options["price-improvement"] === "string" ? parsed.options["price-improvement"] : undefined,
      postOnly: parsed.options["post-only"] !== false,
      release: Boolean(parsed.options.release),
      yes: Boolean(parsed.options.yes),
    };

    switch (subcommand) {
      case "help":
      case "--help":
      case "-h":
        printOnchainMmHelp();
        return;
      case "status":
        printJson(getOnchainMarketMakerStatus());
        return;
      case "build":
      case "install":
        printJson(buildOnchainMarketMaker({ release: Boolean(parsed.options.release) }));
        return;
      case "plan":
        printJson(buildOnchainMarketMakerPlan(runOptions));
        return;
      case "run":
        runOnchainMarketMaker(runOptions);
        return;
      default:
        console.error(`Unknown onchain-mm command: ${subcommand}`);
        printOnchainMmHelp();
        process.exitCode = 1;
        return;
    }
  }

  if (parsed.command === "twamm") {
    const subcommand = parsed.rest[0] || "status";
    const crankOptions = {
      rpcUrl: typeof parsed.options["rpc-url"] === "string" ? parsed.options["rpc-url"] : undefined,
      tokenAMint: typeof parsed.options["token-a"] === "string" ? parsed.options["token-a"] : undefined,
      tokenBMint: typeof parsed.options["token-b"] === "string" ? parsed.options["token-b"] : undefined,
      walletPath: typeof parsed.options.wallet === "string" ? parsed.options.wallet : undefined,
      once: Boolean(parsed.options.once),
      yes: Boolean(parsed.options.yes),
    };

    switch (subcommand) {
      case "help":
      case "--help":
      case "-h":
        printTwammHelp();
        return;
      case "status":
        printJson(getTwammAutomationStatus());
        return;
      case "build-plan":
        printJson(buildTwammBuildPlan({ skipAppInstall: Boolean(parsed.options["skip-app-install"]) }));
        return;
      case "build":
      case "install":
        printJson(buildTwammAutomation({ skipAppInstall: Boolean(parsed.options["skip-app-install"]) }));
        return;
      case "test-plan":
        printJson(buildTwammTestPlan({ anchor: !parsed.options.cargo, cargo: Boolean(parsed.options.cargo) }));
        return;
      case "crank-plan":
      case "plan":
        printJson(buildTwammCrankPlan(crankOptions));
        return;
      case "crank":
      case "run":
        runTwammCrank(crankOptions);
        return;
      default:
        console.error(`Unknown twamm command: ${subcommand}`);
        printTwammHelp();
        process.exitCode = 1;
        return;
    }
  }

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
