import { DEFAULT_GLOBAL, FEE_TIERS, LAMPORTS_PER_SOL } from "./constants.js";
import type {
  Amount,
  BondingCurve,
  FeeBreakdown,
  Global,
  Quote,
} from "./types.js";

const BPS_DENOM = 10_000n;

function ceilDiv(a: Amount, b: Amount): Amount {
  return (a + b - 1n) / b;
}

/** Build a fresh bonding curve from global genesis config. */
export function newBondingCurve(global: Global = DEFAULT_GLOBAL): BondingCurve {
  return {
    virtualTokenReserves: global.initialVirtualTokenReserves,
    virtualSolReserves: global.initialVirtualSolReserves,
    realTokenReserves: global.initialRealTokenReserves,
    realSolReserves: 0n,
    tokenTotalSupply: global.tokenTotalSupply,
    complete: false,
    creator: null,
  };
}

/** Current curve price expressed as lamports per whole token (scaled by 1e9). */
export function curvePriceScaled(curve: BondingCurve): Amount {
  if (curve.virtualTokenReserves === 0n) return 0n;
  return (curve.virtualSolReserves * 1_000_000_000n) / curve.virtualTokenReserves;
}

/** Market cap in lamports = price * total supply. */
export function marketCapLamports(curve: BondingCurve): Amount {
  return (curvePriceScaled(curve) * curve.tokenTotalSupply) / 1_000_000_000n;
}

/** Pick the active fee tier for a curve's market cap. */
export function calculateFeesBps(curve: BondingCurve): FeeBreakdown {
  const mc = marketCapLamports(curve);
  let tier = FEE_TIERS[0]!;
  for (const candidate of FEE_TIERS) {
    if (mc >= candidate.marketCapLamports) tier = candidate;
  }
  const totalBps = tier.lpFeeBps + tier.protocolFeeBps + tier.creatorFeeBps;
  return {
    lpFeeBps: tier.lpFeeBps,
    protocolFeeBps: tier.protocolFeeBps,
    creatorFeeBps: tier.creatorFeeBps,
    totalBps,
  };
}

function feeOn(amount: Amount, totalBps: number): Amount {
  return (amount * BigInt(totalBps)) / BPS_DENOM;
}

/**
 * Tokens received for a given SOL input (fee taken off the SOL in first).
 * Constant product: tokensOut = y * netSol / (x + netSol).
 */
export function getBuyTokenAmountFromSolAmount(
  curve: BondingCurve,
  solAmount: Amount,
): Quote {
  const fee = calculateFeesBps(curve);
  const feeLamports = feeOn(solAmount, fee.totalBps);
  const netSol = solAmount - feeLamports;
  const amountOut =
    netSol <= 0n
      ? 0n
      : (curve.virtualTokenReserves * netSol) /
        (curve.virtualSolReserves + netSol);

  const nextCurve: BondingCurve = {
    ...curve,
    virtualSolReserves: curve.virtualSolReserves + netSol,
    virtualTokenReserves: curve.virtualTokenReserves - amountOut,
    realSolReserves: curve.realSolReserves + netSol,
    realTokenReserves: curve.realTokenReserves - amountOut,
  };
  return { amountOut, feeLamports, fee, nextCurve };
}

/**
 * SOL required (including fee) to receive an exact token amount.
 * solBeforeFee = x * tokenAmount / (y - tokenAmount); gross-up for fee.
 */
export function getBuySolAmountFromTokenAmount(
  curve: BondingCurve,
  tokenAmount: Amount,
): Quote {
  const fee = calculateFeesBps(curve);
  if (tokenAmount <= 0n || tokenAmount >= curve.virtualTokenReserves) {
    return { amountOut: 0n, feeLamports: 0n, fee, nextCurve: curve };
  }
  const netSol = ceilDiv(
    curve.virtualSolReserves * tokenAmount,
    curve.virtualTokenReserves - tokenAmount,
  );
  const grossSol = ceilDiv(netSol * BPS_DENOM, BPS_DENOM - BigInt(fee.totalBps));
  const feeLamports = grossSol - netSol;

  const nextCurve: BondingCurve = {
    ...curve,
    virtualSolReserves: curve.virtualSolReserves + netSol,
    virtualTokenReserves: curve.virtualTokenReserves - tokenAmount,
    realSolReserves: curve.realSolReserves + netSol,
    realTokenReserves: curve.realTokenReserves - tokenAmount,
  };
  return { amountOut: grossSol, feeLamports, fee, nextCurve };
}

/**
 * SOL received when selling an exact token amount (fee taken off the SOL out).
 * solBeforeFee = x * tokenAmount / (y + tokenAmount).
 */
export function getSellSolAmountFromTokenAmount(
  curve: BondingCurve,
  tokenAmount: Amount,
): Quote {
  const fee = calculateFeesBps(curve);
  if (tokenAmount <= 0n) {
    return { amountOut: 0n, feeLamports: 0n, fee, nextCurve: curve };
  }
  const solBeforeFee =
    (curve.virtualSolReserves * tokenAmount) /
    (curve.virtualTokenReserves + tokenAmount);
  const feeLamports = feeOn(solBeforeFee, fee.totalBps);
  const amountOut = solBeforeFee - feeLamports;

  const nextCurve: BondingCurve = {
    ...curve,
    virtualSolReserves: curve.virtualSolReserves - solBeforeFee,
    virtualTokenReserves: curve.virtualTokenReserves + tokenAmount,
    realSolReserves: curve.realSolReserves - solBeforeFee,
    realTokenReserves: curve.realTokenReserves + tokenAmount,
  };
  return { amountOut, feeLamports, fee, nextCurve };
}

/** True once the curve's real token reserves are exhausted (ready to graduate). */
export function isComplete(curve: BondingCurve): boolean {
  return curve.complete || curve.realTokenReserves <= 0n;
}

export function lamportsToSol(lamports: Amount): number {
  return Number(lamports) / Number(LAMPORTS_PER_SOL);
}
