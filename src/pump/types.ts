/**
 * src/pump/types.ts
 *
 * Pump.fun + PumpSwap (AMM) type definitions for solana-claude.
 *
 * Adapted from:
 *   /pump-public-docs/docs/PUMP_PROGRAM_README.md
 *   /pump-public-docs/docs/PUMP_SWAP_README.md
 *   /pump-public-docs/docs/PUMP_CASHBACK_README.md
 *
 * Program addresses:
 *   Pump bonding curve:  6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
 *   PumpSwap AMM:        pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA
 *   PumpFees:            pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ
 */

// ─── Program Addresses ───────────────────────────────────────────────────────

export const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMP_AMM_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const PUMP_FEE_PROGRAM_ID = "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ";

/** Well-known PDAs */
export const PUMP_GLOBAL_PDA = "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf";
export const PUMP_AMM_GLOBAL_CONFIG_PDA = "ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw";
export const CANONICAL_POOL_INDEX = 0;

/** Bonding curve initial parameters (from Global account) */
export const INITIAL_VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000n;
export const INITIAL_VIRTUAL_SOL_RESERVES = 30_000_000_000n;
export const INITIAL_REAL_TOKEN_RESERVES = 793_100_000_000_000n;
export const TOKEN_TOTAL_SUPPLY = 1_000_000_000_000_000n;
export const FEE_BASIS_POINTS = 100n; // 1%

/** AMM fee structure (from GlobalConfig) */
export const AMM_LP_FEE_BPS = 20n;          // 0.20% LP fee
export const AMM_PROTOCOL_FEE_BPS = 5n;     // 0.05% protocol fee
export const AMM_TOTAL_FEE_BPS = 25n;       // 0.25% total

/** Graduation threshold: when real_token_reserves == 0, token graduates to AMM */
export const GRADUATION_SOL_THRESHOLD_LAMPORTS = 85_000_000_000n; // ~85 SOL

// ─── On-chain Account Types ──────────────────────────────────────────────────

/** Pump Global account — singleton at PUMP_GLOBAL_PDA */
export interface PumpGlobal {
  initialized: boolean;
  authority: string;
  feeRecipient: string;
  initialVirtualTokenReserves: bigint;
  initialVirtualSolReserves: bigint;
  initialRealTokenReserves: bigint;
  tokenTotalSupply: bigint;
  feeBasisPoints: bigint;
  withdrawAuthority: string;
  enableMigrate: boolean;
  poolMigrationFee: bigint;
  creatorFeeBasisPoints: bigint;
  feeRecipients: string[];
}

/** Pump BondingCurve account — one per token, PDA from ["bonding-curve", mint] */
export interface BondingCurve {
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  realSolReserves: bigint;
  tokenTotalSupply: bigint;
  /** true when realTokenReserves == 0 (ready to migrate) */
  complete: boolean;
  creator: string;
  /** Mayhem mode: higher risk/reward, no creator fee */
  isMayhemMode: boolean;
  /** Cashback mode: creator fee redirected to traders */
  isCashbackCoin?: boolean;
}

/** PumpSwap Pool account — one per graduated token */
export interface PumpPool {
  poolBump: number;
  index: number;
  creator: string;
  baseMint: string;   // the token
  quoteMint: string;  // SOL (So11111111111111111111111111111111111111112)
  lpMint: string;
  poolBaseTokenAccount: string;
  poolQuoteTokenAccount: string;
  lpSupply: bigint;
  coinCreator: string;
  isMayhemMode: boolean;
  isCashbackCoin?: boolean;
}

/** PumpSwap GlobalConfig — singleton */
export interface PumpAmmGlobalConfig {
  admin: string;
  lpFeeBasisPoints: bigint;
  protocolFeeBasisPoints: bigint;
  disableFlags: number;
  protocolFeeRecipients: string[];
  coinCreatorFeeBasisPoints: bigint;
}

// ─── Event Types (emitted by Pump programs) ──────────────────────────────────

export interface TradeEvent {
  mint: string;
  solAmount: bigint;
  tokenAmount: bigint;
  isBuy: boolean;
  user: string;
  timestamp: bigint;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
  feeRecipient: string;
  feeBasisPoints: bigint;
  fee: bigint;
  creator: string;
  creatorFeeBasisPoints: bigint;
  creatorFee: bigint;
  trackVolume: boolean;
  /** Cashback fields */
  cashbackFeeBasisPoints?: bigint;
  cashback?: bigint;
}

