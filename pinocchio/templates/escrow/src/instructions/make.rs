use core::mem::size_of;
use pinocchio::{account_info::AccountInfo, program_error::ProgramError, ProgramResult};

use super::helpers::require_signer;

pub struct MakeAccounts<'a> {
    pub maker: &'a AccountInfo,
    pub escrow: &'a AccountInfo,
    pub vault: &'a AccountInfo,
}

pub struct MakeData {
    pub seed: u64,
    pub deposit: u64,
    pub receive: u64,
}

pub struct Make<'a> {
    pub accounts: MakeAccounts<'a>,
    pub data: MakeData,
}

impl<'a> TryFrom<&'a [AccountInfo]> for MakeAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [maker, escrow, vault, _mint_a, _mint_b, _token_program, _system_program] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };
        require_signer(maker)?;
        Ok(Self { maker, escrow, vault })
    }
}

impl TryFrom<&[u8]> for MakeData {
    type Error = ProgramError;

    fn try_from(data: &[u8]) -> Result<Self, Self::Error> {
        if data.len() != size_of::<u64>() * 3 {
            return Err(ProgramError::InvalidInstructionData);
        }
        let seed = u64::from_le_bytes(data[0..8].try_into().map_err(|_| ProgramError::InvalidInstructionData)?);
        let deposit = u64::from_le_bytes(data[8..16].try_into().map_err(|_| ProgramError::InvalidInstructionData)?);
        let receive = u64::from_le_bytes(data[16..24].try_into().map_err(|_| ProgramError::InvalidInstructionData)?);
        if deposit == 0 || receive == 0 {
            return Err(ProgramError::InvalidInstructionData);
        }
        Ok(Self { seed, deposit, receive })
    }
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for Make<'a> {
    type Error = ProgramError;

    fn try_from((data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        Ok(Self {
            accounts: MakeAccounts::try_from(accounts)?,
            data: MakeData::try_from(data)?,
        })
    }
}

impl<'a> Make<'a> {
    pub const DISCRIMINATOR: &'a u8 = &0;

    pub fn process(&self) -> ProgramResult {
        let _ = self.accounts;
        let _ = self.data;
        Ok(())
    }
}

