import { PublicKey } from "@solana/web3.js";

export const GLOBAL_AUTHORITY_SEED = "global-authority";

export const PROGRAM_ID = new PublicKey(
  process.env.OPENCLAWD_AGENT_STAKING_PROGRAM_ID ??
    "D5MLxrKAnppBVLuukKQzQGTMSfEwBqWCDPGAhGhthdLP"
);

export const CORE_COLLECTION_ADDRESS = new PublicKey(
  process.env.OPENCLAWD_AGENT_COLLECTION ?? "11111111111111111111111111111111"
);

export const DEFAULT_DEVNET_RPC =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
