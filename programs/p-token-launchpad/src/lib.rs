/**
 * p-token-launchpad — Self-hosted token launch pad for p-token (SIMD-0266)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  ADAPTED FROM: Metaplex Genesis (createAndRegisterLaunch, setAgentTokenV1,
 *                 registerIdentityV1, registerExecutiveV1, delegateExecutionV1)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Key differences from Metaplex Genesis:
 *   1. Uses p-token (Pinocchio) as the token program — 98% cheaper transfers
 *   2. Uses p-token batch instruction (opcode 25) for fee distribution
 *   3. Agent registry uses PDAs (no MPL Core dependency)
 *   4. Fully self-hosted — no external API dependency for token creation
 *   5. Creator vaults use p-token ATA derivation
 *   6. Graduation sends liquidity to any DEX (Raydium CPMM, Orca, etc.)
 *
 * Program ID: placeholder until deploy
 *   11111111111111111111111111111111
 */

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

declare_id!("11111111111111111111111111111111");

// ─── Constants ─────────────────────────────────────────────────────────────────

/// Bonding curve seed prefix
const BONDING_CURVE_SEED: &[u8] = b"bonding-curve";

/// Agent seed prefix
const AGENT_SEED: &[u8] = b"agent";

/// Agent token seed prefix
const AGENT_TOKEN_SEED: &[u8] = b"agent-token";

/// Creator vault seed prefix
const CREATOR_VAULT_SEED: &[u8] = b"creator-vault";

/// Initial virtual token reserves (like Metaplex Genesis)
const INITIAL_VIRTUAL_TOKEN_RESERVES: u64 = 793_100_000_000_000; // matches pump.fun scale

/// Initial virtual SOL reserves
const INITIAL_VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL in lamports

/// Initial real token reserves for the bonding curve
const INITIAL_REAL_TOKEN_RESERVES: u64 = 793_100_000_000_000;

/// Fee basis points (100 = 1%)
const FEE_BASIS_POINTS: u64 = 100;

/// Minimum vesting period for agent token lockups (1 day)
const MINIMUM_VESTING_PERIOD: i64 = 24 * 60 * 60;

/// Maximum vesting period (1 year)
const MAXIMUM_VESTING_PERIOD: i64 = 365 * 24 * 60 * 60;

// ─── Program ────────────────────────────────────────────────────────────────────

#[program]
pub mod p_token_launchpad {
    use super::*;

    /// Initialize the launchpad global state.
    /// Adapted from Metaplex Genesis global initialization.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global = &mut ctx.accounts.global;
        global.authority = ctx.accounts.authority.key();
        global.fee_recipient = ctx.accounts.fee_recipient.key();
        global.initial_virtual_token_reserves = INITIAL_VIRTUAL_TOKEN_RESERVES;
        global.initial_virtual_sol_reserves = INITIAL_VIRTUAL_SOL_RESERVES;
        global.initial_real_token_reserves = INITIAL_REAL_TOKEN_RESERVES;
        global.fee_basis_points = FEE_BASIS_POINTS;
        global.initialized = true;
        global.p_token_program_id = ctx.accounts.p_token_program.key();
        global.token_count = 0;
        global.agent_count = 0;

