// Base58 address. The SDK keeps pubkeys as strings so it stays dependency-free;
// convert to @solana/web3.js PublicKey at the call site.
export type Address = string;

// All token and SOL amounts are base units (lamports / smallest token unit)
// expressed as bigint. Never use JavaScript number for financial math.
export type Amount = bigint;

export interface Global {
  initialVirtualTokenReserves: Amount;
  initialVirtualSolReserves: Amount;
  initialRealTokenReserves: Amount;
  tokenTotalSupply: Amount;
}

export interface BondingCurve {
  virtualTokenReserves: Amount;
  virtualSolReserves: Amount;
  realTokenReserves: Amount;
  realSolReserves: Amount;
  tokenTotalSupply: Amount;
  complete: boolean;
  creator: Address | null;
}

export interface FeeBreakdown {
  lpFeeBps: number;
  protocolFeeBps: number;
  creatorFeeBps: number;
  totalBps: number;
}

export interface Quote {
  // For a buy: tokens received. For a sell: SOL received.
  amountOut: Amount;
  // Fee charged in lamports for this trade.
  feeLamports: Amount;
  fee: FeeBreakdown;
  // Curve state after the trade is applied.
  nextCurve: BondingCurve;
}

export interface FeeShareHolder {
  address: Address;
  shareBps: number;
}

export interface FeeSharingConfig {
  mint: Address;
  holders: FeeShareHolder[];
}

export interface AccountMeta {
  pubkey: Address;
  isSigner: boolean;
  isWritable: boolean;
}

// A wire-ready instruction. Map to @solana/web3.js TransactionInstruction with
// `new TransactionInstruction({ programId: new PublicKey(programId), keys, data: Buffer.from(data) })`.
export interface InstructionDescriptor {
  programId: Address;
  keys: AccountMeta[];
  data: Uint8Array;
}

