//! Spot trading command execution — Jupiter DEX swap integration.
//!
//! Uses Jupiter Swap API v2 (https://api.jup.ag/swap/v2) for quotes and
//! swap transaction building, then signs and submits via the stored wallet.

use crate::cli::spot::SpotCommand;
use crate::context::AppContext;
use crate::error::VulcanError;
use crate::output::{render_success, TableRenderable};
use serde::Serialize;
use solana_pubkey::Pubkey;
use solana_sdk::signer::Signer;
use std::str::FromStr;

const JUP_QUOTE_V2: &str = "https://api.jup.ag/swap/v2/quote";
const JUP_SWAP_V2: &str = "https://api.jup.ag/swap/v2";
const JUP_PRICE_V2: &str = "https://api.jup.ag/price/v2";
const SOL_MINT: &str = "So11111111111111111111111111111111111111112";
const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// ── Result types ────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SpotQuoteResult {
    pub input_mint: String,
    pub output_mint: String,
    pub in_amount: u64,
    pub out_amount: u64,
    pub other_amount_threshold: u64,
    pub price_impact_pct: String,
    pub route_plan: String,
    pub swap_mode: String,
    pub slippage_bps: u64,
    pub quoted_at: String,
}

impl TableRenderable for SpotQuoteResult {
    fn render_table(&self) {
        println!("Jupiter Quote:");
        println!("  Input:  {} ({})", self.in_amount, self.input_mint);
        println!("  Output: {} ({})", self.out_amount, self.output_mint);
        println!("  Minimum output: {}", self.other_amount_threshold);
        println!("  Price impact: {}%", self.price_impact_pct);
        println!("  Slippage: {} bps ({}%)", self.slippage_bps, self.slippage_bps as f64 / 100.0);
        println!("  Route steps: {}", self.route_plan);
        println!("  Swap mode: {}", self.swap_mode);
        println!("  Quoted at: {}", self.quoted_at);
    }
}

#[derive(Debug, Serialize)]
pub struct SpotSwapResult {
    pub input_mint: String,
    pub output_mint: String,
    pub in_amount: u64,
    pub out_amount: u64,
    pub slippage_bps: u64,
    pub dry_run: bool,
    pub tx_signature: Option<String>,
}

impl TableRenderable for SpotSwapResult {
    fn render_table(&self) {
        if self.dry_run {
            println!("[DRY RUN] Would execute spot swap:");
        } else {
            println!("Spot swap executed:");
        }
        println!("  Input:  {} ({})", self.in_amount, self.input_mint);
        println!("  Output: {} ({})", self.out_amount, self.output_mint);
        println!("  Slippage: {} bps", self.slippage_bps);
        if let Some(sig) = &self.tx_signature {
            println!("  Tx: {}", sig);
        }
    }
}

#[derive(Debug, Serialize)]
pub struct SpotPricesResult {
    pub prices: Vec<TokenPrice>,
}

#[derive(Debug, Serialize)]
pub struct TokenPrice {
    pub mint: String,
    pub price: f64,
    pub price_24h_change: Option<f64>,
}

impl TableRenderable for SpotPricesResult {
    fn render_table(&self) {
        if self.prices.is_empty() {
            println!("No prices returned.");
            return;
        }
        for tp in &self.prices {
            print!("  {}: ${}", tp.mint, tp.price);
            if let Some(chg) = tp.price_24h_change {
                print!(" (24h: {:.2}%)", chg);
            }
            println!();
        }
    }
}

// ── Execute dispatch ─────────────────────────────────────────────────────

