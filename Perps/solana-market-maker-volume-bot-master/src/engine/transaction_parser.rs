use std::str::FromStr;
use anyhow::{anyhow, Result};
use anchor_client::solana_sdk::pubkey::Pubkey;
use colored::Colorize;
use yellowstone_grpc_proto::geyser::SubscribeUpdateTransaction;
use yellowstone_grpc_proto::prelude::{TransactionStatusMeta, TokenBalance};
use crate::common::logger::Logger;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DexType {
    RaydiumCPMM,
    PumpFun,
    RaydiumLaunchpad,
}

#[derive(Debug, Clone)]
pub struct TransactionAnalysis {
    pub mint: String,
    pub is_buy: bool,
    pub amount_in: u64,
    pub amount_out: u64,
    pub user: String,
    pub volume_change: f64,
    pub dex_type: DexType,
    pub swap_event: Option<SwapEventData>,
}

#[derive(Debug, Clone)]
pub struct SwapEventData {
    pub amount_in: u64,
    pub amount_out: u64,
    pub before_source_balance: u64,
    pub after_source_balance: u64,
    pub before_destination_balance: u64,
    pub after_destination_balance: u64,
}

#[derive(Debug, Clone)]
pub struct BalanceChange {
    pub account_index: usize,
    pub pre_balance: u64,
    pub post_balance: u64,
    pub mint: Option<String>,
    pub token_change: Option<TokenBalanceChange>,
}

#[derive(Debug, Clone)]
pub struct TokenBalanceChange {
    pub mint: String,
    pub pre_amount: u64,
    pub post_amount: u64,
    pub decimals: u8,
}

// Helper trait for TradeInfoFromToken compatibility
#[derive(Debug, Clone)]
pub struct TradeInfoFromToken {
    pub mint: String,
    pub is_buy: bool,
    pub dex_type: DexType,
    pub user: String,
    pub volume_change: f64,
    pub amount_in: u64,
    pub amount_out: u64,
}

/// Parse Raydium CPMM transaction logs and extract trading information
pub fn parse_raydium_cpmm_transaction(
    txn: &SubscribeUpdateTransaction,
    target_mint: &str,
) -> Option<TransactionAnalysis> {
    let logger = Logger::new("[TX-PARSER] => ".cyan().to_string());
    
    let transaction = txn.transaction.as_ref()?;
    let meta = transaction.meta.as_ref()?;
    
    // Parse log messages for swap events
    let swap_event = parse_swap_event_from_logs(&meta.log_messages)?;
    
    // Parse balance changes
    let balance_changes = parse_balance_changes(meta, target_mint);
    
    // Determine if this is a buy or sell based on the swap event and balance changes
    let (is_buy, user, volume_change) = analyze_transaction_direction(&balance_changes, &swap_event, target_mint)?;
    
    logger.log(format!("Parsed transaction - Mint: {}, Is Buy: {}, Volume: {}", 
        target_mint, is_buy, volume_change).green().to_string());
    
    Some(TransactionAnalysis {
        mint: target_mint.to_string(),
        is_buy,
        amount_in: swap_event.amount_in,
        amount_out: swap_event.amount_out,
        user,
        volume_change,
        dex_type: DexType::RaydiumCPMM,
        swap_event: Some(swap_event),
    })
}
