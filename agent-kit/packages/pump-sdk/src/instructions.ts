import { sha256 } from "./sha256.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  PUMP_FEES_PROGRAM_ID,
  PUMP_PROGRAM_ID,
  RENT_SYSVAR_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  FEE_SHARE_TOTAL_BPS,
  MAX_FEE_SHARE_HOLDERS,
} from "./constants.js";
import { ByteWriter } from "./encoding.js";
import type {
  AccountMeta,
  Address,
  Amount,
  FeeShareHolder,
  InstructionDescriptor,
} from "./types.js";

/** Anchor instruction discriminator: first 8 bytes of sha256("global:<name>"). */
export function discriminator(name: string): Uint8Array {
  return sha256(new TextEncoder().encode(`global:${name}`)).subarray(0, 8);
}

const meta = (
  pubkey: Address,
  isSigner: boolean,
  isWritable: boolean,
): AccountMeta => ({ pubkey, isSigner, isWritable });

export interface CreateAccounts {
  mint: Address;
  mintAuthority: Address;
  bondingCurve: Address;
  associatedBondingCurve: Address;
  global: Address;
  metadata: Address;
  user: Address;
  eventAuthority: Address;
  mplTokenMetadata?: Address;
  systemProgram?: Address;
  tokenProgram?: Address;
  associatedTokenProgram?: Address;
  rent?: Address;
}

export interface TradeAccounts {
  global: Address;
  feeRecipient: Address;
  mint: Address;
  bondingCurve: Address;
  associatedBondingCurve: Address;
  associatedUser: Address;
  user: Address;
  creatorVault: Address;
  eventAuthority: Address;
  systemProgram?: Address;
  tokenProgram?: Address;
}

export interface CreateTokenArgs {
  name: string;
  symbol: string;
  uri: string;
  creator: Address;
}

/**
 * Solana Clawd's offline pump SDK. Methods build wire-ready
 * InstructionDescriptors without a network connection. Amounts are bigint
 * base units; convert descriptors to @solana/web3.js TransactionInstruction
 * at the call site.
 */
export class PumpSdk {
  readonly programId: Address;

  constructor(programId: Address = PUMP_PROGRAM_ID) {
    this.programId = programId;
  }

  /** Create a token on a fresh bonding curve (v2; v1 `create` is deprecated). */
  createV2Instruction(
    accounts: CreateAccounts,
    args: CreateTokenArgs,
  ): InstructionDescriptor {
    const data = new ByteWriter()
      .bytes(discriminator("create"))
      .string(args.name)
      .string(args.symbol)
      .string(args.uri)
      .pubkey(args.creator)
      .toBytes();

    const keys: AccountMeta[] = [
      meta(accounts.mint, true, true),
      meta(accounts.mintAuthority, false, false),
      meta(accounts.bondingCurve, false, true),
      meta(accounts.associatedBondingCurve, false, true),
      meta(accounts.global, false, false),
      meta(accounts.mplTokenMetadata ?? "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s", false, false),
      meta(accounts.metadata, false, true),
      meta(accounts.user, true, true),
      meta(accounts.systemProgram ?? SYSTEM_PROGRAM_ID, false, false),
      meta(accounts.tokenProgram ?? TOKEN_PROGRAM_ID, false, false),
      meta(accounts.associatedTokenProgram ?? ASSOCIATED_TOKEN_PROGRAM_ID, false, false),
      meta(accounts.rent ?? RENT_SYSVAR_ID, false, false),
      meta(accounts.eventAuthority, false, false),
      meta(this.programId, false, false),
    ];

    return { programId: this.programId, keys, data };
  }

  /** Buy `amount` tokens, spending at most `maxSolCost` lamports. */
  buyInstruction(
    accounts: TradeAccounts,
    amount: Amount,
    maxSolCost: Amount,
  ): InstructionDescriptor {
    const data = new ByteWriter()
      .bytes(discriminator("buy"))
      .u64(amount)
      .u64(maxSolCost)
      .toBytes();
    return { programId: this.programId, keys: this.tradeKeys(accounts), data };
  }

  /** Sell `amount` tokens, requiring at least `minSolOutput` lamports back. */
  sellInstruction(
    accounts: TradeAccounts,
    amount: Amount,
    minSolOutput: Amount,
  ): InstructionDescriptor {
    const data = new ByteWriter()
      .bytes(discriminator("sell"))
      .u64(amount)
      .u64(minSolOutput)
      .toBytes();
    return { programId: this.programId, keys: this.tradeKeys(accounts), data };
  }

  /** Configure creator fee sharing. Shares must total exactly 10,000 bps. */
  createFeeSharingConfigInstruction(
    accounts: {
      config: Address;
      mint: Address;
      authority: Address;
      systemProgram?: Address;
    },
    holders: FeeShareHolder[],
    programId: Address = PUMP_FEES_PROGRAM_ID,
  ): InstructionDescriptor {
    assertFeeShares(holders);
    const writer = new ByteWriter()
      .bytes(discriminator("create_fee_sharing_config"))
      .u8(holders.length);
    for (const h of holders) {
      writer.pubkey(h.address).u64(BigInt(h.shareBps));
    }
    const keys: AccountMeta[] = [
      meta(accounts.config, false, true),
      meta(accounts.mint, false, false),
      meta(accounts.authority, true, true),
      meta(accounts.systemProgram ?? SYSTEM_PROGRAM_ID, false, false),
    ];
    return { programId, keys, data: writer.toBytes() };
  }

  private tradeKeys(accounts: TradeAccounts): AccountMeta[] {
    return [
      meta(accounts.global, false, false),
      meta(accounts.feeRecipient, false, true),
      meta(accounts.mint, false, false),
      meta(accounts.bondingCurve, false, true),
      meta(accounts.associatedBondingCurve, false, true),
      meta(accounts.associatedUser, false, true),
      meta(accounts.user, true, true),
      meta(accounts.systemProgram ?? SYSTEM_PROGRAM_ID, false, false),
      meta(accounts.tokenProgram ?? TOKEN_PROGRAM_ID, false, false),
      meta(accounts.creatorVault, false, true),
      meta(accounts.eventAuthority, false, false),
      meta(this.programId, false, false),
    ];
  }
}

export function assertFeeShares(holders: FeeShareHolder[]): void {
  if (holders.length === 0 || holders.length > MAX_FEE_SHARE_HOLDERS) {
    throw new Error(`Fee sharing needs 1-${MAX_FEE_SHARE_HOLDERS} holders.`);
  }
  const seen = new Set<Address>();
  let total = 0;
  for (const h of holders) {
    if (h.shareBps <= 0) throw new Error("Fee shares must be positive.");
    if (seen.has(h.address)) throw new Error(`Duplicate shareholder: ${h.address}`);
    seen.add(h.address);
    total += h.shareBps;
  }
  if (total !== FEE_SHARE_TOTAL_BPS) {
    throw new Error(`Fee shares must total ${FEE_SHARE_TOTAL_BPS} bps, got ${total}.`);
  }
}

/** Shared offline SDK instance. */
export const PUMP_SDK = new PumpSdk();
