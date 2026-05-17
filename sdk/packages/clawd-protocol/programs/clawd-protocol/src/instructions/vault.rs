use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::errors::ClawdError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeVaultParams {
    pub inflation_reserve_amount: u64,
    pub entropy_threshold: u32,
    pub entropy_sensitivity_bps: u32,
    pub anti_gravity_floor_bps: u16,
    pub anti_gravity_max_strength_bps: u16,
    pub transfer_fee_bps: u16,
    pub epoch_duration_slots: u64,
    pub epoch_burn_rate_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LockTokensParams {
    pub amount: u64,
    pub lock_type: LockType,
    pub duration_slots: Option<u64>,
    pub milestone_config_index: Option<u8>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = Vault::LEN,
        seeds = [Vault::SEED, base_mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    pub base_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: DBC config — we read its key
    pub config: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_vault(ctx: Context<InitializeVault>, params: InitializeVaultParams) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.base_mint = ctx.accounts.base_mint.key();
    vault.vault_token_account = ctx.accounts.vault_token_account.key();
    vault.inflation_reserve_amount = params.inflation_reserve_amount;
    vault.entropy_threshold = params.entropy_threshold;
    vault.entropy_sensitivity_bps = params.entropy_sensitivity_bps;
    vault.anti_gravity_floor_bps = params.anti_gravity_floor_bps;
    vault.anti_gravity_max_strength_bps = params.anti_gravity_max_strength_bps;
    vault.transfer_fee_bps = params.transfer_fee_bps;
    vault.epoch_duration_slots = params.epoch_duration_slots;
    vault.epoch_burn_rate_bps = params.epoch_burn_rate_bps;
    vault.bump = ctx.bumps.vault;
    Ok(())
}

#[derive(Accounts)]
pub struct LockTokens<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = owner,
        space = LockPosition::LEN,
        seeds = [LockPosition::SEED, vault.key().as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub lock_position: Account<'info, LockPosition>,

    #[account(mut)]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    pub base_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn lock_tokens(ctx: Context<LockTokens>, params: LockTokensParams) -> Result<()> {
    require!(params.amount > 0, ClawdError::ZeroAmount);

    let slot = Clock::get()?.slot;

    // Transfer tokens from owner to vault
    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.owner_token_account.to_account_info(),
                mint: ctx.accounts.base_mint.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        params.amount,
        ctx.accounts.base_mint.decimals,
    )?;

    let lock = &mut ctx.accounts.lock_position;
    lock.owner = ctx.accounts.owner.key();
    lock.vault = ctx.accounts.vault.key();
    lock.locked_amount = params.amount;
    lock.lock_type = params.lock_type;
    lock.locked_at_slot = slot;
    lock.unlock_slot = params.duration_slots.map(|d| slot + d);
    lock.milestone_index = params.milestone_config_index;
    lock.is_unlocked = false;
    lock.bump = ctx.bumps.lock_position;

    ctx.accounts.vault.total_locked += params.amount;

    Ok(())
}

#[derive(Accounts)]
pub struct UnlockTokens<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [LockPosition::SEED, vault.key().as_ref(), owner.key().as_ref()],
        bump = lock_position.bump,
        has_one = owner,
    )]
    pub lock_position: Account<'info, LockPosition>,

    #[account(mut)]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub burn_mint: InterfaceAccount<'info, Mint>,

    pub base_mint: InterfaceAccount<'info, Mint>,

    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn unlock_tokens(ctx: Context<UnlockTokens>, force_early_exit: bool) -> Result<()> {
    let slot = Clock::get()?.slot;
    let lock = &ctx.accounts.lock_position;

    require!(!lock.is_unlocked, ClawdError::AlreadyUnlocked);

    // Check maturity
    let is_matured = lock.unlock_slot.map_or(false, |s| slot >= s);

    if !is_matured && !force_early_exit {
        return Err(ClawdError::LockNotMatured.into());
    }

    let locked_amount = lock.locked_amount;
    let mut return_amount = locked_amount;
    let mut burn_amount = 0u64;

    // Conviction lock early exit → burn 20%
    if !is_matured && lock.lock_type == LockType::ConvictionLock {
        burn_amount = locked_amount * 2_000 / 10_000;
        return_amount = locked_amount - burn_amount;
    }

    let vault_key = ctx.accounts.vault.base_mint;
    let vault_bump = ctx.accounts.vault.bump;
    let seeds = &[Vault::SEED, vault_key.as_ref(), &[vault_bump]];
    let signer_seeds = &[&seeds[..]];

    // Burn if applicable
    if burn_amount > 0 {
        token_interface::burn_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::BurnChecked {
                    mint: ctx.accounts.burn_mint.to_account_info(),
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            burn_amount,
            ctx.accounts.burn_mint.decimals,
        )?;
        ctx.accounts.vault.total_burned += burn_amount;
    }

    // Return remaining tokens to owner
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault_token_account.to_account_info(),
                mint: ctx.accounts.base_mint.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        return_amount,
        ctx.accounts.base_mint.decimals,
    )?;

    ctx.accounts.lock_position.is_unlocked = true;
    ctx.accounts.vault.total_locked -= locked_amount;

    Ok(())
}
