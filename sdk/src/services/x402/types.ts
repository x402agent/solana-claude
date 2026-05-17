/**
 * src/services/x402/types.ts
 *
 * Type definitions for the x402 HTTP payment protocol.
 * Spec: https://github.com/coinbase/x402
 */

// ── Payment requirement (returned in HTTP 402 body + header) ───────────────

export interface PaymentRequirement {
  /** Payment scheme — "exact" for fixed USDC amounts */
  scheme: string;
  /** Solana network identifier: "solana-mainnet" | "solana-devnet" */
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
  /** Outbound: base64(JSON(PaymentPayload)) on retry */
  PAYMENT: "x-payment",
  /** Inbound: base64(JSON(PaymentRequirement[])) on 402 */
  PAYMENT_REQUIRED: "x-payment-required",
  /** Optional receipt echoed back on 200 */
  PAYMENT_RECEIPT: "x-payment-receipt",
  /** Client hint: max price willing to pay */
  MAX_PRICE: "x-max-price",
} as const;

// ── Well-known USDC mint addresses ─────────────────────────────────────────

export const USDC_ADDRESSES: Record<string, string> = {
  "solana-mainnet": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "solana-devnet": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "base-mainnet": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "ethereum-mainnet": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};
