import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PUMP_SDK,
  bondingCurveMarketCap,
} from "@nirholas/pump-sdk";
import type { OnlinePumpSdk } from "@nirholas/pump-sdk";
import { publicKeySchema } from "../utils/validation.js";
import { lamportsToSol, rawToTokens, formatBN } from "../utils/formatting.js";
import { success, error, getErrorMessage } from "../types.js";
import type { ToolResult } from "../types.js";

// ── get_bonding_curve_state ──
export const getBondingCurveStateSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getBondingCurveState(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getBondingCurveStateSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const bondingCurve = await sdk.fetchBondingCurve(mint);

    return success({
      virtualTokenReserves: formatBN(bondingCurve.virtualTokenReserves),
      virtualSolReserves: formatBN(bondingCurve.virtualSolReserves),
      realTokenReserves: formatBN(bondingCurve.realTokenReserves),
      realSolReserves: formatBN(bondingCurve.realSolReserves),
      tokenTotalSupply: formatBN(bondingCurve.tokenTotalSupply),
      complete: bondingCurve.complete,
      creator: bondingCurve.creator.toBase58(),
    });
  } catch (e: unknown) {
    return error(`Failed to get bonding curve state: ${getErrorMessage(e)}`);
  }
}

// ── get_token_info ──
export const getTokenInfoSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getTokenInfo(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getTokenInfoSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const bondingCurve = await sdk.fetchBondingCurve(mint);
    const marketCap = bondingCurveMarketCap({
      mintSupply: bondingCurve.virtualTokenReserves,
      virtualSolReserves: bondingCurve.virtualSolReserves,
      virtualTokenReserves: bondingCurve.virtualTokenReserves,
    });

    return success({
      mint: params.mint,
      creator: bondingCurve.creator.toBase58(),
      complete: bondingCurve.complete,
      marketCapLamports: formatBN(marketCap),
      marketCapSol: lamportsToSol(marketCap),
      virtualSolReserves: lamportsToSol(bondingCurve.virtualSolReserves),
      virtualTokenReserves: rawToTokens(bondingCurve.virtualTokenReserves),
    });
  } catch (e: unknown) {
    return error(`Failed to get token info: ${getErrorMessage(e)}`);
  }
}

// ── get_creator_profile ──
export const getCreatorProfileSchema = z.object({
  creator: publicKeySchema.describe("Creator wallet address"),
});

export async function getCreatorProfile(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getCreatorProfileSchema>
): Promise<ToolResult> {
  try {
    const creator = new PublicKey(params.creator);
    const vaultBalance = await sdk.getCreatorVaultBalanceBothPrograms(creator);

    return success({
      creator: params.creator,
      vaultBalanceLamports: formatBN(vaultBalance),
      vaultBalanceSol: lamportsToSol(vaultBalance),
      note: "Use RPC token accounts query for full launch history.",
    });
  } catch (e: unknown) {
    return error(`Failed to get creator profile: ${getErrorMessage(e)}`);
  }
}

// ── get_token_holders ──
export const getTokenHoldersSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getTokenHolders(
  _sdk: OnlinePumpSdk,
  params: z.infer<typeof getTokenHoldersSchema>
): Promise<ToolResult> {
  try {
    return success({
      mint: params.mint,
      note: "Token holder data requires RPC getProgramAccounts with token filter. Use getTokenLargestAccounts on your Solana connection for top holders.",
    });
  } catch (e: unknown) {
    return error(`Failed to get token holders: ${getErrorMessage(e)}`);
  }
}

// ── get_recent_trades ──
export const getRecentTradesSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getRecentTrades(
  _sdk: OnlinePumpSdk,
  params: z.infer<typeof getRecentTradesSchema>
): Promise<ToolResult> {
  try {
    return success({
      mint: params.mint,
      note: "Recent trades require parsing transaction history. Use getSignaturesForAddress on the bonding curve PDA and decode TradeEvent from each transaction's logs.",
    });
  } catch (e: unknown) {
    return error(`Failed to get recent trades: ${getErrorMessage(e)}`);
  }
}

// ── get_sol_usd_price ──
export const getSolUsdPriceSchema = z.object({});

export async function getSolUsdPrice(
  _sdk: OnlinePumpSdk,
  _params: z.infer<typeof getSolUsdPriceSchema>
): Promise<ToolResult> {
  try {
    const response = await fetch(
      "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112"
    );
    if (!response.ok) {
      return error(`Jupiter API error: HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      data: Record<string, { price: string }>;
    };
    const solPrice =
      data.data["So11111111111111111111111111111111111111112"]?.price;

    return success({
      solUsdPrice: solPrice ?? "unavailable",
      source: "Jupiter Price API v2",
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return error(`Failed to get SOL/USD price: ${getErrorMessage(e)}`);
  }
}

// ── get_graduation_status ──
export const getGraduationStatusSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getGraduationStatus(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getGraduationStatusSchema>
): Promise<ToolResult> {
  try {
    const graduated = await sdk.isGraduated(params.mint);
    const progress = await sdk.fetchGraduationProgress(params.mint);

    return success({
      mint: params.mint,
      graduated,
      progressBps: progress.progressBps,
      isGraduated: progress.isGraduated,
      tokensRemaining: formatBN(progress.tokensRemaining),
      solAccumulated: formatBN(progress.solAccumulated),
    });
  } catch (e: unknown) {
    return error(`Failed to get graduation status: ${getErrorMessage(e)}`);
  }
}
