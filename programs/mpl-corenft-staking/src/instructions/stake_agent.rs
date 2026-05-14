use crate::*;

#[derive(Accounts)]
pub struct StakeAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_POOL_SEED],
        bump = global_pool.bump
    )]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(
        init,
        payer = owner,
        space = 8 + StakeRecord::INIT_SPACE,
        seeds = [STAKE_RECORD_SEED, asset.key().as_ref()],
        bump
    )]
    pub stake_record: Account<'info, StakeRecord>,

    /// CHECK: This cheap staking registry stores the asset public key only.
    pub asset: UncheckedAccount<'info>,

    /// CHECK: This cheap staking registry stores the collection public key only.
    pub collection: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn stake_agent_handler(ctx: Context<StakeAgent>) -> Result<()> {
    let global_pool = &mut ctx.accounts.global_pool;
    let stake_record = &mut ctx.accounts.stake_record;

    stake_record.owner = ctx.accounts.owner.key();
    stake_record.asset = ctx.accounts.asset.key();
    stake_record.collection = ctx.accounts.collection.key();
    stake_record.staked_at = Clock::get()?.unix_timestamp;
    stake_record.bump = ctx.bumps.stake_record;

    global_pool.total_staked = global_pool
        .total_staked
        .checked_add(1)
        .ok_or(StakingError::CounterOverflow)?;

    Ok(())
}