export interface CreateEvent {
  name: string;
  symbol: string;
  uri: string;
  mint: string;
  bondingCurve: string;
  user: string;
  creator: string;
  timestamp: bigint;
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  tokenTotalSupply: bigint;
  isMayhemMode: boolean;
  isCashbackEnabled: boolean;
}

export interface CompleteEvent {
  user: string;
  mint: string;
  bondingCurve: string;
  timestamp: bigint;
}

export interface AmmBuyEvent {
  timestamp: bigint;
  baseAmountOut: bigint;
  maxQuoteAmountIn: bigint;
  quoteAmountIn: bigint;
  lpFeeBasisPoints: bigint;
  lpFee: bigint;
  protocolFeeBasisPoints: bigint;
  protocolFee: bigint;
  pool: string;
  user: string;
  coinCreator: string;
  coinCreatorFeeBasisPoints: bigint;
  coinCreatorFee: bigint;
  cashbackFeeBasisPoints?: bigint;
  cashback?: bigint;
}

export interface AmmSellEvent {
  timestamp: bigint;
  baseAmountIn: bigint;
  minQuoteAmountOut: bigint;
  quoteAmountOut: bigint;
  lpFeeBasisPoints: bigint;
  lpFee: bigint;
  protocolFeeBasisPoints: bigint;
  protocolFee: bigint;
  pool: string;
  user: string;
  coinCreator: string;
  coinCreatorFeeBasisPoints: bigint;
  coinCreatorFee: bigint;
  cashbackFeeBasisPoints?: bigint;
  cashback?: bigint;
}

// ─── Analytical Result Types ──────────────────────────────────────────────────

export interface BondingCurveQuote {
  /** SOL cost or proceeds in lamports */
  solLamports: bigint;
  /** Token amount (raw, 6 decimals) */
  tokenAmount: bigint;
  /** Protocol fee in lamports */
  protocolFee: bigint;
  /** Creator fee in lamports */
  creatorFee: bigint;
  /** Price per token in lamports (solLamports / tokenAmount) */
  pricePerToken: bigint;
  /** Price impact in basis points */
  priceImpactBps: number;
}

export interface GraduationProgress {
  /** Tokens sold so far (initialReal - realTokenReserves) */
  tokensSold: bigint;
  /** Total real tokens at launch */
  tokensTotal: bigint;
  /** 0–10000 bps progress */
  progressBps: number;
  /** SOL accumulated in real reserves */
  solAccumulated: bigint;
  /** Whether token has graduated */
  isGraduated: boolean;
}

export interface TokenPriceInfo {
  /** Cost to buy 1 whole token (10^6 raw units) in lamports */
  buyPriceLamports: bigint;
  /** SOL received for selling 1 whole token in lamports */
  sellPriceLamports: bigint;
  /** Market cap in lamports */
  marketCapLamports: bigint;
  /** Market cap in USD (requires SOL price) */
  marketCapUSD?: number;
  /** Graduation progress */
  graduation: GraduationProgress;
}

// ─── Scan Result Types (for agent integration) ───────────────────────────────

export interface PumpTokenScan {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  createdAt: number;
  /** Bonding curve state */
  bondingCurve: BondingCurve | null;
  /** Derived analytics */
  priceInfo: TokenPriceInfo | null;
  /** Whether it has graduated to PumpSwap AMM */
  isGraduated: boolean;
  /** Pool info if graduated */
  pool: PumpPool | null;
  /** Trade events in the last 24h (from Helius) */
  recentTrades: TradeEvent[];
  /** Holder count (from DAS) */
  holderCount?: number;
  /** Security flags */
  flags: PumpTokenFlags;
}

export interface PumpTokenFlags {
  /** Creator has no more tokens */
  creatorSold: boolean;
  /** Liquidity locked (LP tokens burned) */
  liquidityLocked: boolean;
  /** Token has cashback enabled */
  cashbackEnabled: boolean;
  /** Token is in mayhem mode */
  mayhemMode: boolean;
  /** Top 10 holders control > 50% */
  whaleConcentration: boolean;
}
