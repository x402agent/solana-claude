use crate::{errors::VaultError, require};
use pinocchio::{account_info::AccountInfo, program_error::ProgramError};

#[inline(always)]
pub fn require_signer(account: &AccountInfo) -> Result<(), ProgramError> {
    require!(account.is_signer(), VaultError::MissingSigner);
    Ok(())
}

