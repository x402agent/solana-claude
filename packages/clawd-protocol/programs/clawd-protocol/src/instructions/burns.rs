/**
 * Novel Burn Instructions
 *
 * Four orthogonal burn mechanisms that have no precedent in existing DeFi:
 *
 * 1. entropy_burn    — on-chain volatility as burn trigger
 * 2. behavioral_burn — bot behavioral fingerprint → reward tax
 * 3. anti_gravity    — self-funding price floor via fee-reserve buy-and-burn
 * 4. agent_epoch     — AI agent activity score drives inflation burns
 */

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, BurnChecked};
use crate::state::*;
use crate::errors::ClawdError;

// ─── Entropy Burn ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct EntropyBurn<'info> {
    #[account(
        mut,
        seeds = [Vault::SEED, vault.base_mint.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [EntropyState::SEED, vault.key().as_ref()],
        bump = entropy_state.bump,
    )]
    pub entropy_state: Account<'info, EntropyState>,

    /// CHECK: DBC VirtualPool — we read volatility_accumulator raw bytes
    pub dbc_pool: UncheckedAccount<'info>,

    #[account(mut)]
    pub inflation_reserve_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, Mint>,

    pub caller: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn entropy_burn(ctx: Context<EntropyBurn>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let dbc_data = ctx.accounts.dbc_pool.try_borrow_data()?;

    let volatility_accumulator = crate::state::entropy::read_volatility_accumulator(&dbc_data)
        .ok_or(ClawdError::InvalidDbcPoolData)?;

    let burn_amount = EntropyState::compute_burn(
        vault.inflation_reserve_amount,
        volatility_accumulator,
        vault.entropy_threshold,
        vault.entropy_sensitivity_bps,
    );

    require!(burn_amount > 0, ClawdError::EntropyBelowThreshold);
    require!(vault.inflation_reserve_amount >= burn_amount, ClawdError::EmptyInflationReserve);

    // Burn from inflation reserve
    let base_mint_key = vault.base_mint;
    let seeds = &[Vault::SEED, base_mint_key.as_ref(), &[vault.bump]];
    let signer_seeds = &[&seeds[..]];

    token_interface::burn_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            BurnChecked {
                mint: ctx.accounts.base_mint.to_account_info(),
                from: ctx.accounts.inflation_reserve_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        burn_amount,
        ctx.accounts.base_mint.decimals,
    )?;

    vault.inflation_reserve_amount -= burn_amount;
    vault.total_burned += burn_amount;

    let entropy_state = &mut ctx.accounts.entropy_state;
    entropy_state.total_entropy_burns += 1;
    entropy_state.total_entropy_burned_tokens += burn_amount;
    entropy_state.last_burn_slot = Clock::get()?.slot;
    if volatility_accumulator > entropy_state.peak_volatility_accumulator {
        entropy_state.peak_volatility_accumulator = volatility_accumulator;
    }

    emit!(EntropyBurnEvent {
        vault: vault.key(),
        volatility_accumulator,
        burn_amount,
        slot: entropy_state.last_burn_slot,
    });

    Ok(())
}

// ─── Behavioral Fingerprint Burn ──────────────────────────────────────────────

#[derive(Accounts)]
pub struct BehavioralBurn<'info> {
    #[account(mut, seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = caller,
        space = WalletBehavior::LEN,
        seeds = [WalletBehavior::SEED, target_wallet.key().as_ref()],
        bump,
    )]
    pub wallet_behavior: Account<'info, WalletBehavior>,

    /// CHECK: wallet whose behavior is being scored
    pub target_wallet: UncheckedAccount<'info>,

    #[account(mut)]
    pub rewards_escrow: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub caller: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn behavioral_burn(
    ctx: Context<BehavioralBurn>,
    trade_count_last_60_slots: u32,
    avg_hold_slots: u64,
    normalized_position_bps: u16,
) -> Result<()> {
    let slot = Clock::get()?.slot;
    let behavior = &mut ctx.accounts.wallet_behavior;

    // Throttle: at most once per 60 slots per wallet
    require!(
        slot >= behavior.last_updated_slot + 60,
        ClawdError::BehaviorScoreUpdateTooSoon
    );

    behavior.trade_count_last_60_slots = trade_count_last_60_slots;
    behavior.avg_hold_slots = avg_hold_slots;
    behavior.normalized_position_bps = normalized_position_bps;
    behavior.behavior_score = WalletBehavior::compute_score(
        trade_count_last_60_slots,
        avg_hold_slots,
        normalized_position_bps,
    );
    behavior.last_updated_slot = slot;

    if behavior.is_bot() {
        let pending_rewards = ctx.accounts.rewards_escrow.amount;
        let burn_amount = behavior.reward_burn_amount(pending_rewards);

        if burn_amount > 0 {
            let base_mint_key = ctx.accounts.vault.base_mint;
            let vault_bump = ctx.accounts.vault.bump;
            let seeds = &[Vault::SEED, base_mint_key.as_ref(), &[vault_bump]];
            let signer_seeds = &[&seeds[..]];

            token_interface::burn_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    BurnChecked {
                        mint: ctx.accounts.base_mint.to_account_info(),
                        from: ctx.accounts.rewards_escrow.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer_seeds,
                ),
                burn_amount,
                ctx.accounts.base_mint.decimals,
            )?;

            behavior.total_rewards_burned += burn_amount;
            ctx.accounts.vault.total_burned += burn_amount;

            emit!(BehavioralBurnEvent {
                wallet: ctx.accounts.target_wallet.key(),
                behavior_score: behavior.behavior_score,
                rewards_burned: burn_amount,
                slot,
            });
        }
    }

    Ok(())
}

