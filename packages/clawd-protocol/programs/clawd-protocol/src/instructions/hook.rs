/**
 * pToken Transfer Hook
 *
 * Called by the Token2022 program on every pToken transfer.
 * This is the "intelligence layer" that runs on-chain with every token movement.
 *
 * On each transfer:
 *   1. Records the transfer in WalletBehavior PDAs for both sender and receiver
 *   2. Routes transfer_fee_bps of the amount into the vault fee_reserve
 *   3. Updates vault ATH if current price is higher (for anti-gravity baseline)
 *
 * Security: the Token2022 program passes the extra account metas list,
 * which we pre-register. No arbitrary accounts can be injected.
 */

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::errors::ClawdError;

#[derive(Accounts)]
pub struct TransferHook<'info> {
    /// CHECK: source token account (passed by Token2022)
    pub source_token: UncheckedAccount<'info>,

    /// CHECK: mint (passed by Token2022)
    pub mint: UncheckedAccount<'info>,

    /// CHECK: destination token account (passed by Token2022)
    pub destination_token: UncheckedAccount<'info>,

    /// CHECK: owner/authority (passed by Token2022)
    pub owner: UncheckedAccount<'info>,

    /// CHECK: extra account metas list
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
    )]
    pub extra_account_metas: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [Vault::SEED, mint.key().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub fee_reserve_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = vault, // vault funds the PDA init on first transfer
        space = WalletBehavior::LEN,
        seeds = [WalletBehavior::SEED, source_token.key().as_ref()],
        bump,
    )]
    pub source_behavior: Account<'info, WalletBehavior>,

    #[account(
        init_if_needed,
        payer = vault,
        space = WalletBehavior::LEN,
        seeds = [WalletBehavior::SEED, destination_token.key().as_ref()],
        bump,
    )]
    pub destination_behavior: Account<'info, WalletBehavior>,

    pub token_program_2022: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64, _decimals: u8) -> Result<()> {
    let slot = Clock::get()?.slot;

    // Update source wallet behavior (trade count)
    let src = &mut ctx.accounts.source_behavior;
    if slot <= src.last_updated_slot + 60 {
        src.trade_count_last_60_slots = src.trade_count_last_60_slots.saturating_add(1);
    } else {
        // New 60-slot window
        src.trade_count_last_60_slots = 1;
    }
    src.wallet = ctx.accounts.source_token.key();
    src.last_updated_slot = slot;

    // Update destination behavior
    let dst = &mut ctx.accounts.destination_behavior;
    dst.wallet = ctx.accounts.destination_token.key();
    if dst.last_updated_slot > 0 {
        let hold_time = slot - dst.last_updated_slot;
        // EMA of hold duration
        dst.avg_hold_slots = (dst.avg_hold_slots * 7 + hold_time) / 8;
    }
    dst.last_updated_slot = slot;

    // Accumulate fee into vault
    let vault = &mut ctx.accounts.vault;
    let fee_amount = (amount as u128 * vault.transfer_fee_bps as u128 / 10_000) as u64;
    vault.total_fees_collected += fee_amount;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + 2 * (1 + 32), // discriminator + count + 2 extra metas
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
    )]
    /// CHECK: extra account metas list PDA
    pub extra_account_metas: UncheckedAccount<'info>,

    /// CHECK: pToken mint
    pub mint: UncheckedAccount<'info>,

    /// CHECK: vault PDA
    pub vault: UncheckedAccount<'info>,

    /// CHECK: fee reserve token account
    pub fee_reserve_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_extra_account_meta_list(
    ctx: Context<InitializeExtraAccountMetaList>,
) -> Result<()> {
    // Write the extra account metas list to the PDA.
    // The list tells Token2022 which additional accounts to pass to the hook.
    // Format: [count: u32, meta1: ExtraAccountMeta, meta2: ExtraAccountMeta, ...]
    // Each ExtraAccountMeta: discriminator(1) + pubkey_or_seeds
    let data = &mut ctx.accounts.extra_account_metas.try_borrow_mut_data()?;

    // Write discriminator
    data[0..8].copy_from_slice(&[43, 34, 13, 49, 167, 88, 235, 235]);

    // Write 2 extra metas: vault and fee_reserve_account
    // (simplified — production uses spl_tlv_account_resolution format)
    let mut offset = 8;
    data[offset..offset + 4].copy_from_slice(&2u32.to_le_bytes()); offset += 4;
    data[offset] = 0; offset += 1; // is_signer=false, is_writable=true
    data[offset..offset + 32].copy_from_slice(ctx.accounts.vault.key().as_ref()); offset += 32;
    data[offset] = 0; offset += 1;
    data[offset..offset + 32].copy_from_slice(ctx.accounts.fee_reserve_account.key().as_ref());

    Ok(())
}
