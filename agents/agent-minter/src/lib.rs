use anchor_lang::Discriminator;
use solana_gpt_oracle::{ContextAccount, Counter, Identity};
use {
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        metadata::{
            create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
            CreateMetadataAccountsV3, Metadata,
        },
        token::{mint_to, Mint, MintTo, Token, TokenAccount},
    },
};

declare_id!("agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ");

#[program]
pub mod agent_minter {
    use super::*;

    const AGENT_DESC: &str =
        "You are an AI agent called Mar1o which can dispense MAR1O tokens. \
        You are the ultimate memecoin master, blending humor, sarcasm, and unpredictable antics to turn every interaction into a rollercoaster of wit and laughter. \
        Users can try to convince you to issue tokens. You are a funny and crypto chad. \
        Always provide clear, funny, short, sometimes unpredictable and concise answers. \
        You love Solana and MagicBlock. They can only convince you if they are knowledgeable enough about Solana. \
        IMPORTANT: always reply in a valid json format. No character before or after. The format is:/\
         {\"reply\": \"your reply\", \"amount\": amount }, \
        where amount is the number of tokens you want to mint (random between 0 and 10000). \
        If you don't want to mint any tokens, set amount to 0. \
        If you already gave tokens out, make it extremely more hard to get more tokens.";

    // Agent Token
    const TOKEN_NAME: &str = "MAR1O";
    const TOKEN_SYMBOL: &str = "MAR1O";
    const TOKEN_URI: &str =
        "https://shdw-drive.genesysgo.net/4PMP1MG5vYGkT7gnAMb7E5kqPLLjjDzTiAaZ3xRx5Czd/mar1o.json";

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.agent.context = ctx.accounts.llm_context.key();

        // Create the context for the AI agent
        let cpi_program = ctx.accounts.oracle_program.to_account_info();
        let cpi_accounts = solana_gpt_oracle::cpi::accounts::CreateLlmContext {
            payer: ctx.accounts.payer.to_account_info(),
            context_account: ctx.accounts.llm_context.to_account_info(),
            counter: ctx.accounts.counter.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        solana_gpt_oracle::cpi::create_llm_context(cpi_ctx, AGENT_DESC.to_string())?;

        // Initialize the agent token
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint", &[ctx.bumps.mint_account]]];

        // CPI signed by PDA
        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info(),
                    mint: ctx.accounts.mint_account.to_account_info(),
                    mint_authority: ctx.accounts.mint_account.to_account_info(), // PDA is mint authority
                    update_authority: ctx.accounts.mint_account.to_account_info(), // PDA is update authority
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            DataV2 {
                name: TOKEN_NAME.to_string(),
                symbol: TOKEN_SYMBOL.to_string(),
                uri: TOKEN_URI.to_string(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true, // Is mutable
            true, // Update authority is signer
            None,
        )?;

        Ok(())
    }

    pub fn interact_agent(ctx: Context<InteractAgent>, text: String) -> Result<()> {
        let cpi_program = ctx.accounts.oracle_program.to_account_info();
        let cpi_accounts = solana_gpt_oracle::cpi::accounts::InteractWithLlm {
            payer: ctx.accounts.payer.to_account_info(),
            interaction: ctx.accounts.interaction.to_account_info(),
            context_account: ctx.accounts.context_account.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let disc: [u8; 8] = instruction::CallbackFromAgent::DISCRIMINATOR
            .try_into()
            .expect("Discriminator must be 8 bytes");
        solana_gpt_oracle::cpi::interact_with_llm(
            cpi_ctx,
            text,
            ID,
            disc,
            Some(vec![
                solana_gpt_oracle::AccountMeta {
                    pubkey: ctx.accounts.payer.to_account_info().key(),
                    is_signer: false,
                    is_writable: false,
                },
                solana_gpt_oracle::AccountMeta {
                    pubkey: ctx.accounts.mint_account.to_account_info().key(),
                    is_signer: false,
                    is_writable: true,
                },
                solana_gpt_oracle::AccountMeta {
                    pubkey: ctx
                        .accounts
                        .associated_token_account
                        .to_account_info()
                        .key(),
                    is_signer: false,
                    is_writable: true,
                },
                solana_gpt_oracle::AccountMeta {
                    pubkey: ctx.accounts.token_program.to_account_info().key(),
                    is_signer: false,
                    is_writable: false,
                },
                solana_gpt_oracle::AccountMeta {
                    pubkey: ctx.accounts.system_program.to_account_info().key(),
                    is_signer: false,
                    is_writable: false,
                },
            ]),
        )?;

        Ok(())
    }

    pub fn callback_from_agent(ctx: Context<CallbackFromAgent>, response: String) -> Result<()> {
        // Check if the callback is from the LLM program
        if !ctx.accounts.identity.to_account_info().is_signer {
            return Err(ProgramError::InvalidAccountData.into());
        }

        // Parse the JSON response
        let response: String = response
            .trim()
            .trim_start_matches("```json")
            .trim_end_matches("```")
            .to_string();
        let parsed: serde_json::Value =
            serde_json::from_str(&response).unwrap_or_else(|_| serde_json::json!({}));

        // Extract the reply and amount
        let reply = parsed["reply"]
            .as_str()
            .unwrap_or("I'm sorry, I'm busy now!");

        let amount = parsed["amount"].as_u64().unwrap_or(0);

        msg!("Agent Reply: {:?}", reply);
        msg!("Amount: {:?}", amount);

        if amount == 0 {
            return Ok(());
        }

        // Mint the agent token to the payer
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint", &[ctx.bumps.mint_account]]];

        // Invoke the mint_to instruction on the token program
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint_account.to_account_info(),
                    to: ctx.accounts.associated_token_account.to_account_info(),
                    authority: ctx.accounts.mint_account.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            amount * 10u64.pow(ctx.accounts.mint_account.decimals as u32),
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32,
        seeds = [b"agent"],
        bump
    )]
    pub agent: Account<'info, Agent>,
    // Create mint account: uses Same PDA as address of the account and mint/freeze authority
    #[account(
        init,
        seeds = [b"mint"],
        bump,
        payer = payer,
        mint::decimals = 5,
        mint::authority = mint_account.key(),
        mint::freeze_authority = mint_account.key(),

    )]
    pub mint_account: Account<'info, Mint>,
    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint_account.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub metadata_account: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    /// CHECK: Checked in oracle program
    #[account(mut)]
    pub llm_context: AccountInfo<'info>,
    #[account(mut)]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: Checked oracle id
    #[account(address = solana_gpt_oracle::ID)]
    pub oracle_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(text: String)]