// ─── Anti-Gravity Sweep ───────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct AntiGravitySweep<'info> {
    #[account(
        mut,
        seeds = [Vault::SEED, vault.base_mint.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub fee_reserve_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: DBC VirtualPool — read current sqrt_price
    #[account(mut)]
    pub dbc_pool: UncheckedAccount<'info>,

    #[account(mut)]
    pub dbc_pool_quote_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub dbc_pool_base_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, Mint>,

    pub quote_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: DBC program — CPI target
    pub dbc_program: UncheckedAccount<'info>,

    /// CHECK: vault PDA authority
    #[account(
        seeds = [b"vault_auth", vault.key().as_ref()],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn anti_gravity_sweep(ctx: Context<AntiGravitySweep>) -> Result<()> {
    let vault = &ctx.accounts.vault;

    require!(vault.ath_quote_sqrt_price > 0, ClawdError::ZeroAth);

    // Read current sqrt_price from DBC pool (offset: discriminator 8 + fields to sqrt_price)
    let dbc_data = ctx.accounts.dbc_pool.try_borrow_data()?;
    let current_sqrt_price = read_dbc_sqrt_price(&dbc_data)?;

    let floor_sqrt_price = vault.floor_sqrt_price();
    require!(current_sqrt_price < floor_sqrt_price, ClawdError::AntiGravityNotTriggered);

    // Compute buy amount
    let fee_reserve_balance = ctx.accounts.fee_reserve_account.amount;
    require!(fee_reserve_balance > 0, ClawdError::InsufficientFeeReserve);

    let price_drop = floor_sqrt_price - current_sqrt_price;
    let strength_bps = (price_drop * 10_000 / floor_sqrt_price).min(vault.anti_gravity_max_strength_bps as u128);
    let buy_amount = (fee_reserve_balance as u128 * strength_bps / 10_000) as u64;

    require!(buy_amount > 0, ClawdError::InsufficientFeeReserve);

    // CPI: swap quote → base via DBC pool, then burn received base tokens
    // (Simplified: in production this uses the DBC swap instruction)
    // The vault_authority PDA signs the swap CPI
    let vault_key = ctx.accounts.vault.key();
    let auth_seeds = &[b"vault_auth", vault_key.as_ref()];
    let (_, auth_bump) = Pubkey::find_program_address(auth_seeds, ctx.program_id);
    let signer_seeds = &[b"vault_auth" as &[u8], vault_key.as_ref(), &[auth_bump]];

    // TODO: CPI to DBC swap2 with buy_amount of quote
    // After swap, burn all received base tokens

    let vault = &mut ctx.accounts.vault;
    vault.total_fees_collected = vault.total_fees_collected.saturating_sub(buy_amount);

    emit!(AntiGravityEvent {
        vault: vault.key(),
        current_sqrt_price,
        floor_sqrt_price,
        quote_used: buy_amount,
        slot: Clock::get()?.slot,
    });

    Ok(())
}

// ─── Agent Epoch Burn ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct AgentEpochBurn<'info> {
    #[account(
        mut,
        seeds = [Vault::SEED, vault.base_mint.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        constraint = agent_binding.vault == vault.key() @ ClawdError::InvalidAgentSigner,
        constraint = agent_binding.agent_pubkey == agent_signer.key() @ ClawdError::InvalidAgentSigner,
    )]
    pub agent_binding: Account<'info, AgentBinding>,

    #[account(
        init_if_needed,
        payer = agent_signer,
        space = EpochRecord::LEN,
        seeds = [EpochRecord::SEED, vault.key().as_ref()],
        bump,
    )]
    pub epoch_record: Account<'info, EpochRecord>,

    #[account(mut)]
    pub inflation_reserve_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub base_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub agent_signer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn agent_epoch_burn(
    ctx: Context<AgentEpochBurn>,
    tasks_completed: u32,
    revenue_generated_lamports: u64,
    uptime_bps: u16,
) -> Result<()> {
    let slot = ctx.accounts.clock.slot;
    let vault = &mut ctx.accounts.vault;
    let epoch_record = &mut ctx.accounts.epoch_record;

    // Enforce epoch cooldown
    require!(
        slot >= epoch_record.last_epoch_start_slot + vault.epoch_duration_slots,
        ClawdError::EpochNotElapsed
    );

    let activity_score = EpochRecord::compute_activity_score(
        tasks_completed,
        50,  // max expected tasks per epoch
        revenue_generated_lamports,
        1_000_000_000, // max expected revenue: 1 SOL per epoch
        uptime_bps,
    );

    let burn_amount = EpochRecord::compute_epoch_burn(
        vault.inflation_reserve_amount,
        activity_score,
        vault.epoch_burn_rate_bps,
    );

    if burn_amount > 0 {
        let base_mint_key = vault.base_mint;
        let seeds = &[Vault::SEED, base_mint_key.as_ref(), &[vault.bump]];
        let signer_seeds = &[&seeds[..]];

        token_interface::burn_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                BurnChecked {
                    mint: ctx.accounts.base_mint.to_account_info(),
                    from: ctx.accounts.inflation_reserve_account.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer_seeds,
            ),
            burn_amount,
            ctx.accounts.base_mint.decimals,
        )?;

        vault.inflation_reserve_amount -= burn_amount;
        vault.total_burned += burn_amount;
    }

    // Update agent binding lifetime stats
    let binding = &mut ctx.accounts.agent_binding;
    binding.lifetime_tasks_completed += tasks_completed as u64;
    binding.lifetime_revenue_lamports += revenue_generated_lamports;
    binding.last_activity_slot = slot;

    epoch_record.epoch_number += 1;
    epoch_record.last_epoch_start_slot = slot;
    epoch_record.total_epoch_burns += burn_amount;
    epoch_record.last_activity_score = activity_score;

    emit!(AgentEpochBurnEvent {
        vault: vault.key(),
        agent: ctx.accounts.agent_signer.key(),
        activity_score,
        burn_amount,
        epoch_number: epoch_record.epoch_number,
        slot,
    });

    Ok(())
}

