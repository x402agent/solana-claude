use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct EntropyState {
    pub vault: Pubkey,
    pub last_burn_slot: u64,
    pub total_entropy_burns: u64,
    pub total_entropy_burned_tokens: u64,
    pub peak_volatility_accumulator: u32,
    pub bump: u8,
}

impl EntropyState {
    pub const SEED: &'static [u8] = b"entropy";
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 4 + 1;

    /// Compute the burn amount from excess volatility.
    /// burn = reserve * max(0, accumulator - threshold) * sensitivity_bps / 10000
    /// Capped at MAX_ENTROPY_BURN_BPS (5%) of reserve per trigger.
    pub fn compute_burn(
        inflation_reserve: u64,
        volatility_accumulator: u32,
        entropy_threshold: u32,
        sensitivity_bps: u32,
    ) -> u64 {
        if volatility_accumulator <= entropy_threshold {
            return 0;
        }
        let excess = volatility_accumulator - entropy_threshold;
        // burn_bps = excess * sensitivity_bps / 10000, capped at 500 bps (5%)
        let raw_bps = (excess as u64).saturating_mul(sensitivity_bps as u64) / 10_000;
        let burn_bps = raw_bps.min(500); // MAX_ENTROPY_BURN_BPS = 500
        (inflation_reserve as u128 * burn_bps as u128 / 10_000) as u64
    }
}

/// DBC VirtualPool layout offset for volatility_accumulator.
/// The volatility_accumulator is a u32 within the VolatilityTracker struct.
/// We read it from the DBC pool account directly without deserialization.
pub const DBC_VOLATILITY_ACCUMULATOR_OFFSET: usize =
    8 + // discriminator
    32 + // config
    32 + // creator
    32 + // base_mint
    32 + // base_vault
    32 + // quote_vault
    8 + // base_reserve
    8 + // quote_reserve
    16 + // sqrt_price (u128)
    8 + // activation_point
    1 + // pool_type
    // protocol fees
    8 + 8 + 8 + 8 + 8 + 8 +
    // metrics (PoolMetrics: 4 x u64)
    32 +
    // volatility_tracker starts here
    // VolatilityTracker { volatility_accumulator: u32, ... }
    0; // volatility_accumulator is the first field

pub fn read_volatility_accumulator(dbc_pool_data: &[u8]) -> Option<u32> {
    let offset = DBC_VOLATILITY_ACCUMULATOR_OFFSET;
    if dbc_pool_data.len() < offset + 4 { return None; }
    Some(u32::from_le_bytes(
        dbc_pool_data[offset..offset + 4].try_into().ok()?
    ))
}
