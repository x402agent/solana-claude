use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MilestoneType {
    HolderCount,
    MarketCapQuote,
    CumulativeVolume,
    GraduationAchieved,
    AgentTasksCompleted,
}

impl Default for MilestoneType {
    fn default() -> Self { MilestoneType::HolderCount }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct MilestoneCondition {
    pub milestone_type: MilestoneType,
    pub threshold: u64,
    /// Basis points of total_locked_amount that unlocks when this milestone hits
    pub unlock_bps: u16,
    pub achieved: bool,
}

impl MilestoneCondition {
    pub const LEN: usize = 1 + 8 + 2 + 1;
}

#[account]
pub struct MilestoneLock {
    pub vault: Pubkey,
    pub creator: Pubkey,
    pub total_locked_amount: u64,
    pub total_unlocked_amount: u64,
    pub milestones: Vec<MilestoneCondition>,
    pub bump: u8,
}

impl MilestoneLock {
    pub const SEED: &'static [u8] = b"milestone";
    pub const MAX_MILESTONES: usize = 8;
    pub const LEN: usize =
        8 + 32 + 32 + 8 + 8 + 4 + Self::MAX_MILESTONES * MilestoneCondition::LEN + 1;

    /// Compute the unlock amount for a newly-achieved milestone
    pub fn unlock_amount(&self, milestone_index: usize) -> u64 {
        let m = &self.milestones[milestone_index];
        (self.total_locked_amount as u128 * m.unlock_bps as u128 / 10_000) as u64
    }

    pub fn remaining_locked(&self) -> u64 {
        self.total_locked_amount.saturating_sub(self.total_unlocked_amount)
    }
}
