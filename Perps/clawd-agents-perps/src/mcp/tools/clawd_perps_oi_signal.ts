import { buildClawdOiCoreSignal, buildOiRiskGate, type SignalMode } from "../../signals/oi-core.js";

export async function clawd_perps_oi_signal(input: {
  symbol?: string;
  mode?: SignalMode;
  lookback?: string;
  mock?: boolean;
}) {
  return buildClawdOiCoreSignal({
    symbol: input.symbol ?? "SOL-PERP",
    mode: input.mode ?? "paper",
    mock: input.mock,
  });
}

export async function clawd_perps_oi_risk_gate(input: {
  symbol?: string;
  notionalUsdc?: number;
  side?: "long" | "short";
  mode?: SignalMode;
  mock?: boolean;
}) {
  const signal = await clawd_perps_oi_signal({
    symbol: input.symbol,
    mode: input.mode ?? "paper",
    mock: input.mock,
  });
  return buildOiRiskGate({
    signal,
    notionalUsdc: input.notionalUsdc ?? 500,
    side: input.side ?? "long",
  });
}
