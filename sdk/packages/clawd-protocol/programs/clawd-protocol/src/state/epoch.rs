use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct EpochRecord {
    pub vault: Pubkey,
    pub epoch_number: u64,
    pub last_epoch_start_slot: u64,
    pub total_epoch_burns: u64,
    pub last_activity_score: u32,
    pub bump: u8,
}

impl EpochRecord {
    pub const SEED: &'static [u8] = b"epoch";
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 4 + 1;

    /// Compute agent activity score [0, 10000].
    /// Weights: tasks 40%, revenue 40%, uptime 20%.
    pub fn compute_activity_score(
        tasks_completed: u32,
        max_expected_tasks: u32,
        revenue_lamports: u64,
        max_expected_revenue: u64,
        uptime_bps: u16,
    ) -> u32 {
        let task_score = ((tasks_completed.min(max_expected_tasks) as u64) * 10_000
            / max_expected_tasks.max(1) as u64) as u32;

        let revenue_score = ((revenue_lamports.min(max_expected_revenue) as u128) * 10_000
            / max_expected_revenue.max(1) as u128) as u32;

        let uptime_score = uptime_bps.min(10_000) as u32;

        (task_score * 40 + revenue_score * 40 + uptime_score * 20) / 100
    }

    /// Compute the epoch burn from activity score and vault config.
    /// burn = inflation_reserve * (activity_score / 10000) * epoch_burn_rate_bps / 10000
    pub fn compute_epoch_burn(
        inflation_reserve: u64,
        activity_score: u32,
        epoch_burn_rate_bps: u16,
    ) -> u64 {
        (inflation_reserve as u128
            * activity_score as u128
            * epoch_burn_rate_bps as u128
            / 100_000_000) as u64
    }
}