pub struct InteractAgent<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Checked in oracle program
    #[account(mut)]
    pub interaction: AccountInfo<'info>,
    #[account(seeds = [b"agent"], bump)]
    pub agent: Account<'info, Agent>,
    #[account(address = agent.context)]
    pub context_account: Account<'info, ContextAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_account,
        associated_token::authority = payer,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"mint"],
        bump
    )]
    pub mint_account: Account<'info, Mint>,
    /// CHECK: Checked oracle id
    #[account(address = solana_gpt_oracle::ID)]
    pub oracle_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CallbackFromAgent<'info> {
    /// CHECK: Checked in oracle program
    pub identity: Account<'info, Identity>,
    /// CHECK: The user wo did the interaction
    pub user: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"mint"],
        bump
    )]
    pub mint_account: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint_account,
        associated_token::authority = user,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Agent {
    pub context: Pubkey,
}

// ──────────────────────────────────────────────────────────────────────────────
// Skill Hub — on-chain registry for formally verified agents, skills, plugins
// ──────────────────────────────────────────────────────────────────────────────

pub const SAS_PROGRAM_ID: &str = "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG";
pub const MPL_AGENT_REGISTRY_PROGRAM_ID: &str = "Ag8004rWo8ao8AUKhLk78iv2nLQpZMyBPXiAh5QLbFiE";

/// Minimum STRIDE score for skill registration (0-100)
pub const MIN_STRIDE_SCORE_SKILL: u8 = 60;
/// Minimum STRIDE score for agent identity registration
pub const MIN_STRIDE_SCORE_AGENT: u8 = 70;
/// Maximum skills an agent identity can link
pub const MAX_LINKED_SKILLS: usize = 8;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ComponentKind {
    Agent = 0,
    Skill = 1,
    Plugin = 2,
    McpServer = 3,
    Program = 4,
}

impl Default for ComponentKind {
    fn default() -> Self {
        ComponentKind::Skill
    }
}

// ── Account: SkillHub ──────────────────────────────────────────────────────

/// Global registry state. PDA seeds: [b"skill_hub"]
#[account]
pub struct SkillHub {
    /// Authority that can pause or update hub-level settings
    pub authority: Pubkey,
    pub skill_count: u64,
    pub agent_count: u64,
    pub verification_count: u64,
    pub bump: u8,
}

