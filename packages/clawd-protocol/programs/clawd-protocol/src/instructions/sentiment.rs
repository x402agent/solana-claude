use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClawdError;

/// SentimentState — derived from DBC pool, drives adaptive fee adjustment
#[account]
#[derive(Default)]
pub struct SentimentState {
    pub dbc_pool: Pubkey,
    pub last_update_slot: u64,
    /// Signed score in range [-1e9, +1e9]. Positive = bullish.
    pub sentiment_score_signed: i64,
    pub ema_buy_volume: u128,
    pub ema_sell_volume: u128,
    /// Applied fee adjustment in bps (negative = discount)
    pub current_fee_adjustment_bps: i16,
    pub update_interval_slots: u32,
    pub bump: u8,
}

impl SentimentState {
    pub const SEED: &'static [u8] = b"senti";
    pub const LEN: usize = 8 + 32 + 8 + 8 + 16 + 16 + 2 + 4 + 1;

    /// EMA decay: alpha = 0.2 (decay_bps = 8000)
    const EMA_DECAY_BPS: u128 = 8_000;

    pub fn update_ema(current: u128, new_value: u64) -> u128 {
        let alpha_bps = 10_000 - Self::EMA_DECAY_BPS;
        (new_value as u128 * alpha_bps + current * Self::EMA_DECAY_BPS) / 10_000
    }

    pub fn compute_sentiment(buy_ema: u128, sell_ema: u128) -> i64 {
        let total = buy_ema + sell_ema;
        if total == 0 { return 0; }
        let scale = 1_000_000_000i128;
        ((buy_ema as i128 - sell_ema as i128) * scale / total as i128) as i64
    }

    /// Convert sentiment score to fee adjustment bps.
    /// Bullish → discount (negative). Bearish → premium (positive).
    pub fn sentiment_to_fee_bps(score: i64, range_bps: u16) -> i16 {
        let clamped = score.clamp(-1_000_000_000, 1_000_000_000);
        let adj = (-clamped * range_bps as i64) / 1_000_000_000;
        adj as i16
    }
}

#[derive(Accounts)]
pub struct UpdateCurveSentiment<'info> {
    #[account(
        init_if_needed,
        payer = caller,
        space = SentimentState::LEN,
        seeds = [SentimentState::SEED, dbc_pool.key().as_ref()],
        bump,
    )]
    pub sentiment_state: Account<'info, SentimentState>,

    /// CHECK: DBC pool — source of price data
    pub dbc_pool: UncheckedAccount<'info>,

    #[account(seeds = [Vault::SEED, vault.base_mint.as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub caller: Signer<'info>,

    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

pub fn update_curve_sentiment(
    ctx: Context<UpdateCurveSentiment>,
    recent_buy_volume: u64,
    recent_sell_volume: u64,
    window_slots: u32,
) -> Result<()> {
    let slot = ctx.accounts.clock.slot;
    let state = &mut ctx.accounts.sentiment_state;

    // Enforce minimum update interval
    if state.last_update_slot > 0 {
        require!(
            slot >= state.last_update_slot + state.update_interval_slots as u64,
            ClawdError::SentimentUpdateTooSoon
        );
    }

    // Update EMAs
    state.ema_buy_volume = SentimentState::update_ema(state.ema_buy_volume, recent_buy_volume);
    state.ema_sell_volume = SentimentState::update_ema(state.ema_sell_volume, recent_sell_volume);

    // Compute new sentiment score
    let score = SentimentState::compute_sentiment(state.ema_buy_volume, state.ema_sell_volume);
    state.sentiment_score_signed = score;

    // Default sentiment fee range: 150 bps
    let fee_adj = SentimentState::sentiment_to_fee_bps(score, 150);
    state.current_fee_adjustment_bps = fee_adj;

    state.last_update_slot = slot;
    if state.update_interval_slots == 0 {
        state.update_interval_slots = window_slots.max(100);
        state.dbc_pool = ctx.accounts.dbc_pool.key();
        state.bump = ctx.bumps.sentiment_state;
    }

    emit!(SentimentUpdateEvent {
        dbc_pool: ctx.accounts.dbc_pool.key(),
        score,
        fee_adjustment_bps: fee_adj,
        ema_buy_volume: state.ema_buy_volume,
        ema_sell_volume: state.ema_sell_volume,
        slot,
    });

    Ok(())
}

#[event]
pub struct SentimentUpdateEvent {
    pub dbc_pool: Pubkey,
    pub score: i64,
    pub fee_adjustment_bps: i16,
    pub ema_buy_volume: u128,
    pub ema_sell_volume: u128,
    pub slot: u64,
}
