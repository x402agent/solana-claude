/**
 * src/pump/index.ts
 *
 * Public barrel export for the Pump.fun integration module.
 *
 * Usage:
 *   import { PumpScanner, getBuyQuote, PUMP_PROGRAM_ID } from "../pump/index.js";
 */

// Types
export type {
  BondingCurve,
  PumpGlobal,
  PumpPool,
  PumpAmmGlobalConfig,
  TradeEvent,
  CreateEvent,
  CompleteEvent,
  AmmBuyEvent,
  AmmSellEvent,
  BondingCurveQuote,
  GraduationProgress,
  TokenPriceInfo,
  PumpTokenScan,
  PumpTokenFlags,
} from "./types.js";

// Constants
export {
  PUMP_PROGRAM_ID,
  PUMP_AMM_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  PUMP_GLOBAL_PDA,
  PUMP_AMM_GLOBAL_CONFIG_PDA,
  CANONICAL_POOL_INDEX,
  INITIAL_VIRTUAL_TOKEN_RESERVES,
  INITIAL_VIRTUAL_SOL_RESERVES,
  INITIAL_REAL_TOKEN_RESERVES,
  TOKEN_TOTAL_SUPPLY,
  FEE_BASIS_POINTS,
  AMM_LP_FEE_BPS,
  AMM_PROTOCOL_FEE_BPS,
  AMM_TOTAL_FEE_BPS,
  GRADUATION_SOL_THRESHOLD_LAMPORTS,
} from "./types.js";

// Math (pure, no network calls)
export {
  ONE_TOKEN,
  ONE_SOL,
  newBondingCurve,
  spotPriceLamports,
  getBuyQuote,
  getSolCostForTokens,
  getSellQuote,
  getGraduationProgress,
  bondingCurveMarketCap,
  getTokenPriceInfo,
  getAmmBuyQuote,
  getAmmSellQuote,
  formatSol,
  formatTokens,
  formatMarketCap,
  formatPriceImpact,
  formatGraduation,
} from "./math.js";

// Client (network I/O)
export type { PumpSignalStrength, PumpSignalScore, PumpPortalEvent } from "./client.js";
export {
  bondingCurvePdaNote,
  fetchBondingCurve,
  scanPumpToken,
  scorePumpSignal,
  formatPumpScan,
  connectPumpPortalStream,
} from "./client.js";

// Scanner (background TaskManager integration)
export type { PumpScannerConfig, ScannerStats } from "./scanner.js";
export { PumpScanner, getPumpScanner } from "./scanner.js";
