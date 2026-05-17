use anchor_lang::prelude::*;

#[error_code]
pub enum ClawdError {
    #[msg("Volatility accumulator has not exceeded entropy threshold")]
    EntropyBelowThreshold,

    #[msg("Current price is above the anti-gravity floor")]
    AntiGravityNotTriggered,

    #[msg("Epoch duration has not passed since last agent burn")]
    EpochNotElapsed,

    #[msg("Lock position is already unlocked")]
    AlreadyUnlocked,

    #[msg("Lock period has not elapsed")]
    LockNotMatured,

    #[msg("Milestone condition has not been satisfied on-chain")]
    MilestoneNotMet,

    #[msg("This milestone has already been verified and claimed")]
    MilestoneAlreadyAchieved,

    #[msg("Signer does not match the registered agent wallet")]
    InvalidAgentSigner,

    #[msg("Constitution hash does not match three-laws.md")]
    ConstitutionHashMismatch,

    #[msg("Sentiment update interval has not elapsed")]
    SentimentUpdateTooSoon,

    #[msg("Fee reserve insufficient for anti-gravity sweep")]
    InsufficientFeeReserve,

    #[msg("Token standard mismatch for this operation")]
    InvalidTokenStandard,

    #[msg("Early exit from conviction lock triggers 20% burn")]
    ConvictionLockEarlyExit,

    #[msg("Amount must be greater than zero")]
    ZeroAmount,

    #[msg("Maximum of 8 milestones per lock")]
    MaxMilestonesExceeded,

    #[msg("Behavior score was updated too recently")]
    BehaviorScoreUpdateTooSoon,

    #[msg("Inflation reserve is empty — no tokens to burn")]
    EmptyInflationReserve,

    #[msg("Vault ATH is zero — call a swap first to initialise anti-gravity")]
    ZeroAth,

    #[msg("Cannot read volatility accumulator from DBC pool")]
    InvalidDbcPoolData,

    #[msg("Arithmetic overflow in burn calculation")]
    ArithmeticOverflow,
}
