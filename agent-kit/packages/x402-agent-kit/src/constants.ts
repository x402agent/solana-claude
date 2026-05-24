import type { X402Network } from "./types.js";

// USDC mint on Solana mainnet — the default x402 settlement asset.
export const USDC_MINT_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Solana Clawd governance/utility token.
export const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";

export const DEFAULT_NETWORK: X402Network = "solana";
export const DEFAULT_TIMEOUT_SECONDS = 60;
export const DEFAULT_MIME_TYPE = "application/json";

export const X402_VERSION = 1 as const;
export const PAYMENT_HEADER = "X-PAYMENT";
export const PAYMENT_RESPONSE_HEADER = "X-PAYMENT-RESPONSE";
