import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PUMP_SDK,
  getFee,
  computeFeesBps,
  calculateFeeTier,
  bondingCurveMarketCap,
} from "@nirholas/pump-sdk";
import type { OnlinePumpSdk } from "@nirholas/pump-sdk";
import { publicKeySchema, bnStringSchema, shareholderSchema } from "../utils/validation.js";
import { lamportsToSol, formatBN, formatBps } from "../utils/formatting.js";
import { instructionsToJson } from "../utils/formatting.js";
import { success, error, getErrorMessage } from "../types.js";
import type { ToolResult } from "../types.js";

// ── get_fee_tier ──
export const getFeeTierSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getFeeTier(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getFeeTierSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const feeConfig = await sdk.fetchFeeConfig();
    const bondingCurve = await sdk.fetchBondingCurve(mint);

    const marketCap = bondingCurveMarketCap({
      mintSupply: bondingCurve.virtualTokenReserves,
      virtualSolReserves: bondingCurve.virtualSolReserves,
      virtualTokenReserves: bondingCurve.virtualTokenReserves,
    });

    const tier = calculateFeeTier({
      feeTiers: feeConfig.feeTiers,
      marketCap,
    });

    return success({
      marketCapLamports: formatBN(marketCap),
      marketCapSol: lamportsToSol(marketCap),
      lpFeeBps: tier.lpFeeBps.toNumber(),
      protocolFeeBps: tier.protocolFeeBps.toNumber(),
      creatorFeeBps: tier.creatorFeeBps.toNumber(),
      lpFeePercent: formatBps(tier.lpFeeBps.toNumber()),
      protocolFeePercent: formatBps(tier.protocolFeeBps.toNumber()),
      creatorFeePercent: formatBps(tier.creatorFeeBps.toNumber()),
    });
  } catch (e: unknown) {
    return error(`Failed to get fee tier: ${getErrorMessage(e)}`);
  }
}

// ── get_fee_breakdown ──
export const getFeeBreakdownSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
  amount: bnStringSchema.describe("Trade amount in lamports"),
  side: z.enum(["buy", "sell"]).describe("Trade side"),
});

export async function getFeeBreakdown(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getFeeBreakdownSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const amount = new BN(params.amount);
    const global = await sdk.fetchGlobal();
    const feeConfig = await sdk.fetchFeeConfig();
    const bondingCurve = await sdk.fetchBondingCurve(mint);

    const fee = getFee({
      global,
      feeConfig,
      mintSupply: bondingCurve.virtualTokenReserves,
      bondingCurve,
      amount,
      isNewBondingCurve: false,
    });

    const feesBps = computeFeesBps({
      global,
      feeConfig,
      mintSupply: bondingCurve.virtualTokenReserves,
      virtualSolReserves: bondingCurve.virtualSolReserves,
      virtualTokenReserves: bondingCurve.virtualTokenReserves,
    });

    return success({
      tradeAmount: formatBN(amount),
      totalFee: formatBN(fee),
      totalFeeSol: lamportsToSol(fee),
      protocolFeeBps: feesBps.protocolFeeBps.toNumber(),
      creatorFeeBps: feesBps.creatorFeeBps.toNumber(),
      side: params.side,
    });
  } catch (e: unknown) {
    return error(`Failed to get fee breakdown: ${getErrorMessage(e)}`);
  }
}

// ── get_creator_vault_balance ──
export const getCreatorVaultBalanceSchema = z.object({
  creator: publicKeySchema.describe("Creator wallet address"),
});

export async function getCreatorVaultBalance(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getCreatorVaultBalanceSchema>
): Promise<ToolResult> {
  try {
    const creator = new PublicKey(params.creator);
    const balance = await sdk.getCreatorVaultBalanceBothPrograms(creator);

    return success({
      balanceLamports: formatBN(balance),
      balanceSol: lamportsToSol(balance),
    });
  } catch (e: unknown) {
    return error(`Failed to get creator vault balance: ${getErrorMessage(e)}`);
  }
}

