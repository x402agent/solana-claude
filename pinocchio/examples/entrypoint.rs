// Pinocchio entrypoint patterns — all three variants with commentary.
//
// Cargo.toml dependencies:
// pinocchio = "0.7"
// pinocchio-system = "0.4"

use pinocchio::{
    account_info::AccountInfo,
    entrypoint,
    program_error::ProgramError,
    pubkey::Pubkey,
    ProgramResult,
};

// ─── Pattern 1: Full drop-in (recommended for migration) ─────────────────────
//
// Sets up Pinocchio's default heap allocator + panic handler automatically.
// Functionally equivalent to solana-program's entrypoint! macro.
entrypoint!(process_instruction);

// ─── Pattern 2: Decoupled (manual allocator + panic handler) ─────────────────
//
// Uncomment to use. Gives you control over heap setup order.
// Lower CU than Pattern 1 if you optimize allocator placement.
//
// pinocchio::program_entrypoint!(process_instruction);
// pinocchio::default_allocator!();
// pinocchio::default_panic_handler!();

// ─── Pattern 3: Lazy / raw (maximum CU control) ──────────────────────────────
//
// Wraps the raw input buffer — your handler reads only what it needs.
// Use pinocchio::no_allocator!() if the program never needs heap memory.
//
// pinocchio::lazy_program_entrypoint!(process_instruction);
// pinocchio::no_allocator!(); // skip heap setup entirely

// ─── Instruction discriminators ──────────────────────────────────────────────
//
// Single-byte discriminators — 255 possible instructions, zero overhead.
const IX_DEPOSIT: u8  = 0x01;
const IX_WITHDRAW: u8 = 0x02;
const IX_CLOSE: u8    = 0x03;

// ─── Entrypoint handler ───────────────────────────────────────────────────────

fn process_instruction(
    _program_id: &Pubkey,
    accounts:    &[AccountInfo],
    data:        &[u8],
) -> ProgramResult {
    // split_first extracts (discriminator_byte, rest_of_data)
    match data.split_first() {
        Some((&IX_DEPOSIT,  rest)) => deposit(accounts, rest),
        Some((&IX_WITHDRAW, rest)) => withdraw(accounts, rest),
        Some((&IX_CLOSE,    _))    => close(accounts),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn deposit(_accounts: &[AccountInfo], _data: &[u8]) -> ProgramResult {
    // ... implementation
    Ok(())
}

fn withdraw(_accounts: &[AccountInfo], _data: &[u8]) -> ProgramResult {
    Ok(())
}

fn close(_accounts: &[AccountInfo]) -> ProgramResult {
    Ok(())
}
