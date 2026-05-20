/**
 * src/services/x402/types.ts
 *
 * Type definitions for the x402 HTTP payment protocol.
 * Spec: https://docs.cdp.coinbase.com/x402/welcome
 */

// ── Payment requirement (returned in HTTP 402 body + header) ───────────────

export interface PaymentRequirement {
  /** Payment scheme — "exact" for fixed USDC amounts */
  scheme: string;
  /** CAIP-2 network identifier, e.g. Solana mainnet/devnet or an EVM chain. */
  network: string;
  /** Maximum amount in base units (USDC: 6 decimals) */
  maxAmountRequired: string;
  /** URL of the resource being accessed */
  resource: string;
  /** Human-readable description */
  description: string;
  /** MIME type of the protected resource */
  mimeType?: string;
  /** Recipient wallet address */
  payTo: string;
  /** Seconds until payment authorization expires */
  maxTimeoutSeconds: number;
  /** SPL token mint address (USDC) */
  asset: string;
  /** Extra metadata (token name, decimals) */
  extra?: Record<string, unknown>;
}

// ── Payment receipt (sent in X-Payment header on retry) ───────────────────

export interface PaymentPayload {
  /** Network the payment was made on */
  network: string;
  /** Payment scheme used */
  scheme: string;
  /** Resource URL this payment authorizes */
  resource: string;
  /** Chain-specific payload */
  payload: {
    /** Base64-encoded signed Solana transaction */
    transaction?: string;
    /** Simulated flag — true in demo mode without a real keypair */
    simulated?: boolean;
    wallet?: string;
    amount?: string;
    asset?: string;
  };
  /** Unix timestamp of signing */
  timestamp: number;
}

// ── Header names ───────────────────────────────────────────────────────────

export const X402_HEADERS = {
  /** Outbound: base64(JSON(PaymentPayload)) on retry. */
  PAYMENT: "PAYMENT-SIGNATURE",
  /** Inbound: base64(JSON(PaymentRequirement[])) on 402. */
  PAYMENT_REQUIRED: "PAYMENT-REQUIRED",
  /** Optional settlement response echoed back on 200. */
  PAYMENT_RECEIPT: "PAYMENT-RESPONSE",
  /** Client hint: max price willing to pay */
  MAX_PRICE: "x-max-price",
  /** Legacy aliases kept for older local Clawd demos. */
  LEGACY_PAYMENT: "x-payment",
  LEGACY_PAYMENT_REQUIRED: "x-payment-required",
  LEGACY_PAYMENT_RECEIPT: "x-payment-receipt",
} as const;

// ── CAIP-2 network identifiers used by x402 v2 ─────────────────────────────

export const X402_NETWORK_IDS = {
  SOLANA_MAINNET: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  SOLANA_DEVNET: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  BASE_MAINNET: "eip155:8453",
  BASE_SEPOLIA: "eip155:84532",
  POLYGON_MAINNET: "eip155:137",
  ARBITRUM_MAINNET: "eip155:42161",
  WORLD_MAINNET: "eip155:480",
} as const;

// ── Well-known USDC mint addresses ─────────────────────────────────────────

export const USDC_ADDRESSES: Record<string, string> = {
  [X402_NETWORK_IDS.SOLANA_MAINNET]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  [X402_NETWORK_IDS.SOLANA_DEVNET]: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  [X402_NETWORK_IDS.BASE_MAINNET]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [X402_NETWORK_IDS.BASE_SEPOLIA]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [X402_NETWORK_IDS.POLYGON_MAINNET]: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  [X402_NETWORK_IDS.ARBITRUM_MAINNET]: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  "solana-mainnet": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "solana-devnet": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "base-mainnet": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "ethereum-mainnet": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};
