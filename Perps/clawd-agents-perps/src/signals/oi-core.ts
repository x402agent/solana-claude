import { readPhoenixOiTick, type OiTick } from "../adapters/phoenix-rise.js";

export type ClawdOiRegime =
  | "LONG_CONTINUATION"
  | "SHORT_CONTINUATION"
  | "SHORTS_CLOSING"
  | "LONGS_CLOSING"
  | "CROWDED_LONG_RISK"
  | "CROWDED_SHORT_RISK"
  | "NEUTRAL"
  | "DATA_INVALID";

export type SignalMode = "observe" | "paper" | "dry-run" | "confirm-each" | "auto-execute";

export type ClawdOiCoreSignal = {
  symbol: string;
  ts: number;
  regime: ClawdOiRegime;
  side: "long" | "short" | "flat";
  score: number;
  confidence: number;
  market: {
    markPrice: number;
    indexPrice?: number;
    priceDeltaPct: number;
    openInterestUsd: number;
    openInterestDeltaPct: number;
    fundingRate?: number;
    spreadBps?: number;
    depthUsd?: number;
    longOiUsd?: number;
    shortOiUsd?: number;
    skew?: number;
    markIndexBasisBps?: number;
  };
  gates: {
    dataFresh: boolean;
    oiPresent: boolean;
    spreadOk: boolean;
    fundingOk: boolean;
    liquidityOk: boolean;
    riskOk: boolean;
    executable: boolean;
    reason?: string;
  };
  action: {
    mode: SignalMode;
    suggestedRoute?: "phoenix" | "imperial" | "vulcan" | "none";
    maxNotionalUsdc?: number;
    stopReason?: string;
  };
};

