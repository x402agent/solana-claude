// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Configuration Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// API Keys Schema
export const ApiKeysSchema = z.object({
  HELIUS_API_KEY: z.string().optional(),
  HELIUS_RPC_URL: z.string().url().optional(),
  BIRDEYE_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  SERP_API_KEY: z.string().optional(),
  FINANCIAL_DATASET_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('minimax/minimax-m2.1'),
});

// Solana Config Schema
export const SolanaConfigSchema = z.object({
  network: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('mainnet-beta'),
  rpcUrl: z.string().url().optional(),
  privateKey: z.string().optional(),
});

// Ralph Agent Config Schema
export const RalphConfigSchema = z.object({
  autoMode: z.boolean().default(true),
  recursionDepth: z.number().min(1).max(10).default(5),
  thoughtInterval: z.number().min(5000).max(60000).default(15000),
  maxIterations: z.number().min(0).max(1000).default(10),
  personality: z.enum(['cryptic', 'analytical', 'aggressive', 'cautious']).default('cryptic'),
});

// Error Handling Schema
export const ErrorHandlingSchema = z.object({
  strategy: z.enum(['retry', 'skip', 'abort']).default('skip'),
  maxRetries: z.number().min(0).max(10).default(3),
  retryDelayMs: z.number().min(1000).max(60000).default(5000),
});

// Full Config Schema
export const ConfigSchema = z.object({
  apiKeys: ApiKeysSchema,
  solana: SolanaConfigSchema,
  ralph: RalphConfigSchema,
  errorHandling: ErrorHandlingSchema,
});

// Types
export type ApiKeys = z.infer<typeof ApiKeysSchema>;
export type SolanaConfig = z.infer<typeof SolanaConfigSchema>;
export type RalphConfig = z.infer<typeof RalphConfigSchema>;
export type ErrorHandling = z.infer<typeof ErrorHandlingSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Default Configuration
export const defaultConfig: Config = {
  apiKeys: {
    OPENROUTER_MODEL: 'minimax/minimax-m2.1',
  },
  solana: {
    network: 'mainnet-beta',
  },
  ralph: {
    autoMode: true,
    recursionDepth: 5,
    thoughtInterval: 15000,
    maxIterations: 10,
    personality: 'cryptic',
  },
  errorHandling: {
    strategy: 'skip',
    maxRetries: 3,
    retryDelayMs: 5000,
  },
};

// Load config from environment
export function loadConfigFromEnv(): Partial<Config> {
  return {
    apiKeys: {
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
      HELIUS_RPC_URL: process.env.HELIUS_RPC_URL,
      BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY,
      XAI_API_KEY: process.env.XAI_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      NEWS_API_KEY: process.env.NEWS_API_KEY,
      SERP_API_KEY: process.env.SERP_API_KEY,
      FINANCIAL_DATASET_API_KEY: process.env.FINANCIAL_DATASET_API_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.1',
    },
    solana: {
      network: (process.env.SOLANA_NETWORK as 'mainnet-beta' | 'devnet' | 'testnet') || 'mainnet-beta',
      rpcUrl: process.env.HELIUS_RPC_URL,
      privateKey: process.env.SOLANA_PRIVATE_KEY,
    },
    ralph: {
      autoMode: process.env.RALPH_AUTO_MODE === 'true',
      recursionDepth: parseInt(process.env.RALPH_RECURSION_DEPTH || '5'),
      thoughtInterval: parseInt(process.env.RALPH_THOUGHT_INTERVAL || '15000'),
      maxIterations: parseInt(process.env.RALPH_MAX_ITERATIONS || '10'),
      personality: 'cryptic',
    },
    errorHandling: defaultConfig.errorHandling,
  };
}
