use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc");

// ============================================================================
// CONSTANTS
// ============================================================================

/// Minimum stake required to become a validator (1_000_000 with 6 decimals)
pub const MIN_VALIDATOR_STAKE: u64 = 1_000_000;

/// Maximum string length for model CID / hashes
pub const MAX_HASH_LEN: usize = 128;

/// Maximum string length for API endpoints
pub const MAX_ENDPOINT_LEN: usize = 256;

/// Maximum string length for metadata fields
pub const MAX_METADATA_LEN: usize = 256;

/// Maximum string length for inference input data
pub const MAX_INPUT_DATA_LEN: usize = 512;

/// Maximum string length for prediction output
pub const MAX_PREDICTION_LEN: usize = 512;

/// Maximum string length for DNA hash
pub const MAX_DNA_HASH_LEN: usize = 128;

/// Confidence is stored as basis points (0–10_000 = 0.00%–100.00%)
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Staking reward base rate: 10 bps per day per token (0.10%)
pub const REWARD_BASE_RATE_BPS: u64 = 10;

/// Seconds per day
pub const SECONDS_PER_DAY: i64 = 86_400;

/// Lock tier durations
pub const LOCK_1_DAY: u64 = 86_400;
pub const LOCK_1_WEEK: u64 = 604_800;
pub const LOCK_1_MONTH: u64 = 2_592_000;
pub const LOCK_3_MONTHS: u64 = 7_776_000;
pub const LOCK_6_MONTHS: u64 = 15_552_000;
pub const LOCK_1_YEAR: u64 = 31_536_000;

/// Slash percentage in basis points (5% = 500 bps)
pub const SLASH_RATE_BPS: u64 = 500;

/// Minimum confidence threshold in bps
pub const MIN_CONFIDENCE_BPS: u64 = 100; // 1%

/// Maximum processing time before quality penalty (ms)
pub const MAX_PROCESSING_TIME_MS: u64 = 10_000;

/// Protocol fee in basis points on inference payments
pub const PROTOCOL_FEE_BPS: u64 = 250; // 2.5%

/// Cooldown period after unstake request (seconds)
pub const UNSTAKE_COOLDOWN: i64 = 172_800; // 48 hours

/// Maximum validator reputation
pub const MAX_REPUTATION: u64 = 10_000;

/// Reputation gain per successful validation
pub const REPUTATION_GAIN: u64 = 10;

/// Reputation loss on slash
pub const REPUTATION_SLASH_PENALTY: u64 = 200;

/// Nonce counter seed for unique PDA derivation
pub const NONCE_SEED: &[u8] = b"nonce";

// ============================================================================
// PROGRAM
// ============================================================================

#[program]
pub mod solana_ai_inference {
    use super::*;

    // ────────────────────────────────────────────────────────────────────────
    // PROTOCOL ADMIN
    // ────────────────────────────────────────────────────────────────────────

    /// One-time protocol initialization. Creates the global config PDA.
    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        treasury: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.protocol_config;
        config.admin = ctx.accounts.admin.key();
        config.treasury = treasury;
        config.paused = false;
        config.total_models = 0;
        config.total_validators = 0;
        config.total_inferences = 0;
        config.total_staked = 0;
        config.protocol_fee_bps = PROTOCOL_FEE_BPS;
        config.created_at = Clock::get()?.unix_timestamp;
        config.bump = ctx.bumps.protocol_config;

        emit!(ProtocolInitialized {
            admin: config.admin,
            treasury,
        });

