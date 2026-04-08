// Compute Worker - High-performance computation
// Demonstrates: register_function with async handler

use iii_sdk::{register_worker, RegisterFunctionMessage, Value};
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = std::env::var("III_BRIDGE_URL")
        .unwrap_or_else(|_| "ws://localhost:49134".into());
    let iii = register_worker(&url, Default::default());

    iii.register_function((
        RegisterFunctionMessage {
            id: "compute-worker::compute".to_string(),
            description: None,
            request_format: None,
            response_format: None,
            metadata: None,
            invocation: None,
        },
        |input: Value| async move {
            let n = input.get("n").and_then(|v| v.as_u64()).unwrap_or(10);
            tokio::time::sleep(Duration::from_millis(100)).await; // Simulates processing latency

            Ok(serde_json::json!({
                "result": n * 2,
                "input": n,
                "source": "compute-worker"
            }))
        },
    ));

    println!("Compute worker started - listening for calls");

    tokio::signal::ctrl_c().await?;
    println!("Shutting down");
    Ok(())
}
