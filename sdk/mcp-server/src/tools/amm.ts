import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PUMP_SDK, canonicalPumpPoolPda } from "@nirholas/pump-sdk";
import type { OnlinePumpSdk } from "@nirholas/pump-sdk";
import { publicKeySchema, bnStringSchema } from "../utils/validation.js";
import { formatBN, instructionsToJson } from "../utils/formatting.js";
import { success, error, getErrorMessage } from "../types.js";
import type { ToolResult } from "../types.js";

// ── get_amm_pool ──
export const getAmmPoolSchema = z.object({
  mint: publicKeySchema.describe("Token mint address (graduated)"),
});

export async function getAmmPool(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getAmmPoolSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const pool = await sdk.fetchPool(mint);
    const poolAddress = canonicalPumpPoolPda(mint);
    return success({
      poolAddress: poolAddress.toBase58(),
      baseMint: pool.baseMint.toBase58(),
      quoteMint: pool.quoteMint.toBase58(),
      lpMint: pool.lpMint.toBase58(),
      lpSupply: formatBN(pool.lpSupply),
      creator: pool.creator.toBase58(),
      coinCreator: pool.coinCreator.toBase58(),
    });
  } catch (e: unknown) {
    return error(`Failed to get AMM pool: ${getErrorMessage(e)}`);
  }
}

// ── get_amm_reserves ──
export const getAmmReservesSchema = z.object({
  mint: publicKeySchema.describe("Token mint address (graduated)"),
});

export async function getAmmReserves(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getAmmReservesSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const pool = await sdk.fetchPool(mint);
    return success({
      poolBaseTokenAccount: pool.poolBaseTokenAccount.toBase58(),
      poolQuoteTokenAccount: pool.poolQuoteTokenAccount.toBase58(),
      lpSupply: formatBN(pool.lpSupply),
      note: "Reserve balances are held in the SPL token accounts above. Query them via RPC for live amounts.",
    });
  } catch (e: unknown) {
    return error(`Failed to get AMM reserves: ${getErrorMessage(e)}`);
  }
}

// ── get_amm_price ──
export const getAmmPriceSchema = z.object({
  mint: publicKeySchema.describe("Token mint address (graduated)"),
});

export async function getAmmPrice(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getAmmPriceSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const priceInfo = await sdk.fetchTokenPrice(mint);

    return success({
      buyPricePerToken: formatBN(priceInfo.buyPricePerToken),
      sellPricePerToken: formatBN(priceInfo.sellPricePerToken),
      marketCap: formatBN(priceInfo.marketCap),
      isGraduated: priceInfo.isGraduated,
      note: "Prices in lamports per token unit.",
    });
  } catch (e: unknown) {
    return error(`Failed to get AMM price: ${getErrorMessage(e)}`);
  }
}

// ── build_amm_deposit ──
export const buildAmmDepositSchema = z.object({
  mint: publicKeySchema.describe("Token mint address (graduated)"),
  user: publicKeySchema.describe("Depositor wallet address"),
  maxBaseAmountIn: bnStringSchema.describe("Max token amount to deposit"),
  maxQuoteAmountIn: bnStringSchema.describe("Max SOL amount in lamports"),
  minLpTokenAmountOut: bnStringSchema.describe("Min LP tokens to receive"),
});

export async function buildAmmDeposit(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof buildAmmDepositSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const user = new PublicKey(params.user);

    const poolAddress = canonicalPumpPoolPda(mint);
    const instruction = await PUMP_SDK.ammDepositInstruction({
      user,
      pool: poolAddress,
      mint,
      maxBaseAmountIn: new BN(params.maxBaseAmountIn),
      maxQuoteAmountIn: new BN(params.maxQuoteAmountIn),
      minLpTokenAmountOut: new BN(params.minLpTokenAmountOut),
    });

    return success({
      instructions: instructionsToJson([instruction]),
      pool: poolAddress.toBase58(),
    });
  } catch (e: unknown) {
    return error(`Failed to build AMM deposit: ${getErrorMessage(e)}`);
  }
}

// ── build_amm_withdraw ──
export const buildAmmWithdrawSchema = z.object({
  mint: publicKeySchema.describe("Token mint address (graduated)"),
  user: publicKeySchema.describe("Withdrawer wallet address"),
  lpTokenAmountIn: bnStringSchema.describe("LP tokens to burn"),
  minBaseAmountOut: bnStringSchema.describe("Min tokens to receive"),
  minQuoteAmountOut: bnStringSchema.describe("Min SOL to receive (lamports)"),
});

export async function buildAmmWithdraw(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof buildAmmWithdrawSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const user = new PublicKey(params.user);

    const poolAddress = canonicalPumpPoolPda(mint);
    const instruction = await PUMP_SDK.ammWithdrawInstruction({
      user,
      pool: poolAddress,
      mint,
      lpTokenAmountIn: new BN(params.lpTokenAmountIn),
      minBaseAmountOut: new BN(params.minBaseAmountOut),
      minQuoteAmountOut: new BN(params.minQuoteAmountOut),
    });

    return success({
      instructions: instructionsToJson([instruction]),
      pool: poolAddress.toBase58(),
    });
  } catch (e: unknown) {
    return error(`Failed to build AMM withdraw: ${getErrorMessage(e)}`);
  }
}
