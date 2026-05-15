use crate::{errors::PAgentTokenError, require};
use pinocchio::{account_info::AccountInfo, program_error::ProgramError};

#[inline(always)]
pub fn require_signer(account: &AccountInfo) -> Result<(), ProgramError> {
    require!(account.is_signer(), PAgentTokenError::MissingSigner);
    Ok(())
}

#[inline(always)]
pub fn require_nonzero_amount(amount: u64) -> Result<(), ProgramError> {
    require!(amount > 0, PAgentTokenError::InvalidAmount);
    Ok(())
}
