use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer as system_transfer, Transfer as SystemTransfer};

use crate::constants::*;
use crate::errors::StakeError;
use crate::events::GachaFeesDeposited;
use crate::instructions::shared::{accrue_pool, distribute_sol_to_pool};
use crate::state::StakePool;

#[derive(Accounts)]
pub struct DepositGachaFees<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, pool.clawd_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, StakePool>,

    /// CHECK: SOL vault PDA holding pooled gacha SOL fees
    #[account(
        mut,
        seeds = [SOL_VAULT_SEED, pool.key().as_ref()],
        bump = pool.sol_vault_bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositGachaFees>, amount: u64) -> Result<()> {
    require!(amount > 0, StakeError::MathOverflow);
    let now = Clock::get()?.unix_timestamp;
    let pool = &mut ctx.accounts.pool;

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        SystemTransfer {
            from: ctx.accounts.depositor.to_account_info(),
            to: ctx.accounts.sol_vault.to_account_info(),
        },
    );
    system_transfer(cpi_ctx, amount)?;

    accrue_pool(pool, now)?;
    distribute_sol_to_pool(pool, amount)?;

    emit!(GachaFeesDeposited {
        pool: pool.key(),
        depositor: ctx.accounts.depositor.key(),
        amount,
    });
    Ok(())
}