pub async fn execute(ctx: &AppContext, cmd: SpotCommand) -> Result<(), VulcanError> {
    match cmd {
        SpotCommand::Quote {
            input_mint,
            output_mint,
            amount,
            slippage_bps,
            exact_out,
        } => {
            let result = execute_quote(ctx, &input_mint, &output_mint, amount, slippage_bps, exact_out).await?;
            render_success(
                ctx.output_format,
                &result,
                serde_json::json!({
                    "command": "spot.quote",
                    "input_mint": input_mint,
                    "output_mint": output_mint,
                    "amount": amount,
                }),
            );
            Ok(())
        }
        SpotCommand::Swap {
            input_mint,
            output_mint,
            amount,
            slippage_bps,
            exact_out,
            wallet,
            dynamic_slippage_max_bps,
        } => {
            let result = execute_swap(ctx, &input_mint, &output_mint, amount, slippage_bps, exact_out, wallet.as_deref(), dynamic_slippage_max_bps).await?;
            render_success(
                ctx.output_format,
                &result,
                serde_json::json!({
                    "command": "spot.swap",
                    "input_mint": input_mint,
                    "output_mint": output_mint,
                    "amount": amount,
                    "dry_run": ctx.dry_run,
                }),
            );
            Ok(())
        }
        SpotCommand::Prices { mints } => {
            let result = execute_prices(ctx, &mints).await?;
            render_success(
                ctx.output_format,
                &result,
                serde_json::json!({
                    "command": "spot.prices",
                    "mints": mints,
                }),
            );
            Ok(())
        }
    }
}

// ── Quote ────────────────────────────────────────────────────────────────

async fn execute_quote(
    ctx: &AppContext,
    input_mint: &str,
    output_mint: &str,
    amount: u64,
    slippage_bps: u64,
    exact_out: bool,
) -> Result<SpotQuoteResult, VulcanError> {
    let swap_mode = if exact_out { "exactOut" } else { "exactIn" };
    let url = format!(
        "{}?inputMint={}&outputMint={}&amount={}&slippageBps={}&swapMode={}",
        JUP_QUOTE_V2, input_mint, output_mint, amount, slippage_bps, swap_mode
    );

    let resp = ctx
        .raw_http_client
        .get(&url)
        .send()
        .await
        .map_err(|e| VulcanError::network("JUP_QUOTE_FAILED", format!("Failed to fetch Jupiter quote: {}", e)))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(VulcanError::api(
            "JUP_QUOTE_ERROR",
            format!("Jupiter quote API returned {}: {}", status, body),
        ));
    }

    let quote: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| VulcanError::api("JUP_QUOTE_PARSE_FAILED", format!("Failed to parse quote response: {}", e)))?;

    let in_amount = quote["inAmount"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(amount);
    let out_amount = quote["outAmount"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);
    let other_amount_threshold = quote["otherAmountThreshold"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);
    let price_impact_pct = quote
        .get("priceImpactPct")
        .and_then(|v| v.as_str())
        .unwrap_or("0")
        .to_string();
    let route_plan_len = quote["routePlan"]
        .as_array()
        .map(|a| a.len())
        .unwrap_or(0);

    Ok(SpotQuoteResult {
        input_mint: input_mint.to_string(),
        output_mint: output_mint.to_string(),
        in_amount,
        out_amount,
        other_amount_threshold,
        price_impact_pct,
        route_plan: format!("{} hop(s)", route_plan_len),
        swap_mode: swap_mode.to_string(),
        slippage_bps,
        quoted_at: chrono::Utc::now().to_rfc3339(),
    })
}

// ── Swap ─────────────────────────────────────────────────────────────────

