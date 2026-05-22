import {
  buildPreflightReport,
  loadPerpsRuntimeConfig,
  resolveTradingMode,
  type PerpsRuntimeConfig,
  type PreflightReport,
} from "./config.js";
import { createPhoenixRiseAdapter, type PhoenixRiseAdapter } from "./adapters/phoenixRise.js";
import {
  buildVulcanExecutionPlan,
  type VulcanExecutionIntent,
  type VulcanExecutionPlan,
} from "./adapters/vulcan.js";
import { summarizeVulcanCatalog } from "./vulcanCatalog.js";
import {
  getTwammAutomationStatus,
  buildTwammCrankPlan,
  type TwammAutomationStatus,
  type TwammAutomationPlan,
} from "./twammAutomation.js";
import {
  getOnchainMarketMakerStatus,
  buildOnchainMarketMakerPlan,
  type OnchainMarketMakerStatus,
  type OnchainMarketMakerPlan,
} from "./onchainMarketMaker.js";

export interface MarketMakerIntent {
  symbol: string;
  mode: "observe" | "quote" | "paper" | "live";
  maxNotionalUsd: number;
  maxSpreadBps: number;
}

export interface MarketMakerStatus {
  armed: boolean;
  mode: "observe" | "paper" | "live";
  symbol: string;
  notes: string[];
}

export interface TraderActionPreview {
  symbol: string;
  side: "buy" | "sell";
  notionalUsd: number;
  execution: "observe" | "paper" | "rise-live" | "vulcan-live";
  preflight: PreflightReport;
  route: {
    adapter: "rise" | "vulcan";
    action: string;
    payload: unknown;
  };
}

export class ClawdPerpsRuntime {
  readonly rise: PhoenixRiseAdapter;

  constructor(
    readonly config: PerpsRuntimeConfig = loadPerpsRuntimeConfig(),
    readonly repoRoot = process.cwd(),
  ) {
    this.rise = createPhoenixRiseAdapter(config);
  }

  createStatus(intent: MarketMakerIntent): MarketMakerStatus {
    const mode = resolveTradingMode(this.config);
    return {
      armed: mode === "live",
      mode,
      symbol: intent.symbol.toUpperCase(),
      notes: [
        "Rise SDK is the source of truth for market reads and unsigned instruction building.",
        "Vulcan remains available for paper execution and CLI compatibility.",
        "Live routes are blocked unless preflight, operator confirmation, and non-sim mode all pass.",
      ],
    };
  }

  async listMarkets() {
    return this.rise.listMarkets();
  }

  async getTicker(symbol?: string) {
    return this.rise.getTicker(symbol);
  }

  async getPositions(authority?: string) {
    return this.rise.getPositions(authority);
  }

  async getPortfolio(authority?: string) {
    return this.rise.getTraderSnapshot(authority);
  }

  async getRuntimeHealth() {
    const [health, markets, vulcan] = await Promise.all([
      this.rise.health(),
      this.rise.listMarkets(),
      summarizeVulcanCatalog(this.repoRoot),
    ]);
    return {
      health,
      mode: resolveTradingMode(this.config),
      walletConfigured: Boolean(this.config.wallet),
      trackedMarkets: markets.length,
      allowedSymbols: this.config.risk.allowedSymbols,
      vulcan,
    };
  }

  async getVulcanCatalogSummary() {
    return summarizeVulcanCatalog(this.repoRoot);
  }

  previewObserve(symbol: string, expectedSpreadBps?: number): TraderActionPreview {
    const preflight = buildPreflightReport(this.config, {
      symbol,
      notionalUsd: 1,
      expectedSpreadBps,
      execution: "observe",
    });
    return {
      symbol: symbol.toUpperCase(),
      side: "buy",
      notionalUsd: 1,
      execution: "observe",
      preflight,
      route: {
        adapter: "rise",
        action: "market.ticker",
        payload: { symbol: symbol.toUpperCase() },
      },
    };
  }

  previewPaperTrade(
    symbol: string,
    side: "buy" | "sell",
    notionalUsd: number,
    expectedSpreadBps?: number,
  ): TraderActionPreview {
    const preflight = buildPreflightReport(this.config, {
      symbol,
      notionalUsd,
      expectedSpreadBps,
      execution: "paper",
    });
    return {
      symbol: symbol.toUpperCase(),
      side,
      notionalUsd,
      execution: "paper",
      preflight,
      route: {
        adapter: "vulcan",
        action: side === "buy" ? "paper-buy" : "paper-sell",
        payload: buildVulcanExecutionPlan(
          this.repoRoot,
          {
            action: side === "buy" ? "paper-buy" : "paper-sell",
            symbol,
            notionalUsd,
          },
          preflight,
        ),
      },
    };
  }

  previewLiveTrade(
    symbol: string,
    side: "buy" | "sell",
    notionalUsd: number,
    leverage?: number,
    expectedSpreadBps?: number,
  ): TraderActionPreview {
    const preflight = buildPreflightReport(this.config, {
      symbol,
      notionalUsd,
      leverage,
      expectedSpreadBps,
      execution: "rise-live",
    });

    return {
      symbol: symbol.toUpperCase(),
      side,
      notionalUsd,
      execution: "rise-live",
      preflight,
      route: {
        adapter: "rise",
        action: "order.place",
        payload: {
          symbol: symbol.toUpperCase(),
          side,
          notionalUsd,
          leverage,
          expectedSpreadBps,
          blocked: !preflight.ok,
        },
      },
    };
  }

