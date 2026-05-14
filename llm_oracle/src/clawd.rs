use serde::{Deserialize, Serialize};
use std::error::Error;

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

#[derive(Serialize, Clone, Debug)]
pub struct ClawdMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize)]
struct MessagesRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    system: &'a str,
    messages: &'a [ClawdMessage],
}

#[derive(Deserialize, Debug)]
struct MessagesResponse {
    #[serde(default)]
    content: Vec<ContentBlock>,
}

#[derive(Deserialize, Debug)]
struct ContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    #[serde(default)]
    text: Option<String>,
}

pub struct ClawdClient {
    api_key: String,
    model: String,
    max_tokens: u32,
    http: reqwest::Client,
}

impl ClawdClient {
    pub fn new(api_key: String, model: String, max_tokens: u32) -> Self {
        Self {
            api_key,
            model,
            max_tokens,
            http: reqwest::Client::new(),
        }
    }

    pub async fn send(
        &self,
        system: &str,
        messages: &[ClawdMessage],
    ) -> Result<String, Box<dyn Error>> {
        let normalized = normalize_messages(messages);
        let body = MessagesRequest {
            model: &self.model,
            max_tokens: self.max_tokens,
            system,
            messages: &normalized,
        };

        let resp = self
            .http
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Clawd API error {}: {}", status, text).into());
        }

        let parsed: MessagesResponse = resp.json().await?;
        let text = parsed
            .content
            .into_iter()
            .filter(|c| c.block_type == "text")
            .filter_map(|c| c.text)
            .collect::<Vec<_>>()
            .join("\n");
        Ok(text)
    }
}

/// Anthropic requires the first message to be `user` and roles to alternate.
/// Drop a leading non-user message and merge consecutive same-role messages.
fn normalize_messages(messages: &[ClawdMessage]) -> Vec<ClawdMessage> {
    let mut iter = messages.iter().skip_while(|m| m.role != "user").peekable();
    let mut out: Vec<ClawdMessage> = Vec::new();
    while let Some(m) = iter.next() {
        match out.last_mut() {
            Some(last) if last.role == m.role => {
                last.content.push_str("\n\n");
                last.content.push_str(&m.content);
            }
            _ => out.push(m.clone()),
        }
    }
    out
}
