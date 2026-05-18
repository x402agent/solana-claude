use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use warp::{Filter, Rejection, Reply};
use colored::Colorize;
use crate::common::logger::Logger;
use crate::common::dynamic_ratios::{DynamicRatioManager, TrendBias, RatioStats};
use crate::common::volume_waves::{VolumeWaveManager, VolumeWaveInfo, TradingPhase};
use crate::common::guardian_mode::{GuardianMode, GuardianStatus, InterventionStrength};
use crate::engine::market_maker::{MarketMaker, MarketMakerConfig};

/// Agent state managed by the API server
pub struct AgentState {
    pub sessions: HashMap<String, AgentSession>,
    pub logger: Logger,
}

/// Individual agent session for a user
pub struct AgentSession {
    pub user_id: String,
    pub token_address: Option<String>,
    pub wallet_address: Option<String>,
    pub is_running: bool,
    pub config: AgentConfig,
    pub stats: AgentStats,
    pub dynamic_ratio_manager: DynamicRatioManager,
    pub volume_wave_manager: VolumeWaveManager,
    pub guardian_mode: GuardianMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub buy_amount_sol: f64,
    pub slippage_bps: u64,
    pub cycles: u32,
    pub interval_seconds: u64,
    pub min_buy_ratio: f64,
    pub max_buy_ratio: f64,
    pub volume_wave_active_hours: u64,
    pub volume_wave_slow_hours: u64,
    pub guardian_enabled: bool,
    pub guardian_drop_threshold: f64,
    pub stealth_mode: bool,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            buy_amount_sol: 0.01,
            slippage_bps: 300, // 3%
            cycles: 10,
            interval_seconds: 30,
            min_buy_ratio: 0.4,
            max_buy_ratio: 0.6,
            volume_wave_active_hours: 4,
            volume_wave_slow_hours: 2,
            guardian_enabled: true,
            guardian_drop_threshold: 0.10, // 10%
            stealth_mode: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AgentStats {
    pub total_buys: u32,
    pub total_sells: u32,
    pub total_volume_sol: f64,
    pub current_cycle: u32,
    pub total_cycles: u32,
    pub runtime_seconds: u64,
    pub last_trade_type: Option<String>,
    pub last_trade_amount: Option<f64>,
}

// ============= API REQUEST/RESPONSE TYPES =============

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub user_id: String,
    pub config: Option<AgentConfig>,
}

#[derive(Debug, Deserialize)]
pub struct SetTokenRequest {
    pub user_id: String,
    pub token_address: String,
}

#[derive(Debug, Deserialize)]
pub struct SetWalletRequest {
    pub user_id: String,
    pub private_key: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateConfigRequest {
    pub user_id: String,
    pub config: AgentConfig,
}

#[derive(Debug, Deserialize)]
pub struct StartRequest {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct StopRequest {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct StatusRequest {
    pub user_id: String,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub user_id: String,
    pub token_address: Option<String>,
    pub wallet_address: Option<String>,
    pub is_running: bool,
    pub config: AgentConfig,
    pub stats: AgentStats,
    pub ratio_stats: RatioStatsJson,
    pub wave_info: WaveInfoJson,
    pub guardian_status: GuardianStatusJson,
}

#[derive(Debug, Serialize)]
pub struct RatioStatsJson {
    pub current_buy_ratio: f64,
    pub current_sell_ratio: f64,
    pub min_buy_ratio: f64,
    pub max_buy_ratio: f64,
}

#[derive(Debug, Serialize)]
pub struct WaveInfoJson {
    pub current_phase: String,
    pub frequency_multiplier: f64,
    pub amount_multiplier: f64,
    pub time_remaining_seconds: u64,
}

#[derive(Debug, Serialize)]
pub struct GuardianStatusJson {
    pub enabled: bool,
    pub active: bool,
    pub intervention_strength: String,
    pub recent_price_drop: f64,
}

// ============= GLOBAL STATE =============

type SharedState = Arc<Mutex<AgentState>>;

impl AgentState {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            logger: Logger::new("[RUST-AGENT-API] => ".cyan().bold().to_string()),
        }
    }

    pub fn create_session(&mut self, user_id: &str, config: AgentConfig) -> Result<(), String> {
        if self.sessions.contains_key(user_id) {
            return Err("Session already exists".to_string());
        }

        let session = AgentSession {
            user_id: user_id.to_string(),
            token_address: None,
            wallet_address: None,
            is_running: false,
            config: config.clone(),
            stats: AgentStats::default(),
            dynamic_ratio_manager: DynamicRatioManager::new(
                config.min_buy_ratio,
                config.max_buy_ratio,
                168, // Weekly change
            ),
            volume_wave_manager: VolumeWaveManager::new(
                config.volume_wave_active_hours,
                config.volume_wave_slow_hours,
            ),
            guardian_mode: GuardianMode::new(
                config.guardian_enabled,
                config.guardian_drop_threshold,
            ),
        };

        self.sessions.insert(user_id.to_string(), session);
        self.logger.log(format!("✅ Created session for user: {}", user_id).green().to_string());
        Ok(())
    }

