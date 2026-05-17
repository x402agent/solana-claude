/**
 * Agent Launcher — atomically deploy a token + vault + DBC pool bound to an AI agent.
 *
 * A single launch_agent_token instruction:
 *   1. Creates the base mint (SPL / Token2022 / pToken)
 *   2. Creates the DBC virtual pool with the chosen config
 *   3. Registers the AgentBinding PDA (links agent wallet to the token)
 *   4. Initialises the vault with entropy + anti-gravity + epoch burn configs
 *   5. Embeds the agent's character hash + constitution hash on-chain
 *
 * The constitution_hash is the SHA-256 of three-laws.md — every agent token
 * is cryptographically bound to the three laws of autonomous agents.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  type Connection,
  type TransactionInstruction,
} from "@solana/web3.js";
import type {
  AgentCurveConfig,
  AgentLaunchParams,
  LaunchResult,
  SdkInstructions,
  VaultConfig,
} from "../types/index.js";
import {
  AgentCapability,
  CLAWD_PROTOCOL_PROGRAM_ID,
  DBC_PROGRAM_ID,
  DEFAULT_EPOCH_DURATION_SLOTS,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "../constants.js";
import { designDefaultAgentCurve } from "../bonding-curve/adaptive-curve.js";
import { defaultAgentTokenConfig } from "../token/token-factory.js";
import {
  deriveAgentBindingPda,
  deriveVaultPda,
} from "../utils/pda.js";

// ─── Agent Launch ─────────────────────────────────────────────────────────────

/**
 * Build all instructions for a full agent token launch.
 *
 * Returns two instruction sets:
 *   result.instructions — Tx 1: mint + vault + pool + binding
 *   result.postDeployInstructions — Tx 2: initialize_extra_account_meta_list (pToken only)
 */
export async function buildAgentLaunchInstructions(
  connection: Connection,
  params: AgentLaunchParams,
  feeReceiver: PublicKey
): Promise<LaunchResult & { postDeployInstructions?: TransactionInstruction[] }> {
  const { agentWallet, tokenConfig, curveConfig, vaultConfig } = params;

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const [agentBindingPda] = deriveAgentBindingPda(agentWallet);
  const [vaultPda] = deriveVaultPda(mint);

  // Encode all params for launch_agent_token (discriminator: [13, 0, ..., 0])
  const nameBytes = Buffer.from(tokenConfig.metadata.name, "utf8");
  const symbolBytes = Buffer.from(tokenConfig.metadata.symbol, "utf8");
  const uriBytes = Buffer.from(tokenConfig.metadata.uri, "utf8");

  const tokenStandardMap = { spl: 0, token2022: 1, ptoken: 2 };
  const tokenStandardByte = tokenStandardMap[tokenConfig.standard];

  // Vault config bytes
  const vaultConfigLen = 8 + 4 + 4 + 2 + 2 + 2 + 8 + 2;
  // Curve config bytes
  const curveConfigLen = 8 + 2 + 4 + 8 + 1 + 8;

  const dataLen =
    8 + // discriminator
    4 + nameBytes.length +
    4 + symbolBytes.length +
    4 + uriBytes.length +
    1 + // decimals
    8 + // initial_supply
    1 + // token_standard
    vaultConfigLen +
    curveConfigLen +
    32 + // character_hash
    32; // constitution_hash

  const data = Buffer.alloc(dataLen);
  Buffer.from([13, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0); // discriminator

  let offset = 8;

  // name
  data.writeUInt32LE(nameBytes.length, offset); offset += 4;
  nameBytes.copy(data, offset); offset += nameBytes.length;

  // symbol
  data.writeUInt32LE(symbolBytes.length, offset); offset += 4;
  symbolBytes.copy(data, offset); offset += symbolBytes.length;

  // uri
  data.writeUInt32LE(uriBytes.length, offset); offset += 4;
  uriBytes.copy(data, offset); offset += uriBytes.length;

  // decimals
  data.writeUInt8(tokenConfig.decimals, offset); offset += 1;

  // initial_supply
  data.writeBigUInt64LE(tokenConfig.initialSupply, offset); offset += 8;

  // token_standard
  data.writeUInt8(tokenStandardByte, offset); offset += 1;

  // vault_config
  data.writeBigUInt64LE(vaultConfig.inflationReserveAmount, offset); offset += 8;
  data.writeUInt32LE(vaultConfig.entropyThreshold, offset); offset += 4;
  data.writeUInt32LE(vaultConfig.entropySensitivityBps, offset); offset += 4;
  data.writeUInt16LE(vaultConfig.antiGravityFloorBps, offset); offset += 2;
  data.writeUInt16LE(vaultConfig.antiGravityMaxStrengthBps, offset); offset += 2;
  data.writeUInt16LE(vaultConfig.transferFeeBps, offset); offset += 2;
  data.writeBigUInt64LE(vaultConfig.epochDurationSlots, offset); offset += 8;
  data.writeUInt16LE(vaultConfig.epochBurnRateBps, offset); offset += 2;

  // curve_config (AgentCurveConfig)
  data.writeBigUInt64LE(curveConfig.baseFeeNumerator, offset); offset += 8;
  data.writeUInt16LE(curveConfig.sentimentFeeRangeBps, offset); offset += 2;
  data.writeUInt32LE(curveConfig.sentimentUpdateIntervalSlots, offset); offset += 4;
  data.writeBigUInt64LE(curveConfig.migrationQuoteThreshold, offset); offset += 8;
  const hasInitialBuy = curveConfig.initialBuyAmount !== undefined;
  data.writeUInt8(hasInitialBuy ? 1 : 0, offset); offset += 1;
  if (hasInitialBuy && curveConfig.initialBuyAmount !== undefined) {
    data.writeBigUInt64LE(curveConfig.initialBuyAmount, offset); offset += 8;
  }

  // character_hash
  Buffer.from(params.characterHash).copy(data, offset); offset += 32;

  // constitution_hash
  Buffer.from(params.constitutionHash).copy(data, offset);

  const tokenProgram =
    tokenConfig.standard === "spl" ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: agentBindingPda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true }, // vault_token_account (PDA-owned)
      { pubkey: feeReceiver, isSigner: false, isWritable: false },
      { pubkey: agentWallet, isSigner: true, isWritable: true },
      { pubkey: feeReceiver, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: DBC_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  };

  const dbcPoolPda = deriveFakeDbcPool(mint); // see note below

  return {
    instructions: [ix],
    signers: [mintKeypair],
    mintKeypair,
    vaultPda,
    dbcPoolPda,
    agentBindingPda,
    computeUnits: 300_000,
  };
}