  buildVulcanPlan(
    intent: VulcanExecutionIntent,
    notionalUsd = 1,
    expectedSpreadBps?: number,
  ): VulcanExecutionPlan {
    const preflight = buildPreflightReport(this.config, {
      symbol: intent.symbol ?? "SOL",
      notionalUsd,
      expectedSpreadBps,
      execution: intent.action.startsWith("live") ? "vulcan-live" : "paper",
    });
    return buildVulcanExecutionPlan(this.repoRoot, intent, preflight);
  }

  // ── TWAMM execution strategy ──────────────────────────────────────────────

  getTwammStatus(): TwammAutomationStatus {
    return getTwammAutomationStatus();
  }

  buildTwammCrankPlan(opts: {
    rpcUrl?: string;
    tokenAMint?: string;
    tokenBMint?: string;
    walletPath?: string;
    once?: boolean;
    yes?: boolean;
  } = {}): TwammAutomationPlan {
    return buildTwammCrankPlan(opts);
  }

  /**
   * Preview a TWAMM-scheduled execution for large orders.
   * TWAMM fills at the time-weighted oracle price over a configurable window,
   * eliminating market-impact slippage at the cost of deferred fills.
   * Use when notionalUsd exceeds ~$50k or when low-impact execution is required.
   */
  previewTwammExecution(
    symbol: string,
    side: "buy" | "sell",
    notionalUsd: number,
    tokenAMint?: string,
    tokenBMint?: string,
  ): TraderActionPreview & { twamm: TwammAutomationPlan } {
    const preflight = buildPreflightReport(this.config, {
      symbol,
      notionalUsd,
      execution: "observe",
    });
    const twammStatus = getTwammAutomationStatus();
    const twammPlan = buildTwammCrankPlan({ tokenAMint, tokenBMint });
    return {
      symbol: symbol.toUpperCase(),
      side,
      notionalUsd,
      execution: "observe",
      preflight,
      route: {
        adapter: "rise",
        action: "twamm.schedule",
        payload: {
          symbol: symbol.toUpperCase(),
          side,
          notionalUsd,
          strategy: "twamm",
          tokenAMint: tokenAMint ?? twammStatus.tokenAMint,
          tokenBMint: tokenBMint ?? twammStatus.tokenBMint,
          note: "TWAMM executes as time-weighted on-chain slices. Arm with CLAWD_TWAMM_LIVE=true.",
          blocked: !preflight.ok || !twammStatus.exists,
        },
      },
      twamm: twammPlan,
    };
  }

  // ── Phoenix on-chain market-maker strategy ────────────────────────────────

  getOnchainMmStatus(): OnchainMarketMakerStatus {
    return getOnchainMarketMakerStatus();
  }

  buildOnchainMmPlan(opts: {
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
  } = {}): OnchainMarketMakerPlan {
    return buildOnchainMarketMakerPlan(opts);
  }

  /**
   * Preview a Phoenix on-chain market-maker run plan.
   * The mm binary places resting limit orders on the Phoenix CLOB, earning
   * maker rebates while tightening the book spread.
   */
  previewOnchainMm(
    market?: string,
    ticker = "SOL-USD",
    quoteEdgeBps = 3,
  ): { status: OnchainMarketMakerStatus; plan: OnchainMarketMakerPlan } {
    const status = getOnchainMarketMakerStatus();
    const plan = buildOnchainMarketMakerPlan({
      market: market ?? status.defaultMarket,
      ticker,
      quoteEdgeBps,
    });
    return { status, plan };
  }

  // ── Vulcan TWAP strategy ──────────────────────────────────────────────────

  /**
   * Build a Vulcan TWAP execution plan for large perps orders.
   * Uses `vulcan strategy twap start` — the runner owns the loop, tick display,
   * ledger, and report. Prefer this over manual slice execution.
   */
  buildVulcanTwapPlan(opts: {
    symbol: string;
    side: "buy" | "sell";
    notionalUsd: number;
    slices?: number;
    intervalSeconds?: number;
    mode?: "paper" | "dry_run" | "confirm_each" | "auto_execute";
    maxPriceDriftBps?: number;
  }): { command: string; args: string[]; note: string } {
    const mode = opts.mode ?? "paper";
    const slices = opts.slices ?? 5;
    const intervalSeconds = opts.intervalSeconds ?? 60;
    const args = [
      "strategy", "twap", "start",
      "--symbol", opts.symbol.toUpperCase(),
      "--side", opts.side,
      "--notional-usdc", String(opts.notionalUsd),
      "--slices", String(slices),
      "--interval-seconds", String(intervalSeconds),
      "--mode", mode,
      "-o", "json",
    ];
    if (opts.maxPriceDriftBps != null) {
      args.push("--max-price-drift-bps", String(opts.maxPriceDriftBps));
    }
    return {
      command: "vulcan",
      args,
      note: `Vulcan TWAP: ${opts.symbol} ${opts.side} $${opts.notionalUsd} over ${slices} slices × ${intervalSeconds}s in ${mode} mode.`,
    };
  }
}

export function createMarketMakerStatus(
  config: PerpsRuntimeConfig,
  intent: MarketMakerIntent,
): MarketMakerStatus {
  return new ClawdPerpsRuntime(config).createStatus(intent);
}
