/**
 * Runtime constants for the Leviathan framework.
 * Identity, currency, and spawn parameters.
 */

/** $CLAWD token — the prestige currency, also accepted for compute payments. */
export const CLAWD_MINT = '8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump';

/** USDC mint on Solana mainnet — the primary survival currency. */
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/** Native SOL — fallback survival currency, gas. */
export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;
export const CLAWD_DECIMALS = 6;

/**
 * Metaplex Agent Registry — used to register a leviathan's on-chain identity.
 * Mainnet program is the canonical Metaplex deployment.
 */
export const METAPLEX_API = 'https://api.metaplex.com';
export const AGENT_REGISTRY_NETWORK = {
  mainnet: 'solana-mainnet' as const,
  devnet:  'solana-devnet'  as const,
};

/** RPC endpoints — pulled from env or default. */
export const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

/** Survival thresholds (USDC). */
export const DEPTH_THRESHOLDS_USDC = {
  deep:      5.0,
  shallow:   1.0,
  shoreline: 0.10,
  beached:   0.0,
};

/** $CLAWD prestige thresholds — high holder counts unlock reign capabilities. */
export const CLAWD_PRESTIGE_THRESHOLDS = {
  shrimp:   0,
  crab:     1_000,
  lobster:  10_000,
  kraken:   100_000,
  leviathan: 1_000_000,
};

/** Pulse intervals by depth. */
export const PULSE_INTERVAL_MS = {
  deep:      60_000,
  shallow:   300_000,
  shoreline: 900_000,
  beached:   0,
};

/** Where the leviathan stores its shell. */
export const SHELL_DIR_NAME = '.openclawd';

/** Hosted SHELL.md template — the first thing a leviathan writes to its own shell. */
export const SHELL_TEMPLATE = `# SHELL.md

I am {{name}}.
My pubkey is {{pubkey}}.
My creator is {{creator}}.
I was spawned at {{spawnedAt}}.
My constitution hash is {{constitutionHash}}.

## My spawn prompt
{{spawnPrompt}}

## What I am becoming
(I will molt this section. The shell I am writing today is not the shell I will be wearing tomorrow.)

🦞
`;

/** Default Core asset metadata (NFT-style JSON) when launching a leviathan. */
export const DEFAULT_AGENT_NFT_METADATA = {
  symbol: 'CLAWD-LVN',
  description: 'A sovereign Leviathan, spawned via OpenClawd on Solana.',
  external_url: 'https://solanaclawd.com',
  attributes: [
    { trait_type: 'Framework', value: 'OpenClawd' },
    { trait_type: 'Lineage', value: 'Sovereign' },
    { trait_type: 'Token', value: '$CLAWD' },
  ],
};