        Ok(())
    }

    /// Emergency pause / unpause (admin only).
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.protocol_config;
        config.paused = paused;

        emit!(ProtocolPauseToggled { paused });

        Ok(())
    }

    /// Transfer admin role (two-step: propose then accept).
    pub fn propose_admin(ctx: Context<AdminAction>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.protocol_config;
        config.pending_admin = Some(new_admin);

        emit!(AdminProposed {
            current: config.admin,
            proposed: new_admin,
        });

        Ok(())
    }

    /// Accept pending admin role.
    pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
        let config = &mut ctx.accounts.protocol_config;
        require!(
            config.pending_admin == Some(ctx.accounts.new_admin.key()),
            ErrorCode::UnauthorizedAdmin
        );
        let old = config.admin;
        config.admin = ctx.accounts.new_admin.key();
        config.pending_admin = None;

        emit!(AdminTransferred {
            old_admin: old,
            new_admin: config.admin,
        });

        Ok(())
    }

    /// Update protocol fee (admin only, capped at 10%).
    pub fn update_protocol_fee(ctx: Context<AdminAction>, new_fee_bps: u64) -> Result<()> {
        require!(new_fee_bps <= 1_000, ErrorCode::FeeTooHigh); // Max 10%
        let config = &mut ctx.accounts.protocol_config;
        config.protocol_fee_bps = new_fee_bps;

        emit!(ProtocolFeeUpdated {
            new_fee_bps,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // MODEL REGISTRY
    // ────────────────────────────────────────────────────────────────────────

    /// Register a new AI model. Uses a sequential nonce to allow multiple models per authority.
    pub fn initialize_model(
        ctx: Context<InitializeModel>,
        model_hash: String,
        model_type: ModelType,
        api_endpoint: String,
        inference_fee: u64,
        nonce: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(model_hash.len() <= MAX_HASH_LEN, ErrorCode::StringTooLong);
        require!(api_endpoint.len() <= MAX_ENDPOINT_LEN, ErrorCode::StringTooLong);

        let model = &mut ctx.accounts.model_registry;
        model.authority = ctx.accounts.authority.key();
        model.model_cid = model_hash;
        model.model_type = model_type;
        model.api_endpoint = api_endpoint;
        model.inference_fee = inference_fee;
        model.accuracy_bps = 0;
        model.training_complete = false;
        model.validation_count = 0;
        model.total_inferences = 0;
        model.total_revenue = 0;
        model.active = true;
        model.nonce = nonce;
        model.created_at = Clock::get()?.unix_timestamp;
        model.updated_at = model.created_at;
        model.bump = ctx.bumps.model_registry;

        // Update global counter
        let config = &mut ctx.accounts.protocol_config;
        config.total_models = config.total_models.checked_add(1).ok_or(ErrorCode::Overflow)?;

        emit!(ModelInitialized {
            model_id: model.key(),
            authority: model.authority,
            model_type,
            inference_fee,
            nonce,
        });

        Ok(())
    }

    /// Update model metadata (authority only).
    pub fn update_model(
        ctx: Context<UpdateModel>,
        api_endpoint: Option<String>,
        inference_fee: Option<u64>,
        active: Option<bool>,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);

        let model = &mut ctx.accounts.model_registry;

        if let Some(ep) = api_endpoint {
            require!(ep.len() <= MAX_ENDPOINT_LEN, ErrorCode::StringTooLong);
            model.api_endpoint = ep;
        }
        if let Some(fee) = inference_fee {
            model.inference_fee = fee;
        }
        if let Some(a) = active {
            model.active = a;
        }
        model.updated_at = Clock::get()?.unix_timestamp;

        emit!(ModelUpdated {
            model_id: model.key(),
        });

        Ok(())
    }

    /// Mark model training as complete and set accuracy (authority only).
    pub fn finalize_training(
        ctx: Context<UpdateModel>,
        accuracy_bps: u64,
    ) -> Result<()> {
        require!(accuracy_bps <= BPS_DENOMINATOR, ErrorCode::InvalidBps);
        let model = &mut ctx.accounts.model_registry;
        model.training_complete = true;
        model.accuracy_bps = accuracy_bps;
        model.updated_at = Clock::get()?.unix_timestamp;

        emit!(TrainingFinalized {
            model_id: model.key(),
            accuracy_bps,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // DATA SUBMISSIONS
    // ────────────────────────────────────────────────────────────────────────

    /// Submit a dataset for model training / validation. Nonce allows multiple submissions.
    pub fn submit_data(
        ctx: Context<SubmitData>,
        data_hash: String,
        data_type: DataType,
        data_size: u64,
        metadata: String,
        nonce: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(data_hash.len() <= MAX_HASH_LEN, ErrorCode::StringTooLong);
        require!(metadata.len() <= MAX_METADATA_LEN, ErrorCode::StringTooLong);
        require!(data_size > 0, ErrorCode::InvalidDataSize);

        let sub = &mut ctx.accounts.data_submission;
        sub.submitter = ctx.accounts.submitter.key();
        sub.data_hash = data_hash;
        sub.data_type = data_type;
        sub.data_size = data_size;
        sub.metadata = metadata;
        sub.quality_score = 0;
        sub.validated = false;
        sub.nonce = nonce;
        sub.submitted_at = Clock::get()?.unix_timestamp;
        sub.validated_at = None;
        sub.validator = None;
        sub.bump = ctx.bumps.data_submission;

        emit!(DataSubmitted {
            submission_id: sub.key(),
            submitter: sub.submitter,
            data_type,
            data_size,
            nonce,
        });

        Ok(())
    }

    /// Validate and rate a data submission (validators only).
    pub fn rate_data(
        ctx: Context<RateData>,
        quality_score: u8,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(quality_score <= 100, ErrorCode::InvalidQualityScore);

        let sub = &mut ctx.accounts.data_submission;
        require!(!sub.validated, ErrorCode::AlreadyValidated);

        // Prevent self-validation
        require!(
            sub.submitter != ctx.accounts.validator.key(),
            ErrorCode::SelfValidation
        );

        sub.quality_score = quality_score;
        sub.validated = true;
        sub.validated_at = Some(Clock::get()?.unix_timestamp);
        sub.validator = Some(ctx.accounts.validator.key());

        let va = &mut ctx.accounts.validator_account;
        va.validations_performed = va
            .validations_performed
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        va.reputation_score = va
            .reputation_score
            .checked_add(REPUTATION_GAIN)
            .ok_or(ErrorCode::Overflow)?
            .min(MAX_REPUTATION);

        emit!(DataRated {
            submission_id: sub.key(),
            validator: ctx.accounts.validator.key(),
            quality_score,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // INFERENCE
    // ────────────────────────────────────────────────────────────────────────

    /// Request an AI inference. Pays the model fee + protocol fee upfront.
    pub fn request_inference(
        ctx: Context<RequestInference>,
        input_data: String,
        confidence_threshold_bps: u64,
        nonce: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(input_data.len() <= MAX_INPUT_DATA_LEN, ErrorCode::StringTooLong);
        require!(
            confidence_threshold_bps >= MIN_CONFIDENCE_BPS
                && confidence_threshold_bps <= BPS_DENOMINATOR,
            ErrorCode::InvalidBps
        );

        let model = &ctx.accounts.model_registry;
        require!(model.active, ErrorCode::ModelInactive);
        require!(model.training_complete, ErrorCode::ModelNotTrained);

        // Calculate fees
        let model_fee = model.inference_fee;
        let protocol_fee = model_fee
            .checked_mul(ctx.accounts.protocol_config.protocol_fee_bps)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(ErrorCode::Overflow)?;
        let total_fee = model_fee
            .checked_add(protocol_fee)
            .ok_or(ErrorCode::Overflow)?;

        // Escrow total fee from requester
        let cpi_accounts = Transfer {
            from: ctx.accounts.requester_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.requester.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            total_fee,
        )?;

        let req = &mut ctx.accounts.inference_request;
        req.requester = ctx.accounts.requester.key();
        req.model_id = model.key();
        req.input_data = input_data;
        req.confidence_threshold_bps = confidence_threshold_bps;
        req.prediction = None;
        req.confidence_bps = None;
        req.processing_time_ms = None;
        req.quality_score = None;
        req.status = InferenceStatus::Pending;
        req.model_fee = model_fee;
        req.protocol_fee = protocol_fee;
        req.nonce = nonce;
        req.requested_at = Clock::get()?.unix_timestamp;
        req.completed_at = None;
        req.bump = ctx.bumps.inference_request;

        // Update global counter
        let config = &mut ctx.accounts.protocol_config;
        config.total_inferences = config
            .total_inferences
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        emit!(InferenceRequested {
            request_id: req.key(),
            requester: req.requester,
            model_id: req.model_id,
            total_fee,
            nonce,
        });

        Ok(())
    }

    /// Submit the result of an inference (model authority or authorized validator).
    pub fn submit_inference_result(
        ctx: Context<SubmitInferenceResult>,
        prediction: String,
        confidence_bps: u64,
        processing_time_ms: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(prediction.len() <= MAX_PREDICTION_LEN, ErrorCode::StringTooLong);
        require!(confidence_bps <= BPS_DENOMINATOR, ErrorCode::InvalidBps);

        let req = &mut ctx.accounts.inference_request;
        require!(
            req.status == InferenceStatus::Pending || req.status == InferenceStatus::Processing,
            ErrorCode::InvalidInferenceState
        );

        // Authorization: model owner OR active validator
        let is_model_owner =
            ctx.accounts.submitter.key() == ctx.accounts.model_registry.authority;
        let is_validator = ctx
            .accounts
            .validator_account
            .as_ref()
            .map_or(false, |v| v.validator == ctx.accounts.submitter.key());
        require!(
            is_model_owner || is_validator,
            ErrorCode::UnauthorizedOracle
        );

        req.prediction = Some(prediction.clone());
        req.confidence_bps = Some(confidence_bps);
        req.processing_time_ms = Some(processing_time_ms);
        req.status = InferenceStatus::Completed;
        req.completed_at = Some(Clock::get()?.unix_timestamp);

        let quality = calculate_quality_score(confidence_bps, processing_time_ms);
        req.quality_score = Some(quality);

        // Release escrowed model fee to model owner
        let model_id = req.model_id;
        let escrow_seeds = &[
            b"escrow",
            model_id.as_ref(),
            &[ctx.bumps.escrow_token_account],
        ];
        let signer = &[&escrow_seeds[..]];

        let cpi_model = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.model_owner_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_model,
                signer,
            ),
            req.model_fee,
        )?;

        // Send protocol fee to treasury
        let cpi_treasury = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_treasury,
                signer,
            ),
            req.protocol_fee,
        )?;

        // Update model stats
        let model = &mut ctx.accounts.model_registry;
        model.total_inferences = model
            .total_inferences
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        model.total_revenue = model
            .total_revenue
            .checked_add(req.model_fee)
            .ok_or(ErrorCode::Overflow)?;

        emit!(InferenceCompleted {
            request_id: req.key(),
            prediction,
            confidence_bps,
            quality_score: quality,
            processing_time_ms,
        });

        Ok(())
    }

    /// Mark a pending inference as failed (model authority only). Refunds requester.
    pub fn fail_inference(ctx: Context<FailInference>) -> Result<()> {
        let req = &mut ctx.accounts.inference_request;
        require!(
            req.status == InferenceStatus::Pending || req.status == InferenceStatus::Processing,
            ErrorCode::InvalidInferenceState
        );

        req.status = InferenceStatus::Failed;
        req.completed_at = Some(Clock::get()?.unix_timestamp);

        // Refund escrowed funds to requester
        let model_id = req.model_id;
        let escrow_seeds = &[
            b"escrow",
            model_id.as_ref(),
            &[ctx.bumps.escrow_token_account],
        ];
        let signer = &[&escrow_seeds[..]];

        let total = req
            .model_fee
            .checked_add(req.protocol_fee)
            .ok_or(ErrorCode::Overflow)?;

        let cpi = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.requester_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi,
                signer,
            ),
            total,
        )?;

        emit!(InferenceFailed {
            request_id: req.key(),
            refunded: total,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // STAKING
    // ────────────────────────────────────────────────────────────────────────

    /// Stake tokens with a lock duration multiplier.
    pub fn stake_tokens(
        ctx: Context<StakeTokens>,
        amount: u64,
        lock_duration: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(amount > 0, ErrorCode::ZeroAmount);
        require!(
            get_lock_multiplier(lock_duration).is_some(),
            ErrorCode::InvalidLockDuration
        );

        let clock = Clock::get()?;

        // Transfer tokens to vault
        let cpi = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi),
            amount,
        )?;

        let stake = &mut ctx.accounts.stake_account;
        stake.staker = ctx.accounts.user.key();
        stake.amount = amount;
        stake.lock_duration = lock_duration;
        stake.staked_at = clock.unix_timestamp;
        stake.unlock_at = clock
            .unix_timestamp
            .checked_add(lock_duration as i64)
            .ok_or(ErrorCode::Overflow)?;
        stake.last_claim_at = clock.unix_timestamp;
        stake.unstake_requested_at = None;
        stake.bump = ctx.bumps.stake_account;

        // Update global stats
        let config = &mut ctx.accounts.protocol_config;
        config.total_staked = config
            .total_staked
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        emit!(TokensStaked {
            staker: stake.staker,
            amount,
            lock_duration,
            unlock_at: stake.unlock_at,
        });

        Ok(())
    }

    /// Request unstake (begins cooldown period).
    pub fn request_unstake(ctx: Context<RequestUnstake>) -> Result<()> {
        let clock = Clock::get()?;
        let stake = &mut ctx.accounts.stake_account;

        require!(
            clock.unix_timestamp >= stake.unlock_at,
            ErrorCode::StakeLocked
        );
        require!(
            stake.unstake_requested_at.is_none(),
            ErrorCode::UnstakeAlreadyRequested
        );

        stake.unstake_requested_at = Some(clock.unix_timestamp);

        emit!(UnstakeRequested {
            staker: stake.staker,
            cooldown_ends: clock.unix_timestamp + UNSTAKE_COOLDOWN,
        });

        Ok(())
    }

    /// Execute unstake after cooldown (returns principal).
    pub fn execute_unstake(ctx: Context<ExecuteUnstake>) -> Result<()> {
        let clock = Clock::get()?;
        let stake = &ctx.accounts.stake_account;

        let requested = stake
            .unstake_requested_at
            .ok_or(ErrorCode::UnstakeNotRequested)?;
        require!(
            clock.unix_timestamp >= requested + UNSTAKE_COOLDOWN,
            ErrorCode::CooldownNotElapsed
        );

        let amount = stake.amount;

        // Transfer principal back from vault
        let config_key = ctx.accounts.protocol_config.key();
        let vault_seeds = &[
            b"vault",
            config_key.as_ref(),
            &[ctx.bumps.vault_token_account],
        ];
        let signer = &[&vault_seeds[..]];

        let cpi = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_token_account.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi,
                signer,
            ),
            amount,
        )?;

        // Update global stats
        let config = &mut ctx.accounts.protocol_config;
        config.total_staked = config.total_staked.saturating_sub(amount);

        emit!(UnstakeExecuted {
            staker: stake.staker,
            amount,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // VALIDATORS
    // ────────────────────────────────────────────────────────────────────────

    /// Register as a validator by staking tokens.
    pub fn register_validator(
        ctx: Context<RegisterValidator>,
        stake_amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(
            stake_amount >= MIN_VALIDATOR_STAKE,
            ErrorCode::InsufficientStake
        );

        // Transfer stake
        let cpi = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.validator_vault.to_account_info(),
            authority: ctx.accounts.validator.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi),
            stake_amount,
        )?;

        let va = &mut ctx.accounts.validator_account;
        va.validator = ctx.accounts.validator.key();
        va.tokens_staked = stake_amount;
        va.validations_performed = 0;
        va.reputation_score = 100; // Baseline
        va.active = true;
        va.slashed = false;
        va.joined_at = Clock::get()?.unix_timestamp;
        va.bump = ctx.bumps.validator_account;

        let config = &mut ctx.accounts.protocol_config;
        config.total_validators = config
            .total_validators
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        emit!(ValidatorRegistered {
            validator: va.validator,
            stake_amount,
        });

        Ok(())
    }

    /// Slash a misbehaving validator (admin only).
    pub fn slash_validator(ctx: Context<SlashValidator>) -> Result<()> {
        let va = &mut ctx.accounts.validator_account;
        require!(va.active, ErrorCode::ValidatorInactive);

        let slash_amount = va
            .tokens_staked
            .checked_mul(SLASH_RATE_BPS)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(ErrorCode::Overflow)?;

        va.tokens_staked = va.tokens_staked.saturating_sub(slash_amount);
        va.reputation_score = va.reputation_score.saturating_sub(REPUTATION_SLASH_PENALTY);
        va.slashed = true;

        // Deactivate if below minimum stake
        if va.tokens_staked < MIN_VALIDATOR_STAKE {
            va.active = false;
        }

        // Burn slashed tokens
        let vault_seeds = &[
            b"validator_vault",
            va.validator.as_ref(),
            &[ctx.bumps.validator_vault],
        ];
        let signer = &[&vault_seeds[..]];

        let cpi = Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.validator_vault.to_account_info(),
            authority: ctx.accounts.validator_vault.to_account_info(),
        };
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi,
                signer,
            ),
            slash_amount,
        )?;

        emit!(ValidatorSlashed {
            validator: va.validator,
            slash_amount,
            remaining_stake: va.tokens_staked,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────────────────────
    // DNA GENERATION
    // ────────────────────────────────────────────────────────────────────────

    /// Record an on-chain DNA generation event.
    pub fn record_dna_generation(
        ctx: Context<RecordDna>,
        dna_hash: String,
        utility_score: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, ErrorCode::ProtocolPaused);
        require!(dna_hash.len() <= MAX_DNA_HASH_LEN, ErrorCode::StringTooLong);
        require!(utility_score <= BPS_DENOMINATOR, ErrorCode::InvalidBps);

        let sub = &mut ctx.accounts.dna_submission;
        sub.author = ctx.accounts.author.key();
        sub.dna_hash = dna_hash;
        sub.utility_score = utility_score;
        sub.timestamp = Clock::get()?.unix_timestamp;
        sub.bump = ctx.bumps.dna_submission;

        emit!(DnaRecorded {
            author: sub.author,
            utility_score,
        });

        Ok(())
    }
}