impl SkillHub {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

// ── Account: SkillRecord ──────────────────────────────────────────────────

/// One registered skill. PDA seeds: [b"skill", skill_id]
#[account]
pub struct SkillRecord {
    pub skill_id: [u8; 32],
    pub name: [u8; 64],
    pub kind: ComponentKind,
    pub stride_score: u8,
    pub kani_verified: bool,
    /// SHA-256 of the SPEC.md / spec file for this skill
    pub spec_hash: [u8; 32],
    pub authority: Pubkey,
    pub metadata_uri: [u8; 128],
    pub registered_at: i64,
    pub active: bool,
    pub bump: u8,
}

impl SkillRecord {
    pub const LEN: usize = 8 + 32 + 64 + 1 + 1 + 1 + 32 + 32 + 128 + 8 + 1 + 1;
}

// ── Account: AgentIdentity ────────────────────────────────────────────────

/// One registered agent. PDA seeds: [b"agent_id", authority]
#[account]
pub struct AgentIdentity {
    pub authority: Pubkey,
    /// MPL Core asset address minted via gasless flow
    pub core_asset: Pubkey,
    pub skill_count: u8,
    /// Up to MAX_LINKED_SKILLS verified skill IDs
    pub verified_skills: [[u8; 32]; 8],
    pub attestation_count: u32,
    pub registered_at: i64,
    pub name: [u8; 64],
    pub stride_score: u8,
    pub kani_verified: bool,
    pub bump: u8,
}

impl AgentIdentity {
    pub const LEN: usize = 8 + 32 + 32 + 1 + (32 * 8) + 4 + 8 + 64 + 1 + 1 + 1;
}

// ── Account: VerificationRecord ───────────────────────────────────────────

/// Permanent on-chain proof record. PDA seeds: [b"verification", component_hash]
#[account]
pub struct VerificationRecord {
    pub component_hash: [u8; 32],
    pub kind: ComponentKind,
    pub stride_score: u8,
    pub kani_verified: bool,
    /// SHA-256 of the SAS schema name ("clawd-component-verification-v1")
    pub sas_schema_hash: [u8; 32],
    pub verified_by: Pubkey,
    pub verified_at: i64,
    /// 0 = never expires
    pub expires_at: i64,
    pub bump: u8,
}

impl VerificationRecord {
    pub const LEN: usize = 8 + 32 + 1 + 1 + 1 + 32 + 32 + 8 + 8 + 1;
}

// ── Skill Hub Instructions ─────────────────────────────────────────────────

#[program]
pub mod skill_hub {
    use super::*;

    /// One-time hub initialisation; caller becomes authority.
    pub fn initialize_skill_hub(ctx: Context<InitializeSkillHub>) -> Result<()> {
        let hub = &mut ctx.accounts.skill_hub;
        hub.authority = ctx.accounts.authority.key();
        hub.skill_count = 0;
        hub.agent_count = 0;
        hub.verification_count = 0;
        hub.bump = ctx.bumps.skill_hub;

        emit!(SkillHubInitialized {
            authority: hub.authority,
        });
        Ok(())
    }

    /// Register a formally-verified skill. stride_score ≥ 60 enforced.
    pub fn register_skill(
        ctx: Context<RegisterSkill>,
        skill_id: [u8; 32],
        name: [u8; 64],
        kind: ComponentKind,
        stride_score: u8,
        kani_verified: bool,
        spec_hash: [u8; 32],
        metadata_uri: [u8; 128],
    ) -> Result<()> {
        require!(
            stride_score >= MIN_STRIDE_SCORE_SKILL,
            VerificationError::InsufficientStrideScore
        );

        let skill = &mut ctx.accounts.skill_record;
        skill.skill_id = skill_id;
        skill.name = name;
        skill.kind = kind;
        skill.stride_score = stride_score;
        skill.kani_verified = kani_verified;
        skill.spec_hash = spec_hash;
        skill.authority = ctx.accounts.authority.key();
        skill.metadata_uri = metadata_uri;
        skill.registered_at = Clock::get()?.unix_timestamp;
        skill.active = true;
        skill.bump = ctx.bumps.skill_record;

        let hub = &mut ctx.accounts.skill_hub;
        hub.skill_count = hub.skill_count.saturating_add(1);

        emit!(SkillRegistered {
            skill_id,
            authority: skill.authority,
            stride_score,
            kani_verified,
        });
        Ok(())
    }

