use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Vault {
    pub base_mint: Pubkey,
    pub dbc_pool: Pubkey,
    pub agent_binding: Option<Pubkey>,
    pub vault_token_account: Pubkey,
    pub fee_reserve_account: Pubkey,

    /// Tokens allocated to inflation reserve for burns
    pub inflation_reserve_amount: u64,
    pub total_locked: u64,
    pub total_conviction_score: u128,
    pub total_burned: u64,
    pub total_fees_collected: u64,

    /// All-time-high sqrt_price (Q64.64) — used for anti-gravity floor
    pub ath_quote_sqrt_price: u128,

    // Entropy burn config
    pub entropy_threshold: u32,
    pub entropy_sensitivity_bps: u32,

    // Anti-gravity config
    pub anti_gravity_floor_bps: u16,
    pub anti_gravity_max_strength_bps: u16,

    // pToken transfer fee
    pub transfer_fee_bps: u16,

    // Agent epoch burn config
    pub epoch_duration_slots: u64,
    pub epoch_burn_rate_bps: u16,

    pub bump: u8,
}

impl Vault {
    pub const SEED: &'static [u8] = b"vault";
    pub const LEN: usize = 8 + // discriminator
        32 + // base_mint
        32 + // dbc_pool
        1 + 32 + // Option<agent_binding>
        32 + // vault_token_account
        32 + // fee_reserve_account
        8 + // inflation_reserve_amount
        8 + // total_locked
        16 + // total_conviction_score
        8 + // total_burned
        8 + // total_fees_collected
        16 + // ath_quote_sqrt_price
        4 + // entropy_threshold
        4 + // entropy_sensitivity_bps
        2 + // anti_gravity_floor_bps
        2 + // anti_gravity_max_strength_bps
        2 + // transfer_fee_bps
        8 + // epoch_duration_slots
        2 + // epoch_burn_rate_bps
        1; // bump

    /// Update ATH if current price is higher
    pub fn update_ath(&mut self, current_sqrt_price: u128) {
        if current_sqrt_price > self.ath_quote_sqrt_price {
            self.ath_quote_sqrt_price = current_sqrt_price;
        }
    }

    /// Calculate the anti-gravity floor sqrt_price
    pub fn floor_sqrt_price(&self) -> u128 {
        (self.ath_quote_sqrt_price * self.anti_gravity_floor_bps as u128) / 10_000
    }
}

/// Lock type determines unlock conditions and burn behaviour
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LockType {
    TimeLock,
    MilestoneLock,
    HybridLock,
    ConvictionLock,
}

impl Default for LockType {
    fn default() -> Self { LockType::TimeLock }
}

#[account]
#[derive(Default)]
pub struct LockPosition {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub locked_amount: u64,
    pub lock_type: LockType,
    pub locked_at_slot: u64,
    pub unlock_slot: Option<u64>,
    pub milestone_index: Option<u8>,
    pub is_unlocked: bool,
    pub bump: u8,
}

impl LockPosition {
    pub const SEED: &'static [u8] = b"lock";
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 9 + 2 + 1 + 1;
}
