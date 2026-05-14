use pinocchio::{account_info::AccountInfo, program_error::ProgramError, ProgramResult};

use super::helpers::require_signer;

pub struct InitializeAgentAccounts<'a> {
    pub owner: &'a AccountInfo,
    pub agent_state: &'a AccountInfo,
}

pub struct InitializeAgent<'a> {
    pub accounts: InitializeAgentAccounts<'a>,
}

impl<'a> TryFrom<&'a [AccountInfo]> for InitializeAgentAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [owner, agent_state, _system_program] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };
        require_signer(owner)?;
        Ok(Self { owner, agent_state })
    }
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for InitializeAgent<'a> {
    type Error = ProgramError;

    fn try_from((_data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        Ok(Self { accounts: InitializeAgentAccounts::try_from(accounts)? })
    }
}

impl<'a> InitializeAgent<'a> {
    pub const DISCRIMINATOR: &'a u8 = &0;

    pub fn process(&self) -> ProgramResult {
        let _ = self.accounts;
        Ok(())
    }
}