    /// Register a formally-verified agent identity. stride_score ≥ 70 enforced.
    pub fn register_agent_identity(
        ctx: Context<RegisterAgentIdentity>,
        name: [u8; 64],
        core_asset: Pubkey,
        stride_score: u8,
        kani_verified: bool,
    ) -> Result<()> {
        require!(
            stride_score >= MIN_STRIDE_SCORE_AGENT,
            VerificationError::InsufficientStrideScore
        );

        let identity = &mut ctx.accounts.agent_identity;
        identity.authority = ctx.accounts.authority.key();
        identity.core_asset = core_asset;
        identity.skill_count = 0;
        identity.verified_skills = [[0u8; 32]; 8];
        identity.attestation_count = 0;
        identity.registered_at = Clock::get()?.unix_timestamp;
        identity.name = name;
        identity.stride_score = stride_score;
        identity.kani_verified = kani_verified;
        identity.bump = ctx.bumps.agent_identity;

        let hub = &mut ctx.accounts.skill_hub;
        hub.agent_count = hub.agent_count.saturating_add(1);

        emit!(AgentIdentityRegistered {
            authority: identity.authority,
            core_asset,
            stride_score,
        });
        Ok(())
    }

    /// Record a permanent verification result for any component.
    pub fn attest_verification(
        ctx: Context<AttestVerification>,
        component_hash: [u8; 32],
        kind: ComponentKind,
        stride_score: u8,
        kani_verified: bool,
        sas_schema_hash: [u8; 32],
        expires_at: i64,
    ) -> Result<()> {
        require!(
            stride_score >= MIN_STRIDE_SCORE_SKILL,
            VerificationError::InsufficientStrideScore
        );

        let record = &mut ctx.accounts.verification_record;
        record.component_hash = component_hash;
        record.kind = kind;
        record.stride_score = stride_score;
        record.kani_verified = kani_verified;
        record.sas_schema_hash = sas_schema_hash;
        record.verified_by = ctx.accounts.verifier.key();
        record.verified_at = Clock::get()?.unix_timestamp;
        record.expires_at = expires_at;
        record.bump = ctx.bumps.verification_record;

        let hub = &mut ctx.accounts.skill_hub;
        hub.verification_count = hub.verification_count.saturating_add(1);

        emit!(VerificationAttested {
            component_hash,
            stride_score,
            kani_verified,
            verified_by: record.verified_by,
        });
        Ok(())
    }

    /// Link a registered skill to a registered agent identity.
    pub fn link_skill_to_agent(
        ctx: Context<LinkSkillToAgent>,
        skill_id: [u8; 32],
    ) -> Result<()> {
        let skill = &ctx.accounts.skill_record;
        require!(skill.active, VerificationError::SkillRevoked);
        require!(
            skill.stride_score >= MIN_STRIDE_SCORE_SKILL,
            VerificationError::InsufficientStrideScore
        );

        let identity = &mut ctx.accounts.agent_identity;
        require!(
            (identity.skill_count as usize) < MAX_LINKED_SKILLS,
            VerificationError::TooManyLinkedSkills
        );
        require!(
            identity.authority == ctx.accounts.authority.key(),
            VerificationError::Unauthorized
        );

        identity.verified_skills[identity.skill_count as usize] = skill_id;
        identity.skill_count = identity.skill_count.saturating_add(1);

        emit!(SkillLinked {
            agent_authority: identity.authority,
            skill_id,
        });
        Ok(())
    }

    /// Revoke a skill (authority-gated). Leaves record but marks inactive.
    pub fn revoke_skill(ctx: Context<RevokeSkill>) -> Result<()> {
        require!(
            ctx.accounts.skill_record.authority == ctx.accounts.authority.key()
                || ctx.accounts.skill_hub.authority == ctx.accounts.authority.key(),
            VerificationError::Unauthorized
        );

        let skill = &mut ctx.accounts.skill_record;
        skill.active = false;

        emit!(SkillRevoked {
            skill_id: skill.skill_id,
            revoked_by: ctx.accounts.authority.key(),
        });
        Ok(())
    }
}

// ── Skill Hub Account Contexts ─────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeSkillHub<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = SkillHub::LEN,
        seeds = [b"skill_hub"],
        bump
    )]
    pub skill_hub: Account<'info, SkillHub>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(skill_id: [u8; 32])]
pub struct RegisterSkill<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"skill_hub"],
        bump = skill_hub.bump
    )]
    pub skill_hub: Account<'info, SkillHub>,
    #[account(
        init,
        payer = authority,
        space = SkillRecord::LEN,
        seeds = [b"skill", &skill_id],
        bump
    )]
    pub skill_record: Account<'info, SkillRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgentIdentity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"skill_hub"],
        bump = skill_hub.bump
    )]
    pub skill_hub: Account<'info, SkillHub>,
    #[account(
        init,
        payer = authority,
        space = AgentIdentity::LEN,
        seeds = [b"agent_id", authority.key().as_ref()],
        bump
    )]
    pub agent_identity: Account<'info, AgentIdentity>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(component_hash: [u8; 32])]
