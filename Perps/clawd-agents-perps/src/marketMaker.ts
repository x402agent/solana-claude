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
}

export function createMarketMakerStatus(
  config: PerpsRuntimeConfig,
  intent: MarketMakerIntent,
): MarketMakerStatus {
  return new ClawdPerpsRuntime(config).createStatus(intent);
}
