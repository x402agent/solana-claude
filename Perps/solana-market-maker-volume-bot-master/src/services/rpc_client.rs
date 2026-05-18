use std::collections::HashMap;
use std::sync::Arc;
use anchor_client::solana_client::nonblocking::rpc_client::RpcClient;
use anchor_client::solana_sdk::pubkey::Pubkey;
use spl_token_2022::extension::StateWithExtensionsOwned;
use spl_token_2022::state::{Account, Mint};
use anyhow::Result;
use colored::Colorize;
use tokio::sync::RwLock;

use crate::common::logger::Logger;
use crate::common::cache::{TOKEN_ACCOUNT_CACHE, TOKEN_MINT_CACHE};

/// BatchRpcClient provides optimized methods for fetching multiple accounts in a single RPC call
pub struct BatchRpcClient {
    rpc_client: Arc<RpcClient>,
    connection_pool: Arc<RwLock<Vec<Arc<RpcClient>>>>,
    logger: Logger,
}

impl BatchRpcClient {
    pub fn new(rpc_client: Arc<RpcClient>) -> Self {
        // Create a connection pool with the initial client
        let mut pool = Vec::with_capacity(5);
        pool.push(rpc_client.clone());
        
        Self {
            rpc_client,
            connection_pool: Arc::new(RwLock::new(pool)),
            logger: Logger::new("[BATCH-RPC] => ".cyan().to_string()),
        }
    }
}

/// Create a batch RPC client from an existing RPC client
pub fn create_batch_client(rpc_client: Arc<RpcClient>) -> BatchRpcClient {
    BatchRpcClient::new(rpc_client)
} 