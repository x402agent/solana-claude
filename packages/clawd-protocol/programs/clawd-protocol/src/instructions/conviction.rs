use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked, BurnChecked};
use crate::state::*;
use crate::errors::ClawdError;

#[derive(Accounts)]
pub struct ConvictionStake<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = staker,
        space = ConvictionPosition::LEN,
        seeds = [ConvictionPosition::SEED, vault.key().as_ref(), staker.key().as_ref()],
        bump,
    )]
    pub conviction_position: Account<'info, ConvictionPosition>,

    #[account(mut)]
    pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub conviction_pool_account: InterfaceAccount<'info, TokenAccount>,

    pub base_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn conviction_stake(
    ctx: Context<ConvictionStake>,
    amount: u64,
    lock_duration_slots: u64,
) -> Result<()> {
    require!(amount > 0, ClawdError::ZeroAmount);
    require!(
        lock_duration_slots >= 216_000, // ~1 day minimum
        ClawdError::ZeroAmount
    );

    let slot = ctx.accounts.clock.slot;

    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.staker_token_account.to_account_info(),
                mint: ctx.accounts.base_mint.to_account_info(),
                to: ctx.accounts.conviction_pool_account.to_account_info(),
                authority: ctx.accounts.staker.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.base_mint.decimals,
    )?;

    let epoch_duration = ctx.accounts.vault.epoch_duration_slots;
    let pos = &mut ctx.accounts.conviction_position;
    pos.staker = ctx.accounts.staker.key();
    pos.vault = ctx.accounts.vault.key();
    pos.staked_amount = amount;
    pos.lock_duration_slots = lock_duration_slots;
    pos.staked_at_slot = slot;
    pos.unlock_slot = slot + lock_duration_slots;
    pos.conviction_score = pos.compute_score(epoch_duration);
    pos.consecutive_epochs = 0;
    pos.last_claim_slot = slot;
    pos.bump = ctx.bumps.conviction_position;

    let vault = &mut ctx.accounts.vault;
    vault.total_conviction_score += pos.conviction_score;
    vault.total_locked += amount;

    Ok(())
}

#[derive(Accounts)]
pub struct ConvictionUnstake<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [ConvictionPosition::SEED, vault.key().as_ref(), staker.key().as_ref()],
        bump = conviction_position.bump,
        has_one = staker,
    )]
    pub conviction_position: Account<'info, ConvictionPosition>,

    #[account(mut)]
    pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub conviction_pool_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, Mint>,

    pub staker: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn conviction_unstake(ctx: Context<ConvictionUnstake>) -> Result<()> {
    let slot = ctx.accounts.clock.slot;
    let pos = &ctx.accounts.conviction_position;
    let is_matured = slot >= pos.unlock_slot;

    let (return_amount, burn_amount) = if is_matured {
        (pos.staked_amount, 0u64)
    } else {
        let burn = pos.early_exit_burn_amount();
        (pos.early_exit_return_amount(), burn)
    };

    let vault = &ctx.accounts.vault;
    let base_mint_key = vault.base_mint;
    let vault_bump = vault.bump;
    let seeds = &[Vault::SEED, base_mint_key.as_ref(), &[vault_bump]];
    let signer_seeds = &[&seeds[..]];

    if burn_amount > 0 {
        token_interface::burn_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                BurnChecked {
                    mint: ctx.accounts.base_mint.to_account_info(),
                    from: ctx.accounts.conviction_pool_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            burn_amount,
            ctx.accounts.base_mint.decimals,
        )?;
        ctx.accounts.vault.total_burned += burn_amount;
    }

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.conviction_pool_account.to_account_info(),
                mint: ctx.accounts.base_mint.to_account_info(),
                to: ctx.accounts.staker_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        return_amount,
        ctx.accounts.base_mint.decimals,
    )?;

    let pos = &ctx.accounts.conviction_position;
    let score = pos.conviction_score;
    let staked = pos.staked_amount;
    let vault = &mut ctx.accounts.vault;
    vault.total_conviction_score = vault.total_conviction_score.saturating_sub(score);
    vault.total_locked -= staked;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimConvictionRewards<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [ConvictionPosition::SEED, vault.key().as_ref(), staker.key().as_ref()],
        bump = conviction_position.bump,
        has_one = staker,
    )]
    pub conviction_position: Account<'info, ConvictionPosition>,

    #[account(mut)]
    pub revenue_pool_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

    pub base_mint: InterfaceAccount<'info, Mint>,

    pub staker: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn claim_conviction_rewards(ctx: Context<ClaimConvictionRewards>) -> Result<()> {
    let pos = &ctx.accounts.conviction_position;
    let vault = &ctx.accounts.vault;

    let total_score = vault.total_conviction_score;
    if total_score == 0 { return Ok(()); }

    let epoch_revenue = ctx.accounts.revenue_pool_account.amount;
    let share = (epoch_revenue as u128 * pos.conviction_score / total_score) as u64;

    if share == 0 { return Ok(()); }

    let base_mint_key = vault.base_mint;
    let vault_bump = vault.bump;
    let seeds = &[Vault::SEED, base_mint_key.as_ref(), &[vault_bump]];
    let signer_seeds = &[&seeds[..]];

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.revenue_pool_account.to_account_info(),
                mint: ctx.accounts.base_mint.to_account_info(),
                to: ctx.accounts.staker_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        share,
        ctx.accounts.base_mint.decimals,
    )?;

    ctx.accounts.conviction_position.total_rewards_claimed += share;
    ctx.accounts.conviction_position.last_claim_slot = Clock::get()?.slot;

    Ok(())
}
