use anyhow::Result;
use bs58;
use colored::Colorize;
use dotenv::dotenv;
use reqwest::Error;
use serde::Deserialize;
use anchor_client::solana_sdk::{commitment_config::CommitmentConfig, signature::Keypair, signer::Signer};
use tokio::sync::{Mutex, OnceCell};
use std::{env, sync::Arc};
use crate::engine::swap::SwapProtocol;
use crate::engine::transaction_parser::DexType;
use crate::{
    common::{constants::INIT_MSG, logger::Logger},
    engine::swap::{SwapDirection, SwapInType},
};

static GLOBAL_CONFIG: OnceCell<Mutex<Config>> = OnceCell::const_new();

pub struct Config {
    pub yellowstone_grpc_http: String,
    pub yellowstone_grpc_token: String,
    pub app_state: AppState,
    pub swap_config: SwapConfig,
    pub counter_limit: u32,
    pub is_progressive_sell: bool,
    pub target_token_mint: String,
    pub coin_creator: String, // New field for pump.fun coin creator
    pub min_buy_amount: f64,
    pub max_buy_amount: f64,
    pub min_sol: f64,
    pub minimal_balance_for_fee: f64,
    pub minimal_wsol_balance_for_trading: f64,
    // New fast trading strategy configuration
    pub selling_time_after_buying: u64, // seconds to wait before selling after buying
    pub interval: u64, // interval between buying operations in seconds
    // New advanced features configuration
    pub min_sell_delay_hours: u64,
    pub max_sell_delay_hours: u64,
    pub price_change_threshold: f64,
    pub min_buy_ratio: f64,
    pub max_buy_ratio: f64,
    pub volume_wave_active_hours: u64,
    pub volume_wave_slow_hours: u64,
    pub guardian_mode_enabled: bool,
    pub guardian_drop_threshold: f64,
    // DEX configuration
    pub dex_type: DexType,
    // Pool configuration for Raydium CPMM (only used when DEX != PumpFun)
    pub pool_id: String,
    pub pool_base_account: String,
    pub pool_quote_account: String,
}
