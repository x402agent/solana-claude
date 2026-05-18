use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use anchor_client::solana_sdk::signature::Keypair;
use anchor_client::solana_sdk::signer::Signer;
use colored::Colorize;
use rand::seq::SliceRandom;
use rand::Rng;
use crate::common::logger::Logger;

/// Wallet profile types that determine trading behavior
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum WalletProfile {
    FrequentSeller,   // Sells often, shorter hold times
    LongTermHolder,   // Holds for long periods, rarely sells
    BalancedTrader,   // Balanced buy/sell behavior
    Aggressive,       // More frequent trading, higher amounts
    Conservative,     // Less frequent trading, smaller amounts
}

impl WalletProfile {
    /// Get the sell probability for this wallet profile
    pub fn get_sell_probability(&self) -> f64 {
        match self {
            WalletProfile::FrequentSeller => 0.45,  // 45% chance of selling
            WalletProfile::LongTermHolder => 0.15,  // 15% chance of selling
            WalletProfile::BalancedTrader => 0.30,  // 30% chance of selling
            WalletProfile::Aggressive => 0.35,      // 35% chance of selling
            WalletProfile::Conservative => 0.25,    // 25% chance of selling
        }
    }
    
    /// Get the minimum hold time in hours for this wallet profile
    pub fn get_min_hold_time_hours(&self) -> u64 {
        match self {
            WalletProfile::FrequentSeller => 6,   // 6 hours minimum
            WalletProfile::LongTermHolder => 72,  // 72 hours minimum (3 days)
            WalletProfile::BalancedTrader => 24,  // 24 hours minimum
            WalletProfile::Aggressive => 4,       // 4 hours minimum
            WalletProfile::Conservative => 48,    // 48 hours minimum (2 days)
        }
    }
    
    /// Get the maximum hold time in hours for this wallet profile
    pub fn get_max_hold_time_hours(&self) -> u64 {
        match self {
            WalletProfile::FrequentSeller => 48,   // 48 hours maximum (2 days)
            WalletProfile::LongTermHolder => 168,  // 168 hours maximum (7 days)
            WalletProfile::BalancedTrader => 96,   // 96 hours maximum (4 days)
            WalletProfile::Aggressive => 24,       // 24 hours maximum
            WalletProfile::Conservative => 120,    // 120 hours maximum (5 days)
        }
    }
    
    /// Get the trading amount multiplier for this wallet profile
    pub fn get_amount_multiplier(&self) -> f64 {
        match self {
            WalletProfile::FrequentSeller => 0.8,  // 80% of base amount
            WalletProfile::LongTermHolder => 1.2,  // 120% of base amount
            WalletProfile::BalancedTrader => 1.0,  // 100% of base amount
            WalletProfile::Aggressive => 1.5,      // 150% of base amount
            WalletProfile::Conservative => 0.6,    // 60% of base amount
        }
    }
    
    /// Get the trading frequency multiplier for this wallet profile
    pub fn get_frequency_multiplier(&self) -> f64 {
        match self {
            WalletProfile::FrequentSeller => 0.7,  // 70% of base interval (more frequent)
            WalletProfile::LongTermHolder => 2.0,  // 200% of base interval (less frequent)
            WalletProfile::BalancedTrader => 1.0,  // 100% of base interval
            WalletProfile::Aggressive => 0.5,      // 50% of base interval (more frequent)
            WalletProfile::Conservative => 1.5,    // 150% of base interval (less frequent)
        }
    }
    
    /// Randomly assign a wallet profile based on realistic distribution
    pub fn random_profile() -> Self {
        let mut rng = rand::thread_rng();
        let random_value = rng.gen::<f64>();
        
        match random_value {
            x if x < 0.20 => WalletProfile::FrequentSeller,  // 20%
            x if x < 0.35 => WalletProfile::LongTermHolder,  // 15%
            x if x < 0.70 => WalletProfile::BalancedTrader,  // 35%
            x if x < 0.85 => WalletProfile::Aggressive,      // 15%
            _ => WalletProfile::Conservative,                 // 15%
        }
    }
}

