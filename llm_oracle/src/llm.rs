use chatgpt::client::ChatGPT;
use chatgpt::types::{ChatMessage, Role};
use std::error::Error;

use crate::clawd::{ClawdClient, ClawdMessage};

pub enum LlmClient {
    ChatGpt(ChatGPT),
    Clawd(ClawdClient),
}

impl LlmClient {
    /// Send a conversation with a character system prompt and return the assistant's reply text.
    pub async fn complete(
        &self,
        system_prompt: &str,
        history: &[ChatMessage],
    ) -> Result<String, Box<dyn Error>> {
        match self {
            LlmClient::ChatGpt(client) => {
                // Inject the character as a leading system message.
                let mut full = Vec::with_capacity(history.len() + 1);
                full.push(ChatMessage {
                    role: Role::System,
                    content: system_prompt.to_string(),
                });
                full.extend(history.iter().cloned());
                let response = client.send_history(&full).await?;
                Ok(response.message().content.clone())
            }
            LlmClient::Clawd(client) => {
                // The on-chain memory uses Role::System to record the assistant's prior
                // replies, so collapse System+Assistant into Anthropic's "assistant".
                let mut messages: Vec<ClawdMessage> = Vec::with_capacity(history.len());
                for m in history {
                    let role = match m.role {
                        Role::User => "user",
                        Role::Assistant | Role::System => "assistant",
                        _ => continue,
                    };
                    messages.push(ClawdMessage {
                        role: role.to_string(),
                        content: m.content.clone(),
                    });
                }
                client.send(system_prompt, &messages).await
            }
        }
    }
}
