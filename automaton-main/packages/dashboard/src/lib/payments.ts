import type { BillingPack } from "../types";

export interface PaymentQuote {
  amountUsd: number;
  token: "USDC" | "CLAWD";
  rail: "pay.sh" | "clawd-commerce";
  status: "ready" | "insufficient";
  cta: string;
  helper: string;
}

export function toPaymentQuote(pack: BillingPack): PaymentQuote {
  const rail = pack.token === "USDC" ? "pay.sh" : "clawd-commerce";
  const helper =
    pack.token === "USDC"
      ? "USDC packages settle instantly over existing x402/pay.sh rails."
      : "$CLAWD packages use the CLAWD token commerce adapter and can mirror the same credit purchase flow.";

  return {
    amountUsd: pack.amountUsd,
    token: pack.token,
    rail,
    status: pack.state === "insufficient" ? "insufficient" : "ready",
    cta:
      pack.state === "insufficient"
        ? `Insufficient ${pack.token}`
        : `Buy $${pack.amountUsd} with ${pack.token}`,
    helper,
  };
}
