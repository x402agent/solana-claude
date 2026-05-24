import { PAYMENT_HEADER, X402_VERSION } from "./constants.js";
import type {
  X402Challenge,
  X402PaymentPayload,
  X402PaymentRequirements,
} from "./types.js";

function toBase64(json: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(json, "utf8").toString("base64");
  // Browser fallback.
  return btoa(unescape(encodeURIComponent(json)));
}

function fromBase64(b64: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
  return decodeURIComponent(escape(atob(b64)));
}

/** Parse a 402 response body into a typed challenge. */
export function parseChallenge(body: unknown): X402Challenge {
  if (
    typeof body !== "object" ||
    body === null ||
    (body as { x402Version?: unknown }).x402Version !== X402_VERSION ||
    !Array.isArray((body as { accepts?: unknown }).accepts)
  ) {
    throw new Error("Not a valid x402 challenge body");
  }
  return body as X402Challenge;
}

export interface SelectPrefs {
  network?: X402PaymentRequirements["network"];
  asset?: string;
  maxAmount?: bigint;
}

/** Choose the cheapest acceptable requirement that matches preferences. */
export function selectRequirement(
  challenge: X402Challenge,
  prefs: SelectPrefs = {},
): X402PaymentRequirements | undefined {
  const candidates = challenge.accepts.filter((r) => {
    if (prefs.network && r.network !== prefs.network) return false;
    if (prefs.asset && r.asset !== prefs.asset) return false;
    if (prefs.maxAmount !== undefined && BigInt(r.maxAmountRequired) > prefs.maxAmount)
      return false;
    return true;
  });
  candidates.sort((a, b) =>
    BigInt(a.maxAmountRequired) < BigInt(b.maxAmountRequired) ? -1 : 1,
  );
  return candidates[0];
}

/** Encode a payment payload for the `X-PAYMENT` header. */
export function encodePaymentHeader(payload: X402PaymentPayload): string {
  return toBase64(JSON.stringify(payload));
}

/** Decode an `X-PAYMENT` header back into a payload. */
export function decodePaymentHeader(header: string): X402PaymentPayload {
  const payload = JSON.parse(fromBase64(header)) as X402PaymentPayload;
  if (payload.x402Version !== X402_VERSION) {
    throw new Error("Unsupported x402 version in payment header");
  }
  return payload;
}

/** Build the request headers carrying a payment payload. */
export function paymentHeaders(payload: X402PaymentPayload): Record<string, string> {
  return { [PAYMENT_HEADER]: encodePaymentHeader(payload) };
}

/**
 * Drive the full x402 flow against a fetch-like function: GET, and if a 402 is
 * returned, hand the selected requirement to `pay` to produce a payment payload,
 * then retry with the X-PAYMENT header.
 */
export async function fetchWithPayment(
  url: string,
  pay: (req: X402PaymentRequirements) => Promise<X402PaymentPayload>,
  options: { prefs?: SelectPrefs; fetchImpl?: typeof fetch; init?: RequestInit } = {},
): Promise<Response> {
  const doFetch = options.fetchImpl ?? fetch;
  const first = await doFetch(url, options.init);
  if (first.status !== 402) return first;

  const challenge = parseChallenge(await first.json());
  const requirement = selectRequirement(challenge, options.prefs);
  if (!requirement) throw new Error("No acceptable x402 payment requirement");

  const payload = await pay(requirement);
  return doFetch(url, {
    ...options.init,
    headers: { ...(options.init?.headers ?? {}), ...paymentHeaders(payload) },
  });
}
