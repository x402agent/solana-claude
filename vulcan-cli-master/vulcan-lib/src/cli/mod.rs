//! Top-level CLI parser and subcommand wiring.

use clap::{Parser, Subcommand};

use crate::output::OutputFormat;

pub mod account;
pub mod agent;
pub mod auth;
pub mod history;
pub mod margin;
pub mod market;
pub mod paper;
pub mod portfolio;
pub mod position;
pub mod spot;
pub mod strategy;
pub mod ta;
pub mod trade;
pub mod wallet;

use account::AccountCommand;
use agent::AgentCommand;
use auth::AuthCommand;
use history::HistoryCommand;
use margin::MarginCommand;
use market::MarketCommand;
use paper::PaperCommand;
use portfolio::PortfolioArgs;
use position::PositionCommand;
use strategy::StrategyCommand;
use ta::TaCommand;
use trade::TradeCommand;
use wallet::WalletCommand;

#[derive(Debug, Parser)]
#[command(name = "vulcan")]
#[command(version)]
#[command(about = "AI-native CLI for Phoenix Perpetuals DEX on Solana")]
pub struct Cli {
    /// Output format
    #[arg(long, value_enum, default_value_t = OutputFormat::Table, global = true)]
    pub output: OutputFormat,

    /// Simulate dangerous commands without sending transactions
    #[arg(long, global = true)]
    pub dry_run: bool,

    /// Confirm dangerous actions without prompting
    #[arg(long, global = true)]
    pub yes: bool,

    /// Enable verbose diagnostic logging
    #[arg(short, long, global = true)]
    pub verbose: bool,

    /// Keep compatible commands open in watch mode
    #[arg(long, global = true)]
    pub watch: bool,

    /// Override Solana RPC URL
    #[arg(long, global = true)]
    pub rpc_url: Option<String>,

    /// Override Phoenix API URL
    #[arg(long, global = true)]
    pub api_url: Option<String>,

    /// Stored wallet name to use instead of the default wallet
    #[arg(long, global = true)]
    pub wallet: Option<String>,

    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Wallet management
    #[command(subcommand)]
    Wallet(WalletCommand),

    /// Market data and metadata
    #[command(subcommand)]
    Market(MarketCommand),

    /// Live trading commands
    #[command(subcommand)]
    Trade(TradeCommand),

    /// Position management
    #[command(subcommand)]
    Position(PositionCommand),

    /// Margin and collateral management
    #[command(subcommand)]
    Margin(MarginCommand),

    /// Phoenix account management
    #[command(subcommand)]
    Account(AccountCommand),

    /// Phoenix API authentication
    #[command(subcommand)]
    Auth(AuthCommand),

    /// Portfolio overview
    Portfolio(PortfolioArgs),

    /// Local paper trading
    #[command(subcommand)]
    Paper(PaperCommand),

    /// Historical fills, orders, collateral, funding, and PnL
    #[command(subcommand)]
    History(HistoryCommand),

    /// Agent setup, logs, context, and MCP helpers
    #[command(subcommand)]
    Agent(AgentCommand),

    /// Strategy runners
    #[command(subcommand)]
    Strategy(StrategyCommand),

    /// Technical analysis helpers
    #[command(subcommand)]
    Ta(TaCommand),

    /// Gateway/API health status
    Status,

    /// Run first-time setup checks
    Setup,

    /// Print version
    Version,

    /// Print bundled agent context
    AgentContext,

    /// Start MCP server over stdio
    Mcp {
        /// Allow tools that can sign or submit transactions
        #[arg(long)]
        allow_dangerous: bool,

        /// Limit enabled MCP tool groups
        #[arg(long, value_delimiter = ',')]
        groups: Option<Vec<String>>,
    },
}
