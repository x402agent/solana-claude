use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod instructions;
pub mod state;
use constant::*;
use error::*;
use instructions::*;
use state::*;

declare_id!("7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ");

#[program]
pub mod mpl_corenft_staking {
    use super::*;

    /// Initialize the global staking pool with an admin authority.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::initialize_handler(ctx)
    }

    /// Register a Core asset as staked.
    pub fn stake_agent(ctx: Context<StakeAgent>) -> Result<()> {
        stake_agent::stake_agent_handler(ctx)
    }

    /// Remove a Core asset from the staking registry.
    pub fn unstake_agent(ctx: Context<UnstakeAgent>) -> Result<()> {
        unstake_agent::unstake_agent_handler(ctx)
    }
}
