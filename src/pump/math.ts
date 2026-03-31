/**
 * src/pump/math.ts
 *
 * Pure bonding-curve math for Pump.fun tokens.
 *
 * Adapted from pump-public-docs and the pump-sdk source (bondingCurve.ts, fees.ts, analytics.ts).
 * All BigInt — no floating point errors.
 *
 * Bonding curve formula: constant-product AMM (Uniswap V2 style) with synthetic reserves.
 *
 * buy tokens:
 *   tokenOut = inputSol * virtualTokenReserves / (virtualSolReserves + inputSol)
 * sell tokens:
 *   solOut = tokenIn * virtualSolReserves / (virtualTokenReserves + tokenIn)
 *
 * Fees: protocol (1% = 100bps) + creator (if set), applied on top of trade amount.
 */

import type {
  BondingCurve,
  BondingCurveQuote,
  GraduationProgress,
  TokenPriceInfo,
} from "./types.js";
import {
  FEE_BASIS_POINTS,
  INITIAL_REAL_TOKEN_RESERVES,
  INITIAL_VIRTUAL_SOL_RESERVES,
  INITIAL_VIRTUAL_TOKEN_RESERVES,
  TOKEN_TOTAL_SUPPLY,
} from "./types.js";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Pump tokens have 6 decimals */
export const ONE_TOKEN = 1_000_000n;
export const ONE_SOL = 1_000_000_000n;
const BPS = 10_000n;

// ─── Default Bonding Curve ───────────────────────────────────────────────────

/**
 * Build a fresh bonding curve state (for tokens that haven't had any trades).
 * Used for pre-launch simulations.
 */
export function newBondingCurve(creator = "11111111111111111111111111111111"): BondingCurve {
  return {
    virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
    virtualSolReserves: INITIAL_VIRTUAL_SOL_RESERVES,
    realTokenReserves: INITIAL_REAL_TOKEN_RESERVES,
    realSolReserves: 0n,
    tokenTotalSupply: TOKEN_TOTAL_SUPPLY,
    complete: false,
    creator,
    isMayhemMode: false,
    isCashbackCoin: false,
  };
}

// ─── Core AMM Math ──────────────────────────────────────────────────────────

/** Ceiling division: ⌈a/b⌉ */
function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

/** fee = ceilDiv(amount * feeBps, 10000) */
function applyFee(amount: bigint, feeBps: bigint): bigint {
  return ceilDiv(amount * feeBps, BPS);
}

/** Compute spot price: lamports per raw token unit (scaled by 1e9) */
export function spotPriceLamports(bc: BondingCurve): bigint {
  if (bc.virtualTokenReserves === 0n) return 0n;
  return (bc.virtualSolReserves * ONE_SOL) / bc.virtualTokenReserves;
}

// ─── Buy Quote ──────────────────────────────────────────────────────────────

/**
 * Quote how many tokens you get for a given SOL input (buy).
 * Accounts for protocol + creator fees.
 *
 * @param bc    - Current bonding curve reserves
 * @param solIn - SOL to spend (lamports, inclusive of fees)
 * @param creatorFeeBps - Creator fee in bps (0 for new tokens)
 * @returns Detailed buy quote
 */
