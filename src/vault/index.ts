/**
 * src/vault/index.ts — Solana-native encrypted vault exports
 */
export {
  SolanaVault,
  storeKeypair,
  retrieveKeypair,
  storeApiKey,
  retrieveApiKey,
} from "./vault-manager.js";

export type {
  VaultEntry,
  VaultEntryInfo,
  VaultEntryType,
} from "./vault-manager.js";
