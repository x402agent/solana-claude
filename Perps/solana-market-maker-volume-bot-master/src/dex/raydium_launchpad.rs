use std::{str::FromStr, sync::Arc, time::Instant};
use solana_program_pack::Pack;
use anchor_client::solana_client::rpc_config::{RpcAccountInfoConfig, RpcProgramAccountsConfig};
use anchor_client::solana_client::rpc_filter::{Memcmp, MemcmpEncodedBytes, RpcFilterType};
use solana_account_decoder::UiAccountEncoding;
use anyhow::{anyhow, Result};
use colored::Colorize;
use anchor_client::solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    system_program,
    signer::Signer,
};
use crate::engine::transaction_parser::DexType;
use spl_associated_token_account::{
    get_associated_token_address,
    instruction::create_associated_token_account_idempotent
};
use spl_token::ui_amount_to_amount;


use crate::{
    common::{config::SwapConfig, logger::Logger, cache::WALLET_TOKEN_ACCOUNTS},
    core::token,
    engine::swap::{SwapDirection, SwapInType},
};

// Constants - moved to lazy_static for single initialization
lazy_static::lazy_static! {
    static ref TOKEN_PROGRAM: Pubkey = Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
    static ref TOKEN_2022_PROGRAM: Pubkey = Pubkey::from_str("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb").unwrap();
    static ref ASSOCIATED_TOKEN_PROGRAM: Pubkey = Pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL").unwrap();
    static ref RAYDIUM_LAUNCHPAD_PROGRAM: Pubkey = Pubkey::from_str("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj").unwrap();
    static ref RAYDIUM_LAUNCHPAD_AUTHORITY: Pubkey = Pubkey::from_str("WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh").unwrap();
    static ref RAYDIUM_GLOBAL_CONFIG: Pubkey = Pubkey::from_str("6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX").unwrap();
    static ref RAYDIUM_PLATFORM_CONFIG: Pubkey = Pubkey::from_str("FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1").unwrap();
    static ref EVENT_AUTHORITY: Pubkey = Pubkey::from_str("2DPAtwB8L12vrMRExbLuyGnC7n2J5LNoZQSejeQGpwkr").unwrap();
    static ref SOL_MINT: Pubkey = Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap();
}

const TEN_THOUSAND: u64 = 10000;
const POOL_VAULT_SEED: &[u8] = b"pool_vault";


