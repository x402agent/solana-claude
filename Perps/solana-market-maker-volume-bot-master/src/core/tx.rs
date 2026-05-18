use std::sync::Arc;
use std::str::FromStr;
use anyhow::Result;
use colored::Colorize;
use anchor_client::solana_sdk::{
    instruction::Instruction,
    signature::Keypair,
    system_instruction,
    transaction::Transaction,
    hash::Hash,
    signature::Signature,
};
use anchor_client::solana_sdk::pubkey::Pubkey;
use spl_token::ui_amount_to_amount;
use solana_sdk::signer::Signer;
use tokio::time::{Instant, sleep};
use std::time::Duration;
use std::env;
use solana_client::rpc_client::SerializableTransaction;
use anchor_client::solana_client::rpc_config::RpcSendTransactionConfig;
use anchor_client::solana_sdk::commitment_config::CommitmentLevel;
use solana_transaction_status;
use crate::{
    common::logger::Logger,
};
use dotenv::dotenv;

// prioritization fee = UNIT_PRICE * UNIT_LIMIT
fn get_unit_price() -> u64 {
    env::var("UNIT_PRICE")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(20000)
}

fn get_unit_limit() -> u32 {
    env::var("UNIT_LIMIT")
        .ok()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(200_000)
}
