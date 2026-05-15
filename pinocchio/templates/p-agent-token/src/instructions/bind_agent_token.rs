use pinocchio::{account_info::AccountInfo, program_error::ProgramError, ProgramResult};

use super::helpers::require_signer;
use crate::{errors::PAgentTokenError, require, state::AgentState};

pub struct BindAgentTokenAccounts<'a> {
    pub owner: &'a AccountInfo,
    pub agent_state: &'a AccountInfo,
}

pub struct BindAgentToken<'a> {
    pub accounts: BindAgentTokenAccounts<'a>,
}

impl<'a> TryFrom<&'a [AccountInfo]> for BindAgentTokenAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [owner, agent_state, _mint] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };
        require_signer(owner)?;
        Ok(Self { owner, agent_state })
    }
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for BindAgentToken<'a> {
    type Error = ProgramError;

    fn try_from((_data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        Ok(Self { accounts: BindAgentTokenAccounts::try_from(accounts)? })
    }
}

impl<'a> BindAgentToken<'a> {
    pub const DISCRIMINATOR: &'a u8 = &2;

    pub fn process(&self) -> ProgramResult {
        let mut data = self.accounts.agent_state.try_borrow_mut_data()?;
        let agent = AgentState::load_mut(&mut data)?;
        require!(!agent.is_bound(), PAgentTokenError::AlreadyBound);
        agent.set_bound();
        Ok(())
    }
}
