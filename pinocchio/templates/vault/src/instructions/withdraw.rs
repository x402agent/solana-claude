use core::mem::size_of;
use pinocchio::{account_info::AccountInfo, program_error::ProgramError, ProgramResult};

use super::helpers::require_signer;
use crate::state::Vault;

pub struct WithdrawAccounts<'a> {
    pub authority: &'a AccountInfo,
    pub vault: &'a AccountInfo,
}

pub struct WithdrawData {
    pub amount: u64,
}

pub struct Withdraw<'a> {
    pub accounts: WithdrawAccounts<'a>,
    pub data: WithdrawData,
}

impl<'a> TryFrom<&'a [AccountInfo]> for WithdrawAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [authority, vault, _system_program] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };
        require_signer(authority)?;
        Ok(Self { authority, vault })
    }
}

impl TryFrom<&[u8]> for WithdrawData {
    type Error = ProgramError;

    fn try_from(data: &[u8]) -> Result<Self, Self::Error> {
        if data.len() != size_of::<u64>() {
            return Err(ProgramError::InvalidInstructionData);
        }
        let amount = u64::from_le_bytes(data.try_into().map_err(|_| ProgramError::InvalidInstructionData)?);
        if amount == 0 {
            return Err(ProgramError::InvalidInstructionData);
        }
        Ok(Self { amount })
    }
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for Withdraw<'a> {
    type Error = ProgramError;

    fn try_from((data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        Ok(Self {
            accounts: WithdrawAccounts::try_from(accounts)?,
            data: WithdrawData::try_from(data)?,
        })
    }
}

impl<'a> Withdraw<'a> {
    pub const DISCRIMINATOR: &'a u8 = &1;

    pub fn process(&self) -> ProgramResult {
        let mut data = self.accounts.vault.try_borrow_mut_data()?;
        let vault = Vault::load_mut(&mut data)?;
        vault.set_amount(vault.amount().checked_sub(self.data.amount).ok_or(ProgramError::InsufficientFunds)?);
        Ok(())
    }
}

