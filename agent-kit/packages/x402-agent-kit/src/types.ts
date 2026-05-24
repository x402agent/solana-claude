// x402 protocol types (HTTP 402 Payment Required) scoped to Solana Clawd agents.

export type X402Network = "solana" | "solana-devnet";
export type X402Scheme = "exact";

export interface X402PaymentRequirements {
  scheme: X402Scheme;
  network: X402Network;
  /** Atomic amount required (e.g. USDC base units, 6 decimals). */
  maxAmountRequired: string;
  /** The protected resource URL. */
  resource: string;
  description: string;
  mimeType: string;
  /** Recipient wallet address (base58). */
  payTo: string;
  maxTimeoutSeconds: number;
  /** SPL mint of the payment asset (USDC by default). */
  asset: string;
  extra?: Record<string, unknown>;
}

/** Body of a 402 Payment Required response. */
export interface X402Challenge {
  x402Version: 1;
  accepts: X402PaymentRequirements[];
  error?: string;
}

/** Payload a client sends back in the `X-PAYMENT` header (base64-encoded JSON). */
export interface X402PaymentPayload {
  x402Version: 1;
  scheme: X402Scheme;
  network: X402Network;
  /** Base64 signed Solana transaction (or transfer proof) that satisfies the requirement. */
  payload: {
    transaction?: string;
    signature?: string;
    payer?: string;
    [key: string]: unknown;
  };
}

/** Settlement result a facilitator/server returns after verifying payment. */
export interface X402SettlementResult {
  success: boolean;
  network: X402Network;
  transaction?: string;
  payer?: string;
  error?: string;
}

/** Minimal shape of a catalog agent's payment config. */
export interface X402AgentPaymentConfig {
  /** Human price, e.g. "$0.01". Informational only. */
  price?: string;
  /** Atomic amount in asset base units. */
  amount: string;
  asset?: string;
  payTo: string;
  network?: X402Network;
  description?: string;
}
