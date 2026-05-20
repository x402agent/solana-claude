export type TradingMode = "observe" | "paper" | "live";

export interface PerpsRiskLimits {
  allowedSymbols: string[];
  maxNotionalUsd: number;
  maxLeverage: number;
  maxSpreadBps: number;
  requireWallet: boolean;
}

export interface PerpsRuntimeConfig {
  rpcUrl: string;
  apiUrl: string;
  heliusApiKey?: string;
  wallet?: string;
  traderPdaIndex: number;
  traderSubaccountIndex: number;
  liveTrading: boolean;
  operatorConfirmed: boolean;
  simOnly: boolean;
  telegramBotToken?: string;
  telegramAllowedChats: string[];
  risk: PerpsRiskLimits;
}

export interface PreflightRequest {
  symbol: string;
  notionalUsd: number;
  leverage?: number;
  expectedSpreadBps?: number;
  execution: "observe" | "paper" | "vulcan-live" | "rise-live";
}

export interface PreflightReport {
  ok: boolean;
  mode: TradingMode;
  blocking: string[];
  warnings: string[];
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSymbols(symbols: string[]): string[] {
  return symbols.map((symbol) => symbol.toUpperCase());
}

export function loadPerpsRuntimeConfig(env: NodeJS.ProcessEnv = process.env): PerpsRuntimeConfig {
  return {
    rpcUrl: env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
    apiUrl: env.CLAWD_PERPS_API_URL ?? "https://perp-api.phoenix.trade",
    heliusApiKey: env.HELIUS_API_KEY || undefined,
    wallet: env.CLAWD_PERPS_WALLET || undefined,
    traderPdaIndex: Number(env.CLAWD_PERPS_TRADER_PDA_INDEX ?? 0),
    traderSubaccountIndex: Number(env.CLAWD_PERPS_TRADER_SUBACCOUNT_INDEX ?? 0),
    liveTrading: env.LIVE_TRADING === "true",
    operatorConfirmed: env.OPERATOR_CONFIRMED === "true",
    simOnly: env.PERPS_SIM_ONLY !== "false",
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || undefined,
    telegramAllowedChats: parseCsv(env.TELEGRAM_ALLOWED_CHATS),
    risk: {
      allowedSymbols: normalizeSymbols(parseCsv(env.PERPS_ALLOWED_SYMBOLS ?? "SOL,ETH,BTC")),
      maxNotionalUsd: Number(env.PERPS_MAX_NOTIONAL_USD ?? 250),
      maxLeverage: Number(env.PERPS_MAX_LEVERAGE ?? 3),
      maxSpreadBps: Number(env.PERPS_MAX_SPREAD_BPS ?? 40),
      requireWallet: env.PERPS_REQUIRE_WALLET !== "false",
    },
  };
}

export function resolveTradingMode(config: PerpsRuntimeConfig): TradingMode {
  if (config.liveTrading && config.operatorConfirmed && !config.simOnly) {
    return "live";
  }
  if (!config.simOnly) {
    return "paper";
  }
  return "observe";
}

export function buildPreflightReport(
  config: PerpsRuntimeConfig,
  request: PreflightRequest,
): PreflightReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const mode = resolveTradingMode(config);
  const symbol = request.symbol.trim().toUpperCase();

  if (!config.rpcUrl) {
    blocking.push("Missing SOLANA_RPC_URL.");
  }
  if (config.risk.requireWallet && !config.wallet) {
    blocking.push("Missing CLAWD_PERPS_WALLET.");
  }
  if (!config.risk.allowedSymbols.includes(symbol)) {
    blocking.push(`Symbol ${symbol} is outside PERPS_ALLOWED_SYMBOLS.`);
  }
  if (request.notionalUsd <= 0) {
    blocking.push("Notional must be positive.");
  }
  if (request.notionalUsd > config.risk.maxNotionalUsd) {
    blocking.push(
      `Notional ${request.notionalUsd} exceeds PERPS_MAX_NOTIONAL_USD=${config.risk.maxNotionalUsd}.`,
    );
  }
  if (request.leverage !== undefined && request.leverage > config.risk.maxLeverage) {
    blocking.push(
      `Leverage ${request.leverage} exceeds PERPS_MAX_LEVERAGE=${config.risk.maxLeverage}.`,
    );
  }
  if (
    request.expectedSpreadBps !== undefined &&
    request.expectedSpreadBps > config.risk.maxSpreadBps
  ) {
    blocking.push(
      `Spread ${request.expectedSpreadBps}bps exceeds PERPS_MAX_SPREAD_BPS=${config.risk.maxSpreadBps}.`,
    );
  }
  if (request.execution === "rise-live" || request.execution === "vulcan-live") {
    if (mode !== "live") {
      blocking.push(
        "Live execution disabled. Require LIVE_TRADING=true, OPERATOR_CONFIRMED=true, and PERPS_SIM_ONLY=false.",
      );
    }
    warnings.push("Live execution path must still simulate and sign outside this adapter.");
  }
  if (mode !== "live") {
    warnings.push(`Runtime mode is ${mode}; execution should remain observe/paper.`);
  }

  return {
    ok: blocking.length === 0,
    mode,
    blocking,
    warnings,
  };
}

export function assertLiveTradingAllowed(
  config: PerpsRuntimeConfig,
  request: Omit<PreflightRequest, "execution">,
): PreflightReport {
  const report = buildPreflightReport(config, {
    ...request,
    execution: "rise-live",
  });
  if (!report.ok) {
    throw new Error(report.blocking.join(" "));
  }
  return report;
}
