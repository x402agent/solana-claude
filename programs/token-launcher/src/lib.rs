use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use solana_program::program::invoke;

declare_id!("funvWGBmpr8N7pTNqpxkWPgWnQbL3Yr5vzCHNJT2YkL");

const MINIMUM_VESTING_PERIOD: i64 = 24 * 60 * 60; // 1 day
const MAXIMUM_VESTING_PERIOD: i64 = 365 * 24 * 60 * 60; // 1 year
const MINIMUM_AMOUNT: u64 = 1_000_000; // Minimum token amount (6 decimals)

#[program]
pub mod token_launcher {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        fee_basis_points: u64,
        initial_virtual_token_reserves: u64,
        initial_virtual_sol_reserves: u64,
        initial_real_token_reserves: u64,
    ) -> Result<()> {
        let global = &mut ctx.accounts.global;
        global.authority = ctx.accounts.authority.key();
        global.fee_recipient = ctx.accounts.fee_recipient.key();
        global.initial_virtual_token_reserves = initial_virtual_token_reserves;
        global.initial_virtual_sol_reserves = initial_virtual_sol_reserves;
        global.initial_real_token_reserves = initial_real_token_reserves;
        global.fee_basis_points = fee_basis_points;
        global.initialized = true;

        emit!(LaunchpadInitialized {
            authority: global.authority,
            fee_recipient: global.fee_recipient,
            timestamp: Clock::get()?.unix_timestamp
        });
        Ok(())
    }

    // Main token launch function
    pub fn launch_token(
        ctx: Context<LaunchToken>,
        name: String,
        symbol: String,
        uri: String,
        initial_supply: u64,
    ) -> Result<()> {
        require!(initial_supply >= MINIMUM_AMOUNT, ErrorCode::InvalidAmount);

        // Create the token mint
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        );

        token::mint_to(cpi_context, initial_supply)?;

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
            initial_supply,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1)]
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is just a fee recipient
    pub fee_recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LaunchToken<'info> {
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

#[account]
pub struct Global {
    pub initialized: bool,
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub initial_virtual_token_reserves: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub fee_basis_points: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than minimum")]
    InvalidAmount,
    #[msg("Invalid duration specified")]
    InvalidDuration,
}

#[event]
pub struct LaunchpadInitialized {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TokenLaunched {
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub initial_supply: u64,
    pub timestamp: i64,
}
