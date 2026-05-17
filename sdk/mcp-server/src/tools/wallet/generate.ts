import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";
import type { ServerState, ToolResult } from "../types.js";

const GenerateSchema = z.object({
  saveId: z.string().optional(),
});

export async function generateKeypair(
  args: Record<string, unknown>,
  state: ServerState,
): Promise<ToolResult> {
  const parsed = GenerateSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { saveId } = parsed.data;
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const secretKeyBase58 = bs58.encode(keypair.secretKey);

  if (saveId) {
    state.generatedKeypairs.set(saveId, {
      publicKey,
      secretKey: keypair.secretKey.slice(),
    });
  }

  const savedNote = saveId ? ` (saved as "${saveId}")` : "";

  return {
    content: [
      {
        type: "text",
        text: [
          `Generated keypair${savedNote}:`,
          "",
          `Public Key: ${publicKey}`,
          "",
          `Secret Key (Base58): ${secretKeyBase58}`,
          "",
          `Keypair Array (for Solana CLI):`,
          JSON.stringify(Array.from(keypair.secretKey)),
          "",
          "⚠️ SECURITY WARNING: Store the secret key securely and NEVER share it.",
        ].join("\n"),
      },
    ],
  };
}
