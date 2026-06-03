use crate::*;

#[derive(Accounts)]
pub struct UnstakeAgent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_POOL_SEED],
        bump = global_pool.bump
    )]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(
        mut,
        seeds = [STAKE_RECORD_SEED, stake_record.asset.as_ref()],
        bump = stake_record.bump,
        close = authority
    )]
    pub stake_record: Account<'info, StakeRecord>,
}

pub fn unstake_agent_handler(ctx: Context<UnstakeAgent>) -> Result<()> {
    let global_pool = &mut ctx.accounts.global_pool;
    let stake_record = &ctx.accounts.stake_record;
    let authority = ctx.accounts.authority.key();

    require!(
        authority == stake_record.owner || authority == global_pool.admin,
        StakingError::Unauthorized
    );

    global_pool.total_staked = global_pool
        .total_staked
        .checked_sub(1)
        .ok_or(StakingError::CounterUnderflow)?;

    Ok(())
}
