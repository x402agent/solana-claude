import {
  DEFAULT_MIME_TYPE,
  DEFAULT_NETWORK,
  DEFAULT_TIMEOUT_SECONDS,
  USDC_MINT_SOLANA,
  X402_VERSION,
} from "./constants.js";
import type {
  X402AgentPaymentConfig,
  X402Challenge,
  X402PaymentRequirements,
} from "./types.js";

export interface BuildRequirementsOptions {
  resource: string;
  payTo: string;
  amount: string;
  asset?: string;
  network?: X402PaymentRequirements["network"];
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
}

export function buildPaymentRequirements(
  opts: BuildRequirementsOptions,
): X402PaymentRequirements {
  return {
    scheme: "exact",
    network: opts.network ?? DEFAULT_NETWORK,
    maxAmountRequired: opts.amount,
    resource: opts.resource,
    description: opts.description ?? "Solana Clawd agent access",
    mimeType: opts.mimeType ?? DEFAULT_MIME_TYPE,
    payTo: opts.payTo,
    maxTimeoutSeconds: opts.maxTimeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
    asset: opts.asset ?? USDC_MINT_SOLANA,
    ...(opts.extra ? { extra: opts.extra } : {}),
  };
}

/** Build a 402 challenge body from one or more requirements. */
export function createChallenge(
  requirements: X402PaymentRequirements | X402PaymentRequirements[],
  error?: string,
): X402Challenge {
  return {
    x402Version: X402_VERSION,
    accepts: Array.isArray(requirements) ? requirements : [requirements],
    ...(error ? { error } : {}),
  };
}

/** Build payment requirements for a catalog agent + host. */
export function agentPaymentRequirements(
  agentId: string,
  payment: X402AgentPaymentConfig,
  host = "https://x402.wtf",
): X402PaymentRequirements {
  const base = host.replace(/\/$/, "");
  return buildPaymentRequirements({
    resource: `${base}/api/agents/chat?agent=${encodeURIComponent(agentId)}`,
    payTo: payment.payTo,
    amount: payment.amount,
    asset: payment.asset,
    network: payment.network,
    description: payment.description ?? `Access to the ${agentId} agent`,
    extra: payment.price ? { price: payment.price } : undefined,
  });
}

/**
 * Express/Fetch-agnostic helper: returns the status + headers + JSON body for a
 * 402 response. Wire it into any server:
 *   const { status, body } = require402(reqs);
 *   res.status(status).json(body);
 */
export function require402(
  requirements: X402PaymentRequirements | X402PaymentRequirements[],
  error = "X-PAYMENT header required",
): { status: 402; headers: Record<string, string>; body: X402Challenge } {
  return {
    status: 402,
    headers: { "Content-Type": "application/json" },
    body: createChallenge(requirements, error),
  };
}
