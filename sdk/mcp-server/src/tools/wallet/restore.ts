import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";
import type { ServerState, ToolResult } from "../../types.js";

const RestoreSchema = z
  .object({
    seedPhrase: z.string().optional(),
    privateKey: z.string().optional(),
    saveId: z.string().optional(),
  })
  .refine((d) => d.seedPhrase || d.privateKey, {
    message: "Either seedPhrase or privateKey must be provided",
  });

export async function restoreKeypair(
  args: Record<string, unknown>,
  state: ServerState,
): Promise<ToolResult> {
  const parsed = RestoreSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { seedPhrase, privateKey, saveId } = parsed.data;

  try {
    if (privateKey) {
      const decoded = bs58.decode(privateKey);
      if (decoded.length !== 64) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid private key: Expected 64 bytes, got ${decoded.length}`,
            },
          ],
          isError: true,
        };
      }

      const keypair = Keypair.fromSecretKey(decoded);
      const publicKey = keypair.publicKey.toBase58();

      if (saveId) {
        state.generatedKeypairs.set(saveId, {
          publicKey,
          secretKey: keypair.secretKey.slice(),
        });
      }

      return {
        content: [
          {
            type: "text",
            text: [
              "✅ Keypair restored successfully!",
              "",
              `Public Key: ${publicKey}`,
              "",
              saveId
                ? `Saved as "${saveId}" for later use.`
                : "Use saveId parameter to save for later reference.",
              "",
              "⚠️ The private key was verified but is not displayed for security.",
            ].join("\n"),
          },
        ],
      };
    }

    if (seedPhrase) {
      return {
        content: [
          {
            type: "text",
            text: [
              "⚠️ Seed phrase recovery is not supported in this MCP server.",
              "",
              "For security reasons, seed phrase recovery should be done using the official Solana CLI:",
              "",
              "```bash",
              "solana-keygen recover -o wallet.json",
              "```",
              "",
              "Or provide the Base58-encoded private key directly.",
            ].join("\n"),
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: "No recovery method provided" }],
      isError: true,
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Restoration failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
