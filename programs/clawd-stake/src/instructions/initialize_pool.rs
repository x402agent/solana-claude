use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer as system_transfer, Transfer as SystemTransfer};
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

use crate::constants::*;
use crate::events::PoolInitialized;
use crate::state::StakePool;

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct InitializePoolParams {
    pub clawd_emission_per_second: u64,
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub clawd_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = StakePool::LEN,
        seeds = [POOL_SEED, clawd_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, StakePool>,

    #[account(
        init,
        payer = admin,
        seeds = [REWARD_VAULT_SEED, pool.key().as_ref()],
        bump,
        token::mint = clawd_mint,
        token::authority = pool,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA system account that holds pooled SOL fees
    #[account(
        mut,
        seeds = [SOL_VAULT_SEED, pool.key().as_ref()],
        bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializePool>, params: InitializePoolParams) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let pool = &mut ctx.accounts.pool;

    pool.admin = ctx.accounts.admin.key();
    pool.clawd_mint = ctx.accounts.clawd_mint.key();
    pool.reward_vault = ctx.accounts.reward_vault.key();
    pool.sol_vault = ctx.accounts.sol_vault.key();
    pool.clawd_emission_per_second = params.clawd_emission_per_second;
    pool.last_update_ts = now;
    pool.acc_clawd_per_weight = 0;
    pool.acc_sol_per_weight = 0;
    pool.total_weight = 0;
    pool.total_positions = 0;
    pool.paused = false;
    pool.bump = ctx.bumps.pool;
    pool.reward_vault_bump = ctx.bumps.reward_vault;
    pool.sol_vault_bump = ctx.bumps.sol_vault;

    let rent_lamports = Rent::get()?.minimum_balance(0);
    let cur = ctx.accounts.sol_vault.lamports();
    if cur < rent_lamports {
        let need = rent_lamports - cur;
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            SystemTransfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.sol_vault.to_account_info(),
            },
        );
        system_transfer(cpi_ctx, need)?;
    }

    emit!(PoolInitialized {
        pool: pool.key(),
        admin: pool.admin,
        clawd_mint: pool.clawd_mint,
        clawd_emission_per_second: pool.clawd_emission_per_second,
    });
    Ok(())
}
