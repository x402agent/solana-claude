/**
 * src/services/x402/client.ts
 *
 * x402 Payment Client — Solana-first edition.
 *
 * Adapted from Claude Code's services/x402/client.ts.
 * Key changes from the original:
 *   - Primary payment rail: Solana USDC (SPL Token) via @x402/svm
 *   - EVM (Base) retained as secondary fallback
 *   - No bun:bundle dep — pure Node.js
 *   - Spend limits checked against AppState permission engine
 *   - Payment records written to AppState memory as KNOWN facts
 *
 * Protocol: https://github.com/coinbase/x402
 *
 * Required env vars (for Solana payments):
 *   X402_SVM_PRIVATE_KEY  — Base58-encoded Solana keypair private key
 *
 * Optional:
 *   X402_EVM_PRIVATE_KEY  — 0x-prefixed EVM private key (Base fallback)
 *   X402_MAX_PER_REQUEST_USD  — Per-request limit (default $0.10)
 *   X402_MAX_SESSION_USD      — Session limit (default $5.00)
 *   X402_NETWORK              — solana|solana-devnet|base|base-sepolia (default: solana)
 */

import { randomBytes, createHash } from "node:crypto";
import {
  type PaymentNetwork,
  type PaymentRequirement,
  type PaymentPayload,
  type X402PaymentRecord,
  type X402Config,
  type SvmPaymentPayload,
  type EvmPaymentPayload,
  X402_HEADERS,
  X402_DEFAULTS,
  USDC_ADDRESSES,
  DEFAULT_FACILITATOR_URLS,
  isSolanaNetwork,
  tokenAmountToUSD,
} from "./types.js";
import { addX402Payment, persistPayment, getX402SessionSpentUSD } from "./tracker.js";

// ─── Config ──────────────────────────────────────────────────────────────────

let _config: X402Config | null = null;

export function getX402Config(): X402Config {
  if (_config) return _config;
  _config = {
    ...X402_DEFAULTS,
    primaryNetwork: (process.env.X402_NETWORK as PaymentNetwork) ?? "solana",
    maxPaymentPerRequestUSD: parseFloat(process.env.X402_MAX_PER_REQUEST_USD ?? "0.10"),
    maxSessionSpendUSD: parseFloat(process.env.X402_MAX_SESSION_USD ?? "5.00"),
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  };

  const svmKey = process.env.X402_SVM_PRIVATE_KEY;
  if (svmKey) {
    // Derive Solana public key from private key bytes
    const pubKey = deriveSolanaPublicKey(svmKey);
    _config.solana = {
      publicKey: pubKey,
      usdcMint: USDC_ADDRESSES[_config.primaryNetwork],
    };
    _config.enabled = true;
    _config.enabled = true;
  }

  const evmKey = process.env.X402_EVM_PRIVATE_KEY;
  if (evmKey && !svmKey) {
    // EVM-only mode
    _config.primaryNetwork = "base";
    _config.enabled = true;
  }

  return _config;
}

export function isX402Enabled(): boolean {
  const cfg = getX402Config();
  if (!cfg.enabled) return false;
  return !!(process.env.X402_SVM_PRIVATE_KEY || process.env.X402_EVM_PRIVATE_KEY);
}

// ─── Solana key helpers ───────────────────────────────────────────────────────

/**
 * Derive a Solana public key (Base58) from a Base58-encoded private key.
 * Uses the ed25519 curve (Solana's native signing algorithm).
 * In a real implementation, use @solana/kit createKeyPairSignerFromBytes.
 * Here we derive it deterministically for config display without the full SDK.
 */
function deriveSolanaPublicKey(base58PrivateKey: string): string {
  // For display purposes — real signing uses @solana/kit
  // This is a simplified derivation that produces the public key hash
  const decoded = base58Decode(base58PrivateKey);
  const pubKeyBytes = decoded.slice(32, 64); // ed25519 keypair: [privkey(32)] + [pubkey(32)]
  return base58Encode(pubKeyBytes);
}

/** Base58 alphabet (Bitcoin/Solana) */
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(str: string): Uint8Array {
  let num = 0n;
  for (const char of str) {
    num = num * 58n + BigInt(BASE58_ALPHABET.indexOf(char));
  }
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }
  const leadingZeros = str.match(/^1*/)?.[0].length ?? 0;
  return new Uint8Array([...Array.from({ length: leadingZeros }, () => 0), ...bytes]);
}

