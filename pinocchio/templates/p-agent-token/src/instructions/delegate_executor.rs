use pinocchio::{account_info::AccountInfo, program_error::ProgramError, ProgramResult};

use super::helpers::require_signer;

pub struct DelegateExecutorAccounts<'a> {
    pub owner: &'a AccountInfo,
    pub agent_state: &'a AccountInfo,
    pub executive: &'a AccountInfo,
}

pub struct DelegateExecutor<'a> {
    pub accounts: DelegateExecutorAccounts<'a>,
}

impl<'a> TryFrom<&'a [AccountInfo]> for DelegateExecutorAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [owner, agent_state, executive] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };
        require_signer(owner)?;
        Ok(Self { owner, agent_state, executive })
    }
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for DelegateExecutor<'a> {
    type Error = ProgramError;

    fn try_from((_data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        Ok(Self { accounts: DelegateExecutorAccounts::try_from(accounts)? })
    }
}

impl<'a> DelegateExecutor<'a> {
    pub const DISCRIMINATOR: &'a u8 = &3;

    pub fn process(&self) -> ProgramResult {
        let _ = self.accounts;
        Ok(())
    }
}
