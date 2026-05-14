use anchor_lang::prelude::*;

declare_id!("5bp3bDnWYdjiYyB99XWWi6h8ga2wnB1TxuRUb4VNJrTn");

pub mod state;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod constants;

use instructions::*;

#[program]
pub mod clawd_stake {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        params: InitializePoolParams,
    ) -> Result<()> {
        instructions::initialize_pool::handler(ctx, params)
    }

    pub fn update_pool(
        ctx: Context<UpdatePool>,
        params: UpdatePoolParams,
    ) -> Result<()> {
        instructions::update_pool::handler(ctx, params)
    }

    pub fn stake(
        ctx: Context<Stake>,
        params: StakeParams,
    ) -> Result<()> {
        instructions::stake::handler(ctx, params)
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        instructions::unstake::handler(ctx)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::handler(ctx)
    }

    pub fn deposit_gacha_fees(
        ctx: Context<DepositGachaFees>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_gacha_fees::handler(ctx, amount)
    }
}
