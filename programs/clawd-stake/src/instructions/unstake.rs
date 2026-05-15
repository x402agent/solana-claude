use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as TokenTransfer};

use crate::constants::*;
use crate::errors::StakeError;
use crate::events::AgentUnstaked;
use crate::instructions::shared::{accrue_pool, settle_position};
use crate::state::{StakePool, StakePosition};

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, pool.clawd_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, StakePool>,

    pub clawd_mint: Account<'info, Mint>,

    #[account(
        mut,
        close = owner,
        seeds = [POSITION_SEED, pool.key().as_ref(), position.agent_asset.as_ref()],
        bump = position.bump,
        has_one = owner @ StakeError::PositionOwnerMismatch,
        has_one = pool,
    )]
    pub position: Account<'info, StakePosition>,

    #[account(
        mut,
        seeds = [REWARD_VAULT_SEED, pool.key().as_ref()],
        bump = pool.reward_vault_bump,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = clawd_mint,
        token::authority = owner,
    )]
    pub owner_clawd_ata: Account<'info, TokenAccount>,

    /// CHECK: SOL vault PDA holding pooled gacha SOL fees
    #[account(
        mut,
        seeds = [SOL_VAULT_SEED, pool.key().as_ref()],
        bump = pool.sol_vault_bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,

    /// CHECK: The agent asset whose FreezeDelegate is removed by the client
    /// in the same transaction (mpl-core revokePlugin / removeFreeze ix).
    pub agent_asset: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Unstake>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let pool = &mut ctx.accounts.pool;
    let position = &mut ctx.accounts.position;

    require!(now >= position.unlock_ts, StakeError::StillLocked);
    require_keys_eq!(position.agent_asset, ctx.accounts.agent_asset.key());

    accrue_pool(pool, now)?;
    settle_position(pool, position)?;

    let clawd_amount = position.clawd_pending;
    let sol_amount = position.sol_pending;

    if clawd_amount > 0 {
        require!(
            ctx.accounts.reward_vault.amount >= clawd_amount,
            StakeError::EmptyRewardVault
        );
        let pool_seeds: &[&[u8]] = &[
            POOL_SEED,
            pool.clawd_mint.as_ref(),
            &[pool.bump],
        ];
        let signer_seeds: &[&[&[u8]]] = &[pool_seeds];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.owner_clawd_ata.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, clawd_amount)?;
    }

    if sol_amount > 0 {
        let from = ctx.accounts.sol_vault.to_account_info();
        let to = ctx.accounts.owner.to_account_info();
        **from.try_borrow_mut_lamports()? = from
            .lamports()
            .checked_sub(sol_amount)
            .ok_or(StakeError::MathOverflow)?;
        **to.try_borrow_mut_lamports()? = to
            .lamports()
            .checked_add(sol_amount)
            .ok_or(StakeError::MathOverflow)?;
    }

    pool.total_weight = pool.total_weight.saturating_sub(position.weight);
    pool.total_positions = pool.total_positions.saturating_sub(1);

    emit!(AgentUnstaked {
        pool: pool.key(),
        position: position.key(),
        owner: position.owner,
        agent_asset: position.agent_asset,
        clawd_paid: clawd_amount,
        sol_paid: sol_amount,
    });
    Ok(())
}
