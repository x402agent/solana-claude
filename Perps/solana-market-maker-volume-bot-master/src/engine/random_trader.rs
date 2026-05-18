use std::sync::Arc;
use std::time::Duration;
use tokio::time::{sleep, Instant};
use anyhow::Result;
use colored::Colorize;
use anchor_client::solana_sdk::signature::Signature;
use anchor_client::solana_sdk::signer::Signer;
use std::sync::atomic::{AtomicU64, Ordering};
use anchor_client::solana_client::rpc_config::RpcSendTransactionConfig;
use anchor_client::solana_sdk::commitment_config::CommitmentLevel;
use solana_transaction_status;

use crate::{
    common::{config::{AppState, Config}, logger::Logger},
    dex::raydium_cpmm::RaydiumCPMM,
    engine::swap::{SwapDirection, SwapInType},
    common::config::SwapConfig,
};

#[derive(Clone)]
pub struct RandomTrader {
    app_state: Arc<AppState>,
    raydium_cpmm: RaydiumCPMM,
    target_mint: String,
    logger: Logger,
    is_running: Arc<tokio::sync::RwLock<bool>>,
    counter: Arc<AtomicU64>, // For deterministic "randomness"
}

#[derive(Debug, Clone)]
pub struct RandomTraderConfig {
    pub min_buy_amount: f64,
    pub max_buy_amount: f64,
    pub min_sell_percentage: f64,
    pub max_sell_percentage: f64,
    pub min_interval_seconds: u64,
    pub max_interval_seconds: u64,
}

impl Default for RandomTraderConfig {
    fn default() -> Self {
        Self {
            min_buy_amount: 0.001,      // 0.001 SOL minimum
            max_buy_amount: 0.01,       // 0.01 SOL maximum
            min_sell_percentage: 0.1,   // 10% minimum
            max_sell_percentage: 0.5,   // 50% maximum
            min_interval_seconds: 30,   // 30 seconds minimum
            max_interval_seconds: 300,  // 5 minutes maximum
        }
    }
}

impl RandomTrader {
    pub fn new(app_state: Arc<AppState>, target_mint: String, pool_id: String, pool_base_account: String, pool_quote_account: String) -> Result<Self> {
        let raydium_cpmm = RaydiumCPMM::new(
            app_state.wallet.clone(),
            Some(app_state.rpc_client.clone()),
            Some(app_state.rpc_nonblocking_client.clone()),
            pool_id,
            pool_base_account,
            pool_quote_account,
        ).map_err(|e| anyhow::anyhow!("Failed to create RaydiumCPMM instance: {}", e))?;
        
        Ok(Self {
            app_state,
            raydium_cpmm,
            target_mint,
            logger: Logger::new("[RANDOM-TRADER] => ".magenta().to_string()),
            is_running: Arc::new(tokio::sync::RwLock::new(false)),
            counter: Arc::new(AtomicU64::new(0)),
        })
    }
    
    /// Generate pseudo-random number using atomic counter
    fn next_pseudo_random(&self) -> u64 {
        let counter = self.counter.fetch_add(1, Ordering::SeqCst);
        // Simple linear congruential generator
        (counter.wrapping_mul(1103515245).wrapping_add(12345)) & 0x7fffffff
    }
    
    /// Generate random value in range using pseudo-random
    fn random_in_range(&self, min: u64, max: u64) -> u64 {
        if min >= max {
            return min;
        }
        let range = max - min;
        let random = self.next_pseudo_random();
        min + (random % range)
    }
    
    /// Generate random float in range
    fn random_float_in_range(&self, min: f64, max: f64) -> f64 {
        if min >= max {
            return min;
        }
        let random = self.next_pseudo_random() as f64 / (0x7fffffff as f64);
        min + (max - min) * random
    }
    