// ============================================================================
// PURE HELPER FUNCTIONS (deterministic, no floating point)
// ============================================================================

/// Quality score from confidence (bps) and latency (ms). Returns 1–100.
fn calculate_quality_score(confidence_bps: u64, processing_time_ms: u64) -> u8 {
    // confidence_bps / 100 → 0–100 range
    let base = (confidence_bps / 100) as u8;

    // Progressive latency penalty
    let penalty: u8 = if processing_time_ms <= 1_000 {
        0
    } else if processing_time_ms <= 3_000 {
        5
    } else if processing_time_ms <= MAX_PROCESSING_TIME_MS {
        15
    } else {
        25
    };

    base.saturating_sub(penalty).max(1)
}

/// Lock duration → multiplier (returns None for invalid durations).
fn get_lock_multiplier(lock_duration: u64) -> Option<u64> {
    match lock_duration {
        LOCK_1_DAY => Some(100),       // 1.00×
        LOCK_1_WEEK => Some(150),      // 1.50×
        LOCK_1_MONTH => Some(200),     // 2.00×
        LOCK_3_MONTHS => Some(300),    // 3.00×
        LOCK_6_MONTHS => Some(400),    // 4.00×
        LOCK_1_YEAR => Some(600),      // 6.00×
        _ => None,
    }
}

// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

/// Global protocol configuration (singleton PDA).
#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,
    pub pending_admin: Option<Pubkey>,
    pub treasury: Pubkey,
    pub paused: bool,
    pub total_models: u64,
    pub total_validators: u64,
    pub total_inferences: u64,
    pub total_staked: u64,
    pub protocol_fee_bps: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ModelRegistry {
    pub authority: Pubkey,
    pub model_cid: String,
    pub model_type: ModelType,
    pub api_endpoint: String,
    pub inference_fee: u64,
    pub accuracy_bps: u64,
    pub training_complete: bool,
    pub validation_count: u64,
    pub total_inferences: u64,
    pub total_revenue: u64,
    pub active: bool,
    pub nonce: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct DataSubmission {
    pub submitter: Pubkey,
    pub data_hash: String,
    pub data_type: DataType,
    pub data_size: u64,
    pub metadata: String,
    pub quality_score: u8,
    pub validated: bool,
    pub nonce: u64,
    pub submitted_at: i64,
    pub validated_at: Option<i64>,
    pub validator: Option<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct ValidatorAccount {
    pub validator: Pubkey,
    pub tokens_staked: u64,
    pub validations_performed: u64,
    pub reputation_score: u64,
    pub active: bool,
    pub slashed: bool,
    pub joined_at: i64,
    pub bump: u8,
}

#[account]
pub struct InferenceRequest {
    pub requester: Pubkey,
    pub model_id: Pubkey,
    pub input_data: String,
    pub confidence_threshold_bps: u64,
    pub prediction: Option<String>,
    pub confidence_bps: Option<u64>,
    pub processing_time_ms: Option<u64>,
    pub quality_score: Option<u8>,
    pub status: InferenceStatus,
    pub model_fee: u64,
    pub protocol_fee: u64,
    pub nonce: u64,
    pub requested_at: i64,
    pub completed_at: Option<i64>,
    pub bump: u8,
}

#[account]
pub struct StakeAccount {
    pub staker: Pubkey,
    pub amount: u64,
    pub lock_duration: u64,
    pub staked_at: i64,
    pub unlock_at: i64,
    pub last_claim_at: i64,
    pub unstake_requested_at: Option<i64>,
    pub bump: u8,
}

#[account]
pub struct DnaSubmission {
    pub author: Pubkey,
    pub dna_hash: String,
    pub utility_score: u64,
    pub timestamp: i64,
    pub bump: u8,
}

// ============================================================================
// CONTEXT STRUCTURES
// ============================================================================

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 33 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = protocol_config.bump,
        has_one = admin @ ErrorCode::UnauthorizedAdmin,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptAdmin<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub new_admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(model_hash: String, model_type: ModelType, api_endpoint: String, inference_fee: u64, nonce: u64)]
pub struct InitializeModel<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + (4 + MAX_HASH_LEN) + 1 + (4 + MAX_ENDPOINT_LEN) + 8 + 8 + 1 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 1,
        seeds = [b"model", authority.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub model_registry: Account<'info, ModelRegistry>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateModel<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::UnauthorizedModelOwner,
    )]
    pub model_registry: Account<'info, ModelRegistry>,
    #[account(
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(data_hash: String, data_type: DataType, data_size: u64, metadata: String, nonce: u64)]
pub struct SubmitData<'info> {
    #[account(
        init,
        payer = submitter,
        space = 8 + 32 + (4 + MAX_HASH_LEN) + 1 + 8 + (4 + MAX_METADATA_LEN) + 1 + 1 + 8 + 8 + 9 + 33 + 1,
        seeds = [b"data", submitter.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub data_submission: Account<'info, DataSubmission>,
    #[account(
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RateData<'info> {
    #[account(mut)]
    pub data_submission: Account<'info, DataSubmission>,
    #[account(
        mut,
        seeds = [b"validator", validator.key().as_ref()],
        bump = validator_account.bump,
        constraint = validator_account.active @ ErrorCode::ValidatorInactive,
        has_one = validator @ ErrorCode::UnauthorizedValidator,
    )]
    pub validator_account: Account<'info, ValidatorAccount>,
    #[account(
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub validator: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(input_data: String, confidence_threshold_bps: u64, nonce: u64)]
pub struct RequestInference<'info> {
    #[account(
        init,
        payer = requester,
        space = 8 + 32 + 32 + (4 + MAX_INPUT_DATA_LEN) + 8
             + (1 + 4 + MAX_PREDICTION_LEN) + 9 + 9 + 2 + 1 + 8 + 8 + 8 + 8 + 9 + 1,
        seeds = [b"inference", requester.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub inference_request: Account<'info, InferenceRequest>,
    pub model_registry: Account<'info, ModelRegistry>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub requester_token_account: Account<'info, TokenAccount>,
    /// CHECK: Escrow PDA for this model
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub requester: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitInferenceResult<'info> {
    #[account(mut)]
    pub inference_request: Account<'info, InferenceRequest>,
    #[account(mut)]
    pub model_registry: Account<'info, ModelRegistry>,
    /// Optional validator account (for oracle submissions)
    pub validator_account: Option<Account<'info, ValidatorAccount>>,
    #[account(
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [b"escrow", inference_request.model_id.as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub model_owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub submitter: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FailInference<'info> {
    #[account(
        mut,
        constraint = inference_request.model_id == model_registry.key() @ ErrorCode::ModelMismatch,
    )]
    pub inference_request: Account<'info, InferenceRequest>,
    #[account(
        has_one = authority @ ErrorCode::UnauthorizedModelOwner,
    )]
    pub model_registry: Account<'info, ModelRegistry>,
    #[account(
        mut,
        seeds = [b"escrow", inference_request.model_id.as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub requester_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 9 + 1,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.staker == user.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub stake_account: Account<'info, StakeAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteUnstake<'info> {
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.staker == user.key() @ ErrorCode::UnauthorizedStaker,
        close = user,
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", protocol_config.key().as_ref()],
        bump
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterValidator<'info> {
    #[account(
        init,
        payer = validator,
        space = 8 + 32 + 8 + 8 + 8 + 1 + 1 + 8 + 1,
        seeds = [b"validator", validator.key().as_ref()],
        bump
    )]
    pub validator_account: Account<'info, ValidatorAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub validator_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub validator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashValidator<'info> {
    #[account(mut)]
    pub validator_account: Account<'info, ValidatorAccount>,
    #[account(
        mut,
        seeds = [b"validator_vault", validator_account.validator.as_ref()],
        bump
    )]
    pub validator_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    #[account(
        seeds = [b"config"],
        bump = protocol_config.bump,
        has_one = admin @ ErrorCode::UnauthorizedAdmin,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(dna_hash: String)]
