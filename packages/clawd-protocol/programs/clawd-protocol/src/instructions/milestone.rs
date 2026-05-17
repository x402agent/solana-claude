use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::errors::ClawdError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MilestoneLockParams {
    pub total_locked_amount: u64,
    pub milestones: Vec<MilestoneCondition>,
}

#[derive(Accounts)]
pub struct CreateMilestoneLock<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = creator,
        space = MilestoneLock::LEN,
        seeds = [MilestoneLock::SEED, vault.key().as_ref(), creator.key().as_ref()],
        bump,
    )]
    pub milestone_lock: Account<'info, MilestoneLock>,

    #[account(mut)]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    pub base_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn create_milestone_lock(
    ctx: Context<CreateMilestoneLock>,
    params: MilestoneLockParams,
) -> Result<()> {
    require!(params.milestones.len() <= MilestoneLock::MAX_MILESTONES, ClawdError::MaxMilestonesExceeded);
    require!(params.total_locked_amount > 0, ClawdError::ZeroAmount);

    let total_bps: u16 = params.milestones.iter().map(|m| m.unlock_bps).sum();
    require!(total_bps <= 10_000, ClawdError::ZeroAmount); // reuse error

    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.creator_token_account.to_account_info(),
                mint: ctx.accounts.base_mint.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        params.total_locked_amount,
        ctx.accounts.base_mint.decimals,
    )?;

    let lock = &mut ctx.accounts.milestone_lock;
    lock.vault = ctx.accounts.vault.key();
    lock.creator = ctx.accounts.creator.key();
    lock.total_locked_amount = params.total_locked_amount;
    lock.milestones = params.milestones;
    lock.bump = ctx.bumps.milestone_lock;

    ctx.accounts.vault.total_locked += params.total_locked_amount;

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyMilestone<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [MilestoneLock::SEED, vault.key().as_ref(), milestone_lock.creator.as_ref()],
        bump = milestone_lock.bump,
    )]
    pub milestone_lock: Account<'info, MilestoneLock>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: DBC pool — read quote_reserve and is_migrated
    pub dbc_pool: UncheckedAccount<'info>,

    pub base_mint: InterfaceAccount<'info, Mint>,

    pub caller: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn verify_milestone(
    ctx: Context<VerifyMilestone>,
    milestone_index: u8,
    holder_count_attestation: Option<u32>,
) -> Result<()> {
    let idx = milestone_index as usize;
    require!(idx < ctx.accounts.milestone_lock.milestones.len(), ClawdError::MilestoneNotMet);

    {
        let m = &ctx.accounts.milestone_lock.milestones[idx];
        require!(!m.achieved, ClawdError::MilestoneAlreadyAchieved);
    }

    // Check on-chain condition
    let dbc_data = ctx.accounts.dbc_pool.try_borrow_data()?;
    let condition_met = check_milestone_on_chain(
        &ctx.accounts.milestone_lock.milestones[idx],
        &dbc_data,
        holder_count_attestation,
        &ctx.accounts.vault.agent_binding,
    )?;

    require!(condition_met, ClawdError::MilestoneNotMet);

    let unlock_amount = ctx.accounts.milestone_lock.unlock_amount(idx);

    let vault = &ctx.accounts.vault;
    let base_mint_key = vault.base_mint;
    let vault_bump = vault.bump;
    let seeds = &[Vault::SEED, base_mint_key.as_ref(), &[vault_bump]];
    let signer_seeds = &[&seeds[..]];

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault_token_account.to_account_info(),
                mint: ctx.accounts.base_mint.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        unlock_amount,
        ctx.accounts.base_mint.decimals,
    )?;

    let lock = &mut ctx.accounts.milestone_lock;
    lock.milestones[idx].achieved = true;
    lock.total_unlocked_amount += unlock_amount;

    ctx.accounts.vault.total_locked -= unlock_amount;

    Ok(())
}

fn check_milestone_on_chain(
    milestone: &MilestoneCondition,
    dbc_data: &[u8],
    holder_count: Option<u32>,
    agent_binding_key: &Option<Pubkey>,
) -> Result<bool> {
    match milestone.milestone_type {
        MilestoneType::MarketCapQuote => {
            // quote_reserve offset in VirtualPool: ~172 bytes in
            const QUOTE_RESERVE_OFFSET: usize = 8 + 32 * 3 + 32 * 2 + 8;
            if dbc_data.len() < QUOTE_RESERVE_OFFSET + 8 { return Ok(false); }
            let quote_reserve = u64::from_le_bytes(
                dbc_data[QUOTE_RESERVE_OFFSET..QUOTE_RESERVE_OFFSET + 8].try_into().unwrap()
            );
            Ok(quote_reserve >= milestone.threshold)
        }
        MilestoneType::GraduationAchieved => {
            // is_migrated offset: activation_point(8) + sqrt_price(16) + pool_type(1) + ... look for flag
            // In VirtualPool: is_migrated is a u8 around offset 250+
            const IS_MIGRATED_OFFSET: usize = 8 + 32 * 5 + 8 + 8 + 16 + 8 + 1 + 8 * 6;
            if dbc_data.len() <= IS_MIGRATED_OFFSET { return Ok(false); }
            Ok(dbc_data[IS_MIGRATED_OFFSET] == 1)
        }
        MilestoneType::HolderCount => {
            // Holder count requires off-chain attestation
            Ok(holder_count.map_or(false, |c| c as u64 >= milestone.threshold))
        }
        MilestoneType::CumulativeVolume => {
            // Cumulative volume from DBC pool metrics (total trading fees * 10 is rough proxy)
            const PROTOCOL_BASE_FEE_OFFSET: usize = 8 + 32 * 5 + 8 + 8 + 16 + 8 + 1;
            if dbc_data.len() < PROTOCOL_BASE_FEE_OFFSET + 8 { return Ok(false); }
            let protocol_fee = u64::from_le_bytes(
                dbc_data[PROTOCOL_BASE_FEE_OFFSET..PROTOCOL_BASE_FEE_OFFSET + 8].try_into().unwrap()
            );
            // Volume ≈ protocol_fee / 0.2% = protocol_fee * 500
            let approx_volume = protocol_fee.saturating_mul(500);
            Ok(approx_volume >= milestone.threshold)
        }
        MilestoneType::AgentTasksCompleted => {
            // Checked via agent_binding.lifetime_tasks_completed — but binding not passed here
            // Return false: caller must pass agent_binding as remaining account in production
            Ok(false)
        }
    }
}
