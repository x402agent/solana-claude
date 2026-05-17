use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawdError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentCurveConfig {
    pub base_fee_numerator: u64,
    pub sentiment_fee_range_bps: u16,
    pub sentiment_update_interval_slots: u32,
    pub migration_quote_threshold: u64,
    pub initial_buy_amount: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchAgentTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub initial_supply: u64,
    pub token_standard: u8, // 0=SPL 1=Token2022 2=pToken
    pub vault_config: crate::instructions::vault::InitializeVaultParams,
    pub curve_config: AgentCurveConfig,
    pub agent_character_hash: [u8; 32],
    pub constitution_hash: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterAgentBindingParams {
    pub agent_pubkey: Pubkey,
    pub character_hash: [u8; 32],
    pub constitution_hash: [u8; 32],
    pub capabilities: u64,
}

#[derive(Accounts)]
pub struct LaunchAgentToken<'info> {
    #[account(
        init,
        payer = agent_wallet,
        space = AgentBinding::LEN,
        seeds = [AgentBinding::SEED, agent_wallet.key().as_ref()],
        bump,
    )]
    pub agent_binding: Account<'info, AgentBinding>,

    /// CHECK: base mint — created in this instruction via CPI or by payer
    #[account(mut)]
    pub base_mint: UncheckedAccount<'info>,

    /// CHECK: vault PDA — init'd via CPI
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: vault token account
    #[account(mut)]
    pub vault_token_account: UncheckedAccount<'info>,

    /// CHECK: DBC config — must be pre-created by partner
    pub dbc_config: UncheckedAccount<'info>,

    /// CHECK: DBC pool — created via CPI to DBC program
    #[account(mut)]
    pub dbc_pool: UncheckedAccount<'info>,

    #[account(mut)]
    pub agent_wallet: Signer<'info>,

    /// CHECK: fee receiver for pool creation fee
    pub fee_receiver: UncheckedAccount<'info>,

    /// CHECK: Token-2022 program
    pub token_program_2022: UncheckedAccount<'info>,

    /// CHECK: DBC program
    pub dbc_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn launch_agent_token(
    ctx: Context<LaunchAgentToken>,
    params: LaunchAgentTokenParams,
) -> Result<()> {
    let slot = Clock::get()?.slot;

    // Register agent binding
    let binding = &mut ctx.accounts.agent_binding;
    binding.agent_pubkey = ctx.accounts.agent_wallet.key();
    binding.base_mint = ctx.accounts.base_mint.key();
    binding.vault = ctx.accounts.vault.key();
    binding.character_hash = params.agent_character_hash;
    binding.constitution_hash = params.constitution_hash;
    binding.capabilities = caps::TRADING | caps::RESEARCH | caps::PAYMENTS | caps::BURN_TRIGGER;
    binding.is_active = true;
    binding.created_at_slot = slot;
    binding.last_activity_slot = slot;
    binding.bump = ctx.bumps.agent_binding;

    // NOTE: In production, this instruction CPIs to:
    //   1. Token2022 program to create the mint
    //   2. clawd_protocol.initialize_vault
    //   3. DBC program's initialize_virtual_pool_with_token2022
    // For MVP the caller executes each step in a separate instruction.

    emit!(AgentTokenLaunchEvent {
        agent: ctx.accounts.agent_wallet.key(),
        base_mint: ctx.accounts.base_mint.key(),
        vault: ctx.accounts.vault.key(),
        character_hash: params.agent_character_hash,
        constitution_hash: params.constitution_hash,
        slot,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterAgentBinding<'info> {
    #[account(
        init,
        payer = authority,
        space = AgentBinding::LEN,
        seeds = [AgentBinding::SEED, agent_wallet.key().as_ref()],
        bump,
    )]
    pub agent_binding: Account<'info, AgentBinding>,

    /// CHECK: base mint that the agent is bound to
    pub base_mint: UncheckedAccount<'info>,

    pub agent_wallet: Signer<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_agent_binding(
    ctx: Context<RegisterAgentBinding>,
    params: RegisterAgentBindingParams,
) -> Result<()> {
    let slot = Clock::get()?.slot;
    let binding = &mut ctx.accounts.agent_binding;
    binding.agent_pubkey = params.agent_pubkey;
    binding.base_mint = ctx.accounts.base_mint.key();
    binding.character_hash = params.character_hash;
    binding.constitution_hash = params.constitution_hash;
    binding.capabilities = params.capabilities;
    binding.is_active = true;
    binding.created_at_slot = slot;
    binding.last_activity_slot = slot;
    binding.bump = ctx.bumps.agent_binding;
    Ok(())
}

#[event]
pub struct AgentTokenLaunchEvent {
    pub agent: Pubkey,
    pub base_mint: Pubkey,
    pub vault: Pubkey,
    pub character_hash: [u8; 32],
    pub constitution_hash: [u8; 32],
    pub slot: u64,
}
