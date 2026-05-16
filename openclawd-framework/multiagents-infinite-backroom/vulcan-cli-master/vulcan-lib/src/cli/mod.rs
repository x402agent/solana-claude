//! Top-level CLI definitions and submodule exports.

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

#[derive(Debug, Parser)]
#[command(name = "vulcan", version, about = "AI-native CLI for Phoenix perpetuals on Solana")]
pub struct Cli {
    /// Output format
    #[arg(short = 'o', long = "output", value_enum, default_value = "table", global = true)]
    pub output: OutputFormat,

    /// Use a specific stored wallet instead of the default
    #[arg(short = 'w', long = "wallet", global = true)]
    pub wallet: Option<String>,

    /// Simulate the action without submitting a transaction
    #[arg(long = "dry-run", default_value_t = false, global = true)]
    pub dry_run: bool,

    /// Skip interactive confirmation prompts
    #[arg(short = 'y', long = "yes", default_value_t = false, global = true)]
    pub yes: bool,

    /// Stream live updates where supported
    #[arg(long = "watch", default_value_t = false, global = true)]
    pub watch: bool,

    /// Verbose/debug logging to stderr
    #[arg(short = 'v', long = "verbose", default_value_t = false, global = true)]
    pub verbose: bool,

    /// Override the Solana RPC endpoint
    #[arg(long = "rpc-url", global = true)]
    pub rpc_url: Option<String>,

    /// Override the Phoenix API endpoint
    #[arg(long = "api-url", global = true)]
    pub api_url: Option<String>,

    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    #[command(subcommand)]
    Wallet(wallet::WalletCommand),
    #[command(subcommand)]
    Market(market::MarketCommand),
    #[command(subcommand)]
    Trade(trade::TradeCommand),
    #[command(subcommand)]
    Position(position::PositionCommand),
    #[command(subcommand)]
    Margin(margin::MarginCommand),
    #[command(subcommand)]
    Account(account::AccountCommand),
    #[command(subcommand)]
    Auth(auth::AuthCommand),
    Portfolio(portfolio::PortfolioArgs),
    #[command(subcommand)]
    Paper(paper::PaperCommand),
    #[command(subcommand)]
    History(history::HistoryCommand),
    #[command(subcommand)]
    Agent(agent::AgentCommand),
    #[command(subcommand)]
    Strategy(strategy::StrategyCommand),
    #[command(subcommand)]
    Ta(ta::TaCommand),
    Status,
    Setup,
    Version,
    AgentContext,
    Mcp {
        #[arg(long = "allow-dangerous", default_value_t = false)]
        allow_dangerous: bool,
        #[arg(long = "groups", value_delimiter = ',')]
        groups: Option<Vec<String>>,
    },
}
