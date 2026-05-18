use std::sync::Arc;
use std::time::Duration;
use std::collections::{HashMap, VecDeque};
use tokio::time::Instant;
use anyhow::Result;
use anchor_client::solana_sdk::signature::Signature;
use anchor_client::solana_sdk::signer::Signer;
use anchor_client::solana_sdk::pubkey::Pubkey;
use anchor_client::solana_sdk::signature::Keypair;
use anchor_client::solana_sdk::system_instruction;
use anchor_client::solana_sdk::transaction::Transaction;
use colored::Colorize;
use solana_transaction_status;
use tokio::time;
use tokio::sync::Mutex;
use futures_util::stream::StreamExt;
use futures_util::{SinkExt, Sink};
use yellowstone_grpc_client::{ClientTlsConfig, GeyserGrpcClient};
use yellowstone_grpc_proto::geyser::{
    subscribe_update::UpdateOneof, CommitmentLevel, SubscribeRequest, SubscribeRequestPing,
    SubscribeRequestFilterTransactions, SubscribeUpdate,
};
use crate::engine::transaction_parser;
use crate::common::{
    config::{AppState, SwapConfig, JUPITER_PROGRAM, OKX_DEX_PROGRAM},
    logger::Logger,
    wallet_pool::{WalletPool, RandomizationConfig, TradeType},
    price_monitor::{GlobalPriceMonitor, create_global_price_monitor},
    dynamic_ratios::{GlobalDynamicRatioManager, create_global_dynamic_ratio_manager},
    volume_waves::{GlobalVolumeWaveManager, create_global_volume_wave_manager},
    guardian_mode::{GlobalGuardianMode, create_global_guardian_mode},
};
use crate::dex::{raydium_cpmm::RaydiumCPMM, dex_manager::DexManager};
use crate::engine::swap::{SwapDirection, SwapInType};
use crate::core::token;
use spl_token::instruction::sync_native;
use spl_associated_token_account::{get_associated_token_address, instruction::create_associated_token_account_idempotent};
use solana_program_pack::Pack;
use std::str::FromStr;
use rand::Rng;
use crate::engine::transaction_parser::{parse_target_token_transaction, TradeInfoFromToken, DexType};

// Activity tracking structures for token analysis
#[derive(Debug, Clone)]
pub struct TokenActivity {
    pub timestamp: Instant,
    pub is_buy: bool,
    pub volume_sol: f64,
    pub user: String,
    pub price: f64,
}

#[derive(Debug, Default)]
pub struct TokenActivityReport {
    pub total_trades: u32,
    pub buy_trades: u32,
    pub sell_trades: u32,
    pub total_volume_sol: f64,
    pub buy_volume_sol: f64,
    pub sell_volume_sol: f64,
    pub average_price: f64,
    pub min_price: f64,
    pub max_price: f64,
    pub unique_traders: u32,
    pub report_period_minutes: u64,
}

/// Configuration for market maker bot with advanced multi-wallet support
#[derive(Clone)]
pub struct MarketMakerConfig {
    pub yellowstone_grpc_http: String,
    pub yellowstone_grpc_token: String,
    pub app_state: Arc<AppState>,
    pub target_token_mint: String,
    pub coin_creator: String,
    pub slippage: u64,
    pub randomization_config: RandomizationConfig,
    pub enable_multi_wallet: bool,
    pub max_concurrent_trades: usize,
    pub enable_telegram_notifications: bool,
    pub dex_type: DexType,
    // Pool configuration for Raydium CPMM
    pub pool_id: String,
    pub pool_base_account: String,
    pub pool_quote_account: String,
}

impl MarketMakerConfig {
    /// Create a new MarketMakerConfig with stealth mode settings
    pub fn stealth_mode(
        yellowstone_grpc_http: String,
        yellowstone_grpc_token: String,
        app_state: Arc<AppState>,
        target_token_mint: String,
        coin_creator: String,
        dex_type: DexType,
        pool_id: String,
        pool_base_account: String,
        pool_quote_account: String,
    ) -> Self {
        Self {
            yellowstone_grpc_http,
            yellowstone_grpc_token,
            app_state,
            target_token_mint,
            coin_creator,
            slippage: 1000, // 10%
            randomization_config: RandomizationConfig::stealth_mode(),
            enable_multi_wallet: true,
            max_concurrent_trades: 3,
            enable_telegram_notifications: true,
            dex_type,
            // Pool configuration from parameters
            pool_id,
            pool_base_account,
            pool_quote_account,
        }
    }

    /// Create a new MarketMakerConfig with conservative settings
    pub fn conservative_mode(
        yellowstone_grpc_http: String,
        yellowstone_grpc_token: String,
        app_state: Arc<AppState>,
        target_token_mint: String,
        coin_creator: String,
        dex_type: DexType,
        pool_id: String,
        pool_base_account: String,
        pool_quote_account: String,
    ) -> Self {
        Self {
            yellowstone_grpc_http,
            yellowstone_grpc_token,
            app_state,
            target_token_mint,
            coin_creator,
            slippage: 1500, // 15%
            randomization_config: RandomizationConfig::conservative_mode(),
            enable_multi_wallet: true,
            max_concurrent_trades: 2,
            enable_telegram_notifications: true,
            dex_type,
            // Pool configuration from parameters
            pool_id,
            pool_base_account,
            pool_quote_account,
        }
    }

    /// Create a new MarketMakerConfig with default settings
    pub fn new(
        yellowstone_grpc_http: String,
        yellowstone_grpc_token: String,
        app_state: Arc<AppState>,
        target_token_mint: String,
        coin_creator: String,
        dex_type: DexType,
        pool_id: String,
        pool_base_account: String,
        pool_quote_account: String,
    ) -> Self {
        Self {
            yellowstone_grpc_http,
            yellowstone_grpc_token,
            app_state,
            target_token_mint,
            coin_creator,
            slippage: 1000, // 10%
            randomization_config: RandomizationConfig::default(),
            enable_multi_wallet: true,
            max_concurrent_trades: 2,
            enable_telegram_notifications: true,
            dex_type,
            // Pool configuration from parameters
            pool_id,
            pool_base_account,
            pool_quote_account,
        }
    }
}

/// Advanced market maker bot with multi-wallet support and sophisticated randomization
pub struct MarketMaker {
    config: MarketMakerConfig,
    wallet_pool: Arc<Mutex<WalletPool>>,
    logger: Logger,
    is_running: Arc<tokio::sync::RwLock<bool>>,
    recent_trades: Arc<Mutex<VecDeque<TradeType>>>,
    trade_counter: Arc<Mutex<u32>>,
    current_wallet: Arc<Mutex<Option<Arc<anchor_client::solana_sdk::signature::Keypair>>>>,
    wallet_change_counter: Arc<Mutex<u32>>,
    token_activities: Arc<Mutex<VecDeque<TokenActivity>>>,
    last_activity_report: Arc<Mutex<Instant>>,
    price_monitor: GlobalPriceMonitor,
    dynamic_ratio_manager: GlobalDynamicRatioManager,
    volume_wave_manager: GlobalVolumeWaveManager,
    guardian_mode: GlobalGuardianMode,
    dex_manager: Arc<Mutex<Option<DexManager>>>,
}
