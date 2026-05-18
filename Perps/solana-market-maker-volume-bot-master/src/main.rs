use anchor_client::solana_sdk::signature::Signer;
use solana_vntr_sniper::{
    common::{config::Config, constants::RUN_MSG, cache::WALLET_TOKEN_ACCOUNTS},
    engine::{
        market_maker::{start_market_maker, MarketMakerConfig},
    },
    services::{telegram, cache_maintenance, blockhash_processor::BlockhashProcessor},
    core::token,
};
use solana_program_pack::Pack;
use anchor_client::solana_sdk::pubkey::Pubkey;
use anchor_client::solana_sdk::transaction::Transaction;
use anchor_client::solana_sdk::system_instruction;
use anchor_client::solana_sdk::signature::Keypair;
use std::str::FromStr;
use colored::Colorize;
use spl_token::instruction::sync_native;
use spl_token::ui_amount_to_amount;
use spl_associated_token_account::get_associated_token_address;
use std::sync::Arc;
use std::fs;
use std::path::Path;
use anchor_client::solana_client::rpc_config::RpcSendTransactionConfig;
use anchor_client::solana_sdk::commitment_config::CommitmentLevel;
use solana_transaction_status;

#[tokio::main]
async fn main() {
    /* Initial Settings */
    let config = Config::new().await;
    let config = config.lock().await;

    /* Running Bot */
    let run_msg = RUN_MSG;
    println!("{}", run_msg);
    
    // Initialize blockhash processor
    match BlockhashProcessor::new(config.app_state.rpc_client.clone()).await {
        Ok(processor) => {
            if let Err(e) = processor.start().await {
                eprintln!("Failed to start blockhash processor: {}", e);
                return;
            }
            println!("Blockhash processor started successfully");
        },
        Err(e) => {
            eprintln!("Failed to initialize blockhash processor: {}", e);
            return;
        }
    }

    // Parse command line arguments
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        // Check for wallet generation argument
        if args.contains(&"--wallet".to_string()) {
            println!("Generating wallets...");
            
            match generate_wallets().await {
                Ok(_) => {
                    println!("✅ Wallet generation completed successfully!");
                    return;
                },
                Err(e) => {
                    eprintln!("❌ Failed to generate wallets: {}", e);
                    return;
                }
            }
        }
        // Check for command line arguments
        else if args.contains(&"--wrap".to_string()) {
            println!("Wrapping SOL to WSOL...");
            
            // Get wrap amount from .env
            let wrap_amount = std::env::var("WRAP_AMOUNT")
                .ok()
                .and_then(|v| v.parse::<f64>().ok())
                .unwrap_or(0.1);
            
            match wrap_sol(&config, wrap_amount).await {
                Ok(_) => {
                    println!("Successfully wrapped {} SOL to WSOL", wrap_amount);
                    return;
                },
                Err(e) => {
                    eprintln!("Failed to wrap SOL: {}", e);
                    return;
                }
            }
        } else if args.contains(&"--unwrap".to_string()) {
            println!("Unwrapping WSOL to SOL...");
            
            match unwrap_sol(&config).await {
                Ok(_) => {
                    println!("Successfully unwrapped WSOL to SOL");
                    return;
                },
                Err(e) => {
                    eprintln!("Failed to unwrap WSOL: {}", e);
                    return;
                }
            }
        } else if args.contains(&"--close".to_string()) {
            println!("Closing all token accounts...");
            
            match close_all_token_accounts(&config).await {
                Ok(_) => {
                    println!("Successfully closed all token accounts");
                    return;
                },
                Err(e) => {
                    eprintln!("Failed to close all token accounts: {}", e);
                    return;
                }
            }
        } else if args.contains(&"--check-tokens".to_string()) {
            println!("Token monitoring feature disabled in this version");
            return;
        } else if args.contains(&"--distribute".to_string()) {
            println!("Distributing SOL to all wallets and converting to WSOL...");
            
            match distribute_sol(&config).await {
                Ok(_) => {
                    println!("✅ SOL distribution and WSOL conversion completed successfully!");
                    return;
                },
                Err(e) => {
                    eprintln!("❌ Failed to distribute SOL: {}", e);
                    return;
                }
            }
        } else if args.contains(&"--collect".to_string()) {
            println!("🔍 Checking wallet balances and collecting all funds...");
            println!("📊 This will: sell all tokens, close WSOL accounts, and collect SOL to main wallet");
            
            match collect_sol(&config).await {
                Ok(_) => {
                    println!("✅ Collection completed successfully!");
                    return;
                },
                Err(e) => {
                    eprintln!("❌ Failed to complete collection: {}", e);
                    return;
                }
            }
        }
    }

    // Initialize Telegram bot
    match telegram::init().await {
        Ok(_) => println!("Telegram bot initialized successfully"),
        Err(e) => println!("Failed to initialize Telegram bot: {}. Continuing without notifications.", e),
    }
    
    // Initialize token account list
    initialize_token_account_list(&config).await;
    
    // Start cache maintenance service (clean up expired cache entries every 60 seconds)
    cache_maintenance::start_cache_maintenance(60).await;
    println!("Cache maintenance service started");

    // Market maker mode - no need for target addresses

    // Create stealth market maker config with 100 wallets
    let market_maker_config = MarketMakerConfig::stealth_mode(
        config.yellowstone_grpc_http.clone(),
        config.yellowstone_grpc_token.clone(),
        std::sync::Arc::new(config.app_state.clone()),
        config.target_token_mint.clone(),
        config.coin_creator.clone(),
        config.dex_type.clone(),
        config.pool_id.clone(),
        config.pool_base_account.clone(),
        config.pool_quote_account.clone(),
    );
    
    // Start the advanced stealth market maker bot
    println!("🚀 Starting Advanced Stealth Market Maker for mint: {}", config.target_token_mint);
    println!("🎯 Using 100 wallets with sophisticated randomization");
    println!("💰 Buy amount ratio: 50% - 90% of wrapped WSOL");
    println!("🎲 70% Buy / 30% Sell ratio");
    println!("🔄 Wallet rotation every 2 trades");
    println!("⏰ Randomized intervals: 10 minutes - 2 hours");
    println!("📊 Activity reports every 30 minutes");
    println!("🎯 Buy: amount_in = WSOL lamports, minimum_amount_out = 0");
    println!("🎯 Sell: amount_in = token balance, minimum_amount_out = 0");
    
    if let Err(e) = start_market_maker(market_maker_config).await {
        eprintln!("Advanced Market Maker error: {}", e);
        
        // Send error notification via Telegram
        if let Err(te) = telegram::send_error_notification(&format!("Advanced Market Maker bot crashed: {}", e)).await {
            eprintln!("Failed to send Telegram notification: {}", te);
        }
    }
}
