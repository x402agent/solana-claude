use crate::{errors::EscrowError, require};
use pinocchio::{account_info::AccountInfo, program_error::ProgramError};

#[inline(always)]
pub fn require_signer(account: &AccountInfo) -> Result<(), ProgramError> {
    require!(account.is_signer(), EscrowError::MissingSigner);
    Ok(())
}

