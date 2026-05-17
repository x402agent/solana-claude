use anchor_lang::prelude::*;

/// Agent capability flags (bitmask)
pub mod caps {
    pub const TRADING: u64 = 0x01;
    pub const SPAWNING: u64 = 0x02;
    pub const PAYMENTS: u64 = 0x04;
    pub const RESEARCH: u64 = 0x08;
    pub const GOVERNANCE: u64 = 0x10;
    pub const BURN_TRIGGER: u64 = 0x20;
}

#[account]
#[derive(Default)]
pub struct AgentBinding {
    pub agent_pubkey: Pubkey,
    pub base_mint: Pubkey,
    pub vault: Pubkey,
    /// SHA-256 of the agent's character JSON
    pub character_hash: [u8; 32],
    /// SHA-256 of three-laws.md — immutably binds agent to the three laws
    pub constitution_hash: [u8; 32],
    /// Bitmask of agent capabilities
    pub capabilities: u64,
    pub is_active: bool,
    pub created_at_slot: u64,
    pub last_activity_slot: u64,
    pub lifetime_tasks_completed: u64,
    pub lifetime_revenue_lamports: u64,
    pub bump: u8,
}

impl AgentBinding {
    pub const SEED: &'static [u8] = b"agent";
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1;

    pub fn can_trigger_burn(&self) -> bool {
        self.capabilities & caps::BURN_TRIGGER != 0
    }
}
