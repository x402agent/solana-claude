use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("CLAWDpRoToCoLv1pRoGRaM111111111111111111111");

#[program]
pub mod clawd_protocol {
    use super::*;

    // ─── Vault ────────────────────────────────────────────────────────────────

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        params: InitializeVaultParams,
    ) -> Result<()> {
        instructions::vault::initialize_vault(ctx, params)
    }

    pub fn lock_tokens(ctx: Context<LockTokens>, params: LockTokensParams) -> Result<()> {
        instructions::vault::lock_tokens(ctx, params)
    }

    pub fn unlock_tokens(ctx: Context<UnlockTokens>, force_early_exit: bool) -> Result<()> {
        instructions::vault::unlock_tokens(ctx, force_early_exit)
    }

    // ─── Burn Engine ──────────────────────────────────────────────────────────

    /// Entropy burn: volatility accumulator → deflationary pressure
    pub fn entropy_burn(ctx: Context<EntropyBurn>) -> Result<()> {
        instructions::burns::entropy_burn(ctx)
    }

    /// Behavioral burn: penalise bot-detected wallets via reward tax
    pub fn behavioral_burn(
        ctx: Context<BehavioralBurn>,
        trade_count_last_60_slots: u32,
        avg_hold_slots: u64,
        normalized_position_bps: u16,
    ) -> Result<()> {
        instructions::burns::behavioral_burn(
            ctx,
            trade_count_last_60_slots,
            avg_hold_slots,
            normalized_position_bps,
        )
    }

    /// Anti-gravity sweep: auto buy-and-burn when price drops below floor
    pub fn anti_gravity_sweep(ctx: Context<AntiGravitySweep>) -> Result<()> {
        instructions::burns::anti_gravity_sweep(ctx)
    }

    /// Agent epoch burn: AI agent activity score → inflation reserve burns
    pub fn agent_epoch_burn(
        ctx: Context<AgentEpochBurn>,
        tasks_completed: u32,
        revenue_generated_lamports: u64,
        uptime_bps: u16,
    ) -> Result<()> {
        instructions::burns::agent_epoch_burn(ctx, tasks_completed, revenue_generated_lamports, uptime_bps)
    }

    // ─── Conviction Vault ─────────────────────────────────────────────────────

    pub fn conviction_stake(
        ctx: Context<ConvictionStake>,
        amount: u64,
        lock_duration_slots: u64,
    ) -> Result<()> {
        instructions::conviction::conviction_stake(ctx, amount, lock_duration_slots)
    }

    pub fn conviction_unstake(ctx: Context<ConvictionUnstake>) -> Result<()> {
        instructions::conviction::conviction_unstake(ctx)
    }

    pub fn claim_conviction_rewards(ctx: Context<ClaimConvictionRewards>) -> Result<()> {
        instructions::conviction::claim_conviction_rewards(ctx)
    }

    // ─── Milestone Locks ──────────────────────────────────────────────────────

    pub fn create_milestone_lock(
        ctx: Context<CreateMilestoneLock>,
        params: MilestoneLockParams,
    ) -> Result<()> {
        instructions::milestone::create_milestone_lock(ctx, params)
    }

    pub fn verify_milestone(
        ctx: Context<VerifyMilestone>,
        milestone_index: u8,
        holder_count_attestation: Option<u32>,
    ) -> Result<()> {
        instructions::milestone::verify_milestone(ctx, milestone_index, holder_count_attestation)
    }

    // ─── Agent Registry ───────────────────────────────────────────────────────

    pub fn launch_agent_token(
        ctx: Context<LaunchAgentToken>,
        params: LaunchAgentTokenParams,
    ) -> Result<()> {
        instructions::agent::launch_agent_token(ctx, params)
    }

    pub fn register_agent_binding(
        ctx: Context<RegisterAgentBinding>,
        params: RegisterAgentBindingParams,
    ) -> Result<()> {
        instructions::agent::register_agent_binding(ctx, params)
    }

    // ─── Adaptive Curve ───────────────────────────────────────────────────────

    pub fn update_curve_sentiment(
        ctx: Context<UpdateCurveSentiment>,
        recent_buy_volume: u64,
        recent_sell_volume: u64,
        window_slots: u32,
    ) -> Result<()> {
        instructions::sentiment::update_curve_sentiment(
            ctx,
            recent_buy_volume,
            recent_sell_volume,
            window_slots,
        )
    }

    // ─── pToken Transfer Hook ─────────────────────────────────────────────────

    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64, decimals: u8) -> Result<()> {
        instructions::hook::transfer_hook(ctx, amount, decimals)
    }

    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        instructions::hook::initialize_extra_account_meta_list(ctx)
    }
}