/// Wallet information including profile and trading history
#[derive(Debug, Clone)]
pub struct WalletInfo {
    pub keypair: Arc<Keypair>,
    pub profile: WalletProfile,
    pub usage_count: u32,
    pub last_buy_time: Option<tokio::time::Instant>,
    pub last_sell_time: Option<tokio::time::Instant>,
    pub total_buys: u32,
    pub total_sells: u32,
    pub created_at: tokio::time::Instant,
}

impl WalletInfo {
    /// Update buy statistics
    pub fn record_buy(&mut self) {
        self.usage_count += 1;
        self.total_buys += 1;
        self.last_buy_time = Some(tokio::time::Instant::now());
    }
    
    /// Update sell statistics
    pub fn record_sell(&mut self) {
        self.usage_count += 1;
        self.total_sells += 1;
        self.last_sell_time = Some(tokio::time::Instant::now());
    }
}


impl WalletPool {
    
    
    /// Load a single wallet from a file
    fn load_wallet_from_file(path: &Path) -> Result<Keypair, String> {
        let private_key = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read wallet file: {}", e))?
            .trim()
            .to_string();
        
        if private_key.len() < 85 {
            return Err(format!("Invalid private key length: {}", private_key.len()));
        }
        
        let keypair = Keypair::from_base58_string(&private_key);
        Ok(keypair)
    }
    
    
    
    /// Record a buy transaction for a wallet
    pub fn record_buy_for_wallet(&mut self, wallet_pubkey: &anchor_client::solana_sdk::pubkey::Pubkey) {
        if let Some(wallet) = self.wallets.iter_mut().find(|w| w.pubkey() == *wallet_pubkey) {
            wallet.record_buy();
        }
    }
    
    /// Get wallet count
    pub fn wallet_count(&self) -> usize {
        self.wallets.len()
    }
    
    /// Get wallet usage statistics
    pub fn get_usage_stats(&self) -> HashMap<String, u32> {
        self.wallets.iter()
            .map(|w| (w.pubkey().to_string(), w.usage_count))
            .collect()
    }
    
    /// Get wallet profile statistics
    pub fn get_profile_stats(&self) -> HashMap<WalletProfile, u32> {
        let mut stats = HashMap::new();
        for wallet in &self.wallets {
            *stats.entry(wallet.profile).or_insert(0) += 1;
        }
        stats
    }
    
    /// Reset usage statistics
    pub fn reset_usage_stats(&mut self) {
        for wallet in &mut self.wallets {
            wallet.usage_count = 0;
        }
        self.logger.log("📊 Wallet usage statistics reset".yellow().to_string());
    }
    
    /// Get least used wallets (for balancing)
    pub fn get_least_used_wallets(&self, count: usize) -> Vec<Arc<Keypair>> {
        let mut wallet_pairs: Vec<_> = self.wallets.iter()
            .map(|wallet| (wallet.keypair.clone(), wallet.usage_count))
            .collect();
        
        // Sort by usage count (ascending)
        wallet_pairs.sort_by_key(|(_, usage)| *usage);
        
        wallet_pairs.into_iter()
            .take(count)
            .map(|(keypair, _)| keypair)
            .collect()
    }
    
}

/// Trade type for tracking recent trades
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TradeType {
    Buy,
    Sell,
}

/// Advanced randomization configuration
#[derive(Debug, Clone)]
pub struct RandomizationConfig {
    pub min_amount_sol: f64,
    pub max_amount_sol: f64,
    pub base_buy_interval_ms: u64,
    pub base_sell_interval_ms: u64,
    pub buy_sell_ratio: f64, // 0.7 = 70% buy, 30% sell
    pub wallet_rotation_frequency: u32, // Change wallet every N trades
    pub enable_realistic_pauses: bool,
    pub max_consecutive_same_wallet: u32,
}

impl Default for RandomizationConfig {
    fn default() -> Self {
        Self {
            min_amount_sol: 0.03,
            max_amount_sol: 0.55,
            base_buy_interval_ms: 600_000,   // 10 minutes base (600 seconds)
            base_sell_interval_ms: 900_000,  // 15 minutes base (900 seconds)
            buy_sell_ratio: 0.7,
            wallet_rotation_frequency: 3, // Change wallet every 3 trades
            enable_realistic_pauses: true,
            max_consecutive_same_wallet: 5,
        }
    }
}
