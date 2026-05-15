// TryFrom account validation pattern — Anchor-style ergonomics without macros.
//
// All account checks live in try_from(); process() stays clean business logic.

use pinocchio::{
    account_info::AccountInfo,
    program_error::ProgramError,
    ProgramResult,
};
use pinocchio_system::ID as SYSTEM_PROGRAM_ID;
use pinocchio_token::ID as TOKEN_PROGRAM_ID;

// ─── Accounts struct ──────────────────────────────────────────────────────────

pub struct TransferAccounts<'a> {
    pub from:      &'a AccountInfo,
    pub to:        &'a AccountInfo,
    pub authority: &'a AccountInfo,
    // Note: token_program not included — we don't need it in process()
}

// ─── Validation via TryFrom ───────────────────────────────────────────────────

impl<'a> TryFrom<&'a [AccountInfo]> for TransferAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        // Destructure — returns NotEnoughAccountKeys if len < 4
        let [from, to, authority, _token_program] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // authority must sign the transaction
        if !authority.is_signer() {
            return Err(ProgramError::MissingRequiredSignature);
        }

        // from must be a token account owned by SPL Token
        if !from.is_owned_by(&TOKEN_PROGRAM_ID) {
            return Err(ProgramError::InvalidAccountOwner);
        }

        // to must be a token account owned by SPL Token
        if !to.is_owned_by(&TOKEN_PROGRAM_ID) {
            return Err(ProgramError::InvalidAccountOwner);
        }

        // from and to must be writable (checked at runtime by the VM,
        // but good to assert explicitly for clarity)
        if !from.is_writable() || !to.is_writable() {
            return Err(ProgramError::InvalidArgument);
        }

        Ok(Self { from, to, authority })
    }
}

// ─── Instruction data ─────────────────────────────────────────────────────────

pub struct TransferData {
    pub amount: u64,
}

impl TryFrom<&[u8]> for TransferData {
    type Error = ProgramError;

    fn try_from(data: &[u8]) -> Result<Self, Self::Error> {
        if data.len() != core::mem::size_of::<u64>() {
            return Err(ProgramError::InvalidInstructionData);
        }
        let amount = u64::from_le_bytes(data.try_into().unwrap());
        if amount == 0 {
            return Err(ProgramError::InvalidInstructionData);
        }
        Ok(Self { amount })
    }
}

// ─── Instruction ──────────────────────────────────────────────────────────────

pub struct TransferInstruction<'a> {
    accounts: TransferAccounts<'a>,
    data:     TransferData,
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for TransferInstruction<'a> {
    type Error = ProgramError;

    fn try_from((data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        Ok(Self {
            accounts: TransferAccounts::try_from(accounts)?,
            data:     TransferData::try_from(data)?,
        })
    }
}

impl<'a> TransferInstruction<'a> {
    pub fn process(&self) -> ProgramResult {
        pinocchio_token::instructions::Transfer {
            from:      self.accounts.from,
            to:        self.accounts.to,
            authority: self.accounts.authority,
            amount:    self.data.amount,
        }.invoke()
    }
}
