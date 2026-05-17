import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { z } from "zod";
import { SolanaAddressSchema } from "../../utils/validation.js";
import type { ServerState, ToolResult } from "../../types.js";

const VerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  publicKey: SolanaAddressSchema,
});

export async function verifySignature(
  args: Record<string, unknown>,
  _state: ServerState,
): Promise<ToolResult> {
  const parsed = VerifySchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { message, signature, publicKey } = parsed.data;

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const pubKeyBytes = new PublicKey(publicKey).toBytes();

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, pubKeyBytes);

    if (isValid) {
      return {
        content: [
          {
            type: "text",
            text: [
              "✅ Signature is VALID!",
              "",
              `Public Key: ${publicKey}`,
              `Message: "${message}"`,
              `Signature: ${signature.substring(0, 20)}...`,
            ].join("\n"),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "❌ Signature is INVALID!",
            "",
            "The signature does not match the message and public key.",
            "",
            "Possible causes:",
            "- Wrong public key",
            "- Message was modified",
            "- Signature is corrupted",
          ].join("\n"),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