export function getBuyQuote(
  bc: BondingCurve,
  solIn: bigint,
  creatorFeeBps = 0n,
): BondingCurveQuote {
  if (solIn === 0n || bc.virtualTokenReserves === 0n) {
    return { solLamports: 0n, tokenAmount: 0n, protocolFee: 0n, creatorFee: 0n, pricePerToken: 0n, priceImpactBps: 0 };
  }

  const totalFeeBps = FEE_BASIS_POINTS + creatorFeeBps;

  // Subtract fees from input: inputNet = floor((solIn - 1) * 10000 / (totalFees + 10000))
  const inputNet = ((solIn - 1n) * BPS) / (totalFeeBps + BPS);

  // x * y = k: tokenOut = inputNet * vToken / (vSol + inputNet)
  const rawTokenOut =
    (inputNet * bc.virtualTokenReserves) / (bc.virtualSolReserves + inputNet);
  const tokenAmount = rawTokenOut < bc.realTokenReserves ? rawTokenOut : bc.realTokenReserves;

  const protocolFee = applyFee(inputNet, FEE_BASIS_POINTS);
  const creatorFee = creatorFeeBps > 0n ? applyFee(inputNet, creatorFeeBps) : 0n;

  const priceBefore = spotPriceLamports(bc);
  const newVSol = bc.virtualSolReserves + inputNet;
  const newVToken = bc.virtualTokenReserves - tokenAmount;
  const priceAfter = newVToken === 0n ? 0n : (newVSol * ONE_SOL) / newVToken;
  const priceImpactBps = priceBefore === 0n ? 0 :
    Number(((priceAfter - priceBefore) * BPS) / priceBefore);

  return {
    solLamports: solIn,
    tokenAmount,
    protocolFee,
    creatorFee,
    pricePerToken: tokenAmount === 0n ? 0n : (solIn * ONE_SOL) / tokenAmount,
    priceImpactBps,
  };
}

/**
 * Quote how much SOL you need to buy an exact token amount.
 *
 * @param bc        - Current bonding curve reserves
 * @param tokenWant - Token amount to buy (raw units)
 * @param creatorFeeBps - Creator fee bps
 * @returns SOL required (lamports)
 */
export function getSolCostForTokens(
  bc: BondingCurve,
  tokenWant: bigint,
  creatorFeeBps = 0n,
): bigint {
  if (tokenWant === 0n || bc.virtualTokenReserves === 0n) return 0n;
  const minAmount = tokenWant < bc.realTokenReserves ? tokenWant : bc.realTokenReserves;

  // Reverse AMM: solNeeded = minAmount * vSol / (vToken - minAmount) + 1
  const solBase = ceilDiv(minAmount * bc.virtualSolReserves, bc.virtualTokenReserves - minAmount);

  const totalFeeBps = FEE_BASIS_POINTS + creatorFeeBps;
  return solBase + applyFee(solBase, totalFeeBps);
}

// ─── Sell Quote ─────────────────────────────────────────────────────────────

/**
 * Quote how much SOL you receive for selling a given token amount.
 *
 * @param bc          - Current bonding curve reserves
 * @param tokenAmount - Tokens to sell (raw units, 6 decimals)
 * @param creatorFeeBps - Creator fee bps
 * @returns Detailed sell quote
 */
export function getSellQuote(
  bc: BondingCurve,
  tokenAmount: bigint,
  creatorFeeBps = 0n,
): BondingCurveQuote {
  if (tokenAmount === 0n || bc.virtualTokenReserves === 0n) {
    return { solLamports: 0n, tokenAmount: 0n, protocolFee: 0n, creatorFee: 0n, pricePerToken: 0n, priceImpactBps: 0 };
  }

  // x * y = k: solOut = tokenIn * vSol / (vToken + tokenIn)
  const rawSolOut = (tokenAmount * bc.virtualSolReserves) / (bc.virtualTokenReserves + tokenAmount);

  const protocolFee = applyFee(rawSolOut, FEE_BASIS_POINTS);
  const creatorFee = creatorFeeBps > 0n ? applyFee(rawSolOut, creatorFeeBps) : 0n;
  const solOut = rawSolOut - protocolFee - creatorFee;

  const priceBefore = spotPriceLamports(bc);
  const newVSol = bc.virtualSolReserves - rawSolOut;
  const newVToken = bc.virtualTokenReserves + tokenAmount;
  const priceAfter = newVToken === 0n ? 0n : (newVSol * ONE_SOL) / newVToken;
  const priceImpactBps = priceBefore === 0n ? 0 :
    Number(((priceBefore - priceAfter) * BPS) / priceBefore);

  return {
    solLamports: solOut < 0n ? 0n : solOut,
    tokenAmount,
    protocolFee,
    creatorFee,
    pricePerToken: tokenAmount === 0n ? 0n : (solOut * ONE_SOL) / tokenAmount,
    priceImpactBps,
  };
}

// ─── Graduation Progress ─────────────────────────────────────────────────────

