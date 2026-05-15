use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::StakeError;
use crate::state::{StakePool, StakePosition};

pub fn tier_base_weight(tier: u8) -> Result<u64> {
    Ok(match tier {
        TIER_LEGENDARY => TIER_WEIGHT_LEGENDARY,
        TIER_EPIC => TIER_WEIGHT_EPIC,
        TIER_RARE => TIER_WEIGHT_RARE,
        TIER_COMMON => TIER_WEIGHT_COMMON,
        _ => return err!(StakeError::InvalidTier),
    })
}

pub fn lock_seconds(lock_kind: u8) -> Result<i64> {
    Ok(match lock_kind {
        LOCK_FLEXIBLE => LOCK_FLEX_SECS,
        LOCK_30_DAY => LOCK_30_SECS,
        LOCK_90_DAY => LOCK_90_SECS,
        LOCK_CULT => LOCK_CULT_SECS,
        _ => return err!(StakeError::InvalidLockKind),
    })
}

pub fn lock_multiplier(lock_kind: u8) -> Result<u64> {
    Ok(match lock_kind {
        LOCK_FLEXIBLE => MULT_FLEXIBLE,
        LOCK_30_DAY => MULT_30_DAY,
        LOCK_90_DAY => MULT_90_DAY,
        LOCK_CULT => MULT_CULT,
        _ => return err!(StakeError::InvalidLockKind),
    })
}

pub fn compute_weight(tier: u8, lock_kind: u8) -> Result<u64> {
    let base = tier_base_weight(tier)?;
    let mult = lock_multiplier(lock_kind)?;
    let weight = (base as u128)
        .checked_mul(mult as u128)
        .ok_or(StakeError::MathOverflow)?
        .checked_div(MULTIPLIER_PRECISION as u128)
        .ok_or(StakeError::MathOverflow)?;
    Ok(weight as u64)
}

pub fn accrue_pool(pool: &mut StakePool, now: i64) -> Result<()> {
    if pool.total_weight == 0 {
        pool.last_update_ts = now;
        return Ok(());
    }
    let dt = now.saturating_sub(pool.last_update_ts).max(0) as u128;
    if dt == 0 {
        return Ok(());
    }
    let emission = (pool.clawd_emission_per_second as u128)
        .checked_mul(dt)
        .ok_or(StakeError::MathOverflow)?;
    let per_weight = emission
        .checked_mul(REWARDS_PRECISION)
        .ok_or(StakeError::MathOverflow)?
        .checked_div(pool.total_weight as u128)
        .ok_or(StakeError::MathOverflow)?;
    pool.acc_clawd_per_weight = pool
        .acc_clawd_per_weight
        .checked_add(per_weight)
        .ok_or(StakeError::MathOverflow)?;
    pool.last_update_ts = now;
    Ok(())
}

pub fn distribute_sol_to_pool(pool: &mut StakePool, sol_amount: u64) -> Result<()> {
    if pool.total_weight == 0 || sol_amount == 0 {
        return Ok(());
    }
    let per_weight = (sol_amount as u128)
        .checked_mul(REWARDS_PRECISION)
        .ok_or(StakeError::MathOverflow)?
        .checked_div(pool.total_weight as u128)
        .ok_or(StakeError::MathOverflow)?;
    pool.acc_sol_per_weight = pool
        .acc_sol_per_weight
        .checked_add(per_weight)
        .ok_or(StakeError::MathOverflow)?;
    Ok(())
}

pub fn settle_position(pool: &StakePool, pos: &mut StakePosition) -> Result<()> {
    let weight = pos.weight as u128;

    let earned_clawd = pool
        .acc_clawd_per_weight
        .checked_mul(weight)
        .ok_or(StakeError::MathOverflow)?
        .checked_div(REWARDS_PRECISION)
        .ok_or(StakeError::MathOverflow)?;
    let pending_clawd = earned_clawd
        .checked_sub(pos.clawd_reward_debt)
        .ok_or(StakeError::MathOverflow)? as u64;
    pos.clawd_pending = pos
        .clawd_pending
        .checked_add(pending_clawd)
        .ok_or(StakeError::MathOverflow)?;
    pos.clawd_reward_debt = earned_clawd;

    let earned_sol = pool
        .acc_sol_per_weight
        .checked_mul(weight)
        .ok_or(StakeError::MathOverflow)?
        .checked_div(REWARDS_PRECISION)
        .ok_or(StakeError::MathOverflow)?;
    let pending_sol = earned_sol
        .checked_sub(pos.sol_reward_debt)
        .ok_or(StakeError::MathOverflow)? as u64;
    pos.sol_pending = pos
        .sol_pending
        .checked_add(pending_sol)
        .ok_or(StakeError::MathOverflow)?;
    pos.sol_reward_debt = earned_sol;

    Ok(())
}