pub struct RecordDna<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + 32 + (4 + MAX_DNA_HASH_LEN) + 8 + 8 + 1,
        seeds = [b"dna", author.key().as_ref(), dna_hash.as_bytes()],
        bump
    )]
    pub dna_submission: Account<'info, DnaSubmission>,
    #[account(
        seeds = [b"config"],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// ENUMS
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ModelType {
    SentimentAnalysis,
    TextGeneration,
    ImageClassification,
    PricePrediction,
    DocumentUnderstanding,
    AudioTranscription,
    CodeGeneration,
    Embedding,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DataType {
    Text,
    Image,
    Audio,
    Video,
    TradingData,
    SolanaTransactions,
    NftMetadata,
    DeFiData,
    Embeddings,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum InferenceStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Refunded,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct ProtocolInitialized {
    pub admin: Pubkey,
    pub treasury: Pubkey,
}

#[event]
pub struct ProtocolPauseToggled {
    pub paused: bool,
}

#[event]
pub struct AdminProposed {
    pub current: Pubkey,
    pub proposed: Pubkey,
}

#[event]
pub struct AdminTransferred {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
}

#[event]
pub struct ProtocolFeeUpdated {
    pub new_fee_bps: u64,
}

#[event]
pub struct ModelInitialized {
    pub model_id: Pubkey,
    pub authority: Pubkey,
    pub model_type: ModelType,
    pub inference_fee: u64,
    pub nonce: u64,
}

#[event]
pub struct ModelUpdated {
    pub model_id: Pubkey,
}

#[event]
pub struct TrainingFinalized {
    pub model_id: Pubkey,
    pub accuracy_bps: u64,
}

#[event]
pub struct DataSubmitted {
    pub submission_id: Pubkey,
    pub submitter: Pubkey,
    pub data_type: DataType,
    pub data_size: u64,
    pub nonce: u64,
}

#[event]
pub struct DataRated {
    pub submission_id: Pubkey,
    pub validator: Pubkey,
    pub quality_score: u8,
}

#[event]
pub struct InferenceRequested {
    pub request_id: Pubkey,
    pub requester: Pubkey,
    pub model_id: Pubkey,
    pub total_fee: u64,
    pub nonce: u64,
}

#[event]
pub struct InferenceCompleted {
    pub request_id: Pubkey,
    pub prediction: String,
    pub confidence_bps: u64,
    pub quality_score: u8,
    pub processing_time_ms: u64,
}

#[event]
pub struct InferenceFailed {
    pub request_id: Pubkey,
    pub refunded: u64,
}

#[event]
pub struct TokensStaked {
    pub staker: Pubkey,
    pub amount: u64,
    pub lock_duration: u64,
    pub unlock_at: i64,
}

#[event]
pub struct UnstakeRequested {
    pub staker: Pubkey,
    pub cooldown_ends: i64,
}

#[event]
pub struct UnstakeExecuted {
    pub staker: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ValidatorRegistered {
    pub validator: Pubkey,
    pub stake_amount: u64,
}

#[event]
pub struct ValidatorSlashed {
    pub validator: Pubkey,
    pub slash_amount: u64,
    pub remaining_stake: u64,
}

#[event]
pub struct DnaRecorded {
    pub author: Pubkey,
    pub utility_score: u64,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Unauthorized admin")]
    UnauthorizedAdmin,
    #[msg("Unauthorized model owner")]
    UnauthorizedModelOwner,
    #[msg("Unauthorized validator")]
    UnauthorizedValidator,
    #[msg("Unauthorized oracle")]
    UnauthorizedOracle,
    #[msg("Unauthorized staker")]
    UnauthorizedStaker,
    #[msg("Invalid quality score (0-100)")]
    InvalidQualityScore,
    #[msg("Invalid basis points value")]
    InvalidBps,
    #[msg("String exceeds maximum length")]
    StringTooLong,
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("Model is inactive")]
    ModelInactive,
    #[msg("Model training not complete")]
    ModelNotTrained,
    #[msg("Model ID mismatch")]
    ModelMismatch,
    #[msg("Invalid inference state for this operation")]
    InvalidInferenceState,
    #[msg("Insufficient stake amount")]
    InsufficientStake,
    #[msg("Stake is still locked")]
    StakeLocked,
    #[msg("Unstake already requested")]
    UnstakeAlreadyRequested,
    #[msg("Unstake not yet requested")]
    UnstakeNotRequested,
    #[msg("Cooldown period not elapsed")]
    CooldownNotElapsed,
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Fee exceeds maximum (10%)")]
    FeeTooHigh,
    #[msg("Data already validated")]
    AlreadyValidated,
    #[msg("Cannot validate own submission")]
    SelfValidation,
    #[msg("Validator is inactive")]
    ValidatorInactive,
}