export type BuildOiSignalArgs = {
  symbol: string;
  apiUrl?: string;
  rpcUrl?: string;
  previous?: OiTick;
  mode?: SignalMode;
  maxSpreadBps?: number;
  maxFundingAbs?: number;
  minDepthUsd?: number;
  maxMarkIndexBasisBps?: number;
  mock?: boolean;
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

const pct = (now: number, prev?: number) => {
  if (!prev || !Number.isFinite(prev) || prev === 0) return 0;
  return ((now - prev) / Math.abs(prev)) * 100;
};

const bps = (a?: number, b?: number) => {
  if (!a || !b || !Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return ((a - b) / ((a + b) / 2)) * 10_000;
};

export function classifyRegime(args: {
  priceDeltaPct: number;
  oiDeltaPct: number;
  fundingRate?: number;
  skew?: number;
}): Exclude<ClawdOiRegime, "DATA_INVALID"> {
  const { priceDeltaPct, oiDeltaPct, fundingRate = 0, skew = 0 } = args;

  const oiUp = oiDeltaPct > 0.75;
  const oiDown = oiDeltaPct < -0.75;
  const priceUp = priceDeltaPct > 0.25;
  const priceDown = priceDeltaPct < -0.25;

  const crowdedLong = oiUp && fundingRate > 0.0005 && skew > 0.15;
  const crowdedShort = oiUp && fundingRate < -0.0005 && skew < -0.15;

  if (crowdedLong) return "CROWDED_LONG_RISK";
  if (crowdedShort) return "CROWDED_SHORT_RISK";
  if (priceUp && oiUp) return "LONG_CONTINUATION";
  if (priceDown && oiUp) return "SHORT_CONTINUATION";
  if (priceUp && oiDown) return "SHORTS_CLOSING";
  if (priceDown && oiDown) return "LONGS_CLOSING";

  return "NEUTRAL";
}

export function scoreSignal(args: {
  regime: ClawdOiRegime;
  priceDeltaPct: number;
  oiDeltaPct: number;
  fundingRate?: number;
  spreadBps?: number;
  skew?: number;
}) {
  const { regime, priceDeltaPct, oiDeltaPct, fundingRate = 0, spreadBps = 0, skew = 0 } = args;
  let score = 0;

  if (regime === "LONG_CONTINUATION") {
    score = 35 + oiDeltaPct * 4 + priceDeltaPct * 5 - Math.abs(fundingRate) * 10_000;
  }
  if (regime === "SHORT_CONTINUATION") {
    score = -35 + oiDeltaPct * -4 + priceDeltaPct * 5 - Math.abs(fundingRate) * 2_500;
  }
  if (regime === "CROWDED_LONG_RISK") {
    score = -55 - Math.abs(skew) * 50;
  }
  if (regime === "CROWDED_SHORT_RISK") {
    score = 55 + Math.abs(skew) * 50;
  }
  if (regime === "SHORTS_CLOSING" || regime === "LONGS_CLOSING" || regime === "DATA_INVALID") {
    score = 0;
  }

  const spreadPenalty = Math.max(0, Math.abs(spreadBps) - 15) * 1.5;
  return clamp(score - Math.sign(score || 1) * spreadPenalty, -100, 100);
}

function invalidReasons(gates: ClawdOiCoreSignal["gates"]) {
  return Object.entries(gates)
    .filter(([key, value]) => key !== "executable" && key !== "reason" && value === false)
    .map(([key]) => key)
    .join(",");
}

export async function buildClawdOiCoreSignal(args: BuildOiSignalArgs): Promise<ClawdOiCoreSignal> {
  const tick = await readPhoenixOiTick({
    symbol: args.symbol,
    apiUrl: args.apiUrl,
    rpcUrl: args.rpcUrl,
    mock: args.mock,
  });

  const spreadBps = bps(tick.bestAsk, tick.bestBid);
  const markIndexBasisBps = bps(tick.markPrice, tick.indexPrice);
  const priceDeltaPct = pct(tick.markPrice, args.previous?.markPrice);
  const openInterestDeltaPct = pct(tick.openInterestUsd, args.previous?.openInterestUsd);
  const skew =
    tick.longOiUsd !== undefined && tick.shortOiUsd !== undefined
      ? (tick.longOiUsd - tick.shortOiUsd) / Math.max(tick.longOiUsd + tick.shortOiUsd, 1)
      : undefined;

  const gates: ClawdOiCoreSignal["gates"] = {
    dataFresh: Date.now() - tick.ts < 15_000,
    oiPresent: tick.openInterestUsd > 0,
    spreadOk: spreadBps === undefined || Math.abs(spreadBps) <= (args.maxSpreadBps ?? 25),
    fundingOk: tick.fundingRate === undefined || Math.abs(tick.fundingRate) <= (args.maxFundingAbs ?? 0.0025),
    liquidityOk: tick.depthUsd === undefined || tick.depthUsd >= (args.minDepthUsd ?? 25_000),
    riskOk: markIndexBasisBps === undefined || Math.abs(markIndexBasisBps) <= (args.maxMarkIndexBasisBps ?? 150),
    executable: false,
  };
  gates.executable =
    gates.dataFresh &&
    gates.oiPresent &&
    gates.spreadOk &&
    gates.fundingOk &&
    gates.liquidityOk &&
    gates.riskOk;
  if (!gates.executable) gates.reason = invalidReasons(gates);

  const rawRegime = classifyRegime({
    priceDeltaPct,
    oiDeltaPct: openInterestDeltaPct,
    fundingRate: tick.fundingRate,
    skew,
  });
  const regime: ClawdOiRegime = gates.executable ? rawRegime : "DATA_INVALID";
  const score = scoreSignal({
    regime,
    priceDeltaPct,
    oiDeltaPct: openInterestDeltaPct,
    fundingRate: tick.fundingRate,
    spreadBps,
    skew,
  });

  const mode = args.mode ?? "paper";
  const allowedToRoute = gates.executable && mode !== "observe";

  return {
    symbol: tick.symbol,
    ts: tick.ts,
    regime,
    side: score > 25 ? "long" : score < -25 ? "short" : "flat",
    score,
    confidence: clamp(Math.abs(score) / 100, 0, 1),
    market: {
      markPrice: tick.markPrice,
      indexPrice: tick.indexPrice,
      priceDeltaPct,
      openInterestUsd: tick.openInterestUsd,
      openInterestDeltaPct,
      fundingRate: tick.fundingRate,
      spreadBps,
      depthUsd: tick.depthUsd,
      longOiUsd: tick.longOiUsd,
      shortOiUsd: tick.shortOiUsd,
      skew,
      markIndexBasisBps,
    },
    gates,
    action: {
      mode,
      suggestedRoute: allowedToRoute ? "phoenix" : "none",
      maxNotionalUsdc: allowedToRoute ? Math.round(Math.abs(score) * 10) : 0,
      stopReason: allowedToRoute ? undefined : gates.reason ?? (mode === "observe" ? "observe-only" : undefined),
    },
  };
}

export function buildOiRiskGate(args: {
  signal: ClawdOiCoreSignal;
  notionalUsdc: number;
  side: "long" | "short";
}) {
  const directionOk = args.signal.side === "flat" || args.signal.side === args.side;
  const maxNotionalUsdc = args.signal.action.maxNotionalUsdc ?? 0;
  const notionalOk = args.notionalUsdc <= maxNotionalUsdc;
  const ok = args.signal.gates.executable && directionOk && notionalOk;

  return {
    ok,
    reason: ok
      ? "spread, funding, depth, and OI gates passed"
      : [
          args.signal.gates.reason,
          directionOk ? undefined : `signal side ${args.signal.side} does not match requested ${args.side}`,
          notionalOk ? undefined : `notional ${args.notionalUsdc} exceeds signal max ${maxNotionalUsdc}`,
        ].filter(Boolean).join("; "),
    maxNotionalUsdc,
    recommendedMode: args.signal.action.mode,
    signal: args.signal,
  };
}
