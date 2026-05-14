use pinocchio::{account_info::AccountInfo, program_error::ProgramError, ProgramResult};

use super::helpers::require_signer;

pub struct TakeAccounts<'a> {
    pub taker: &'a AccountInfo,
    pub escrow: &'a AccountInfo,
    pub vault: &'a AccountInfo,
}

pub struct Take<'a> {
    pub accounts: TakeAccounts<'a>,
}

impl<'a> TryFrom<&'a [AccountInfo]> for TakeAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [taker, escrow, vault, _maker_receive_account, _taker_receive_account, _token_program] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };
        require_signer(taker)?;
        Ok(Self { taker, escrow, vault })
    }
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for Take<'a> {
    type Error = ProgramError;

    fn try_from((_data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        Ok(Self { accounts: TakeAccounts::try_from(accounts)? })
    }
}

impl<'a> Take<'a> {
    pub const DISCRIMINATOR: &'a u8 = &1;

    pub fn process(&self) -> ProgramResult {
        let _ = self.accounts;
        Ok(())
    }
}

