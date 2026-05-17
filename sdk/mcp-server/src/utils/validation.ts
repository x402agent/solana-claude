import { z } from "zod";

// ── Base58 validation ──
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BASE58_CHARS_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const publicKeySchema = z
  .string()
  .regex(BASE58_REGEX, "Invalid Solana public key (base58)")
  .describe("Solana public key (base58-encoded)");

export const bnStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be a non-negative integer string")
  .describe("Amount as string (use string to preserve precision for large numbers)");

export const slippageSchema = z
  .number()
  .min(0)
  .max(100)
  .default(1)
  .describe("Slippage tolerance percentage (0-100, default 1%)");

export const shareholderSchema = z.object({
  address: publicKeySchema.describe("Shareholder wallet address"),
  shareBps: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .describe("Share in basis points (1-10000)"),
});

export const socialShareholderSchema = z.object({
  address: publicKeySchema.optional().describe("Wallet address (optional for social recipients)"),
  shareBps: z.number().int().min(1).max(10000),
  userId: z.string().optional().describe("Social platform user ID"),
  platform: z.enum(["pump", "x", "github"]).optional().describe("Social platform"),
});

export const platformSchema = z
  .enum(["pump", "x", "github"])
  .describe("Social platform identifier");

// ── Wallet tool schemas ──

export const SolanaAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .regex(BASE58_CHARS_REGEX, "Invalid Base58 characters in address");

export const PrefixSchema = z
  .string()
  .max(6, "Prefix too long (max 6 characters)")
  .regex(BASE58_CHARS_REGEX, "Prefix must contain only Base58 characters");

export const SuffixSchema = z
  .string()
  .max(6, "Suffix too long (max 6 characters)")
  .regex(BASE58_CHARS_REGEX, "Suffix must contain only Base58 characters");

export function isValidBase58(str: string): boolean {
  return BASE58_CHARS_REGEX.test(str);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[^\x20-\x7E]/g, "");
}