// ── get_minimum_distributable_fee ──
export const getMinDistributableSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getMinDistributableFee(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getMinDistributableSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const result = await sdk.getMinimumDistributableFee(mint);

    return success({
      distributableFees: formatBN(result.distributableFees),
      distributableFeesSol: lamportsToSol(result.distributableFees),
      minimumRequired: formatBN(result.minimumRequired),
      canDistribute: result.canDistribute,
      isGraduated: result.isGraduated,
    });
  } catch (e: unknown) {
    return error(`Failed to get minimum distributable fee: ${getErrorMessage(e)}`);
  }
}

// ── build_collect_creator_fees ──
export const buildCollectFeesSchema = z.object({
  creator: publicKeySchema.describe("Creator wallet address"),
});

export async function buildCollectCreatorFees(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof buildCollectFeesSchema>
): Promise<ToolResult> {
  try {
    const creator = new PublicKey(params.creator);
    const instructions = await sdk.collectCoinCreatorFeeInstructions(creator);

    return success({
      instructions: instructionsToJson(instructions),
      note: "Collects creator fees from both Pump and PumpAMM programs.",
    });
  } catch (e: unknown) {
    return error(`Failed to build collect fees instructions: ${getErrorMessage(e)}`);
  }
}

// ── build_distribute_fees ──
export const buildDistributeFeesSchema = z.object({
  mint: publicKeySchema.describe("Token mint address with fee sharing config"),
});

export async function buildDistributeFees(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof buildDistributeFeesSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const result = await sdk.buildDistributeCreatorFeesInstructions(mint);

    return success({
      instructions: instructionsToJson(result.instructions),
      isGraduated: result.isGraduated,
    });
  } catch (e: unknown) {
    return error(`Failed to build distribute fees instructions: ${getErrorMessage(e)}`);
  }
}

// ── get_fee_sharing_config ──
export const getFeeSharingConfigSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getFeeSharingConfig(
  _sdk: OnlinePumpSdk,
  params: z.infer<typeof getFeeSharingConfigSchema>
): Promise<ToolResult> {
  try {
    return success({
      mint: params.mint,
      note: "Use get_shareholders to see the current shareholder list and distribution.",
    });
  } catch (e: unknown) {
    return error(`Failed to get fee sharing config: ${getErrorMessage(e)}`);
  }
}

// ── build_update_fee_shares ──
export const buildUpdateFeeSharesSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
  authority: publicKeySchema.describe("Current admin authority"),
  currentShareholders: z.array(shareholderSchema).describe("Current shareholders"),
  newShareholders: z.array(shareholderSchema).min(1).max(10).describe("New shareholders (total BPS must equal 10000)"),
});

export async function buildUpdateFeeShares(
  _sdk: OnlinePumpSdk,
  params: z.infer<typeof buildUpdateFeeSharesSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const authority = new PublicKey(params.authority);

    const totalBps = params.newShareholders.reduce((s, sh) => s + sh.shareBps, 0);
    if (totalBps !== 10000) {
      return error(`Shareholder BPS must total 10000, got ${totalBps}`);
    }

    const currentShareholders = params.currentShareholders.map((s) =>
      new PublicKey(s.address)
    );
    const newShareholders = params.newShareholders.map((s) => ({
      address: new PublicKey(s.address),
      shareBps: s.shareBps,
    }));

    const instruction = await PUMP_SDK.updateFeeShares({
      authority,
      mint,
      currentShareholders,
      newShareholders,
    });

    return success({
      instructions: instructionsToJson([instruction]),
      newShareholders: params.newShareholders.map((s) => ({
        ...s,
        sharePercent: formatBps(s.shareBps),
      })),
    });
  } catch (e: unknown) {
    return error(`Failed to build update fee shares: ${getErrorMessage(e)}`);
  }
}