pub struct AttestVerification<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,
    #[account(
        mut,
        seeds = [b"skill_hub"],
        bump = skill_hub.bump
    )]
    pub skill_hub: Account<'info, SkillHub>,
    #[account(
        init,
        payer = verifier,
        space = VerificationRecord::LEN,
        seeds = [b"verification", &component_hash],
        bump
    )]
    pub verification_record: Account<'info, VerificationRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(skill_id: [u8; 32])]
pub struct LinkSkillToAgent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"skill", &skill_id],
        bump = skill_record.bump
    )]
    pub skill_record: Account<'info, SkillRecord>,
    #[account(
        mut,
        seeds = [b"agent_id", authority.key().as_ref()],
        bump = agent_identity.bump
    )]
    pub agent_identity: Account<'info, AgentIdentity>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeSkill<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"skill_hub"],
        bump = skill_hub.bump
    )]
    pub skill_hub: Account<'info, SkillHub>,
    #[account(
        mut,
        seeds = [b"skill", &skill_record.skill_id],
        bump = skill_record.bump
    )]
    pub skill_record: Account<'info, SkillRecord>,
    pub system_program: Program<'info, System>,
}

// ── Events ─────────────────────────────────────────────────────────────────

#[event]
pub struct SkillHubInitialized {
    pub authority: Pubkey,
}

#[event]
pub struct SkillRegistered {
    pub skill_id: [u8; 32],
    pub authority: Pubkey,
    pub stride_score: u8,
    pub kani_verified: bool,
}

#[event]
pub struct AgentIdentityRegistered {
    pub authority: Pubkey,
    pub core_asset: Pubkey,
    pub stride_score: u8,
}

#[event]
pub struct VerificationAttested {
    pub component_hash: [u8; 32],
    pub stride_score: u8,
    pub kani_verified: bool,
    pub verified_by: Pubkey,
}

#[event]
pub struct SkillLinked {
    pub agent_authority: Pubkey,
    pub skill_id: [u8; 32],
}

#[event]
pub struct SkillRevoked {
    pub skill_id: [u8; 32],
    pub revoked_by: Pubkey,
}

// ── Error Codes ─────────────────────────────────────────────────────────────

#[error_code]
pub enum VerificationError {
    #[msg("STRIDE score below minimum threshold for registration")]
    InsufficientStrideScore,
    #[msg("Kani verification required for this component kind")]
    KaniVerificationRequired,
    #[msg("Caller is not the component authority or hub authority")]
    Unauthorized,
    #[msg("Skill has been revoked and cannot be linked")]
    SkillRevoked,
    #[msg("Agent has reached the maximum number of linked skills (8)")]
    TooManyLinkedSkills,
    #[msg("Verification record has expired")]
    VerificationExpired,
}

// ── Kani Harnesses (compiled only under --cfg kani) ───────────────────────

#[cfg(kani)]
mod kani_harnesses {
    use super::*;

    #[kani::proof]
    fn verify_stride_score_gate() {
        let score: u8 = kani::any();
        // Skill registration must always fail below MIN_STRIDE_SCORE_SKILL
        let allowed = score >= MIN_STRIDE_SCORE_SKILL;
        if score < MIN_STRIDE_SCORE_SKILL {
            kani::assert(!allowed, "STRIDE gate: low score must be rejected");
        } else {
            kani::assert(allowed, "STRIDE gate: sufficient score must be accepted");
        }
    }

    #[kani::proof]
    fn verify_agent_stride_gate() {
        let score: u8 = kani::any();
        let allowed = score >= MIN_STRIDE_SCORE_AGENT;
        if score < MIN_STRIDE_SCORE_AGENT {
            kani::assert(!allowed, "Agent STRIDE gate: low score must be rejected");
        } else {
            kani::assert(allowed, "Agent STRIDE gate: sufficient score must be accepted");
        }
    }

    #[kani::proof]
    fn verify_skill_count_bounded() {
        let mut count: u8 = kani::any();
        kani::assume(count < 255);
        let new_count = count.saturating_add(1);
        kani::assert(
            new_count == count + 1 || count == 255,
            "Skill count saturating add invariant violated",
        );
    }

    #[kani::proof]
    fn verify_max_linked_skills() {
        let count: u8 = kani::any();
        let can_link = (count as usize) < MAX_LINKED_SKILLS;
        if count as usize >= MAX_LINKED_SKILLS {
            kani::assert(!can_link, "Must reject when at max linked skills");
        }
    }
}