    /// Start the random trading engine with buy-then-sell pattern using SELLING_TIME_AFTER_BUYING
    pub async fn start(&self, config: RandomTraderConfig) -> Result<()> {
        {
            let mut running = self.is_running.write().await;
            if *running {
                return Err(anyhow::anyhow!("Random trader is already running"));
            }
            *running = true;
        }
        
        self.logger.log("Starting buy-then-sell trading engine...".green().to_string());
        self.logger.log(format!("Target mint: {}", self.target_mint));
        self.logger.log(format!("Config: {:?}", config));
        
        // Get SELLING_TIME_AFTER_BUYING from global config
        let selling_delay = {
            let global_config = Config::get().await;
            global_config.selling_time_after_buying
        };
        
        self.logger.log(format!("🕐 Selling delay after buying: {} seconds", selling_delay).cyan().to_string());
        
        // Main trading loop: buy -> wait -> sell -> repeat
        while self.is_running().await {
            // Generate random interval before next cycle
            let cycle_interval = self.random_in_range(config.min_interval_seconds, config.max_interval_seconds);
            self.logger.log(format!("⏰ Next trading cycle in {} seconds", cycle_interval).yellow().to_string());
            sleep(Duration::from_secs(cycle_interval)).await;
            
            if !self.is_running().await {
                break;
            }
            
            // Step 1: Execute buy
            self.logger.log("💰 STEP 1: Executing BUY...".green().bold().to_string());
            match self.execute_random_buy(&config).await {
                Ok(()) => {
                    self.logger.log("✅ Buy successful, waiting before selling...".green().to_string());
                    
                    // Step 2: Wait for SELLING_TIME_AFTER_BUYING
                    self.logger.log(format!("⏳ STEP 2: Waiting {} seconds before selling...", selling_delay).yellow().to_string());
                    sleep(Duration::from_secs(selling_delay)).await;
                    
                    if !self.is_running().await {
                        break;
                    }
                    
                    // Step 3: Execute sell (100% of tokens)
                    self.logger.log("💸 STEP 3: Executing SELL ALL...".blue().bold().to_string());
                    if let Err(e) = self.execute_sell_all().await {
                        self.logger.log(format!("❌ Sell failed: {}", e).red().to_string());
                        // Continue to next cycle even if sell fails
                    }
                },
                Err(e) => {
                    self.logger.log(format!("❌ Buy failed: {}", e).red().to_string());
                    // Continue to next cycle even if buy fails
                }
            }
        }
        
        Ok(())
    }
    
    /// Stop the random trading engine
    pub async fn stop(&self) {
        let mut running = self.is_running.write().await;
        *running = false;
        self.logger.log("Random trading engine stopped".red().to_string());
    }
    
    /// Check if the trader is running
    pub async fn is_running(&self) -> bool {
        *self.is_running.read().await
    }
    
    /// Execute a random buy
    async fn execute_random_buy(&self, config: &RandomTraderConfig) -> Result<()> {
        // Calculate random amount
        let buy_amount = self.random_float_in_range(config.min_buy_amount, config.max_buy_amount);
        
        self.logger.log(format!(
            "Executing random buy - Amount: {} SOL",
            buy_amount
        ).green().to_string());
        
        // Create swap config for buy
        let swap_config = SwapConfig {
            mint: self.target_mint.clone(),
            swap_direction: SwapDirection::Buy,
            in_type: SwapInType::Qty,
            amount_in: buy_amount,
            slippage: 1000, // 10% slippage
            max_buy_amount: buy_amount,
        };
        
        // Execute the swap
        let start_time = Instant::now();
        match self.raydium_cpmm.build_swap_from_default_info(swap_config).await {
            Ok((keypair, instructions, token_price)) => {
                self.logger.log(format!("Token price: ${:.8}", token_price));
                
                // Send transaction
                match self.send_swap_transaction(&keypair, instructions).await {
                    Ok(signature) => {
                        self.logger.log(format!(
                            "✅ Random buy successful! Amount: {} SOL, Signature: {}, Time: {:?}",
                            buy_amount, signature, start_time.elapsed()
                        ).green().bold().to_string());
                    },
                    Err(e) => {
                        self.logger.log(format!("❌ Random buy transaction failed: {}", e).red().to_string());
                        return Err(e);
                    }
                }
            },
            Err(e) => {
                self.logger.log(format!("❌ Random buy preparation failed: {}", e).red().to_string());
                return Err(e);
            }
        }
        
        Ok(())
    }
    
