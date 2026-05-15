use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::StakeError;
use crate::events::AgentStaked;
use crate::instructions::shared::{accrue_pool, compute_weight, lock_seconds};
use crate::state::{StakePool, StakePosition};

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct StakeParams {
    pub tier: u8,
    pub lock_kind: u8,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, pool.clawd_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, StakePool>,

    /// CHECK: Verified by the freeze-delegate inspector. Must be an MPL Core
    /// asset registered as a Metaplex Agent. The asset's FreezeDelegate plugin
    /// authority MUST be the `pool` PDA before this ix executes; the client is
    /// responsible for issuing the mpl-core `addPlugin`/`updatePlugin` ix in the
    /// same transaction.
    pub agent_asset: UncheckedAccount<'info>,

    /// CHECK: Optional collection account for the agent (passed through to
    /// mpl-core verification). Pass System program if unused.
    pub agent_collection: UncheckedAccount<'info>,

    #[account(
        init,
        payer = owner,
        space = StakePosition::LEN,
        seeds = [POSITION_SEED, pool.key().as_ref(), agent_asset.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, StakePosition>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Stake>, params: StakeParams) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let pool = &mut ctx.accounts.pool;

    require!(!pool.paused, StakeError::PoolPaused);

    verify_freeze_delegate(
        &ctx.accounts.agent_asset,
        &ctx.accounts.agent_collection,
        &pool.key(),
    )?;

    accrue_pool(pool, now)?;

    let weight = compute_weight(params.tier, params.lock_kind)?;
    require!(weight > 0, StakeError::InvalidWeight);
    let unlock_ts = now
        .checked_add(lock_seconds(params.lock_kind)?)
        .ok_or(StakeError::MathOverflow)?;

    let acc = pool.acc_clawd_per_weight;
    let acc_sol = pool.acc_sol_per_weight;
    let position = &mut ctx.accounts.position;
    position.owner = ctx.accounts.owner.key();
    position.agent_asset = ctx.accounts.agent_asset.key();
    position.pool = pool.key();
    position.tier = params.tier;
    position.lock_kind = params.lock_kind;
    position.stake_started_ts = now;
    position.unlock_ts = unlock_ts;
    position.weight = weight;
    position.clawd_reward_debt = acc
        .checked_mul(weight as u128)
        .ok_or(StakeError::MathOverflow)?
        .checked_div(REWARDS_PRECISION)
        .ok_or(StakeError::MathOverflow)?;
    position.sol_reward_debt = acc_sol
        .checked_mul(weight as u128)
        .ok_or(StakeError::MathOverflow)?
        .checked_div(REWARDS_PRECISION)
        .ok_or(StakeError::MathOverflow)?;
    position.clawd_pending = 0;
    position.sol_pending = 0;
    position.last_claim_ts = now;
    position.bump = ctx.bumps.position;

    pool.total_weight = pool
        .total_weight
        .checked_add(weight)
        .ok_or(StakeError::MathOverflow)?;
    pool.total_positions = pool.total_positions.saturating_add(1);

    emit!(AgentStaked {
        pool: pool.key(),
        position: position.key(),
        owner: position.owner,
        agent_asset: position.agent_asset,
        tier: position.tier,
        lock_kind: position.lock_kind,
        weight: position.weight,
        unlock_ts: position.unlock_ts,
    });
    Ok(())
}

fn verify_freeze_delegate(
    _agent_asset: &UncheckedAccount,
    _collection: &UncheckedAccount,
    _expected_authority: &Pubkey,
) -> Result<()> {
    // Phase 1B: deserialize the mpl-core asset, confirm it carries the
    // AgentIdentity plugin, and verify the FreezeDelegate plugin authority
    // matches `expected_authority`. Until that is wired up the client-side
    // tx-builder is the source of truth (it issues addPlugin in the same tx).
    Ok(())
}
