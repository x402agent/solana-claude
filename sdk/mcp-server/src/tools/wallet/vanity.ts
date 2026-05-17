import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";
import { PrefixSchema, SuffixSchema } from "../../utils/validation.js";
import type { ServerState, ToolResult } from "../../types.js";

const VanitySchema = z
  .object({
    prefix: PrefixSchema.optional(),
    suffix: SuffixSchema.optional(),
    caseInsensitive: z.boolean().default(false),
    timeout: z.number().min(1).max(300).default(60),
    saveId: z.string().optional(),
  })
  .refine((d) => d.prefix || d.suffix, {
    message: "At least one of prefix or suffix must be specified",
  });

export async function generateVanity(
  args: Record<string, unknown>,
  state: ServerState,
): Promise<ToolResult> {
  const parsed = VanitySchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { prefix, suffix, caseInsensitive, timeout, saveId } = parsed.data;

  const startTime = Date.now();
  const timeoutMs = timeout * 1000;
  let attempts = 0;

  const matchPrefix = prefix
    ? caseInsensitive ? prefix.toLowerCase() : prefix
    : null;
  const matchSuffix = suffix
    ? caseInsensitive ? suffix.toLowerCase() : suffix
    : null;

  while (Date.now() - startTime < timeoutMs) {
    attempts++;
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const check = caseInsensitive ? address.toLowerCase() : address;

    const prefixOk = !matchPrefix || check.startsWith(matchPrefix);
    const suffixOk = !matchSuffix || check.endsWith(matchSuffix);

    if (prefixOk && suffixOk) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const secretKeyBase58 = bs58.encode(keypair.secretKey);

      if (saveId) {
        state.generatedKeypairs.set(saveId, {
          publicKey: address,
          secretKey: keypair.secretKey.slice(),
        });
      }

      const pattern = [
        prefix ? `prefix "${prefix}"` : null,
        suffix ? `suffix "${suffix}"` : null,
      ]
        .filter(Boolean)
        .join(" and ");

      return {
        content: [
          {
            type: "text",
            text: [
              `✅ Found vanity address with ${pattern}!`,
              "",
              `Public Key: ${address}`,
              "",
              `Secret Key (Base58): ${secretKeyBase58}`,
              "",
              `Attempts: ${attempts.toLocaleString()}`,
              `Time: ${elapsed}s`,
              `Rate: ${Math.round(attempts / parseFloat(elapsed)).toLocaleString()} keys/sec`,
              "",
              "⚠️ SECURITY WARNING: Store the secret key securely and NEVER share it.",
            ].join("\n"),
          },
        ],
      };
    }

    // Yield control periodically
    if (attempts % 10000 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  return {
    content: [
      {
        type: "text",
        text: [
          `⏱️ Timeout after ${elapsed}s (${attempts.toLocaleString()} attempts)`,
          "",
          "Pattern not found. Try:",
          "- A shorter prefix/suffix",
          "- Case-insensitive matching",
          "- A longer timeout",
          "- The Rust vanity generator for 10x speed",
        ].join("\n"),
      },
    ],
  };
}
