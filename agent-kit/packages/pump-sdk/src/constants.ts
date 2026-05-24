// On-chain program addresses for the pump bonding-curve protocol this SDK targets.
// The SDK is Solana Clawd's own implementation; these are the canonical program IDs.
export const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMP_AMM_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const PUMP_FEES_PROGRAM_ID = "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ";

export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const RENT_SYSVAR_ID = "SysvarRent111111111111111111111111111111111";

// Token economics.
export const TOKEN_DECIMALS = 6;
export const LAMPORTS_PER_SOL = 1_000_000_000n;

// Default bonding-curve genesis state (lamports / base units).
export const DEFAULT_GLOBAL = {
  initialVirtualTokenReserves: 1_073_000_000_000_000n,
  initialVirtualSolReserves: 30_000_000_000n,
  initialRealTokenReserves: 793_100_000_000_000n,
  tokenTotalSupply: 1_000_000_000_000_000n,
};

// Tiered fee schedule (basis points). Tiers are selected by bonding-curve
// market cap; later tiers reduce the trading fee as the curve matures.
export interface FeeTierDef {
  marketCapLamports: bigint;
  lpFeeBps: number;
  protocolFeeBps: number;
  creatorFeeBps: number;
}

export const FEE_TIERS: FeeTierDef[] = [
  { marketCapLamports: 0n, lpFeeBps: 0, protocolFeeBps: 100, creatorFeeBps: 5 },
  {
    marketCapLamports: 30_000_000_000n,
    lpFeeBps: 0,
    protocolFeeBps: 80,
    creatorFeeBps: 5,
  },
  {
    marketCapLamports: 100_000_000_000n,
    lpFeeBps: 20,
    protocolFeeBps: 50,
    creatorFeeBps: 5,
  },
];

export const MAX_FEE_SHARE_HOLDERS = 10;
export const FEE_SHARE_TOTAL_BPS = 10_000;
