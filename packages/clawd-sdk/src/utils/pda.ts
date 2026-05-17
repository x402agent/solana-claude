import { PublicKey } from "@solana/web3.js";
import {
  CLAWD_PROTOCOL_PROGRAM_ID,
  VAULT_SEED,
  LOCK_SEED,
  CONVICTION_SEED,
  MILESTONE_SEED,
  AGENT_SEED,
  SENTIMENT_SEED,
  ENTROPY_SEED,
  BEHAVIOR_SEED,
  EPOCH_SEED,
  VAULT_AUTH_SEED,
  EXTRA_METAS_SEED,
} from "../constants.js";

function pda(
  seeds: (Buffer | Uint8Array | PublicKey)[],
  programId = CLAWD_PROTOCOL_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    seeds.map((s) => (s instanceof PublicKey ? s.toBytes() : s)),
    programId
  );
}

export function deriveVaultPda(
  baseMint: PublicKey
): [PublicKey, number] {
  return pda([VAULT_SEED, baseMint]);
}

export function deriveVaultAuthorityPda(
  vault: PublicKey
): [PublicKey, number] {
  return pda([VAULT_AUTH_SEED, vault]);
}

export function deriveLockPositionPda(
  vault: PublicKey,
  owner: PublicKey
): [PublicKey, number] {
  return pda([LOCK_SEED, vault, owner]);
}

export function deriveConvictionPositionPda(
  vault: PublicKey,
  staker: PublicKey
): [PublicKey, number] {
  return pda([CONVICTION_SEED, vault, staker]);
}

export function deriveMilestoneLockPda(
  vault: PublicKey,
  creator: PublicKey
): [PublicKey, number] {
  return pda([MILESTONE_SEED, vault, creator]);
}

export function deriveAgentBindingPda(
  agentWallet: PublicKey
): [PublicKey, number] {
  return pda([AGENT_SEED, agentWallet]);
}

export function deriveSentimentStatePda(
  dbcPool: PublicKey
): [PublicKey, number] {
  return pda([SENTIMENT_SEED, dbcPool]);
}

export function deriveEntropyStatePda(
  vault: PublicKey
): [PublicKey, number] {
  return pda([ENTROPY_SEED, vault]);
}

export function deriveWalletBehaviorPda(
  wallet: PublicKey
): [PublicKey, number] {
  return pda([BEHAVIOR_SEED, wallet]);
}

export function deriveEpochRecordPda(
  vault: PublicKey
): [PublicKey, number] {
  return pda([EPOCH_SEED, vault]);
}

export function deriveExtraAccountMetasPda(
  mint: PublicKey
): [PublicKey, number] {
  return pda([EXTRA_METAS_SEED, mint]);
}