async fn execute_swap(
    ctx: &AppContext,
    input_mint: &str,
    output_mint: &str,
    amount: u64,
    slippage_bps: u64,
    exact_out: bool,
    wallet_override: Option<&str>,
    _dynamic_slippage_max_bps: Option<u64>,
) -> Result<SpotSwapResult, VulcanError> {
    // 1. Get swap mode
    let swap_mode = if exact_out { "exactOut" } else { "exactIn" };

    // 2. Get a quote first
    let quote_url = format!(
        "{}?inputMint={}&outputMint={}&amount={}&slippageBps={}&swapMode={}",
        JUP_QUOTE_V2, input_mint, output_mint, amount, slippage_bps, swap_mode
    );

    let quote_resp = ctx
        .raw_http_client
        .get(&quote_url)
        .send()
        .await
        .map_err(|e| VulcanError::network("JUP_QUOTE_FAILED", format!("Failed to fetch Jupiter quote: {}", e)))?;

    if !quote_resp.status().is_success() {
        let status = quote_resp.status();
        let body = quote_resp.text().await.unwrap_or_default();
        return Err(VulcanError::api(
            "JUP_QUOTE_ERROR",
            format!("Jupiter quote API returned {}: {}", status, body),
        ));
    }

    let quote: serde_json::Value = quote_resp
        .json()
        .await
        .map_err(|e| VulcanError::api("JUP_QUOTE_PARSE_FAILED", format!("Failed to parse quote: {}", e)))?;

    let out_amount = quote["outAmount"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    // 3. Resolve wallet for signing
    let (wallet, authority) = resolve_spot_wallet(ctx, wallet_override)?;

    // 4. Get swap transaction from Jupiter
    let user_pubkey = authority.to_string();
    let swap_req = serde_json::json!({
        "quoteResponse": quote,
        "userPublicKey": user_pubkey,
        "wrapAndUnwrapSol": true,
        "dynamicComputeUnitLimit": true,
        "prioritizationFeeLamports": "auto",
        "computeUnitPriceMicroLamports": "auto",
    });

    let swap_resp = ctx
        .raw_http_client
        .post(format!("{}/swap", JUP_SWAP_V2))
        .header("Content-Type", "application/json")
        .json(&swap_req)
        .send()
        .await
        .map_err(|e| VulcanError::network("JUP_SWAP_FAILED", format!("Failed to build swap tx: {}", e)))?;

    if !swap_resp.status().is_success() {
        let status = swap_resp.status();
        let body = swap_resp.text().await.unwrap_or_default();
        return Err(VulcanError::api(
            "JUP_SWAP_ERROR",
            format!("Jupiter swap API returned {}: {}", status, body),
        ));
    }

    let swap_data: serde_json::Value = swap_resp
        .json()
        .await
        .map_err(|e| VulcanError::api("JUP_SWAP_PARSE_FAILED", format!("Failed to parse swap response: {}", e)))?;

    let swap_tx_b58 = swap_data["swapTransaction"]
        .as_str()
        .ok_or_else(|| VulcanError::api("JUP_SWAP_MISSING_TX", "No swapTransaction in Jupiter response"))?;

    // 5. Dry run: just report the quote without submitting
    if ctx.dry_run {
        return Ok(SpotSwapResult {
            input_mint: input_mint.to_string(),
            output_mint: output_mint.to_string(),
            in_amount: amount,
            out_amount,
            slippage_bps,
            dry_run: true,
            tx_signature: None,
        });
    }

    // 6. Decode, sign, and submit
    let tx_bytes = bs58::decode(swap_tx_b58)
        .into_vec()
        .map_err(|e| VulcanError::validation("JUP_TX_DECODE_FAILED", format!("Failed to decode base58 tx: {}", e)))?;

    let mut tx: solana_sdk::transaction::Transaction = bincode::deserialize(&tx_bytes)
        .map_err(|e| VulcanError::validation("JUP_TX_DESERIALIZE_FAILED", format!("Failed to deserialize tx: {}", e)))?;

    let keypair = wallet
        .to_solana_keypair()
        .map_err(|e| VulcanError::auth("KEYPAIR_ERROR", e.to_string()))?;

    // Partially sign — Jupiter includes some signatures for lookup tables
    tx.sign(&[&keypair], tx.message.recent_blockhash);

    let rpc_client = ctx.rpc_client();
    let sig = rpc_client
        .send_and_confirm_transaction(&tx)
        .map_err(|e| VulcanError::tx_failed("JUP_TX_SEND_FAILED", e.to_string()))?;

    Ok(SpotSwapResult {
        input_mint: input_mint.to_string(),
        output_mint: output_mint.to_string(),
        in_amount: amount,
        out_amount,
        slippage_bps,
        dry_run: false,
        tx_signature: Some(sig.to_string()),
    })
}

// ── Prices ───────────────────────────────────────────────────────────────

async fn execute_prices(
    ctx: &AppContext,
    mints: &[String],
) -> Result<SpotPricesResult, VulcanError> {
    let ids = mints.join(",");
    let url = format!("{}?ids={}", JUP_PRICE_V2, ids);

    let resp = ctx
        .raw_http_client
        .get(&url)
        .send()
        .await
        .map_err(|e| VulcanError::network("JUP_PRICE_FAILED", format!("Failed to fetch prices: {}", e)))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(VulcanError::api(
            "JUP_PRICE_ERROR",
            format!("Jupiter price API returned {}: {}", status, body),
        ));
    }

    let prices_data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| VulcanError::api("JUP_PRICE_PARSE_FAILED", format!("Failed to parse prices: {}", e)))?;

    let data = prices_data["data"]
        .as_object()
        .ok_or_else(|| VulcanError::api("JUP_PRICE_MISSING_DATA", "No 'data' key in prices response"))?;

    let mut prices = Vec::new();
    for (mint, info) in data {
        let price = info["price"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);
        let price_24h_change = info["price24hChange"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok());

        prices.push(TokenPrice {
            mint: mint.clone(),
            price,
            price_24h_change,
        });
    }

    Ok(SpotPricesResult { prices })
}

