/**
 * src/services/x402/index.ts
 *
 * x402 protocol client for the OpenClawd framework.
 *
 * Wraps Node's fetch() to handle HTTP 402 Payment Required automatically:
 *   1. Request hits a paid endpoint
 *   2. Server returns 402 + PAYMENT-REQUIRED header
 *   3. Client signs a USDC transfer (or simulates in demo mode)
 *   4. Client retries with PAYMENT-SIGNATURE header
 *   5. Server verifies and returns data
 *
 * Production: install @x402/svm + @x402/axios for real on-chain signing.
 * Demo mode:  works without a private key — shows the flow, skips signing.
 */

import type { PaymentRequirement, PaymentPayload } from "./types.js";
import { X402_HEADERS, USDC_ADDRESSES, X402_NETWORK_IDS } from "./types.js";
import { OPENCLAWD_PUBLIC_ENDPOINTS } from "../../config.js";

export { X402_HEADERS, USDC_ADDRESSES, X402_NETWORK_IDS } from "./types.js";
export type { PaymentRequirement, PaymentPayload } from "./types.js";

// ── Config ─────────────────────────────────────────────────────────────────

interface SolanaSignerConfig {
  publicKey: string;
  usdcMint: string;
}

interface X402Config {
  enabled: boolean;
  primaryNetwork: string;
  maxPaymentPerRequestUSD: number;
  maxSessionSpendUSD: number;
  facilitatorUrl: string;
  solana?: SolanaSignerConfig;
}

interface SessionStats {
  payments: number;
  totalUSD: number;
  lastPayment?: { resource: string; amountUSD: number; timestamp: number };
}

const sessionStats: SessionStats = { payments: 0, totalUSD: 0 };

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type FetchHeadersInit = NonNullable<FetchInit>["headers"];

// ── Config loading ──────────────────────────────────────────────────────────

export function isX402Enabled(): boolean {
  return Boolean(
    process.env.X402_SVM_PRIVATE_KEY || process.env.X402_ENABLED === "true",
  );
}

export function getX402Config(): X402Config {
  const network = normalizeX402Network(
    process.env.X402_NETWORK ?? X402_NETWORK_IDS.SOLANA_MAINNET,
  );
  const privateKey = process.env.X402_SVM_PRIVATE_KEY;

  let solana: SolanaSignerConfig | undefined;
  if (privateKey || process.env.X402_ENABLED === "true") {
    solana = {
      publicKey:
        process.env.X402_SVM_PUBLIC_KEY ?? "(simulated x402 payer)",
      usdcMint: USDC_ADDRESSES[network] ?? USDC_ADDRESSES[X402_NETWORK_IDS.SOLANA_MAINNET],
    };
  }

  return {
    enabled: isX402Enabled(),
    primaryNetwork: network,
    maxPaymentPerRequestUSD: parseFloat(process.env.X402_MAX_PER_REQUEST ?? "0.10"),
    maxSessionSpendUSD: parseFloat(process.env.X402_MAX_SESSION ?? "1.00"),
    facilitatorUrl:
      process.env.X402_FACILITATOR_URL ??
      OPENCLAWD_PUBLIC_ENDPOINTS.facilitator,
    solana,
  };
}

export function normalizeX402Network(network: string): string {
  switch (network) {
    case "solana-mainnet":
    case "solana":
      return X402_NETWORK_IDS.SOLANA_MAINNET;
    case "solana-devnet":
      return X402_NETWORK_IDS.SOLANA_DEVNET;
    case "base":
    case "base-mainnet":
      return X402_NETWORK_IDS.BASE_MAINNET;
    case "base-sepolia":
      return X402_NETWORK_IDS.BASE_SEPOLIA;
    case "polygon":
    case "polygon-mainnet":
      return X402_NETWORK_IDS.POLYGON_MAINNET;
    case "arbitrum":
    case "arbitrum-mainnet":
      return X402_NETWORK_IDS.ARBITRUM_MAINNET;
    case "world":
    case "world-mainnet":
      return X402_NETWORK_IDS.WORLD_MAINNET;
    default:
      return network;
  }
}

// ── Header parsing ──────────────────────────────────────────────────────────

export function parsePaymentRequirement(header: string): PaymentRequirement[] {
  const candidates = [header];

  try {
    candidates.push(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    // Leave only the raw candidate.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? (parsed as PaymentRequirement[]) : [parsed as PaymentRequirement];
    } catch {
      // Try the next representation.
    }
  }

  return [];
}

export function getPaymentRequirementHeader(headers: Headers): string | null {
  return (
    headers.get(X402_HEADERS.PAYMENT_REQUIRED) ??
    headers.get(X402_HEADERS.LEGACY_PAYMENT_REQUIRED)
  );
}

export function setPaymentHeader(headers: Headers, paymentHeader: string): void {
  headers.set(X402_HEADERS.PAYMENT, paymentHeader);
}

