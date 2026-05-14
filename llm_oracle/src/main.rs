use anchor_lang::prelude::AccountMeta;
use anchor_lang::{AccountDeserialize, AnchorSerialize, Discriminator};
use chatgpt::client::ChatGPT;
use chatgpt::config::ModelConfiguration;
use chatgpt::types::{ChatMessage, Role};
use futures::StreamExt;
use memory::InteractionMemory;
use solana_account_decoder::UiAccountEncoding;
use solana_client::pubsub_client::PubsubClient;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::{RpcAccountInfoConfig, RpcProgramAccountsConfig};
use solana_sdk::compute_budget::ComputeBudgetInstruction;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::env;
use std::error::Error;
use std::str::FromStr;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

mod character;
mod clawd;
mod llm;
mod memory;

use character::Character;
use clawd::ClawdClient;
use llm::LlmClient;

const MAX_TX_RETRY_ATTEMPTS: u8 = 5;
const MAX_API_RETRY_ATTEMPTS: u8 = 3;

struct OracleConfig {
    rpc_url: String,
    websocket_url: String,
    payer: Keypair,
    identity_pda: Pubkey,
    provider: Provider,
    character: Character,
}

enum Provider {
    Clawd { api_key: String, model: String },
    OpenAi { api_key: String, model: String },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let cfg = load_config()?;
    let mut interaction_memory = InteractionMemory::new(10);

    println!(" Oracle identity:  {}", cfg.payer.pubkey());
    println!(" RPC:              {}", cfg.rpc_url);
    println!(" WS:               {}", cfg.websocket_url);
    println!(" Character:        {}", cfg.character.name);
    println!(
        " Provider:         {}",
        match &cfg.provider {
            Provider::Clawd { model, .. } => format!("clawd ({})", model),
            Provider::OpenAi { model, .. } => format!("openai ({})", model),
        }
    );

    loop {
        if let Err(e) = run_oracle(&cfg, &mut interaction_memory).await {
            eprintln!("Error encountered: {:?}. Restarting...", e);
        }
    }
}

fn build_llm_client(provider: &Provider) -> Result<LlmClient, Box<dyn Error>> {
    match provider {
        Provider::Clawd { api_key, model } => Ok(LlmClient::Clawd(ClawdClient::new(
            api_key.clone(),
            model.clone(),
            300,
        ))),
        Provider::OpenAi { api_key, model } => {
            // chatgpt_rs requires a `&'static str` for Custom engines.
            let engine_name: &'static str = Box::leak(model.clone().into_boxed_str());
            let client = ChatGPT::new_with_config(
                api_key,
                ModelConfiguration {
                    engine: chatgpt::config::ChatGPTEngine::Custom(engine_name),
                    presence_penalty: 0.3,
                    frequency_penalty: 0.3,
                    max_tokens: Some(300),
                    ..Default::default()
                },
            )?;
            Ok(LlmClient::ChatGpt(client))
        }
    }
}

async fn run_oracle(
    cfg: &OracleConfig,
    interaction_memory: &mut InteractionMemory,
) -> Result<(), Box<dyn Error>> {
    let llm = build_llm_client(&cfg.provider)?;
    let system_prompt = cfg.character.system_prompt();
    let rpc_client = RpcClient::new_with_commitment(&cfg.rpc_url, CommitmentConfig::processed());

    let (tx, rx) = mpsc::channel(100);
    let mut stream = ReceiverStream::new(rx);

    let rpc_config = RpcAccountInfoConfig {
        commitment: Some(CommitmentConfig::processed()),
        encoding: Some(UiAccountEncoding::Base64),
        ..Default::default()
    };

    let filters = vec![solana_client::rpc_filter::RpcFilterType::Memcmp(
        solana_client::rpc_filter::Memcmp::new(
            0,
            solana_client::rpc_filter::MemcmpEncodedBytes::Bytes(
                solana_gpt_oracle::Interaction::DISCRIMINATOR.to_vec(),
            ),
        ),
    )];

    fetch_and_process_program_accounts(
        &rpc_client,
        filters.clone(),
        &cfg.payer,
        &cfg.identity_pda,
        &llm,
        &system_prompt,
        interaction_memory,
    )
    .await?;

    let program_config = RpcProgramAccountsConfig {
        account_config: rpc_config,
        filters: Some(filters),
        ..Default::default()
    };

    let subscription = PubsubClient::program_subscribe(
        &cfg.websocket_url,
        &solana_gpt_oracle::ID,
        Some(program_config),
    )?;

    tokio::spawn(async move {
        for update in subscription.1 {
            if tx.send(update).await.is_err() {
                eprintln!("Receiver dropped");
                break;
            }
        }
    });

    while let Some(update) = stream.next().await {
        if let Ok(interaction_pubkey) = Pubkey::from_str(&update.value.pubkey) {
            if let Some(data) = update.value.account.data.decode() {
                process_interaction(
                    &cfg.payer,
                    &cfg.identity_pda,
                    &llm,
                    &system_prompt,
                    &rpc_client,
                    interaction_pubkey,
                    data,
                    interaction_memory,
                )
                .await?;
            }
        }
    }

    Ok(())
}

