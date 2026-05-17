import type { Idl } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "./constant";

export const OPENCLAWD_AGENT_STAKING_IDL: Idl = {
  address: PROGRAM_ID.toBase58(),
  metadata: {
    name: "openclawdAgentStaking",
    version: "0.1.0",
    spec: "0.1.0",
    description:
      "OpenClawd agent staking and unstaking protocol for Metaplex Core assets on Solana.",
  },
  instructions: [
    {
      name: "initialize",
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        { name: "admin", writable: true, signer: true },
        { name: "globalPool", writable: true },
        { name: "systemProgram" },
      ],
      args: [],
    },
    {
      name: "stakeAgent",
      discriminator: [57, 152, 69, 17, 172, 229, 29, 105],
      accounts: [
        { name: "owner" },
        { name: "user", writable: true, signer: true },
        { name: "globalPool", writable: true },
        { name: "asset", writable: true },
        { name: "collection", writable: true },
        { name: "coreProgram" },
        { name: "systemProgram" },
      ],
      args: [],
    },
    {
      name: "unstakeAgent",
      discriminator: [233, 246, 239, 66, 94, 179, 65, 38],
      accounts: [
        { name: "owner" },
        { name: "user", writable: true, signer: true },
        { name: "globalPool", writable: true },
        { name: "asset", writable: true },
        { name: "collection", writable: true },
        { name: "coreProgram" },
        { name: "systemProgram" },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "globalPool",
      discriminator: [162, 244, 124, 37, 148, 94, 28, 50],
    },
  ],
  types: [
    {
      name: "globalPool",
      type: {
        kind: "struct",
        fields: [
          { name: "admin", type: "pubkey" },
          { name: "totalAgentsStaked", type: "u64" },
          { name: "reserved", type: "u128" },
        ],
      },
    },
  ],
};