/**
 * Calculate graduation progress — how close a token is to migrating to PumpSwap.
 * A token graduates when realTokenReserves == 0 (all real tokens sold).
 */
export function getGraduationProgress(bc: BondingCurve): GraduationProgress {
  if (bc.complete || (INITIAL_REAL_TOKEN_RESERVES > 0n && bc.realTokenReserves === 0n)) {
    return {
      tokensSold: INITIAL_REAL_TOKEN_RESERVES,
      tokensTotal: INITIAL_REAL_TOKEN_RESERVES,
      progressBps: 10_000,
      solAccumulated: bc.realSolReserves,
      isGraduated: true,
    };
  }

  // Cast via BigInt() to prevent compiler from narrowing the literal type
  const totalRealTokens = BigInt(INITIAL_REAL_TOKEN_RESERVES);
  const tokensSold = totalRealTokens - bc.realTokenReserves;
  const progressBps = totalRealTokens === 0n ? 0
    : Number((tokensSold * BPS) / totalRealTokens);

  return {
    tokensSold,
    tokensTotal: INITIAL_REAL_TOKEN_RESERVES,
    progressBps,
    solAccumulated: bc.realSolReserves,
    isGraduated: false,
  };
}

// ─── Market Cap ──────────────────────────────────────────────────────────────

/**
 * Bonding curve market cap = virtualSolReserves * totalSupply / virtualTokenReserves
 * Returns value in lamports.
 */
export function bondingCurveMarketCap(bc: BondingCurve): bigint {
  if (bc.virtualTokenReserves === 0n) return 0n;
  return (bc.virtualSolReserves * bc.tokenTotalSupply) / bc.virtualTokenReserves;
}

// ─── Token Price Info ────────────────────────────────────────────────────────

/**
 * Get the full price info for a token on its bonding curve.
 *
 * @param bc       - Current bonding curve state
 * @param solPriceUSD - Current SOL price in USD (from CoinGecko/Jupiter)
 */
export function getTokenPriceInfo(
  bc: BondingCurve,
  solPriceUSD?: number,
): TokenPriceInfo {
  const buyQuote = getSellQuote(bc, ONE_TOKEN);    // Actually uses getSellQuote for "sell 1 token" = sell side price
  const buyQuoteActual = getBuyQuote(bc, getSolCostForTokens(bc, ONE_TOKEN));

  const marketCapLamports = bondingCurveMarketCap(bc);
  const marketCapUSD = solPriceUSD !== undefined
    ? (Number(marketCapLamports) / 1e9) * solPriceUSD
    : undefined;

  return {
    buyPriceLamports: buyQuoteActual.solLamports,
    sellPriceLamports: buyQuote.solLamports,
    marketCapLamports,
    marketCapUSD,
    graduation: getGraduationProgress(bc),
  };
}

// ─── PumpSwap AMM Math ───────────────────────────────────────────────────────

/**
 * Quote a PumpSwap AMM buy (graduated token).
 * Fees: LP fee (20bps) + protocol fee (5bps) = 25bps total.
 *
 * @param poolBaseReserves  - AMM base (token) reserves
 * @param poolQuoteReserves - AMM quote (SOL) reserves
 * @param solIn             - SOL to spend (lamports)
 * @param coinCreatorFeeBps - Coin creator fee (typically 0 for AMM)
 */
export function getAmmBuyQuote(
  poolBaseReserves: bigint,
  poolQuoteReserves: bigint,
  solIn: bigint,
  coinCreatorFeeBps = 0n,
): { tokenOut: bigint; totalFeeLamports: bigint; priceImpactBps: number } {
  if (solIn === 0n || poolBaseReserves === 0n || poolQuoteReserves === 0n) {
    return { tokenOut: 0n, totalFeeLamports: 0n, priceImpactBps: 0 };
  }

  const totalFeeBps = 20n + 5n + coinCreatorFeeBps; // LP + protocol + creator
  const totalFee = applyFee(solIn, totalFeeBps);
  const solInWithFee = solIn - totalFee;

  // x*y=k formula
  const tokenOut = (solInWithFee * poolBaseReserves) / (poolQuoteReserves + solInWithFee);

  const spotBefore = poolQuoteReserves === 0n ? 0n : (poolBaseReserves * ONE_SOL) / poolQuoteReserves;
  const newQuote = poolQuoteReserves + solInWithFee;
  const newBase = poolBaseReserves - tokenOut;
  const spotAfter = newQuote === 0n ? 0n : (newBase * ONE_SOL) / newQuote;
  const priceImpactBps = spotBefore === 0n ? 0
    : Number(((spotBefore - spotAfter) * BPS) / spotBefore);

  return { tokenOut, totalFeeLamports: totalFee, priceImpactBps };
}

