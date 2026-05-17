use crate::*;

#[error_code]
pub enum StakingError {
    #[msg("Caller is not the configured program admin")]
    InvalidAdmin,
    #[msg("Agent asset metadata is invalid")]
    InvalidMetadata,
    #[msg("Collection does not match the asset's update authority")]
    InvalidCollection,
    #[msg("Could not parse creators in metadata")]
    MetadataCreatorParseError,
    #[msg("Reward vault has insufficient balance")]
    LackVaultBalance,
    #[msg("Caller is not the agent asset owner")]
    InvalidOwner,
    #[msg("Asset address does not match a staked record")]
    InvalidAgentAsset,
    #[msg("Reward distribution is currently disabled")]
    DisabledReward,
    #[msg("Stake counter overflow")]
    CounterOverflow,
    #[msg("Stake counter underflow")]
    CounterUnderflow,
}
