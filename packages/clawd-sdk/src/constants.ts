import { PublicKey } from "@solana/web3.js";

// ─── Program IDs ─────────────────────────────────────────────────────────────

export const CLAWD_PROTOCOL_PROGRAM_ID = new PublicKey(
  "CLAWDpRoToCoLv1pRoGRaM111111111111111111111"
);

export const DBC_PROGRAM_ID = new PublicKey(
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN"
);

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bN"
);

// ─── PDA Seeds ────────────────────────────────────────────────────────────────

export const VAULT_SEED = Buffer.from("vault");
export const LOCK_SEED = Buffer.from("lock");
export const CONVICTION_SEED = Buffer.from("convic");
export const MILESTONE_SEED = Buffer.from("milestone");
export const AGENT_SEED = Buffer.from("agent");
export const SENTIMENT_SEED = Buffer.from("senti");
export const ENTROPY_SEED = Buffer.from("entropy");
export const BEHAVIOR_SEED = Buffer.from("behav");
export const EPOCH_SEED = Buffer.from("epoch");
export const VAULT_AUTH_SEED = Buffer.from("vault_auth");
export const EXTRA_METAS_SEED = Buffer.from("extra-account-metas");

// ─── Curve Math Constants ─────────────────────────────────────────────────────

export const Q64 = BigInt("18446744073709551616"); // 2^64

export const MIN_SQRT_PRICE = BigInt("4295048016");
export const MAX_SQRT_PRICE = BigInt("79226673521066979257578248091");

export const FEE_DENOMINATOR = 1_000_000_000n;
export const BPS_DENOMINATOR = 10_000n;

export const MIN_FEE_BPS = 25; // 0.25%
export const MAX_FEE_BPS = 9_900; // 99%

// ─── Vault Constants ──────────────────────────────────────────────────────────

/** Max basis points a single entropy burn can consume from inflation_reserve */
export const MAX_ENTROPY_BURN_BPS = 500; // 5% per trigger

/** Wallet behavior score threshold above which behavioral burns apply (0-10000) */
export const BOT_THRESHOLD_SCORE = 7_500;

/** Fraction of rewards burned from bot-flagged wallet (bps) */
export const BOT_REWARD_PENALTY_BPS = 2_500; // 25% of pending rewards

/** Early conviction exit burn fraction (bps of principal) */
export const CONVICTION_EARLY_EXIT_BURN_BPS = 2_000; // 20%

/** Max milestones per milestone lock */
export const MAX_MILESTONES = 8;

/** Max consecutive epochs bonus multiplier cap (10x) */
export const MAX_CONSISTENCY_MULTIPLIER = 10_000; // 10.0x in bps

/** Minimum lock duration for conviction stake (slots) — ~1 day at 400ms/slot */
export const MIN_CONVICTION_LOCK_SLOTS = 216_000n;

// ─── Sentiment Engine Constants ───────────────────────────────────────────────

/** Sentiment score range: [-SENTIMENT_SCALE, +SENTIMENT_SCALE] */
export const SENTIMENT_SCALE = 1_000_000_000n;

/** EMA smoothing factor for sentiment (alpha = 1 - SENTIMENT_EMA_DECAY/10000) */
export const SENTIMENT_EMA_DECAY = 8_000; // alpha ≈ 0.2 (fast-decaying)

/** Slots between sentiment updates (minimum) */
export const MIN_SENTIMENT_UPDATE_INTERVAL = 100;

// ─── Agent Constants ──────────────────────────────────────────────────────────

/** Agent capability flags (bitmask stored in AgentBinding.capabilities) */
export const AgentCapability = {
  TRADING: 0x01n,
  SPAWNING: 0x02n,
  PAYMENTS: 0x04n,
  RESEARCH: 0x08n,
  GOVERNANCE: 0x10n,
  BURN_TRIGGER: 0x20n, // Can call agent_epoch_burn
} as const;

/** Default epoch duration (24h at ~400ms/slot) */
export const DEFAULT_EPOCH_DURATION_SLOTS = 216_000n;

/** Max activity score for full-rate epoch burn */
export const MAX_ACTIVITY_SCORE = 10_000;

// ─── Well-known Mints ─────────────────────────────────────────────────────────

export const NATIVE_SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

export const CLAWD_MINT_MAINNET = new PublicKey(
  "CLAWDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
);
