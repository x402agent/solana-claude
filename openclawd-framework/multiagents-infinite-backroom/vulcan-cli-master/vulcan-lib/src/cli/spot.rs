//! Spot trading subcommand definitions — Jupiter DEX swaps for Solana tokens.

use clap::Subcommand;

#[derive(Debug, Subcommand)]
pub enum SpotCommand {
    /// Get a Jupiter swap quote for a token pair
    Quote {
        /// Input token mint address (e.g., So11111111111111111111111111111111111111112 for SOL)
        input_mint: String,
        /// Output token mint address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v for USDC)
        output_mint: String,
        /// Amount of input tokens in raw lamports (smallest unit)
        amount: u64,
        /// Slippage tolerance in basis points (default: 50 = 0.5%)
        #[arg(long, default_value = "50")]
        slippage_bps: u64,
        /// Whether the amount is in output token terms (exact_out swap)
        #[arg(long)]
        exact_out: bool,
    },

    /// Execute a Jupiter swap. Resolves stored wallet for signing.
    Swap {
        /// Input token mint address
        input_mint: String,
        /// Output token mint address
        output_mint: String,
        /// Amount of input tokens in raw lamports (smallest unit)
        amount: u64,
        /// Slippage tolerance in basis points (default: 50 = 0.5%)
        #[arg(long, default_value = "50")]
        slippage_bps: u64,
        /// Whether the amount is in output token terms (exact_out swap)
        #[arg(long)]
        exact_out: bool,
        /// Stored wallet name to use instead of the default
        #[arg(long)]
        wallet: Option<String>,
        /// Use Jupiter's dynamic slippage (max bps override)
        #[arg(long, default_value = "300")]
        dynamic_slippage_max_bps: Option<u64>,
    },

    /// Get prices for one or more tokens from the Jupiter price API
    Prices {
        /// One or more token mint addresses
        mints: Vec<String>,
    },
}