// ── Wallet helpers ───────────────────────────────────────────────────────

/// Resolve the stored wallet and authority pubkey for spot trading.
/// Uses session wallet if available (MCP mode), otherwise resolves from store.
fn resolve_spot_wallet(
    ctx: &AppContext,
    wallet_override: Option<&str>,
) -> Result<(crate::wallet::Wallet, Pubkey), VulcanError> {
    // MCP session wallet path — no password prompt needed
    if let Some(sw) = &ctx.session_wallet {
        let wallet = sw.to_wallet()?;
        return Ok((wallet, sw.authority));
    }

    let chosen = wallet_override
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .or_else(|| ctx.wallet_override.clone());

    let wallet_name = match chosen {
        Some(name) => {
            if !ctx.wallet_store.exists(&name) {
                return Err(VulcanError::auth(
                    "WALLET_NOT_FOUND",
                    format!(
                        "Wallet '{}' not found. Use `vulcan wallet list` for stored names.",
                        name
                    ),
                ));
            }
            name
        }
        None => ctx
            .wallet_store
            .default_wallet()
            .map_err(|e| VulcanError::config("CONFIG_ERROR", e.to_string()))?
            .ok_or_else(|| {
                VulcanError::config(
                    "NO_DEFAULT_WALLET",
                    "No default wallet set. Use 'vulcan wallet set-default <NAME>' or pass --wallet <NAME>",
                )
            })?,
    };

    let wallet_file = ctx
        .wallet_store
        .load(&wallet_name)
        .map_err(|e| VulcanError::auth("WALLET_NOT_FOUND", e.to_string()))?;

    let authority = Pubkey::from_str(&wallet_file.public_key)
        .map_err(|e| VulcanError::validation("INVALID_PUBKEY", e.to_string()))?;

    if ctx.dry_run {
        // Dry-run wallet: zeroed keypair with the correct authority pubkey
        let mut keypair_bytes = vec![0u8; 64];
        keypair_bytes[32..64].copy_from_slice(authority.as_ref());
        let wallet = crate::wallet::Wallet::from_bytes(&keypair_bytes)
            .map_err(|e| VulcanError::internal("DRY_RUN_WALLET_FAILED", e.to_string()))?;
        return Ok((wallet, authority));
    }

    let password = crate::commands::trade::prompt_password()?;
    let wallet = crate::wallet::Wallet::decrypt(&wallet_file.encrypted, &password)
        .map_err(|e| VulcanError::auth("DECRYPT_FAILED", e.to_string()))?;

    Ok((wallet, authority))
}
