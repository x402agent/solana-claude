#![no_std]

use pinocchio::{
    account_info::AccountInfo,
    entrypoint,
    program_error::ProgramError,
    pubkey::Pubkey,
    ProgramResult,
};

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::{Make, Refund, Take};

entrypoint!(process_instruction);

pub const ID: Pubkey = [0; 32];

fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    match instruction_data.split_first() {
        Some((Make::DISCRIMINATOR, data)) => Make::try_from((data, accounts))?.process(),
        Some((Take::DISCRIMINATOR, data)) => Take::try_from((data, accounts))?.process(),
        Some((Refund::DISCRIMINATOR, data)) => Refund::try_from((data, accounts))?.process(),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

