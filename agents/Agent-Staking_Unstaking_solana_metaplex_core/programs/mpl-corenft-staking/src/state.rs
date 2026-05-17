use anchor_lang::prelude::*;

#[account]
pub struct GlobalPool {
    /// Program admin — only key allowed to perform emergency unstakes.
    pub admin: Pubkey,
    /// Total OpenClawd agent NFTs currently staked across all owners.
    pub total_agents_staked: u64,
    /// Reserved space for future fields (reward distribution, tier boosts, etc.).
    /// Layout-stable: do not reorder above this field across upgrades.
    pub reserved: u128,
}

impl Default for GlobalPool {
    #[inline]
    fn default() -> GlobalPool {
        GlobalPool {
            admin: Pubkey::default(),
            total_agents_staked: 0,
            reserved: 0,
        }
    }
}

impl GlobalPool {
    pub const DATA_SIZE: usize = 8 + std::mem::size_of::<GlobalPool>();
}
