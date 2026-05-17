/**
 * Unified Token Factory — single entry point for SPL, Token2022, and pToken launches.
 */

import type { Connection, PublicKey } from "@solana/web3.js";
import type { TokenLaunchConfig, SdkInstructions } from "../types/index.js";
import { buildSplLaunchInstructions, type SplLaunchResult } from "./spl-launcher.js";
import {
  buildToken2022LaunchInstructions,
  type Token2022LaunchResult,
} from "./token2022-launcher.js";
import {
  buildPTokenLaunchInstructions,
  type PTokenLaunchResult,
} from "./ptoken-launcher.js";

export type TokenLaunchResult =
  | SplLaunchResult
  | Token2022LaunchResult
  | PTokenLaunchResult;

/**
 * Launch a token. Dispatches to the correct builder based on config.standard.
 *
 * @param feeReserveAccount  Required only for pToken — the vault fee reserve ATA
 */
export async function launchToken(
  connection: Connection,
  payer: PublicKey,
  config: TokenLaunchConfig,
  feeReserveAccount?: PublicKey
): Promise<TokenLaunchResult> {
  switch (config.standard) {
    case "spl":
      return buildSplLaunchInstructions(connection, payer, config);

    case "token2022":
      return buildToken2022LaunchInstructions(connection, payer, config);

    case "ptoken":
      if (!feeReserveAccount) {
        throw new Error(
          "feeReserveAccount is required for pToken launch — it receives transfer hook fees"
        );
      }
      return buildPTokenLaunchInstructions(
        connection,
        payer,
        config,
        feeReserveAccount
      );

    default:
      throw new Error(`Unknown token standard: ${(config as TokenLaunchConfig).standard}`);
  }
}

/** Check if a launch result is a pToken */
export function isPTokenResult(
  result: TokenLaunchResult
): result is PTokenLaunchResult {
  return "initExtraMetasInstruction" in result;
}

/** Check if a launch result is Token2022 (including pToken) */
export function isToken2022Result(
  result: TokenLaunchResult
): result is Token2022LaunchResult | PTokenLaunchResult {
  return "extensionsEnabled" in result;
}

/**
 * Default agent token config — pToken with 1% transfer fee.
 * Ready to use with launchToken().
 */
export function defaultAgentTokenConfig(opts: {
  name: string;
  symbol: string;
  uri: string;
  decimals?: number;
  initialSupply?: bigint;
  mintCloseAuthority?: PublicKey;
}): TokenLaunchConfig {
  return {
    standard: "ptoken",
    decimals: opts.decimals ?? 6,
    initialSupply: opts.initialSupply ?? 1_000_000_000_000n, // 1M tokens
    metadata: {
      name: opts.name,
      symbol: opts.symbol,
      uri: opts.uri,
    },
    extensions: {
      transferFee: {
        feeBps: 100, // 1% → routes to vault
        maxFee: BigInt("18446744073709551615"),
        // Set to payer in launchToken — update post-deploy
        transferFeeConfigAuthority: new (require("@solana/web3.js").PublicKey)(
          "11111111111111111111111111111111"
        ),
        withdrawWithheldAuthority: new (require("@solana/web3.js").PublicKey)(
          "11111111111111111111111111111111"
        ),
      },
      metadataPointer: { authority: null, metadataAddress: null }, // self-referential
      ...(opts.mintCloseAuthority !== undefined ? { mintCloseAuthority: opts.mintCloseAuthority } : {}),
    },
  };
}