// ─── DBC sqrt_price reader ─────────────────────────────────────────────────────

fn read_dbc_sqrt_price(data: &[u8]) -> Result<u128> {
    // sqrt_price is at offset: 8 (disc) + 32*3 (config,creator,base_mint) + 32*2 (vaults) + 8+8 (reserves) = 168
    const SQRT_PRICE_OFFSET: usize = 8 + 32 * 3 + 32 * 2 + 8 + 8;
    if data.len() < SQRT_PRICE_OFFSET + 16 {
        return Err(ClawdError::InvalidDbcPoolData.into());
    }
    let lo = u64::from_le_bytes(data[SQRT_PRICE_OFFSET..SQRT_PRICE_OFFSET + 8].try_into().unwrap());
    let hi = u64::from_le_bytes(data[SQRT_PRICE_OFFSET + 8..SQRT_PRICE_OFFSET + 16].try_into().unwrap());
    Ok(lo as u128 | ((hi as u128) << 64))
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct EntropyBurnEvent {
    pub vault: Pubkey,
    pub volatility_accumulator: u32,
    pub burn_amount: u64,
    pub slot: u64,
}

#[event]
pub struct BehavioralBurnEvent {
    pub wallet: Pubkey,
    pub behavior_score: u32,
    pub rewards_burned: u64,
    pub slot: u64,
}

#[event]
pub struct AntiGravityEvent {
    pub vault: Pubkey,
    pub current_sqrt_price: u128,
    pub floor_sqrt_price: u128,
    pub quote_used: u64,
    pub slot: u64,
}

#[event]
pub struct AgentEpochBurnEvent {
    pub vault: Pubkey,
    pub agent: Pubkey,
    pub activity_score: u32,
    pub burn_amount: u64,
    pub epoch_number: u64,
    pub slot: u64,
}