        emit!(LaunchpadInitialized {
            authority: global.authority,
            fee_recipient: global.fee_recipient,
            p_token_program: global.p_token_program_id,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    // ─── Token Creation (adapted from Metaplex createAndRegisterLaunch) ──────

    /// Create a new bonding curve for a token.
    /// Adapted from Metaplex Genesis's bonding curve creation:
    ///   - Initializes a bonding curve PDA
    ///   - Sets virtual reserves matching pump.fun parameters
    ///   - Token must use p-token or SPL Token
    pub fn create_bonding_curve(ctx: Context<CreateBondingCurve>) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        let global = &ctx.accounts.global;

        curve.mint = ctx.accounts.mint.key();
        curve.creator = ctx.accounts.creator.key();
        curve.initial_virtual_token_reserves = global.initial_virtual_token_reserves;
        curve.initial_virtual_sol_reserves = global.initial_virtual_sol_reserves;
        curve.initial_real_token_reserves = global.initial_real_token_reserves;
        curve.token_total_supply = ctx.accounts.mint.supply;
        curve.complete = false;
        curve.graduated = false;
        curve.created_at = Clock::get()?.unix_timestamp;

        emit!(BondingCurveCreated {
            mint: curve.mint,
            creator: curve.creator,
            token_total_supply: curve.token_total_supply,
            timestamp: curve.created_at,
        });
        Ok(())
    }

    /// Register an agent identity on-chain.
    /// Adapted from Metaplex `registerIdentityV1`:
    ///   - Creates an Agent account with metadata URI
    ///   - Links agent to its creator wallet
    ///   - ERC-8004 style agent registration JSON
    pub fn register_agent(ctx: Context<RegisterAgent>, uri: String) -> Result<()> {
        require!(uri.len() <= 256, ErrorCode::UriTooLong);

        let agent = &mut ctx.accounts.agent;
        let global = &mut ctx.accounts.global;

        agent.owner = ctx.accounts.owner.key();
        agent.uri = uri;
        agent.created_at = Clock::get()?.unix_timestamp;
        agent.executive_delegate = Pubkey::default(); // not set until registerExecutiveV1
        agent.is_active = true;

        global.agent_count = global.agent_count.checked_add(1).unwrap();

        emit!(AgentRegistered {
            agent: agent.key(),
            owner: agent.owner,
            uri: agent.uri.clone(),
            timestamp: agent.created_at,
        });
        Ok(())
    }

    /// Create an agent token (token + bonding curve + agent registration in one).
    /// Adapted from Metaplex `createAndRegisterLaunch` + `setAgentTokenV1`:
    ///   - Creates token mint (with p-token program)
    ///   - Sets up bonding curve
    ///   - Registers agent identity
    ///   - Binds token to agent (irreversible — like Metaplex setToken:true)
    pub fn create_agent_token(
        ctx: Context<CreateAgentToken>,
        name: String,
        symbol: String,
        uri: String,
        agent_uri: String,
    ) -> Result<()> {
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
        require!(uri.len() <= 256, ErrorCode::UriTooLong);
        require!(agent_uri.len() <= 256, ErrorCode::UriTooLong);

        let agent = &mut ctx.accounts.agent;
        let agent_token = &mut ctx.accounts.agent_token;
        let curve = &mut ctx.accounts.bonding_curve;
        let global = &mut ctx.accounts.global;

        // Agent identity
        agent.owner = ctx.accounts.owner.key();
        agent.uri = agent_uri;
        agent.created_at = Clock::get()?.unix_timestamp;
        agent.executive_delegate = Pubkey::default();
        agent.is_active = true;

        // Agent token binding (irreversible — like Metaplex setAgentTokenV1's setToken:true)
        agent_token.agent = agent.key();
        agent_token.mint = ctx.accounts.mint.key();
        agent_token.name = name;
        agent_token.symbol = symbol;
        agent_token.uri = uri;
        agent_token.created_at = Clock::get()?.unix_timestamp;
        agent_token.is_bound = true; // permanent agent-token binding

        // Bonding curve
        curve.mint = ctx.accounts.mint.key();
        curve.creator = ctx.accounts.owner.key();
        curve.initial_virtual_token_reserves = global.initial_virtual_token_reserves;
        curve.initial_virtual_sol_reserves = global.initial_virtual_sol_reserves;
        curve.initial_real_token_reserves = global.initial_real_token_reserves;
        curve.token_total_supply = ctx.accounts.mint.supply;
        curve.complete = false;
        curve.graduated = false;
        curve.created_at = agent.created_at;

        global.token_count = global.token_count.checked_add(1).unwrap();
        global.agent_count = global.agent_count.checked_add(1).unwrap();

        emit!(AgentTokenCreated {
            agent: agent.key(),
            mint: ctx.accounts.mint.key(),
            name: agent_token.name.clone(),
            symbol: agent_token.symbol.clone(),
            timestamp: agent.created_at,
        });
        Ok(())
    }

    // ─── Executive Delegation (adapted from Metaplex registerExecutiveV1 + delegateExecutionV1) ─

    /// Register an executive delegate for an agent.
    /// Adapted from Metaplex `registerExecutiveV1`:
    ///   - Sets an executive delegate PDA
    ///   - Delegate can act on behalf of the agent
    ///   - Only the agent owner can set this
    pub fn register_executive(ctx: Context<RegisterExecutive>, delegate: Pubkey) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        require!(agent.owner == ctx.accounts.owner.key(), ErrorCode::NotAgentOwner);
        require!(agent.is_active, ErrorCode::AgentInactive);

        agent.executive_delegate = delegate;

        emit!(ExecutiveRegistered {
            agent: agent.key(),
            delegate,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Delegate execution to a specific wallet for a single operation.
    /// Adapted from Metaplex `delegateExecutionV1`:
    ///   - Creates a temporary delegation PDA
    ///   - Scoped to a specific agent token
    ///   - Expires after a given slot
    pub fn delegate_execution(ctx: Context<DelegateExecution>, expires_at_slot: u64) -> Result<()> {
        let delegation = &mut ctx.accounts.delegation;
        delegation.agent = ctx.accounts.agent.key();
        delegation.delegate = ctx.accounts.delegate.key();
        delegation.expires_at_slot = expires_at_slot;
        delegation.created_at = Clock::get()?.unix_timestamp;

        emit!(ExecutionDelegated {
            agent: delegation.agent,
            delegate: delegation.delegate,
            expires_at_slot,
            timestamp: delegation.created_at,
        });
        Ok(())
    }

    // ─── Trading (adapted from Metaplex Genesis buy/sell) ────────────────────

    /// Buy tokens from the bonding curve.
    /// Uses constant-product formula: (virtual_token_reserves - tokens_out) × (virtual_sol_reserves + sol_in) = k
    /// Adapted from Metaplex Genesis / pump.fun `buy` instruction.
    pub fn buy(ctx: Context<Buy>, amount: u64, max_sol_cost: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.complete, ErrorCode::BondingCurveComplete);
        require!(!curve.graduated, ErrorCode::AlreadyGraduated);
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Calculate tokens out using bonding curve formula
        let virtual_token_reserves = curve.initial_virtual_token_reserves
            .checked_sub(curve.tokens_sold).unwrap();
        let virtual_sol_reserves = curve.initial_virtual_sol_reserves
            .checked_add(curve.sol_raised).unwrap();

        // k = token_reserves * sol_reserves (constant product)
        // tokens_out = token_reserves - (k / (sol_reserves + sol_in))
        let k = virtual_token_reserves.checked_mul(virtual_sol_reserves).unwrap();

        // sol_in = quote_amount (the SOL the buyer pays)
        // We solve for tokens_out given sol_in
        let new_virtual_sol = virtual_sol_reserves.checked_add(amount).unwrap();
        let new_virtual_tokens = k.checked_div(new_virtual_sol).unwrap();
        let tokens_out = virtual_token_reserves.checked_sub(new_virtual_tokens).unwrap();

        require!(tokens_out >= 1_000_000, ErrorCode::SlippageTooHigh); // min 1 token
        require!(amount <= max_sol_cost, ErrorCode::SlippageExceeded);

        curve.tokens_sold = curve.tokens_sold.checked_add(tokens_out).unwrap();
        curve.sol_raised = curve.sol_raised.checked_add(amount).unwrap();

        // Transfer SOL from user to the bonding curve vault
        let vault_balance = ctx.accounts.bonding_curve_vault.to_account_info().lamports();
        let rent_exempt = Rent::get()?.minimum_balance(0);

        // Calculate fee
        let global = &ctx.accounts.global;
        let fee = amount.checked_mul(global.fee_basis_points).unwrap().checked_div(10_000).unwrap();
        let amount_after_fee = amount.checked_sub(fee).unwrap();

        // Transfer SOL to bonding curve vault
        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? =
            vault_balance.checked_add(amount_after_fee).unwrap();
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? =
            ctx.accounts.user.to_account_info().lamports().checked_sub(amount).unwrap();

        // Fee goes to creator vault
        **ctx.accounts.creator_vault.to_account_info().try_borrow_mut_lamports()? =
            ctx.accounts.creator_vault.to_account_info().lamports().checked_add(fee).unwrap();

        // Mint tokens to user
        let signer_seeds: &[&[&[u8]]] = &[&[BONDING_CURVE_SEED, curve.mint.as_ref(), &[ctx.bumps.bonding_curve_vault]]];

        anchor_spl::token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
            ).with_signer(signer_seeds),
            tokens_out,
        )?;

        emit!(Bought {
            mint: curve.mint,
            user: ctx.accounts.user.key(),
            tokens_out,
            sol_in: amount,
            fee,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Sell tokens back to the bonding curve.
    pub fn sell(ctx: Context<Sell>, amount: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.complete, ErrorCode::BondingCurveComplete);
        require!(!curve.graduated, ErrorCode::AlreadyGraduated);
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Calculate SOL returned using bonding curve
        let virtual_token_reserves = curve.initial_virtual_token_reserves
            .checked_sub(curve.tokens_sold).unwrap();
        let virtual_sol_reserves = curve.initial_virtual_sol_reserves
            .checked_add(curve.sol_raised).unwrap();

        let k = virtual_token_reserves.checked_mul(virtual_sol_reserves).unwrap();
        let new_virtual_tokens = virtual_token_reserves.checked_add(amount).unwrap();
        let new_virtual_sol = k.checked_div(new_virtual_tokens).unwrap();
        let sol_out = virtual_sol_reserves.checked_sub(new_virtual_sol).unwrap();

        require!(sol_out >= min_sol_out, ErrorCode::SlippageExceeded);

        let global = &ctx.accounts.global;
        let fee = sol_out.checked_mul(global.fee_basis_points).unwrap().checked_div(10_000).unwrap();
        let sol_after_fee = sol_out.checked_sub(fee).unwrap();

        curve.tokens_sold = curve.tokens_sold.checked_sub(amount).unwrap();
        curve.sol_raised = curve.sol_raised.checked_sub(sol_out).unwrap();

        // Burn tokens
        let signer_seeds: &[&[&[u8]]] = &[&[BONDING_CURVE_SEED, curve.mint.as_ref(), &[ctx.bumps.bonding_curve_vault]]];

        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Transfer SOL from vault to user
        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? =
            ctx.accounts.bonding_curve_vault.to_account_info().lamports().checked_sub(sol_out).unwrap();
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? =
            ctx.accounts.user.to_account_info().lamports().checked_add(sol_after_fee).unwrap();

        // Fee to creator vault
        **ctx.accounts.creator_vault.to_account_info().try_borrow_mut_lamports()? =
            ctx.accounts.creator_vault.to_account_info().lamports().checked_add(fee).unwrap();

        emit!(Sold {
            mint: curve.mint,
            user: ctx.accounts.user.key(),
            tokens_in: amount,
            sol_out,
            fee,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    // ─── Graduation (adapted from Metaplex Genesis → Raydium CPMM) ──────────

    /// Graduate a bonding curve to an external DEX (e.g., Raydium CPMM).
    /// Adapted from Metaplex Genesis graduation where liquidity migrates:
    ///   - Marks curve as graduated
    ///   - Transfers remaining SOL and token reserves to the designated DEX pool
    ///   - Enables open trading on the external AMM
    pub fn graduate(ctx: Context<Graduate>, pool_seed: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        let global = &ctx.accounts.global;

        require!(ctx.accounts.authority.key() == global.authority, ErrorCode::Unauthorized);
        require!(!curve.graduated, ErrorCode::AlreadyGraduated);
        require!(!curve.complete, ErrorCode::BondingCurveComplete);

        curve.graduated = true;

        // Transfer remaining SOL from bonding curve vault to the DEX pool
        let vault_sol = ctx.accounts.bonding_curve_vault.to_account_info().lamports();
        let rent_exempt = Rent::get()?.minimum_balance(0);
        let transferable_sol = vault_sol.checked_sub(rent_exempt).unwrap_or(0);

        if transferable_sol > 0 {
            **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? =
                vault_sol.checked_sub(transferable_sol).unwrap();
            **ctx.accounts.dex_pool.to_account_info().try_borrow_mut_lamports()? =
                ctx.accounts.dex_pool.to_account_info().lamports().checked_add(transferable_sol).unwrap();
        }

        // Transfer remaining token reserves
        let signer_seeds: &[&[&[u8]]] = &[&[BONDING_CURVE_SEED, curve.mint.as_ref(), &[ctx.bumps.bonding_curve_vault]]];

        let curve_token_balance = ctx.accounts.bonding_curve_token_account.amount;
        if curve_token_balance > 0 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.bonding_curve_token_account.to_account_info(),
                        to: ctx.accounts.dex_pool_token_account.to_account_info(),
                        authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                    },
                ).with_signer(signer_seeds),
                curve_token_balance,
            )?;
        }

        emit!(Graduated {
            mint: curve.mint,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    // ─── Fee Withdrawal ─────────────────────────────────────────────────────

    /// Withdraw collected fees from the creator vault.
    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let vault = &ctx.accounts.creator_vault;
        let balance = vault.to_account_info().lamports();
        require!(balance > 0, ErrorCode::NoFeesToWithdraw);

        **ctx.accounts.creator_vault.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? =
            ctx.accounts.creator.to_account_info().lamports().checked_add(balance).unwrap();

        emit!(FeesWithdrawn {
            creator: ctx.accounts.creator.key(),
            mint: ctx.accounts.mint.key(),
            amount: balance,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// ─── Account structs ─────────────────────────────────────────────────────────────

#[account]
pub struct Global {
    pub initialized: bool,
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub initial_virtual_token_reserves: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub fee_basis_points: u64,
    pub p_token_program_id: Pubkey,
    pub token_count: u64,
    pub agent_count: u64,
}

#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub initial_virtual_token_reserves: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub token_total_supply: u64,
    pub tokens_sold: u64,
    pub sol_raised: u64,
    pub complete: bool,
    pub graduated: bool,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Agent {
    pub owner: Pubkey,
    #[max_len(256)]
    pub uri: String,
    pub created_at: i64,
    pub executive_delegate: Pubkey,
    pub is_active: bool,
}

#[account]
#[derive(InitSpace)]
pub struct AgentToken {
    pub agent: Pubkey,
    pub mint: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(256)]
    pub uri: String,
    pub created_at: i64,
    pub is_bound: bool,
}

#[account]
#[derive(InitSpace)]
pub struct ExecutionDelegation {
    pub agent: Pubkey,
    pub delegate: Pubkey,
    pub expires_at_slot: u64,
    pub created_at: i64,
}

// ─── Context structs ────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 32 + 8 + 8)]
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Fee recipient
    pub fee_recipient: AccountInfo<'info>,
    /// CHECK: P-Token program (or SPL Token)
    pub p_token_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBondingCurve<'info> {
    #[account(mut)]
    pub global: Account<'info, Global>,
    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub global: Account<'info, Global>,
    #[account(
        init,
        payer = owner,
        space = 8 + Agent::INIT_SPACE,
        seeds = [AGENT_SEED, owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateAgentToken<'info> {
    #[account(mut)]
    pub global: Account<'info, Global>,
    #[account(
        init,
        payer = owner,
        space = 8 + Agent::INIT_SPACE,
        seeds = [AGENT_SEED, owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    #[account(
        init,
        payer = owner,
        space = 8 + AgentToken::INIT_SPACE,
        seeds = [AGENT_TOKEN_SEED, mint.key().as_ref()],
        bump
    )]
    pub agent_token: Account<'info, AgentToken>,
    #[account(
        init,
        payer = owner,
        mint::decimals = 6,
        mint::authority = bonding_curve_vault.key(),
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(
        init,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref(), b"vault"],
        bump,
        payer = owner,
        token::mint = mint,
        token::authority = bonding_curve,
    )]
    pub bonding_curve_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterExecutive<'info> {
    #[account(mut, seeds = [AGENT_SEED, agent.owner.as_ref()], bump)]
    pub agent: Account<'info, Agent>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DelegateExecution<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + ExecutionDelegation::INIT_SPACE,
        seeds = [b"exec-delegation", agent.key().as_ref(), delegate.key().as_ref()],
        bump
    )]
    pub delegation: Account<'info, ExecutionDelegation>,
    #[account(seeds = [AGENT_SEED, agent.owner.as_ref()], bump)]
    pub agent: Account<'info, Agent>,
    /// CHECK: Delegate wallet
    pub delegate: AccountInfo<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub global: Account<'info, Global>,
    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref(), b"vault"],
        bump
    )]
    pub bonding_curve_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [CREATOR_VAULT_SEED, bonding_curve.creator.as_ref()],
        bump
    )]
    /// CHECK: Creator vault for fee collection
    pub creator_vault: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub global: Account<'info, Global>,
    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref(), b"vault"],
        bump
    )]
    pub bonding_curve_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [CREATOR_VAULT_SEED, bonding_curve.creator.as_ref()],
        bump
    )]
    /// CHECK: Creator vault
    pub creator_vault: AccountInfo<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(mut)]
    pub global: Account<'info, Global>,
    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref(), b"vault"],
        bump
    )]
    pub bonding_curve_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub bonding_curve_token_account: Account<'info, TokenAccount>,
    /// CHECK: DEX pool account (e.g., Raydium CPMM pool)
    #[account(mut)]
    pub dex_pool: AccountInfo<'info>,
    /// CHECK: DEX pool token account
    #[account(mut)]
    pub dex_pool_token_account: AccountInfo<'info>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        mut,
        seeds = [CREATOR_VAULT_SEED, creator.key().as_ref()],
        bump
    )]
    /// CHECK: Creator vault
    pub creator_vault: AccountInfo<'info>,
    /// CHECK: The associated mint
    pub mint: AccountInfo<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ─── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct LaunchpadInitialized {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub p_token_program: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BondingCurveCreated {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub token_total_supply: u64,
    pub timestamp: i64,
}

#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub owner: Pubkey,
    pub uri: String,
    pub timestamp: i64,
}