/// Process an interaction and respond to it
async fn process_interaction(
    payer: &Keypair,
    identity_pda: &Pubkey,
    llm: &LlmClient,
    system_prompt: &str,
    rpc_client: &RpcClient,
    interaction_pubkey: Pubkey,
    data: Vec<u8>,
    interaction_memory: &mut InteractionMemory,
) -> Result<(), Box<dyn Error>> {
    if let Ok(interaction) =
        solana_gpt_oracle::Interaction::try_deserialize_unchecked(&mut data.as_slice())
    {
        if interaction.is_processed == true {
            return Ok(());
        }
        println!("Processing interaction: {:?}", interaction_pubkey);
        if let Ok(context_data) = rpc_client.get_account(&interaction.context) {
            if let Ok(context) = solana_gpt_oracle::ContextAccount::try_deserialize_unchecked(
                &mut context_data.data.as_slice(),
            ) {
                println!(
                    "Interaction: {:?}, Pubkey: {:?}",
                    interaction, interaction_pubkey
                );

                let mut previous_history = interaction_memory
                    .get_history(&interaction_pubkey)
                    .unwrap_or(Vec::new())
                    .clone();
                interaction_memory.add_interaction(
                    interaction_pubkey,
                    interaction.text.clone(),
                    Role::User,
                );
                previous_history.push(ChatMessage {
                    role: Role::User,
                    content: format!(
                        "With context: {:?}, respond to: {:?}",
                        context.text, interaction.text
                    ),
                });
                let mut api_attempts: u8 = 0;
                let mut response_content = String::new();
                while api_attempts < MAX_API_RETRY_ATTEMPTS {
                    match llm.complete(system_prompt, &previous_history).await {
                        Ok(text) => {
                            response_content = text;
                            break;
                        }
                        Err(e) => {
                            api_attempts += 1;
                            previous_history = previous_history
                                .iter()
                                .skip((api_attempts as usize) * 2)
                                .cloned()
                                .collect();
                            eprintln!(
                                "API call failed (attempt {}/{}): {:?}",
                                api_attempts, MAX_API_RETRY_ATTEMPTS, e
                            );
                            if api_attempts >= MAX_API_RETRY_ATTEMPTS {
                                return Err(e);
                            }
                        }
                    }
                }

                interaction_memory.add_interaction(
                    interaction_pubkey,
                    response_content.clone(),
                    Role::System,
                );

                let response_data = [
                    solana_gpt_oracle::instruction::CallbackFromLlm::DISCRIMINATOR.to_vec(),
                    response_content.try_to_vec()?,
                ]
                .concat();

                let mut callback_instruction = Instruction {
                    program_id: solana_gpt_oracle::ID,
                    accounts: vec![
                        AccountMeta::new(payer.pubkey(), true),
                        AccountMeta::new_readonly(*identity_pda, false),
                        AccountMeta::new(interaction_pubkey, false),
                        AccountMeta::new_readonly(interaction.callback_program_id, false),
                    ],
                    data: response_data,
                };

                let remaining_accounts: Vec<AccountMeta> = interaction
                    .callback_account_metas
                    .iter()
                    .map(|meta| AccountMeta {
                        pubkey: meta.pubkey,
                        is_signer: meta.is_signer,
                        is_writable: meta.is_writable,
                    })
                    .collect();
                callback_instruction.accounts.extend(remaining_accounts);

                let mut attempts = 0;
                while attempts < MAX_TX_RETRY_ATTEMPTS {
                    if let Ok(recent_blockhash) = rpc_client
                        .get_latest_blockhash_with_commitment(CommitmentConfig::processed())
                    {
                        let compute_budget_instruction =
                            ComputeBudgetInstruction::set_compute_unit_limit(300_000);
                        let priority_fee_instruction =
                            ComputeBudgetInstruction::set_compute_unit_price(1_000_000);

                        let transaction = Transaction::new_signed_with_payer(
                            &[
                                compute_budget_instruction,
                                priority_fee_instruction,
                                callback_instruction.clone(),
                            ],
                            Some(&payer.pubkey()),
                            &[&payer],
                            recent_blockhash.0,
                        );

                        match rpc_client.send_and_confirm_transaction(&transaction) {
                            Ok(signature) => {
                                println!("Transaction signature: {}\n", signature);
                                break;
                            }
                            Err(e) => {
                                attempts += 1;
                                eprintln!("Failed to send transaction: {:?}\n", e)
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

/// Fetch all open interactions and process them
async fn fetch_and_process_program_accounts(
    rpc_client: &RpcClient,
    filters: Vec<solana_client::rpc_filter::RpcFilterType>,
    payer: &Keypair,
    identity_pda: &Pubkey,
    llm: &LlmClient,
    system_prompt: &str,
    interaction_memory: &mut InteractionMemory,
) -> Result<(), Box<dyn Error>> {
    let rpc_config = RpcAccountInfoConfig {
        commitment: Some(CommitmentConfig::processed()),
        encoding: Some(UiAccountEncoding::Base64),
        ..Default::default()
    };

    let program_config = RpcProgramAccountsConfig {
        account_config: rpc_config,
        filters: Some(filters),
        ..Default::default()
    };

    let accounts =
        rpc_client.get_program_accounts_with_config(&solana_gpt_oracle::ID, program_config)?;

    for (pubkey, account) in accounts {
        process_interaction(
            payer,
            identity_pda,
            llm,
            system_prompt,
            rpc_client,
            pubkey,
            account.data,
            interaction_memory,
        )
        .await?;
    }

    Ok(())
}

/// Load the Oracle configuration
fn load_config() -> Result<OracleConfig, Box<dyn Error>> {
    let identity = env::var("IDENTITY").unwrap_or_else(|_| {
        "62LxqpAW6SWhp7iKBjCQneapn1w6btAhW7xHeREWSpPzw3xZbHCfAFesSR4R76ejQXCLWrndn37cKCCLFvx6Swps"
            .to_string()
    });
    let rpc_url = env::var("RPC_URL").unwrap_or_else(|_| "http://localhost:8899".to_string());
    let websocket_url =
        env::var("WEBSOCKET_URL").unwrap_or_else(|_| "ws://localhost:8900".to_string());
    let payer = Keypair::from_base58_string(&identity);
    let identity_pda = Pubkey::find_program_address(&[b"identity"], &solana_gpt_oracle::ID).0;

    let provider_name = env::var("LLM_PROVIDER").unwrap_or_else(|_| "clawd".to_string());
    let provider = match provider_name.to_lowercase().as_str() {
        "clawd" | "claude" | "anthropic" => {
            let api_key = env::var("ANTHROPIC_API_KEY")
                .map_err(|_| "ANTHROPIC_API_KEY not set (required for clawd provider)")?;
            let model =
                env::var("CLAWD_MODEL").unwrap_or_else(|_| "claude-sonnet-4-6".to_string());
            Provider::Clawd { api_key, model }
        }
        "openai" | "gpt" | "chatgpt" => {
            let api_key = env::var("OPENAI_API_KEY")
                .map_err(|_| "OPENAI_API_KEY not set (required for openai provider)")?;
            let model = env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o".to_string());
            Provider::OpenAi { api_key, model }
        }
        other => return Err(format!("unknown LLM_PROVIDER: {}", other).into()),
    };

    let character_name = env::var("CHARACTER").unwrap_or_else(|_| "clawd".to_string());
    let character = Character::resolve(&character_name)?;

    Ok(OracleConfig {
        rpc_url,
        websocket_url,
        payer,
        identity_pda,
        provider,
        character,
    })
}
