use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Only the asset owner or staking admin can unstake this asset")]
    Unauthorized,
    #[msg("Stake counter overflowed")]
    CounterOverflow,
    #[msg("Stake counter underflowed")]
    CounterUnderflow,
}