export function getPaymentHeader(headers: Headers): string | null {
  return headers.get(X402_HEADERS.PAYMENT) ?? headers.get(X402_HEADERS.LEGACY_PAYMENT);
}

export function amountRequiredToUSD(requirement: PaymentRequirement): number {
  const atomicAmount = Number.parseFloat(requirement.maxAmountRequired);
  const decimals = typeof requirement.extra?.decimals === "number" ? requirement.extra.decimals : 6;
  if (!Number.isFinite(atomicAmount)) return Number.POSITIVE_INFINITY;
  return atomicAmount / 10 ** decimals;
}

export function encodeX402Payload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeX402Payload<T = unknown>(header: string): T {
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8")) as T;
  } catch {
    return JSON.parse(header) as T;
  }
}

// ── Payment payload construction ────────────────────────────────────────────

async function buildPaymentHeader(
  requirement: PaymentRequirement,
  cfg: X402Config,
): Promise<string | null> {
  const { solana } = cfg;

  if (!solana) {
    // Demo mode — no private key configured
    return null;
  }

  // In production, use @x402/svm to sign a real USDC transfer:
  //
  //   import { registerExactSvmScheme } from "@x402/svm/exact/client";
  //   import { createKeyPairSignerFromBytes } from "@solana/kit";
  //   import { base58 } from "@scure/base";
  //
  //   const signer = await createKeyPairSignerFromBytes(
  //     base58.decode(process.env.X402_SVM_PRIVATE_KEY),
  //   );
  //   registerExactSvmScheme(x402Client, { signer });
  //   const tx = await x402Client.createPayment(requirement);
  //   const payload = { transaction: Buffer.from(tx).toString("base64") };

  const payload: PaymentPayload = {
    network: requirement.network,
    scheme: requirement.scheme,
    resource: requirement.resource,
    payload: {
      simulated: true,
      wallet: solana.publicKey,
      amount: requirement.maxAmountRequired,
      asset: requirement.asset,
    },
    timestamp: Date.now(),
  };

  return encodeX402Payload(payload);
}

// ── Fetch wrapper ───────────────────────────────────────────────────────────

export function wrapFetchWithX402(fetchFn: typeof fetch): typeof fetch {
  const cfg = getX402Config();

  const wrapped = async (input: FetchInput, init?: FetchInit): Promise<Response> => {
    const firstResponse = await fetchFn(input, init);

    // Only intercept 402
    if (firstResponse.status !== 402) return firstResponse;

    const requirementsHeader = getPaymentRequirementHeader(firstResponse.headers);
    if (!requirementsHeader) return firstResponse;

    const requirements = parsePaymentRequirement(requirementsHeader);
    const req = requirements[0];
    if (!req) return firstResponse;

    // Check price ceiling
    const amountUSD = amountRequiredToUSD(req);
    if (amountUSD > cfg.maxPaymentPerRequestUSD) {
      console.warn(
        `x402: payment $${amountUSD.toFixed(6)} exceeds configured max $${cfg.maxPaymentPerRequestUSD}`,
      );
      return firstResponse;
    }

    // Check session cap
    if (sessionStats.totalUSD + amountUSD > cfg.maxSessionSpendUSD) {
      console.warn(
        `x402: session spend cap reached ($${cfg.maxSessionSpendUSD})`,
      );
      return firstResponse;
    }

    // Build payment header
    const paymentHeader = await buildPaymentHeader(req, cfg);
    if (!paymentHeader) return firstResponse;

    // Retry with payment
    const retryHeaders = new Headers((init?.headers as FetchHeadersInit | undefined) ?? {});
    setPaymentHeader(retryHeaders, paymentHeader);

    const paidResponse = await fetchFn(input, { ...init, headers: retryHeaders });

    if (paidResponse.ok) {
      sessionStats.payments++;
      sessionStats.totalUSD += amountUSD;
      sessionStats.lastPayment = {
        resource: req.resource,
        amountUSD,
        timestamp: Date.now(),
      };
    }

    return paidResponse;
  };

  return wrapped as typeof fetch;
}

// ── Reporting ───────────────────────────────────────────────────────────────

export function getX402Summary(): { session: SessionStats } {
  return { session: { ...sessionStats } };
}

export function formatX402Cost(): string {
  if (sessionStats.payments === 0) return "x402: no payments this session";
  return (
    `x402 session: ${sessionStats.payments} payment(s) totalling $${sessionStats.totalUSD.toFixed(6)} USDC` +
    (sessionStats.lastPayment
      ? ` (last: ${sessionStats.lastPayment.resource.replace(/https?:\/\/[^/]+/, "")})`
      : "")
  );
}

export function resetX402Session(): void {
  sessionStats.payments = 0;
  sessionStats.totalUSD = 0;
  sessionStats.lastPayment = undefined;
}