    /// Execute sell all tokens (100%)
    async fn execute_sell_all(&self) -> Result<()> {
        self.logger.log("Executing sell ALL tokens (100%)".blue().to_string());
        
        // Create swap config for selling 100% of tokens
        let swap_config = SwapConfig {
            mint: self.target_mint.clone(),
            swap_direction: SwapDirection::Sell,
            in_type: SwapInType::Pct,
            amount_in: 1.0, // Sell 100% of tokens
            slippage: 1000, // 10% slippage
            max_buy_amount: 0.0, // Not used for sells
        };
        
        // Execute the swap
        let start_time = Instant::now();
        match self.raydium_cpmm.build_swap_from_default_info(swap_config).await {
            Ok((keypair, instructions, token_price)) => {
                self.logger.log(format!("Token price: ${:.8}", token_price));
                
                // Send transaction
                match self.send_swap_transaction(&keypair, instructions).await {
                    Ok(signature) => {
                        self.logger.log(format!(
                            "✅ Sell ALL successful! Percentage: 100%, Signature: {}, Time: {:?}",
                            signature, start_time.elapsed()
                        ).blue().bold().to_string());
                    },
                    Err(e) => {
                        self.logger.log(format!("❌ Sell ALL transaction failed: {}", e).red().to_string());
                        return Err(e);
                    }
                }
            },
            Err(e) => {
                self.logger.log(format!("❌ Sell ALL preparation failed: {}", e).red().to_string());
                return Err(e);
            }
        }
        
        Ok(())
    }
    
    /// Send swap transaction to the network (SKIP SIMULATION for on-chain testing)
    async fn send_swap_transaction(
        &self,
        keypair: &Arc<anchor_client::solana_sdk::signature::Keypair>,
        instructions: Vec<anchor_client::solana_sdk::instruction::Instruction>,
    ) -> Result<Signature> {
        use anchor_client::solana_sdk::transaction::Transaction;
        
        // Get recent blockhash
        let recent_blockhash = self.app_state.rpc_client
            .get_latest_blockhash()
            .map_err(|e| anyhow::anyhow!("Failed to get recent blockhash: {}", e))?;
        
        // Create and sign transaction
        let transaction = Transaction::new_signed_with_payer(
            &instructions,
            Some(&keypair.pubkey()),
            &[keypair.as_ref()],
            recent_blockhash,
        );
        
        self.logger.log("🚀 Sending swap transaction with SKIP SIMULATION for on-chain testing".yellow().to_string());
        self.logger.log(format!("📊 Transaction size: {} bytes", transaction.message_data().len()).cyan().to_string());
        
        // Configure to skip simulation for on-chain testing
        let config = RpcSendTransactionConfig {
            skip_preflight: true,
            preflight_commitment: Some(CommitmentLevel::Finalized.into()),
            encoding: Some(solana_transaction_status::UiTransactionEncoding::Base64),
            max_retries: Some(0), // No retries to see exact error
            min_context_slot: None,
        };
        
        // Send transaction directly to blockchain (skip simulation)
        let signature = self.app_state.rpc_nonblocking_client
            .send_transaction_with_config(&transaction, config)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to send swap transaction (skip simulation): {}", e))?;
        
        self.logger.log(format!("🎯 ON-CHAIN swap transaction sent (simulation bypassed): {}", signature).green().to_string());
        self.logger.log(format!("🔗 Check transaction: https://solscan.io/tx/{}", signature).blue().to_string());
        
        Ok(signature)
    }
} 