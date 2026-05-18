//! Rust Market Maker Agent API Server
//! 
//! Run with: cargo run --release --bin api_server
//! 
//! This starts an HTTP API server that the TypeScript bot can call
//! to manage market making sessions.

use solana_vntr_sniper::services::api_server::run_api_server;
use std::env;
use colored::Colorize;

#[tokio::main]
async fn main() {
    println!("{}", "
╔═══════════════════════════════════════════════════════════╗
║          🦀 RUST MARKET MAKER AGENT API                    ║
║                                                           ║
║  High-performance market making engine with:              ║
║  • 🎲 Dynamic Buy/Sell Ratios                             ║
║  • 🌊 Volume Wave Patterns                                ║
║  • 🛡️ Guardian Mode (crash protection)                    ║
║  • 🥷 Stealth Mode                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    ".cyan().bold());

    let port: u16 = env::var("RUST_AGENT_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    println!("{}", format!("🚀 Starting API server on port {}...", port).green());
    println!("{}", format!("📡 Endpoint: http://localhost:{}/api/v1/agent", port).yellow());
    println!();

    run_api_server(port).await;
}

