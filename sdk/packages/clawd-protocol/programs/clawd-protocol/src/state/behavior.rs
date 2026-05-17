use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct WalletBehavior {
    pub wallet: Pubkey,
    pub trade_count_last_60_slots: u32,
    pub avg_hold_slots: u64,
    /// Normalised position size as bps of total supply
    pub normalized_position_bps: u16,
    /// Computed score [0, 10000]. Higher = more bot-like.
    pub behavior_score: u32,
    pub total_rewards_burned: u64,
    pub last_updated_slot: u64,
    pub bump: u8,
}

impl WalletBehavior {
    pub const SEED: &'static [u8] = b"behav";
    pub const LEN: usize = 8 + 32 + 4 + 8 + 2 + 4 + 8 + 8 + 1;

    /// Compute bot score [0, 10000].
    /// Weights: frequency 50%, hold duration 35%, position size 15%.
    pub fn compute_score(
        trade_count: u32,
        avg_hold_slots: u64,
        position_bps: u16,
    ) -> u32 {
        // frequency score: 0 at 0 trades, 10000 at 30+ trades in 60 slots
        let freq_score = ((trade_count.min(30) as u64) * 10_000 / 30) as u32;

        // hold score: 10000 if < 3 slots avg hold, 0 if >= 200 slots
        let hold_score = if avg_hold_slots < 3 {
            10_000u32
        } else {
            (10_000u64.saturating_sub(avg_hold_slots.saturating_mul(50))) as u32
        };

        // position score: 0 at 0, 5000 at 1000 bps (10% of supply)
        let pos_score = ((position_bps.min(1000) as u32) * 5_000 / 1_000).min(5_000);

        // weighted sum
        (freq_score * 50 + hold_score * 35 + pos_score * 15) / 100
    }

    pub const BOT_THRESHOLD: u32 = 7_500;
    pub const BOT_REWARD_PENALTY_BPS: u64 = 2_500; // 25% of pending rewards

    pub fn is_bot(&self) -> bool {
        self.behavior_score >= Self::BOT_THRESHOLD
    }

    pub fn reward_burn_amount(&self, pending_rewards: u64) -> u64 {
        if self.is_bot() {
            pending_rewards * Self::BOT_REWARD_PENALTY_BPS / 10_000
        } else {
            0
        }
    }
}
