use anchor_lang::prelude::*;

#[event]
pub struct PoolInitialized {
    pub pool: Pubkey,
    pub admin: Pubkey,
    pub clawd_mint: Pubkey,
    pub clawd_emission_per_second: u64,
}

#[event]
pub struct PoolUpdated {
    pub pool: Pubkey,
    pub clawd_emission_per_second: u64,
    pub paused: bool,
}

#[event]
pub struct AgentStaked {
    pub pool: Pubkey,
    pub position: Pubkey,
    pub owner: Pubkey,
    pub agent_asset: Pubkey,
    pub tier: u8,
    pub lock_kind: u8,
    pub weight: u64,
    pub unlock_ts: i64,
}

#[event]
pub struct AgentUnstaked {
    pub pool: Pubkey,
    pub position: Pubkey,
    pub owner: Pubkey,
    pub agent_asset: Pubkey,
    pub clawd_paid: u64,
    pub sol_paid: u64,
}

#[event]
pub struct RewardsClaimed {
    pub pool: Pubkey,
    pub position: Pubkey,
    pub owner: Pubkey,
    pub clawd_paid: u64,
    pub sol_paid: u64,
}

#[event]
pub struct GachaFeesDeposited {
    pub pool: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
}
