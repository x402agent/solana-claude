// Solana Compute Worker — high-performance transaction building and risk scoring
//
// Functions:
//   compute-worker::compute         — generic computation (backwards compat)
//   compute-worker::priority_fees   — fetch Solana priority fee percentiles
//   compute-worker::risk_score      — heuristic risk score for a token mint
//   compute-worker::build_swap_tx   — build a Jupiter-routed swap transaction

use iii_sdk::{register_worker, RegisterFunctionMessage, Value};
use std::time::Duration;

fn make_fn(id: &str) -> RegisterFunctionMessage {
    RegisterFunctionMessage {
        id: id.to_string(),
        description: None,
        request_format: None,
        response_format: None,
        metadata: None,
        invocation: None,
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = std::env::var("III_BRIDGE_URL")
        .unwrap_or_else(|_| "ws://localhost:49134".into());
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".into());

    let iii = register_worker(&url, Default::default());

    // ── Generic compute (backwards compat) ───────────────────────────────
    iii.register_function((
        make_fn("compute-worker::compute"),
        |input: Value| async move {
            let n = input.get("n").and_then(|v| v.as_u64()).unwrap_or(10);
            tokio::time::sleep(Duration::from_millis(50)).await;
            Ok(serde_json::json!({
                "result": n * 2,
                "input": n,
                "source": "compute-worker"
            }))
        },
    ));

    // ── Priority fee estimator ───────────────────────────────────────────
    let rpc_for_fees = rpc_url.clone();
    iii.register_function((
        make_fn("compute-worker::priority_fees"),
        move |_input: Value| {
            let rpc = rpc_for_fees.clone();
            async move {
                // Call getRecentPrioritizationFees via JSON-RPC
                let client = reqwest::Client::new();
                let body = serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getRecentPrioritizationFees",
                    "params": []
                });

                let resp = client.post(&rpc)
                    .json(&body)
                    .send()
                    .await;

                match resp {
                    Ok(r) => {
                        let json: Value = r.json().await.unwrap_or(serde_json::json!({}));
                        let fees = json.get("result").cloned().unwrap_or(serde_json::json!([]));

                        // Compute percentiles from recent fees
                        let mut values: Vec<u64> = fees.as_array()
                            .map(|arr| arr.iter()
                                .filter_map(|f| f.get("prioritizationFee").and_then(|v| v.as_u64()))
                                .collect())
                            .unwrap_or_default();
                        values.sort();
                        let len = values.len();

                        let p25 = if len > 0 { values[len / 4] } else { 0 };
                        let p50 = if len > 0 { values[len / 2] } else { 0 };
                        let p75 = if len > 0 { values[len * 3 / 4] } else { 0 };
                        let p95 = if len > 0 { values[len * 95 / 100] } else { 0 };

                        Ok(serde_json::json!({
                            "source": "compute-worker",
                            "samples": len,
                            "micro_lamports": {
                                "p25": p25,
                                "p50": p50,
                                "p75": p75,
                                "p95": p95
                            }
                        }))
                    }
                    Err(e) => Ok(serde_json::json!({
                        "source": "compute-worker",
                        "error": format!("RPC error: {}", e)
                    }))
                }
            }
        },
    ));

    // ── Risk scoring ─────────────────────────────────────────────────────
    let rpc_for_risk = rpc_url.clone();
    iii.register_function((
        make_fn("compute-worker::risk_score"),
        move |input: Value| {
            let rpc = rpc_for_risk.clone();
            async move {
                let mint = input.get("mint").and_then(|v| v.as_str()).unwrap_or("");
                if mint.is_empty() {
                    return Ok(serde_json::json!({"error": "mint required"}));
                }

                // Fetch token supply to check concentration
                let client = reqwest::Client::new();
                let body = serde_json::json!({
                    "jsonrpc": "2.0", "id": 1,
                    "method": "getTokenSupply",
                    "params": [mint]
                });

                let supply_resp = client.post(&rpc).json(&body).send().await;
                let supply_info = match supply_resp {
                    Ok(r) => r.json::<Value>().await.unwrap_or(serde_json::json!({})),
                    Err(_) => serde_json::json!({}),
                };

                let ui_amount = supply_info
                    .pointer("/result/value/uiAmount")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                let decimals = supply_info
                    .pointer("/result/value/decimals")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);

                // Heuristic risk score: 0 = safe, 100 = extreme risk
                let mut risk: u64 = 30; // base risk for any token
                if ui_amount < 1_000.0 { risk += 30; }       // very low supply = suspicious
                if ui_amount > 1_000_000_000_000.0 { risk += 20; } // absurd supply
                if decimals == 0 { risk += 15; }              // no decimals = unusual
                if risk > 100 { risk = 100; }

                let level = match risk {
                    0..=30 => "low",
                    31..=60 => "medium",
                    61..=80 => "high",
                    _ => "extreme",
                };

                Ok(serde_json::json!({
                    "source": "compute-worker",
                    "mint": mint,
                    "risk_score": risk,
                    "risk_level": level,
                    "supply": ui_amount,
                    "decimals": decimals
                }))
            }
        },
    ));

    // ── Build swap transaction (Jupiter quote) ───────────────────────────
    iii.register_function((
        make_fn("compute-worker::build_swap_tx"),
        |input: Value| async move {
            let input_mint = input.get("input_mint").and_then(|v| v.as_str()).unwrap_or("");
            let output_mint = input.get("output_mint").and_then(|v| v.as_str()).unwrap_or("");
            let amount = input.get("amount_lamports").and_then(|v| v.as_u64()).unwrap_or(0);
            let slippage = input.get("slippage_bps").and_then(|v| v.as_u64()).unwrap_or(100);
            let wallet = input.get("wallet").and_then(|v| v.as_str()).unwrap_or("");

            if input_mint.is_empty() || output_mint.is_empty() || amount == 0 || wallet.is_empty() {
                return Ok(serde_json::json!({"error": "input_mint, output_mint, amount_lamports, wallet required"}));
            }

            let client = reqwest::Client::new();

            // 1. Get Jupiter quote
            let quote_url = format!(
                "https://quote-api.jup.ag/v6/quote?inputMint={}&outputMint={}&amount={}&slippageBps={}",
                input_mint, output_mint, amount, slippage
            );
            let quote_resp = client.get(&quote_url).send().await;
            let quote = match quote_resp {
                Ok(r) => r.json::<Value>().await.unwrap_or(serde_json::json!({})),
                Err(e) => return Ok(serde_json::json!({"error": format!("Jupiter quote failed: {}", e)})),
            };

            if quote.get("error").is_some() {
                return Ok(serde_json::json!({"error": quote}));
            }

            // 2. Get swap transaction
            let swap_body = serde_json::json!({
                "quoteResponse": quote,
                "userPublicKey": wallet,
                "wrapAndUnwrapSol": true,
                "dynamicComputeUnitLimit": true,
                "prioritizationFeeLamports": "auto"
            });

            let swap_resp = client.post("https://quote-api.jup.ag/v6/swap")
                .json(&swap_body)
                .send()
                .await;

            match swap_resp {
                Ok(r) => {
                    let swap_data: Value = r.json().await.unwrap_or(serde_json::json!({}));
                    let tx = swap_data.get("swapTransaction").cloned().unwrap_or(serde_json::json!(null));
                    Ok(serde_json::json!({
                        "source": "compute-worker",
                        "transaction": tx,
                        "quote": {
                            "input_mint": input_mint,
                            "output_mint": output_mint,
                            "in_amount": quote.get("inAmount"),
                            "out_amount": quote.get("outAmount"),
                            "price_impact_pct": quote.get("priceImpactPct"),
                        }
                    }))
                }
                Err(e) => Ok(serde_json::json!({"error": format!("Jupiter swap failed: {}", e)}))
            }
        },
    ));

    println!("Solana compute worker started — compute, priority_fees, risk_score, build_swap_tx");

    tokio::signal::ctrl_c().await?;
    println!("Shutting down");
    Ok(())
}
