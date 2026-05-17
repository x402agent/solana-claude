/**
 * Agent Registry — fetch and validate AgentBinding state on-chain.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import type { AgentBinding } from "../types/index.js";
import { deriveAgentBindingPda } from "../utils/pda.js";

export async function fetchAgentBinding(
  connection: Connection,
  agentWallet: PublicKey
): Promise<AgentBinding | null> {
  const [bindingPda] = deriveAgentBindingPda(agentWallet);
  const info = await connection.getAccountInfo(bindingPda);
  if (!info) return null;

  const d = info.data.slice(8);
  let o = 0;
  const rk = () => { const pk = new PublicKey(d.slice(o, o + 32)); o += 32; return pk; };
  const r64 = () => { const v = d.readBigUInt64LE(o); o += 8; return v; };
  const r8 = () => { const v = d.readUInt8(o); o += 1; return v; };
  const rb = (len: number) => { const v = new Uint8Array(d.slice(o, o + len)); o += len; return v; };

  return {
    agentPubkey: rk(),
    baseMint: rk(),
    vault: rk(),
    characterHash: rb(32),
    constitutionHash: rb(32),
    capabilities: r64(),
    isActive: r8() === 1,
    createdAtSlot: r64(),
    lastActivitySlot: r64(),
    lifetimeTasksCompleted: r64(),
    lifetimeRevenueLamports: r64(),
  };
}

/** Verify the constitution hash matches a given three-laws content */
export function verifyConstitutionHash(
  binding: AgentBinding,
  expectedConstitutionContent: string
): boolean {
  const { createHash } = require("crypto");
  const expected = createHash("sha256")
    .update(expectedConstitutionContent, "utf8")
    .digest() as Buffer;
  return Buffer.from(binding.constitutionHash).equals(expected);
}

/** Get human-readable capability names */
export function decodeCapabilities(capabilities: bigint): string[] {
  const caps: string[] = [];
  if (capabilities & 0x01n) caps.push("trading");
  if (capabilities & 0x02n) caps.push("spawning");
  if (capabilities & 0x04n) caps.push("payments");
  if (capabilities & 0x08n) caps.push("research");
  if (capabilities & 0x10n) caps.push("governance");
  if (capabilities & 0x20n) caps.push("burn_trigger");
  return caps;
}