    pub fn get_session(&self, user_id: &str) -> Option<&AgentSession> {
        self.sessions.get(user_id)
    }

    pub fn get_session_mut(&mut self, user_id: &str) -> Option<&mut AgentSession> {
        self.sessions.get_mut(user_id)
    }

    pub fn delete_session(&mut self, user_id: &str) -> bool {
        self.sessions.remove(user_id).is_some()
    }
}

// ============= API HANDLERS =============

async fn health_check() -> Result<impl Reply, Rejection> {
    Ok(warp::reply::json(&ApiResponse {
        success: true,
        data: Some("Rust Market Maker Agent API running"),
        error: None::<String>,
    }))
}

async fn create_session(
    req: CreateSessionRequest,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    let config = req.config.unwrap_or_default();
    
    match state.create_session(&req.user_id, config) {
        Ok(()) => Ok(warp::reply::json(&ApiResponse {
            success: true,
            data: Some("Session created"),
            error: None::<String>,
        })),
        Err(e) => Ok(warp::reply::json(&ApiResponse::<String> {
            success: false,
            data: None,
            error: Some(e),
        })),
    }
}

async fn set_token(
    req: SetTokenRequest,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    
    if let Some(session) = state.get_session_mut(&req.user_id) {
        session.token_address = Some(req.token_address.clone());
        Ok(warp::reply::json(&ApiResponse {
            success: true,
            data: Some(format!("Token set: {}", req.token_address)),
            error: None::<String>,
        }))
    } else {
        Ok(warp::reply::json(&ApiResponse::<String> {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        }))
    }
}

async fn set_wallet(
    req: SetWalletRequest,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    
    if let Some(session) = state.get_session_mut(&req.user_id) {
        // Validate and extract public key from private key
        match bs58::decode(&req.private_key).into_vec() {
            Ok(bytes) => {
                if bytes.len() >= 32 {
                    // Extract public key (last 32 bytes of 64-byte keypair)
                    let pubkey = if bytes.len() == 64 {
                        bs58::encode(&bytes[32..]).into_string()
                    } else {
                        "Invalid key format".to_string()
                    };
                    session.wallet_address = Some(pubkey.clone());
                    Ok(warp::reply::json(&ApiResponse {
                        success: true,
                        data: Some(format!("Wallet set: {}...{}", &pubkey[..8], &pubkey[pubkey.len()-6..])),
                        error: None::<String>,
                    }))
                } else {
                    Ok(warp::reply::json(&ApiResponse::<String> {
                        success: false,
                        data: None,
                        error: Some("Invalid private key length".to_string()),
                    }))
                }
            }
            Err(_) => Ok(warp::reply::json(&ApiResponse::<String> {
                success: false,
                data: None,
                error: Some("Invalid base58 private key".to_string()),
            })),
        }
    } else {
        Ok(warp::reply::json(&ApiResponse::<String> {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        }))
    }
}

async fn update_config(
    req: UpdateConfigRequest,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    
    if let Some(session) = state.get_session_mut(&req.user_id) {
        session.config = req.config;
        Ok(warp::reply::json(&ApiResponse {
            success: true,
            data: Some("Config updated"),
            error: None::<String>,
        }))
    } else {
        Ok(warp::reply::json(&ApiResponse::<String> {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        }))
    }
}

async fn start_agent(
    req: StartRequest,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    
    if let Some(session) = state.get_session_mut(&req.user_id) {
        if session.is_running {
            return Ok(warp::reply::json(&ApiResponse::<String> {
                success: false,
                data: None,
                error: Some("Agent already running".to_string()),
            }));
        }
        
        if session.token_address.is_none() {
            return Ok(warp::reply::json(&ApiResponse::<String> {
                success: false,
                data: None,
                error: Some("Token address not set".to_string()),
            }));
        }
        
        if session.wallet_address.is_none() {
            return Ok(warp::reply::json(&ApiResponse::<String> {
                success: false,
                data: None,
                error: Some("Wallet not imported".to_string()),
            }));
        }
        
        session.is_running = true;
        session.stats.total_cycles = session.config.cycles;
        
        Ok(warp::reply::json(&ApiResponse {
            success: true,
            data: Some("Agent started"),
            error: None::<String>,
        }))
    } else {
        Ok(warp::reply::json(&ApiResponse::<String> {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        }))
    }
}

async fn stop_agent(
    req: StopRequest,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    
    if let Some(session) = state.get_session_mut(&req.user_id) {
        session.is_running = false;
        Ok(warp::reply::json(&ApiResponse {
            success: true,
            data: Some("Agent stopped"),
            error: None::<String>,
        }))
    } else {
        Ok(warp::reply::json(&ApiResponse::<String> {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        }))
    }
}

async fn get_status(
    user_id: String,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    
    if let Some(session) = state.get_session_mut(&user_id) {
        let ratio_stats = session.dynamic_ratio_manager.get_ratio_stats();
        let wave_info = session.volume_wave_manager.get_wave_info();
        let guardian_status = session.guardian_mode.get_status();
        
        let info = SessionInfo {
            user_id: session.user_id.clone(),
            token_address: session.token_address.clone(),
            wallet_address: session.wallet_address.clone(),
            is_running: session.is_running,
            config: session.config.clone(),
            stats: session.stats.clone(),
            ratio_stats: RatioStatsJson {
                current_buy_ratio: ratio_stats.current_buy_ratio,
                current_sell_ratio: ratio_stats.current_sell_ratio,
                min_buy_ratio: ratio_stats.min_buy_ratio,
                max_buy_ratio: ratio_stats.max_buy_ratio,
            },
            wave_info: WaveInfoJson {
                current_phase: format!("{:?}", wave_info.current_phase),
                frequency_multiplier: wave_info.frequency_multiplier,
                amount_multiplier: wave_info.amount_multiplier,
                time_remaining_seconds: wave_info.time_remaining.as_secs(),
            },
            guardian_status: GuardianStatusJson {
                enabled: guardian_status.enabled,
                active: guardian_status.active,
                intervention_strength: format!("{:?}", guardian_status.intervention_strength),
                recent_price_drop: guardian_status.recent_price_drop,
            },
        };
        
        Ok(warp::reply::json(&ApiResponse {
            success: true,
            data: Some(info),
            error: None::<String>,
        }))
    } else {
        Ok(warp::reply::json(&ApiResponse::<SessionInfo> {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        }))
    }
}

async fn delete_session(
    user_id: String,
    state: SharedState,
) -> Result<impl Reply, Rejection> {
    let mut state = state.lock().await;
    
    if state.delete_session(&user_id) {
        Ok(warp::reply::json(&ApiResponse {
            success: true,
            data: Some("Session deleted"),
            error: None::<String>,
        }))
    } else {
        Ok(warp::reply::json(&ApiResponse::<String> {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
        }))
    }
}

// ============= API SERVER =============

pub async fn run_api_server(port: u16) {
    let state: SharedState = Arc::new(Mutex::new(AgentState::new()));
    
    let logger = Logger::new("[RUST-AGENT-API] => ".cyan().bold().to_string());
    logger.log(format!("🚀 Starting Rust Market Maker Agent API on port {}", port).green().bold().to_string());
    
    // Clone state for each route
    let state_filter = warp::any().map(move || state.clone());
    
    // Health check
    let health = warp::path("health")
        .and(warp::get())
        .and_then(health_check);
    
    // Create session
    let create = warp::path("session")
        .and(warp::post())
        .and(warp::body::json())
        .and(state_filter.clone())
        .and_then(create_session);
    
    // Set token
    let token = warp::path("token")
        .and(warp::post())
        .and(warp::body::json())
        .and(state_filter.clone())
        .and_then(set_token);
    
    // Set wallet
    let wallet = warp::path("wallet")
        .and(warp::post())
        .and(warp::body::json())
        .and(state_filter.clone())
        .and_then(set_wallet);
    
    // Update config
    let config = warp::path("config")
        .and(warp::post())
        .and(warp::body::json())
        .and(state_filter.clone())
        .and_then(update_config);
    
    // Start agent
    let start = warp::path("start")
        .and(warp::post())
        .and(warp::body::json())
        .and(state_filter.clone())
        .and_then(start_agent);
    
    // Stop agent
    let stop = warp::path("stop")
        .and(warp::post())
        .and(warp::body::json())
        .and(state_filter.clone())
        .and_then(stop_agent);
    
    // Get status
    let status = warp::path!("status" / String)
        .and(warp::get())
        .and(state_filter.clone())
        .and_then(get_status);
    
    // Delete session
    let delete = warp::path!("session" / String)
        .and(warp::delete())
        .and(state_filter.clone())
        .and_then(delete_session);
    
    // Combine routes
    let routes = warp::path("api")
        .and(warp::path("v1"))
        .and(warp::path("agent"))
        .and(
            health
                .or(create)
                .or(token)
                .or(wallet)
                .or(config)
                .or(start)
                .or(stop)
                .or(status)
                .or(delete)
        )
        .with(warp::cors().allow_any_origin());
    
    logger.log("📡 API routes registered:".to_string());
    logger.log("  GET  /api/v1/agent/health".to_string());
    logger.log("  POST /api/v1/agent/session".to_string());
    logger.log("  POST /api/v1/agent/token".to_string());
    logger.log("  POST /api/v1/agent/wallet".to_string());
    logger.log("  POST /api/v1/agent/config".to_string());
    logger.log("  POST /api/v1/agent/start".to_string());
    logger.log("  POST /api/v1/agent/stop".to_string());
    logger.log("  GET  /api/v1/agent/status/{user_id}".to_string());
    logger.log("  DELETE /api/v1/agent/session/{user_id}".to_string());
    
    warp::serve(routes).run(([0, 0, 0, 0], port)).await;
}

