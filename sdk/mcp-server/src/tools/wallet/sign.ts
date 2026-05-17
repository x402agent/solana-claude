import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { z } from "zod";
import type { ServerState, ToolResult } from "../../types.js";

const SignSchema = z
  .object({
    message: z.string().min(1, "Message cannot be empty"),
    keypairId: z.string().optional(),
    privateKey: z.string().optional(),
  })
  .refine((d) => d.keypairId || d.privateKey, {
    message: "Either keypairId or privateKey must be provided",
  });

export async function signMessage(
  args: Record<string, unknown>,
  state: ServerState,
): Promise<ToolResult> {
  const parsed = SignSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { message, keypairId, privateKey } = parsed.data;

  let secretKey: Uint8Array;
  let publicKeyStr: string;

  try {
    if (keypairId) {
      const stored = state.generatedKeypairs.get(keypairId);
      if (!stored) {
        return {
          content: [
            {
              type: "text",
              text: `Keypair "${keypairId}" not found. Generate one first or provide a privateKey.`,
            },
          ],
          isError: true,
        };
      }
      secretKey = stored.secretKey;
      publicKeyStr = stored.publicKey;
    } else if (privateKey) {
      const decoded = bs58.decode(privateKey);
      if (decoded.length !== 64) {
        return {
          content: [
            { type: "text", text: "Invalid private key length. Expected 64 bytes (Base58 encoded)." },
          ],
          isError: true,
        };
      }
      secretKey = decoded;
      publicKeyStr = Keypair.fromSecretKey(secretKey).publicKey.toBase58();
    } else {
      return {
        content: [{ type: "text", text: "No keypair provided" }],
        isError: true,
      };
    }

    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, secretKey);
    const signatureBase58 = bs58.encode(signature);

    return {
      content: [
        {
          type: "text",
          text: [
            "✅ Message signed successfully!",
            "",
            `Public Key: ${publicKeyStr}`,
            `Message: "${message}"`,
            `Signature (Base58): ${signatureBase58}`,
            "",
            "To verify, use the verify_signature tool with:",
            `- message: "${message}"`,
            `- signature: "${signatureBase58}"`,
            `- publicKey: "${publicKeyStr}"`,
          ].join("\n"),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        { type: "text", text: `Signing failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      ],
      isError: true,
    };
  }
}
