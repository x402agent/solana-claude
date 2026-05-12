use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::StakeError;
use crate::events::PoolUpdated;
use crate::instructions::shared::accrue_pool;
use crate::state::StakePool;

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct UpdatePoolParams {
    pub clawd_emission_per_second: Option<u64>,
    pub paused: Option<bool>,
    pub new_admin: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct UpdatePool<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, pool.clawd_mint.as_ref()],
        bump = pool.bump,
        has_one = admin @ StakeError::Unauthorized,
    )]
    pub pool: Account<'info, StakePool>,
}

pub fn handler(ctx: Context<UpdatePool>, params: UpdatePoolParams) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let pool = &mut ctx.accounts.pool;

    accrue_pool(pool, now)?;

    if let Some(rate) = params.clawd_emission_per_second {
        pool.clawd_emission_per_second = rate;
    }
    if let Some(p) = params.paused {
        pool.paused = p;
    }
    if let Some(new_admin) = params.new_admin {
        pool.admin = new_admin;
    }

    emit!(PoolUpdated {
        pool: pool.key(),
        clawd_emission_per_second: pool.clawd_emission_per_second,
        paused: pool.paused,
    });
    Ok(())
}