/**
 * Quote a PumpSwap AMM sell.
 *
 * @param poolBaseReserves  - AMM base (token) reserves
 * @param poolQuoteReserves - AMM quote (SOL) reserves
 * @param tokenIn           - Tokens to sell (raw units)
 * @param coinCreatorFeeBps - Coin creator fee
 */
export function getAmmSellQuote(
  poolBaseReserves: bigint,
  poolQuoteReserves: bigint,
  tokenIn: bigint,
  coinCreatorFeeBps = 0n,
): { solOut: bigint; totalFeeLamports: bigint; priceImpactBps: number } {
  if (tokenIn === 0n || poolBaseReserves === 0n || poolQuoteReserves === 0n) {
    return { solOut: 0n, totalFeeLamports: 0n, priceImpactBps: 0 };
  }

  // x*y=k: solGross = tokenIn * poolQuote / (poolBase + tokenIn)
  const solGross = (tokenIn * poolQuoteReserves) / (poolBaseReserves + tokenIn);

  const totalFeeBps = 20n + 5n + coinCreatorFeeBps;
  const totalFee = applyFee(solGross, totalFeeBps);
  const solOut = solGross - totalFee;

  const spotBefore = poolQuoteReserves === 0n ? 0n : (poolBaseReserves * ONE_SOL) / poolQuoteReserves;
  const newBase = poolBaseReserves + tokenIn;
  const newQuote = poolQuoteReserves - solGross;
  const spotAfter = newQuote === 0n ? 0n : (newBase * ONE_SOL) / newQuote;
  const priceImpactBps = spotBefore === 0n ? 0
    : Number(((spotAfter - spotBefore) * BPS) / spotBefore);

  return { solOut: solOut < 0n ? 0n : solOut, totalFeeLamports: totalFee, priceImpactBps };
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

/** Format lamports as human-readable SOL string */
export function formatSol(lamports: bigint, decimals = 4): string {
  const sol = Number(lamports) / 1e9;
  return `${sol.toFixed(decimals)} SOL`;
}

/** Format raw token units as human-readable with symbol */
export function formatTokens(raw: bigint, symbol = "", decimals = 2): string {
  const amount = Number(raw) / 1e6;
  const fmt = amount >= 1_000_000
    ? `${(amount / 1_000_000).toFixed(2)}M`
    : amount >= 1_000
    ? `${(amount / 1_000).toFixed(2)}K`
    : amount.toFixed(decimals);
  return symbol ? `${fmt} ${symbol}` : fmt;
}

/** Format market cap in USD */
export function formatMarketCap(lamports: bigint, solPriceUSD: number): string {
  const usd = (Number(lamports) / 1e9) * solPriceUSD;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(2)}K`;
  return `$${usd.toFixed(2)}`;
}

/** Format price impact */
export function formatPriceImpact(bps: number): string {
  const pct = bps / 100;
  if (pct < 0.5) return `${pct.toFixed(2)}% 🟢`;
  if (pct < 2) return `${pct.toFixed(2)}% 🟡`;
  return `${pct.toFixed(2)}% 🔴`;
}

/** Format graduation progress */
export function formatGraduation(progressBps: number): string {
  const pct = (progressBps / 100).toFixed(1);
  const bar = "█".repeat(Math.round(progressBps / 1000)) + "░".repeat(10 - Math.round(progressBps / 1000));
  return `${bar} ${pct}%`;
}