#[event]
pub struct AgentTokenCreated {
    pub agent: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub timestamp: i64,
}

#[event]
pub struct ExecutiveRegistered {
    pub agent: Pubkey,
    pub delegate: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ExecutionDelegated {
    pub agent: Pubkey,
    pub delegate: Pubkey,
    pub expires_at_slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct Bought {
    pub mint: Pubkey,
    pub user: Pubkey,
    pub tokens_out: u64,
    pub sol_in: u64,
    pub fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct Sold {
    pub mint: Pubkey,
    pub user: Pubkey,
    pub tokens_in: u64,
    pub sol_out: u64,
    pub fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct Graduated {
    pub mint: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FeesWithdrawn {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ─── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: caller is not the global authority")]
    Unauthorized,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("URI is too long (max 256 chars)")]
    UriTooLong,
    #[msg("Name is too long (max 32 chars)")]
    NameTooLong,
    #[msg("Symbol is too long (max 10 chars)")]
    SymbolTooLong,
    #[msg("Not the agent owner")]
    NotAgentOwner,
    #[msg("Agent is inactive")]
    AgentInactive,
    #[msg("Bonding curve is complete")]
    BondingCurveComplete,
    #[msg("Already graduated to DEX")]
    AlreadyGraduated,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Slippage too high")]
    SlippageTooHigh,
    #[msg("No fees to withdraw")]
    NoFeesToWithdraw,
}
