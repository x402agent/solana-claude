import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PUMP_SDK,
  feeSharingConfigPda,
} from "@nirholas/pump-sdk";
import type { OnlinePumpSdk } from "@nirholas/pump-sdk";
import { publicKeySchema, shareholderSchema, platformSchema } from "../utils/validation.js";
import { formatBps, instructionsToJson, lamportsToSol, formatBN } from "../utils/formatting.js";
import { success, error, getErrorMessage } from "../types.js";
import type { ToolResult } from "../types.js";

// ── build_create_fee_sharing ──
export const buildCreateFeeSharingSchema = z.object({
  creator: publicKeySchema.describe("Creator wallet address"),
  mint: publicKeySchema.describe("Token mint address"),
  pool: publicKeySchema.optional().describe("AMM pool address (if graduated)"),
});

export async function buildCreateFeeSharing(
  _sdk: OnlinePumpSdk,
  params: z.infer<typeof buildCreateFeeSharingSchema>
): Promise<ToolResult> {
  try {
    const creator = new PublicKey(params.creator);
    const mint = new PublicKey(params.mint);
    const pool = params.pool ? new PublicKey(params.pool) : null;

    const instruction = await PUMP_SDK.createFeeSharingConfig({
      creator,
      mint,
      pool,
    });

    return success({
      instructions: instructionsToJson([instruction]),
      feeSharingConfigPda: feeSharingConfigPda(mint).toBase58(),
    });
  } catch (e: unknown) {
    return error(`Failed to build create fee sharing: ${getErrorMessage(e)}`);
  }
}

// ── build_update_shareholders ──
export const buildUpdateShareholdersSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
  authority: publicKeySchema.describe("Admin authority"),
  currentShareholders: z.array(shareholderSchema).describe("Current shareholders"),
  newShareholders: z
    .array(shareholderSchema)
    .min(1)
    .max(10)
    .describe("New shareholders (BPS must total 10000)"),
});

export async function buildUpdateShareholders(
  _sdk: OnlinePumpSdk,
  params: z.infer<typeof buildUpdateShareholdersSchema>
): Promise<ToolResult> {
  try {
    const totalBps = params.newShareholders.reduce((s, sh) => s + sh.shareBps, 0);
    if (totalBps !== 10000) {
      return error(`Shareholder BPS must total 10000, got ${totalBps}`);
    }

    const mint = new PublicKey(params.mint);
    const authority = new PublicKey(params.authority);
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
      shareholders: params.newShareholders.map((s) => ({
        ...s,
        sharePercent: formatBps(s.shareBps),
      })),
    });
  } catch (e: unknown) {
    return error(`Failed to build update shareholders: ${getErrorMessage(e)}`);
  }
}

// ── build_revoke_admin ──
export const buildRevokeAdminSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
  authority: publicKeySchema.describe("Current admin authority to revoke"),
});

export async function buildRevokeAdmin(
  _sdk: OnlinePumpSdk,
  params: z.infer<typeof buildRevokeAdminSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const authority = new PublicKey(params.authority);

    const instruction = await PUMP_SDK.revokeFeeSharingAuthorityInstruction({
      authority,
      mint,
    });

    return success({
      instructions: instructionsToJson([instruction]),
      warning:
        "This PERMANENTLY locks the fee sharing configuration. No further changes will be possible.",
    });
  } catch (e: unknown) {
    return error(`Failed to build revoke admin: ${getErrorMessage(e)}`);
  }
}

// ── get_shareholders ──
export const getShareholdersSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getShareholders(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getShareholdersSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const configPda = feeSharingConfigPda(mint);
    const config = PUMP_SDK.decodeSharingConfig(
      (await (sdk as any).connection.getAccountInfo(configPda))!
    );

    return success({
      mint: params.mint,
      configAddress: configPda.toBase58(),
      admin: config.admin.toBase58(),
      shareholders: config.shareholders.map((s: any) => ({
        address: s.address.toBase58(),
        shareBps: s.shareBps,
        sharePercent: formatBps(s.shareBps),
      })),
    });
  } catch (e: unknown) {
    return error(`Failed to get shareholders: ${getErrorMessage(e)}`);
  }
}

// ── get_distributable_amount ──
export const getDistributableAmountSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function getDistributableAmount(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof getDistributableAmountSchema>
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
    return error(`Failed to get distributable amount: ${getErrorMessage(e)}`);
  }
}

// ── build_claim_share ──
export const buildClaimShareSchema = z.object({
  mint: publicKeySchema.describe("Token mint address"),
});

export async function buildClaimShare(
  sdk: OnlinePumpSdk,
  params: z.infer<typeof buildClaimShareSchema>
): Promise<ToolResult> {
  try {
    const mint = new PublicKey(params.mint);
    const result = await sdk.buildDistributeCreatorFeesInstructions(mint);

    return success({
      instructions: instructionsToJson(result.instructions),
      note: "This distributes fees to all shareholders. Each shareholder receives their proportional share.",
    });
  } catch (e: unknown) {
    return error(`Failed to build claim share: ${getErrorMessage(e)}`);
  }
}
