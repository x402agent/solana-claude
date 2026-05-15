use anchor_lang::prelude::*;

#[error_code]
pub enum StakeError {
    #[msg("Pool is paused")]
    PoolPaused,
    #[msg("Position is still locked")]
    StillLocked,
    #[msg("Invalid tier")]
    InvalidTier,
    #[msg("Invalid lock kind")]
    InvalidLockKind,
    #[msg("Asset is not a registered Metaplex Agent")]
    NotAnAgent,
    #[msg("Freeze delegate not set to staking authority")]
    FreezeDelegateMismatch,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Position not owned by signer")]
    PositionOwnerMismatch,
    #[msg("Reward vault is empty")]
    EmptyRewardVault,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Tier weight cannot be zero")]
    InvalidWeight,
}
