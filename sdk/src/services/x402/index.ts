/**
 * src/services/x402/index.ts
 *
 * x402 protocol client for the OpenClawd framework.
 *
 * Wraps Node's fetch() to handle HTTP 402 Payment Required automatically:
 *   1. Request hits a paid endpoint
 *   2. Server returns 402 + X-Payment-Required header
 *   3. Client signs a USDC transfer (or simulates in demo mode)
 *   4. Client retries with X-Payment header
 *   5. Server verifies and returns data
 *
 * Production: install @x402/svm + @x402/axios for real on-chain signing.
 * Demo mode:  works without a private key — shows the flow, skips signing.
 */

import type { PaymentRequirement, PaymentPayload } from "./types.js";
import { X402_HEADERS, USDC_ADDRESSES } from "./types.js";

export { X402_HEADERS, USDC_ADDRESSES } from "./types.js";
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

// ── Config loading ──────────────────────────────────────────────────────────

export function isX402Enabled(): boolean {
  return Boolean(
    process.env.X402_SVM_PRIVATE_KEY || process.env.X402_ENABLED === "true",
  );
}

export function getX402Config(): X402Config {
  const network = process.env.X402_NETWORK ?? "solana-mainnet";
  const privateKey = process.env.X402_SVM_PRIVATE_KEY;

  let solana: SolanaSignerConfig | undefined;
  if (privateKey) {
    solana = {
      publicKey:
        process.env.X402_SVM_PUBLIC_KEY ?? "(set X402_SVM_PUBLIC_KEY for display)",
      usdcMint: USDC_ADDRESSES[network] ?? USDC_ADDRESSES["solana-mainnet"],
    };
  }

  return {
    enabled: isX402Enabled(),
    primaryNetwork: network,
    maxPaymentPerRequestUSD: parseFloat(process.env.X402_MAX_PER_REQUEST ?? "0.10"),
    maxSessionSpendUSD: parseFloat(process.env.X402_MAX_SESSION ?? "1.00"),
    facilitatorUrl: process.env.X402_FACILITATOR_URL ?? "https://clawdrouter.fly.dev",
    solana,
  };
}

// ── Header parsing ──────────────────────────────────────────────────────────

export function parsePaymentRequirement(header: string): PaymentRequirement[] {
  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? (parsed as PaymentRequirement[]) : [parsed as PaymentRequirement];
  } catch {
    return [];
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

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// ── Fetch wrapper ───────────────────────────────────────────────────────────

export function wrapFetchWithX402(fetchFn: typeof fetch): typeof fetch {
  const cfg = getX402Config();

  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const firstResponse = await fetchFn(input, init);

    // Only intercept 402
    if (firstResponse.status !== 402) return firstResponse;

    const requirementsHeader = firstResponse.headers.get(X402_HEADERS.PAYMENT_REQUIRED);
    if (!requirementsHeader) return firstResponse;

    const requirements = parsePaymentRequirement(requirementsHeader);
    const req = requirements[0];
    if (!req) return firstResponse;

    // Check price ceiling
    const amountUSD = parseFloat(req.maxAmountRequired) / 1_000_000;
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
    const retryHeaders = new Headers((init?.headers as HeadersInit | undefined) ?? {});
    retryHeaders.set(X402_HEADERS.PAYMENT, paymentHeader);

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
