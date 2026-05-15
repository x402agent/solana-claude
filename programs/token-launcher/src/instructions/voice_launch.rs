use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use solana_program::program::invoke;

use crate::state::{EnhancedBondingCurve, Vesting};
use crate::utils::pumpfun_integration::{PUMPFUN_PROGRAM_ID, MPL_TOKEN_METADATA_PROGRAM_ID};

#[derive(Accounts)]
pub struct LaunchTokenWithVoice<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = payer.key(),
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub token_account: Account<'info, TokenAccount>,
    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: MPL Token Metadata Program
    pub token_metadata_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn launch_token_with_voice(
    ctx: Context<LaunchTokenWithVoice>,
    name: String,
    symbol: String,
    uri: String,
    deepgram_transcript_id: [u8; 64],
    initial_price: u64,
    slope: u64,
    curve_type: u8,
    launch_type: u8,
) -> Result<()> {
    // Create the token mint
    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        },
    );

    token::mint_to(cpi_context, initial_price)?;

    // Create metadata
    let metadata_infos = vec![
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.token_metadata_program.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];

    invoke(
        &mpl_token_metadata::instruction::create_metadata_accounts_v3(
            ctx.accounts.token_metadata_program.key(),
            ctx.accounts.metadata.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.payer.key(),
            name,
            symbol,
            uri,
            None,
            0,
            true,
            true,
            None,
            None,
            None,
        ),
        metadata_infos.as_slice(),
    )?;

    emit!(TokenLaunched {
        mint: ctx.accounts.mint.key(),
        name,
        symbol,
        initial_supply: initial_price,
        launch_type,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct TokenLaunched {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub initial_supply: u64,
    pub launch_type: u8,
    pub timestamp: i64,
}
