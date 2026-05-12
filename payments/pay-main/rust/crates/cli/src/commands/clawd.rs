use std::process::{Command, Stdio};

use clap::Args;

/// Run OpenClawd with 402 payment support.
///
/// Launches the `clawd` binary with Pay MCP metadata available through
/// environment variables. If `clawd` is not installed locally, falls back to
/// `npx -y --package @openclawdsolana/clawd clawd` so one-shot `npx @solana/pay clawd`
/// works after installing only Pay.
#[derive(Args)]
#[command(disable_help_flag = true)]
pub struct ClawdCommand {
    /// Arguments forwarded to clawd.
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
    pub args: Vec<String>,
}

impl ClawdCommand {
    pub fn run(self, pay_bin: &str, active_account_name: Option<&str>) -> pay_core::Result<i32> {
        let mut envs = vec![
            ("CLAWD_PAY_ENABLED".to_string(), "1".to_string()),
            ("CLAWD_PAY_MCP_COMMAND".to_string(), pay_bin.to_string()),
            ("CLAWD_PAY_MCP_ARGS".to_string(), "mcp".to_string()),
            (
                "CLAWD_PAY_SYSTEM_PROMPT".to_string(),
                pay_core::instructions::INSTRUCTIONS.to_string(),
            ),
        ];

        if let Some(source) = active_account_name {
            envs.push(("PAY_ACTIVE_ACCOUNT".to_string(), source.to_string()));
        }
        if let Ok(url) = std::env::var("PAY_RPC_URL") {
            envs.push(("PAY_RPC_URL".to_string(), url));
        }
        if let Ok(network) = std::env::var("PAY_NETWORK_ENFORCED") {
            envs.push(("PAY_NETWORK_ENFORCED".to_string(), network));
        }
        if let Ok(proxy) = std::env::var("PAY_DEBUGGER_PROXY") {
            envs.push(("PAY_DEBUGGER_PROXY".to_string(), proxy));
        }

        match launch("clawd", &[], &self.args, &envs) {
            Ok(code) => Ok(code),
            Err(first_err) => {
                let npx_args = ["-y", "--package", "@openclawdsolana/clawd", "clawd"];
                launch("npx", &npx_args, &self.args, &envs).map_err(|second_err| {
                    pay_core::Error::Config(format!(
                        "Failed to launch clawd: {first_err}. Fallback `npx -y --package @openclawdsolana/clawd clawd` also failed: {second_err}."
                    ))
                })
            }
        }
    }
}

fn launch(
    program: &str,
    prefix_args: &[&str],
    user_args: &[String],
    envs: &[(String, String)],
) -> Result<i32, std::io::Error> {
    let status = Command::new(program)
        .args(prefix_args)
        .args(user_args)
        .envs(envs.iter().map(|(key, value)| (key, value)))
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;

    Ok(status.code().unwrap_or(1))
}
