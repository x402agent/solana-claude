import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import type { ServerState, ToolResult } from "../../types.js";

const ValidateSchema = z.object({
  address: z.string().min(1),
});

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

export async function validateAddress(
  args: Record<string, unknown>,
  _state: ServerState,
): Promise<ToolResult> {
  const parsed = ValidateSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { address } = parsed.data;

  if (address.length < 32 || address.length > 44) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Invalid address: Wrong length (${address.length} characters)\n\nSolana addresses are typically 32-44 characters.`,
        },
      ],
    };
  }

  if (!BASE58_REGEX.test(address)) {
    const invalidChars = [...new Set(address.split("").filter((c) => !BASE58_REGEX.test(c)))];
    return {
      content: [
        {
          type: "text",
          text: `❌ Invalid address: Contains invalid characters: ${invalidChars.join(", ")}\n\nBase58 does not include: 0, O, I, l`,
        },
      ],
    };
  }

  try {
    const pubKey = new PublicKey(address);
    const isOnCurve = PublicKey.isOnCurve(pubKey.toBytes());

    return {
      content: [
        {
          type: "text",
          text: [
            "✅ Valid Solana address!",
            "",
            `Address: ${address}`,
            `Length: ${address.length} characters`,
            `On Ed25519 curve: ${isOnCurve ? "Yes (standard keypair)" : "No (PDA or special address)"}`,
            "",
            isOnCurve
              ? "This appears to be a standard wallet address."
              : "This appears to be a Program Derived Address (PDA) or system address.",
          ].join("\n"),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Invalid address: ${err instanceof Error ? err.message : "Failed to parse as Solana public key"}`,
        },
      ],
    };
  }
}
