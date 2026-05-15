use anchor_lang::prelude::*;

#[account]
pub struct StakePool {
    pub admin: Pubkey,
    pub clawd_mint: Pubkey,
    pub reward_vault: Pubkey,
    pub sol_vault: Pubkey,
    pub clawd_emission_per_second: u64,
    pub last_update_ts: i64,
    pub acc_clawd_per_weight: u128,
    pub acc_sol_per_weight: u128,
    pub total_weight: u64,
    pub total_positions: u64,
    pub paused: bool,
    pub bump: u8,
    pub reward_vault_bump: u8,
    pub sol_vault_bump: u8,
    pub _padding: [u8; 64],
}

impl StakePool {
    pub const LEN: usize = 8
        + 32 * 4
        + 8 * 5
        + 16 * 2
        + 1 * 4
        + 64;
}

#[account]
pub struct StakePosition {
    pub owner: Pubkey,
    pub agent_asset: Pubkey,
    pub pool: Pubkey,
    pub tier: u8,
    pub lock_kind: u8,
    pub stake_started_ts: i64,
    pub unlock_ts: i64,
    pub weight: u64,
    pub clawd_reward_debt: u128,
    pub sol_reward_debt: u128,
    pub clawd_pending: u64,
    pub sol_pending: u64,
    pub last_claim_ts: i64,
    pub bump: u8,
    pub _padding: [u8; 32],
}

impl StakePosition {
    pub const LEN: usize = 8
        + 32 * 3
        + 1 * 2
        + 8 * 4
        + 16 * 2
        + 8 * 2
        + 1
        + 32;
}