/**
 * Build a register_agent_binding instruction for an already-existing token.
 */
export function buildRegisterAgentBindingInstruction(
  baseMint: PublicKey,
  agentWallet: PublicKey,
  authority: PublicKey,
  characterHash: Uint8Array,
  constitutionHash: Uint8Array,
  capabilities: bigint
): SdkInstructions {
  const [agentBindingPda] = deriveAgentBindingPda(agentWallet);

  const data = Buffer.alloc(8 + 32 + 32 + 8);
  Buffer.from([14, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0);
  let offset = 8;
  Buffer.from(characterHash).copy(data, offset); offset += 32;
  Buffer.from(constitutionHash).copy(data, offset); offset += 32;
  data.writeBigUInt64LE(capabilities, offset);

  const ix: TransactionInstruction = {
    programId: CLAWD_PROTOCOL_PROGRAM_ID,
    keys: [
      { pubkey: agentBindingPda, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: agentWallet, isSigner: true, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };

  return { instructions: [ix], computeUnits: 50_000 };
}

// ─── Constitution Hash ────────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash of three-laws.md.
 * Pass the file path or the content directly.
 */
export function hashConstitution(
  contentOrPath: string,
  isPath = false
): Uint8Array {
  const content = isPath ? readFileSync(contentOrPath, "utf8") : contentOrPath;
  return createHash("sha256").update(content, "utf8").digest();
}

/**
 * Compute SHA-256 of a character JSON string or object.
 */
export function hashCharacter(character: string | object): Uint8Array {
  const content =
    typeof character === "string" ? character : JSON.stringify(character);
  return createHash("sha256").update(content, "utf8").digest();
}

// ─── Default Launch Presets ───────────────────────────────────────────────────

/**
 * Sensible defaults for a new agent token launch.
 * Override any field as needed.
 */
export function defaultAgentLaunchParams(opts: {
  agentWallet: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  constitutionPath?: string;
  character?: object;
}): Omit<AgentLaunchParams, "characterHash" | "constitutionHash"> & {
  characterHash: Uint8Array;
  constitutionHash: Uint8Array;
} {
  const threeLaws =
    opts.constitutionPath ??
    join(process.cwd(), "../../three-laws.md");

  const constitutionHash = hashConstitution(threeLaws, true);
  const characterHash = opts.character
    ? hashCharacter(opts.character)
    : new Uint8Array(32);

  const curveConfig = designDefaultAgentCurve({
    startPrice: 0.000001,
    migrationPrice: 0.001,
  });

  return {
    agentWallet: opts.agentWallet,
    tokenConfig: defaultAgentTokenConfig({
      name: opts.name,
      symbol: opts.symbol,
      uri: opts.uri,
    }),
    curveConfig: {
      baseFeeNumerator: curveConfig.baseFeeNumerator,
      sentimentFeeRangeBps: curveConfig.sentimentFeeRangeBps,
      sentimentUpdateIntervalSlots: curveConfig.sentimentUpdateIntervalSlots,
      migrationQuoteThreshold: curveConfig.migrationQuoteThreshold,
    },
    vaultConfig: {
      inflationReserveAmount: 100_000_000_000n, // 100k tokens
      entropyThreshold: 5_000_000,
      entropySensitivityBps: 50,
      antiGravityFloorBps: 7_000, // 70% of ATH
      antiGravityMaxStrengthBps: 1_000, // max 10% of fee reserve per sweep
      transferFeeBps: 100, // 1% transfer fee → fee reserve
      epochDurationSlots: DEFAULT_EPOCH_DURATION_SLOTS,
      epochBurnRateBps: 200, // up to 2% of reserve per epoch at full activity
    },
    capabilities:
      AgentCapability.TRADING |
      AgentCapability.RESEARCH |
      AgentCapability.PAYMENTS |
      AgentCapability.BURN_TRIGGER,
    characterHash,
    constitutionHash,
  };
}

// ─── Pool PDA Derivation (DBC) ────────────────────────────────────────────────

function deriveFakeDbcPool(baseMint: PublicKey): PublicKey {
  // DBC pool PDA: seeds = ["pool", config, base_mint] — config is set at launch
  // We return a placeholder here; the real PDA is returned by the on-chain program
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), baseMint.toBytes()],
    DBC_PROGRAM_ID
  )[0];
}
