use anchor_lang::prelude::*;

#[constant]
pub const POOL_SEED: &[u8] = b"clawd-stake-pool";

#[constant]
pub const POSITION_SEED: &[u8] = b"clawd-stake-position";

#[constant]
pub const REWARD_VAULT_SEED: &[u8] = b"clawd-reward-vault";

#[constant]
pub const SOL_VAULT_SEED: &[u8] = b"clawd-sol-vault";

pub const SECONDS_PER_DAY: i64 = 86_400;

pub const MULTIPLIER_PRECISION: u64 = 10_000;

pub const TIER_LEGENDARY: u8 = 0;
pub const TIER_EPIC: u8 = 1;
pub const TIER_RARE: u8 = 2;
pub const TIER_COMMON: u8 = 3;

pub const LOCK_FLEXIBLE: u8 = 0;
pub const LOCK_30_DAY: u8 = 1;
pub const LOCK_90_DAY: u8 = 2;
pub const LOCK_CULT: u8 = 3;

pub const LOCK_FLEX_SECS: i64 = 0;
pub const LOCK_30_SECS: i64 = 30 * SECONDS_PER_DAY;
pub const LOCK_90_SECS: i64 = 90 * SECONDS_PER_DAY;
pub const LOCK_CULT_SECS: i64 = 365 * SECONDS_PER_DAY;

pub const MULT_FLEXIBLE: u64 = 10_000;
pub const MULT_30_DAY: u64 = 15_000;
pub const MULT_90_DAY: u64 = 25_000;
pub const MULT_CULT: u64 = 50_000;

pub const TIER_WEIGHT_LEGENDARY: u64 = 10_000;
pub const TIER_WEIGHT_EPIC: u64 = 4_000;
pub const TIER_WEIGHT_RARE: u64 = 1_500;
pub const TIER_WEIGHT_COMMON: u64 = 1_000;

pub const REWARDS_PRECISION: u128 = 1_000_000_000_000;
