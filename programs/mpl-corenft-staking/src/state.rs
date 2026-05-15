use anchor_lang::prelude::*;

#[account]
pub struct GlobalPool {
    pub admin: Pubkey,
    pub total_staked: u64,
    pub bump: u8,
}

impl GlobalPool {
    pub const INIT_SPACE: usize = 32 + 8 + 1;
}

#[account]
pub struct StakeRecord {
    pub owner: Pubkey,
    pub asset: Pubkey,
    pub collection: Pubkey,
    pub staked_at: i64,
    pub bump: u8,
}

impl StakeRecord {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 8 + 1;
}
