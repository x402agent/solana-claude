/**
 * p-token (SIMD-0266) integration for the Clawd x402 facilitator.
 *
 * p-token is treated here as a CU-optimised token-program-compatible rail for
 * SPL-style payments. It is opt-in through P_TOKEN_PROGRAM_ID.
 *
 * Key facts:
 *   - Same program address post-activation (hard fork upgrade).
 *   - All existing SPL Token instructions are preserved with same opcodes.
 *   - New opcodes: 25 = batch, 26 = unwrap_lamports.
 *   - CU savings per transfer: ~15 CUs (~10%).  Burn saves ~67 CUs.
 *   - Pre-activation: optionally deploy at P_TOKEN_PREVIEW_PROGRAM_ID for testnet.
 *
 * Detection strategy:
 *   - if env.P_TOKEN_PROGRAM_ID is set, advertise and verify p-token.
 *   - otherwise stay on the canonical SPL Token program.
 *
 * Instruction layout reference (SIMD-0266):
 *   batch (opcode 25):
 *     [0]   u8   = 25
 *     [1]   u8   = n  (number of (destination_ata, amount_u64_le, decimals_u8) tuples)
 *     [2..] repeated tuples of 9 bytes each:
 *             amount : u64 LE  (8 bytes)
 *             decimals: u8     (1 byte)
 *     accounts: source_ata, mint, owner, [dest_ata_0, dest_ata_1, ...]
 *
 *   unwrap_lamports (opcode 26):
 *     [0]   u8   = 26
 *     accounts: mint, recipient, authority (mint_authority OR mint_keypair)
 */

import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Env, PTokenStatus, BatchOutput } from "../types";

/** The well-known SPL Token program address. */
export const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

/**
 * p-token preview program for testnet/devnet — set P_TOKEN_PROGRAM_ID in wrangler env.
 * Post mainnet activation this collapses to SPL_TOKEN_PROGRAM_ID.
 */
export const P_TOKEN_PREVIEW_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111",
);

/** CU benchmarks from SIMD-0266 (logs disabled). */
export const P_TOKEN_CU = {
  InitializeMint: 112,
  InitializeAccount: 143,
  Transfer: 131,
  MintTo: 126,
  Burn: 135,
  CloseAccount: 132,
  TransferChecked: 131,
} as const;

export const SPL_TOKEN_CU = {
  InitializeMint: 154,
  InitializeAccount: 220,
  Transfer: 156,
  MintTo: 156,
  Burn: 217,
  CloseAccount: 183,
  TransferChecked: 146,
} as const;

// p-token instruction opcodes (new instructions only; legacy opcodes unchanged)
const P_TOKEN_OPCODE_BATCH = 25;
const P_TOKEN_OPCODE_UNWRAP_LAMPORTS = 26;

/** 5-minute TTL for the p-token detection cache (ms). */
const DETECT_TTL_MS = 5 * 60 * 1000;

let _cachedStatus: PTokenStatus | null = null;

/**
 * Detect whether p-token is the active token program on the connected cluster.
 * Result is cached for 5 minutes to avoid per-request RPC overhead.
 */
export async function detectPToken(env: Env): Promise<PTokenStatus> {
  if (_cachedStatus && Date.now() - _cachedStatus.checkedAt < DETECT_TTL_MS) {
    return _cachedStatus;
  }

  if (env.P_TOKEN_PROGRAM_ID) {
    _cachedStatus = {
      active: true,
      programId: env.P_TOKEN_PROGRAM_ID,
      cuSavingsPerTransfer: SPL_TOKEN_CU.TransferChecked - P_TOKEN_CU.TransferChecked,
      checkedAt: Date.now(),
    };
    return _cachedStatus;
  }

  _cachedStatus = {
    active: false,
    programId: SPL_TOKEN_PROGRAM_ID.toBase58(),
    cuSavingsPerTransfer: 0,
    checkedAt: Date.now(),
  };
  return _cachedStatus;
}

/**
 * Return the active token program PublicKey — p-token if active, SPL otherwise.
 */
export async function getTokenProgramId(env: Env): Promise<PublicKey> {
  const status = await detectPToken(env);
  return new PublicKey(status.programId);
}

/**
 * Build the data buffer for a p-token `batch` instruction (opcode 25).
 *
 * The batch instruction moves tokens from one source ATA to N destination ATAs
 * in a single instruction — far cheaper than N × transferChecked.
 *
 * accounts order expected by the caller:
 *   [source_ata, mint, owner, dest_ata_0, dest_ata_1, ..., dest_ata_n-1]
 */
export function buildBatchData(outputs: Array<{ amount: bigint; decimals: number }>): Uint8Array {
  if (outputs.length === 0 || outputs.length > 64) {
    throw new RangeError("p-token batch: 1–64 outputs required");
  }
  // 1 (opcode) + 1 (n) + n × 9 (amount u64 + decimals u8)
  const buf = new Uint8Array(2 + outputs.length * 9);
  const view = new DataView(buf.buffer);
  buf[0] = P_TOKEN_OPCODE_BATCH;
  buf[1] = outputs.length;
  let off = 2;
  for (const o of outputs) {
    view.setBigUint64(off, o.amount, true);
    off += 8;
    buf[off++] = o.decimals;
  }
  return buf;
}

/**
 * Build the data buffer for the p-token `unwrap_lamports` instruction (opcode 26).
 * Recovers stranded SOL from a token mint account.
 *
 * accounts order: [mint, recipient, authority]
 *   authority = mint_authority if set, otherwise mint_keypair.
 */
export function buildUnwrapLamportsData(): Uint8Array {
  return new Uint8Array([P_TOKEN_OPCODE_UNWRAP_LAMPORTS]);
}

/**
 * Derive ATAs for a batch payment and return the flattened account index list
 * suitable for a CompiledInstruction.
 *
 * Returns { atas, accountKeyIndexes } where accountKeyIndexes maps into a
 * message's staticAccountKeys array starting at `baseIndex`.
 */
export function deriveDestinationAtas(
  mint: PublicKey,
  outputs: BatchOutput[],
  tokenProgramId: PublicKey = SPL_TOKEN_PROGRAM_ID,
): PublicKey[] {
  return outputs.map((o) =>
    getAssociatedTokenAddressSync(mint, new PublicKey(o.payTo), true, tokenProgramId),
  );
}

/**
 * Estimate the compute units for a p-token batch transfer.
 *
 * Based on SIMD-0266 benchmarks: base overhead ~50 CU, plus ~25 CU per output
 * (vs ~131 CU × n for individual transferChecked calls).
 */
export function estimateBatchCu(outputCount: number): number {
  return 50 + outputCount * 25;
}

/**
 * CU savings summary for informational headers / receipts.
 */
export function cuSavingsSummary(batchSize: number): {
  splCu: number;
  pTokenCu: number;
  savedCu: number;
  savedPct: number;
} {
  const splCu = batchSize * SPL_TOKEN_CU.TransferChecked;
  const pTokenCu = estimateBatchCu(batchSize);
  const savedCu = splCu - pTokenCu;
  return {
    splCu,
    pTokenCu,
    savedCu,
    savedPct: Math.round((savedCu / splCu) * 100),
  };
}

export { P_TOKEN_OPCODE_BATCH, P_TOKEN_OPCODE_UNWRAP_LAMPORTS };