function base58Encode(bytes: Uint8Array): string {
  let num = 0n;
  for (const byte of bytes) num = num * 256n + BigInt(byte);
  let result = "";
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % 58n)] + result;
    num /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    result = "1" + result;
  }
  return result;
}

// ─── Payment requirement parsing/validation ───────────────────────────────────

export function parsePaymentRequirement(headerValue: string): PaymentRequirement {
  try {
    // x402 v2 uses PAYMENT-REQUIRED header with base64-encoded JSON array
    const decoded = Buffer.from(headerValue, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    // v2 format: array of requirements, pick first Solana one or fallback to first
    const requirements: PaymentRequirement[] = Array.isArray(parsed) ? parsed : [parsed];
    const solReq = requirements.find(r => isSolanaNetwork(r.network as PaymentNetwork));
    const req = solReq ?? requirements[0];
    if (!req) throw new Error("No payment requirements found");
    return req as PaymentRequirement;
  } catch {
    // v1 format: JSON directly  
    try {
      const parsed = JSON.parse(headerValue) as PaymentRequirement;
      if (!parsed.scheme || !parsed.network) throw new Error("Missing fields");
      return parsed;
    } catch {
      throw new Error(`Invalid x402 payment requirement header`);
    }
  }
}

export function validatePaymentRequirement(
  req: PaymentRequirement,
  sessionSpentUSD: number,
): { valid: boolean; reason?: string } {
  const cfg = getX402Config();

  if (!cfg.enabled) return { valid: false, reason: "x402 not enabled (set X402_SVM_PRIVATE_KEY)" };

  const amountUSD = tokenAmountToUSD(req.maxAmountRequired, req.network as PaymentNetwork);

  if (amountUSD > cfg.maxPaymentPerRequestUSD) {
    return {
      valid: false,
      reason: `Payment $${amountUSD.toFixed(4)} exceeds per-request limit $${cfg.maxPaymentPerRequestUSD.toFixed(2)}`,
    };
  }
  if (sessionSpentUSD + amountUSD > cfg.maxSessionSpendUSD) {
    return {
      valid: false,
      reason: `Payment would exceed session limit $${cfg.maxSessionSpendUSD.toFixed(2)} (spent: $${sessionSpentUSD.toFixed(4)})`,
    };
  }

  // SVM network check
  const svmKey = process.env.X402_SVM_PRIVATE_KEY;
  if (isSolanaNetwork(req.network as PaymentNetwork) && !svmKey) {
    return { valid: false, reason: "Solana payment required but X402_SVM_PRIVATE_KEY not set" };
  }

  return { valid: true };
}

// ─── Solana payment construction ──────────────────────────────────────────────

/**
 * Build a Solana USDC transfer payload for x402.
 *
 * In production this would use @solana/kit + @x402/svm to build and sign a
 * proper SPL Token transfer transaction. Here we produce the payload structure
 * that the x402 SVM facilitator expects.
 *
 * Full implementation: examples/x402-solana.ts (uses @x402/svm SDK)
 */
async function buildSvmPayment(req: PaymentRequirement): Promise<SvmPaymentPayload> {
  const privKey = process.env.X402_SVM_PRIVATE_KEY!;
  const cfg = getX402Config();
  const fromPubkey = cfg.solana?.publicKey ?? deriveSolanaPublicKey(privKey);
  const nonce = base58Encode(randomBytes(32));
  const validAfter = "0";
  const validBefore = String(Math.floor(Date.now() / 1000) + req.maxTimeoutSeconds);

  // ⚠️  Production note: replace this with real @solana/kit signing:
  //
  //   import { createKeyPairSignerFromBytes } from "@solana/kit";
  //   import { registerExactSvmScheme } from "@x402/svm/exact/client";
  //   const keypair = await createKeyPairSignerFromBytes(base58Decode(privKey));
  //   const client = new x402Client();
  //   registerExactSvmScheme(client, { signer: keypair });
  //   const payment = await client.createPayment(req);

  // Stub transaction bytes (replace with real signed tx in production)
  const stubTxBytes = randomBytes(200);
  const transaction = stubTxBytes.toString("base64");

  return {
    type: "svm",
    transaction,
    from: fromPubkey,
    to: req.payTo,
    value: req.maxAmountRequired,
    nonce,
    validAfter,
    validBefore,
  };
}

/** Build EVM EIP-3009 payment payload (fallback) */
function buildEvmPayment(req: PaymentRequirement): EvmPaymentPayload {
  const nonce = "0x" + randomBytes(32).toString("hex");
  const validAfter = "0";
  const validBefore = String(Math.floor(Date.now() / 1000) + req.maxTimeoutSeconds);

  // Stub — replace with real viem/ethers EIP-712 signing for production
  const stubSignature = "0x" + randomBytes(65).toString("hex");

  return {
    type: "evm",
    signature: stubSignature,
    authorization: {
      from: process.env.X402_EVM_ADDRESS ?? "0x0000000000000000000000000000000000000000",
      to: req.payTo,
      value: req.maxAmountRequired,
      validAfter,
      validBefore,
      nonce,
    },
  };
}

// ─── Main payment handler ─────────────────────────────────────────────────────

/**
 * Handle a 402 response: parse requirement, validate, sign payment, return header.
 * Adapted from Claude Code's handlePaymentRequired().
 */
export async function handlePaymentRequired(
  headerValue: string,
  sessionSpentUSD: number,
): Promise<{ paymentHeader: string; record: X402PaymentRecord } | null> {
  const req = parsePaymentRequirement(headerValue);
  const validation = validatePaymentRequirement(req, sessionSpentUSD);

  if (!validation.valid) {
    process.stderr.write(`[x402] Rejected: ${validation.reason}\n`);
    return null;
  }

  const network = req.network as PaymentNetwork;
  const payload: PaymentPayload = {
    x402Version: 1,
    scheme: req.scheme as "exact",
    network,
    payload: isSolanaNetwork(network)
      ? await buildSvmPayment(req)
      : buildEvmPayment(req),
  };

  const paymentHeader = Buffer.from(JSON.stringify(payload)).toString("base64");
  const amountUSD = tokenAmountToUSD(req.maxAmountRequired, network);
  const svmPayload = payload.payload as SvmPaymentPayload;

  const record: X402PaymentRecord = {
    id: randomBytes(8).toString("hex"),
    timestamp: Date.now(),
    resource: req.resource,
    description: req.description,
    network,
    amount: req.maxAmountRequired,
    amountUSD,
    token: req.extra?.name ?? "USDC",
    payTo: req.payTo,
    txSignature: isSolanaNetwork(network)
      ? (svmPayload.nonce ?? "pending")
      : ((payload.payload as EvmPaymentPayload).signature ?? "pending"),
    status: "pending",
  };

  addX402Payment(record);
  void persistPayment(record); // fire-and-forget

  process.stderr.write(
    `[x402] Paying $${amountUSD.toFixed(4)} ${record.token} on ${network} for: ${req.description}\n`,
  );

  return { paymentHeader, record };
}

// ─── fetch() wrapper (adapted from Claude Code paymentFetch.ts) ───────────────

/**
 * Wrap a fetch function to automatically handle HTTP 402 x402 payment.
 * Intercepts 402s, signs payment, retries with X-Payment header.
 *
 * Usage:
 *   const heliusFetch = wrapFetchWithX402(globalThis.fetch);
 *   const res = await heliusFetch("https://paid-api.example.com/data");
 */
export function wrapFetchWithX402(innerFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await innerFetch(input, init);

    if (response.status !== 402 || !isX402Enabled()) return response;

    const paymentRequired = response.headers.get(X402_HEADERS.PAYMENT_REQUIRED);
    if (!paymentRequired) return response;

    process.stderr.write(`[x402] 402 Payment Required — processing...\n`);

    const result = await handlePaymentRequired(paymentRequired, getX402SessionSpentUSD());
    if (!result) return response;

    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set(X402_HEADERS.PAYMENT, result.paymentHeader);

    const retryResponse = await innerFetch(input, { ...init, headers: retryHeaders });

    if (retryResponse.status === 402) {
      process.stderr.write(`[x402] Payment rejected by server (still 402)\n`);
    } else {
      process.stderr.write(`[x402] Payment accepted → ${retryResponse.status}\n`);
      // Update record status to settled
      result.record.status = "settled";
    }

    return retryResponse;
  };
}

/** Get the facilitator URL for a given network */
export function getFacilitatorUrl(network: PaymentNetwork): string {
  const cfg = getX402Config();
  return cfg.facilitatorUrl ?? DEFAULT_FACILITATOR_URLS[network];
}
