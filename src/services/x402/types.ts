/**
 * src/services/x402/types.ts
 *
 * x402 Protocol Types — Solana-first edition.
 *
 * Adapted from Claude Code's src/services/x402/types.ts.
 * Extended to support Solana USDC (SPL Token) as the primary payment rail
 * alongside EVM (Base) as secondary.
 *
 * x402 spec: https://github.com/coinbase/x402
 * Solana SVM scheme: @x402/svm (registerExactSvmScheme)
 */

/** Payment scheme — currently only 'exact' (pay exact amount, no partial) */
export type PaymentScheme = "exact";

/** Supported networks — Solana first, EVM secondary */
export type PaymentNetwork =
  | "solana"           // Solana Mainnet (primary — no gas, fast, cheap)
  | "solana-devnet"    // Solana Devnet (testing)
  | "base"             // Base Mainnet (EVM fallback)
  | "base-sepolia"     // Base Sepolia (EVM testnet)
  | "ethereum"         // Ethereum Mainnet
  | "ethereum-sepolia";

/** x402 payment requirement — returned in HTTP 402 response header */
export interface PaymentRequirement {
  /** Payment scheme */
  scheme: PaymentScheme;
  /** Target network */
  network: PaymentNetwork;
  /** Amount in token smallest unit (USDC = 6 decimals, so 1000 = $0.001) */
  maxAmountRequired: string;
  /** The URL being paid for */
  resource: string;
  /** Human-readable description of what's being purchased */
  description: string;
  /** MIME type of the resource */
  mimeType?: string;
  /** Recipient address (Base58 for Solana, EIP-55 hex for EVM) */
  payTo: string;
  /** Max seconds the server will wait for settlement */
  maxTimeoutSeconds: number;
  /** Token mint address (SPL mint for Solana, ERC-20 for EVM) */
  asset: string;
  /** Additional token metadata */
  extra?: {
    name?: string;
    version?: string;
    decimals?: number;
  };
}

/** Signed payment payload — sent in X-Payment request header */
export interface PaymentPayload {
  x402Version: 1;
  scheme: PaymentScheme;
  network: PaymentNetwork;
  /** Network-specific payload (SVM or EVM) */
  payload: SvmPaymentPayload | EvmPaymentPayload;
}

/** Solana SVM payment payload (SPL Token transfer via @solana/kit) */
export interface SvmPaymentPayload {
  type: "svm";
  /** Base64-encoded signed Solana transaction */
  transaction: string;
  /** Payer public key (Base58) */
  from: string;
  /** Recipient public key (Base58) */
  to: string;
  /** Amount in lamports (for SOL) or token smallest unit (for USDC) */
  value: string;
  /** Unique nonce to prevent replay (Base58-encoded 32 bytes) */
  nonce: string;
  /** Validity window */
  validAfter: string;
  validBefore: string;
}

/** EVM payment payload (EIP-3009 transferWithAuthorization) */
export interface EvmPaymentPayload {
  type: "evm";
  signature: string;
  authorization: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
}

/** x402 wallet configuration (stored in ~/.config/solana-claude/config.json) */
export interface X402Config {
  enabled: boolean;
  /** Primary network — Solana for this runtime */
  primaryNetwork: PaymentNetwork;
  /** Solana wallet (keypair) configuration */
  solana?: {
    /** Payer public key (Base58) — derived from private key, safe to store */
    publicKey: string;
    /** USDC mint address on the configured network */
    usdcMint: string;
  };
  /** EVM wallet configuration (optional fallback) */
  evm?: {
    address: string;
  };
  /** Max USD per single request */
  maxPaymentPerRequestUSD: number;
  /** Max USD per session */
  maxSessionSpendUSD: number;
  /** Override facilitator URL */
  facilitatorUrl?: string;
}

/** Payment record for tracking and display */
export interface X402PaymentRecord {
  id: string;
  timestamp: number;
  resource: string;
  description: string;
  network: PaymentNetwork;
  /** Amount in token smallest unit */
  amount: string;
  /** USD equivalent at time of payment */
  amountUSD: number;
  token: string;
  payTo: string;
  /** Transaction signature (Base58 for Solana, hex for EVM) */
  txSignature: string;
  status: "pending" | "settled" | "failed";
}

/** x402 HTTP headers */
export const X402_HEADERS = {
  PAYMENT_REQUIRED: "x-payment-required",
  PAYMENT: "x-payment",
  PAYMENT_RESPONSE: "x-payment-response",
} as const;

/** USDC token addresses by network */
export const USDC_ADDRESSES: Record<PaymentNetwork, string> = {
  "solana":          "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Solana Mainnet USDC
  "solana-devnet":   "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // Devnet USDC
  "base":            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia":    "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "ethereum":        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "ethereum-sepolia":"0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
} as const;

/** Default facilitator URLs */
export const DEFAULT_FACILITATOR_URLS: Record<PaymentNetwork, string> = {
  "solana":          "https://x402.org/facilitator",
  "solana-devnet":   "https://x402.org/facilitator",
  "base":            "https://x402.org/facilitator",
  "base-sepolia":    "https://x402.org/facilitator",
  "ethereum":        "https://x402.org/facilitator",
  "ethereum-sepolia":"https://x402.org/facilitator",
} as const;

export const X402_DEFAULTS: X402Config = {
  enabled: false,
  primaryNetwork: "solana",
  maxPaymentPerRequestUSD: 0.10,
  maxSessionSpendUSD: 5.00,
} as const;

/** Is this a Solana network? */
export function isSolanaNetwork(network: PaymentNetwork): boolean {
  return network === "solana" || network === "solana-devnet";
}

/** Is this an EVM network? */
export function isEvmNetwork(network: PaymentNetwork): boolean {
  return !isSolanaNetwork(network);
}

/** USDC decimals for a given network */
export function getUsdcDecimals(network: PaymentNetwork): number {
  return 6; // USDC is always 6 decimals on both Solana and EVM
}

/** Convert token amount (smallest unit) to USD */
export function tokenAmountToUSD(amount: string, network: PaymentNetwork): number {
  return parseInt(amount, 10) / 10 ** getUsdcDecimals(network);
}
