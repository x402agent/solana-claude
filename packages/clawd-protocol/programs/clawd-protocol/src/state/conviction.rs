use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct ConvictionPosition {
    pub staker: Pubkey,
    pub vault: Pubkey,
    pub staked_amount: u64,
    pub lock_duration_slots: u64,
    pub staked_at_slot: u64,
    pub unlock_slot: u64,
    /// conviction_score = amount * duration_epochs * consistency_multiplier
    pub conviction_score: u128,
    /// Incremented each epoch the position is re-locked without gap
    pub consecutive_epochs: u32,
    pub last_claim_slot: u64,
    pub total_rewards_claimed: u64,
    pub bump: u8,
}

impl ConvictionPosition {
    pub const SEED: &'static [u8] = b"convic";
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 16 + 4 + 8 + 8 + 1;

    /// Compute conviction score from position parameters.
    /// score = amount * duration_epochs * consistency_multiplier
    /// consistency_multiplier = 1.0 + min(consecutive_epochs * 0.1, 9.0)  (bps: 10000..100000)
    pub fn compute_score(&self, epoch_duration_slots: u64) -> u128 {
        let duration_epochs = self.lock_duration_slots / epoch_duration_slots.max(1);
        let consistency_bps: u128 = (10_000 + (self.consecutive_epochs as u128).min(90) * 1_000).min(100_000);
        (self.staked_amount as u128) * duration_epochs as u128 * consistency_bps / 10_000
    }

    pub fn has_matured(&self, current_slot: u64) -> bool {
        current_slot >= self.unlock_slot
    }

    /// Early exit burns 20% of principal
    pub fn early_exit_burn_amount(&self) -> u64 {
        self.staked_amount * 2_000 / 10_000
    }

    pub fn early_exit_return_amount(&self) -> u64 {
        self.staked_amount - self.early_exit_burn_amount()
    }
}
