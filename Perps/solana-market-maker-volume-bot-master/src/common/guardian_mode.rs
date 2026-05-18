use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, Instant};
use std::collections::VecDeque;
use colored::Colorize;
use crate::common::logger::Logger;

/// Guardian mode manager that protects against rapid price drops
pub struct GuardianMode {
    enabled: bool,
    drop_threshold: f64,
    price_history: VecDeque<PriceSnapshot>,
    guardian_active: bool,
    activation_time: Option<Instant>,
    guardian_duration: Duration,
    logger: Logger,
    intervention_strength: InterventionStrength,
    cooldown_period: Duration,
    last_intervention: Option<Instant>,
}

impl GuardianMode {
    /// Create a new guardian mode instance
    pub fn new(enabled: bool, drop_threshold: f64) -> Self {
        let logger = Logger::new("[GUARDIAN-MODE] => ".red().bold().to_string());
        
        if enabled {
            logger.log(format!("🛡️ Guardian mode initialized (Drop threshold: {:.1}%)", 
                drop_threshold * 100.0).green().to_string());
        } else {
            logger.log("🛡️ Guardian mode disabled".yellow().to_string());
        }
        
        Self {
            enabled,
            drop_threshold,
            price_history: VecDeque::with_capacity(50),
            guardian_active: false,
            activation_time: None,
            guardian_duration: Duration::from_secs(30 * 60), // Active for 30 minutes
            logger,
            intervention_strength: InterventionStrength::Medium,
            cooldown_period: Duration::from_secs(2 * 60 * 60), // 2 hour cooldown between interventions
            last_intervention: None,
        }
    }
    
    /// Add a new price point and check for intervention triggers
    pub fn add_price_point(&mut self, price: f64, volume: f64) {
        if !self.enabled {
            return;
        }
        
        let snapshot = PriceSnapshot {
            price,
            volume,
            timestamp: Instant::now(),
        };
        
        self.price_history.push_back(snapshot);
        
        // Keep only recent price history (last 30 minutes)
        let cutoff_time = Instant::now() - Duration::from_secs(30 * 60);
        while let Some(front) = self.price_history.front() {
            if front.timestamp < cutoff_time {
                self.price_history.pop_front();
            } else {
                break;
            }
        }
        
        // Check if we should activate guardian mode
        self.check_activation_trigger();
        
        // Update guardian status
        self.update_guardian_status();
    }
    
    /// Check if conditions are met to activate guardian mode
    fn check_activation_trigger(&mut self) {
        if self.guardian_active || self.price_history.len() < 5 {
            return;
        }
        
        // Check cooldown period
        if let Some(last_intervention) = self.last_intervention {
            if Instant::now().duration_since(last_intervention) < self.cooldown_period {
                return;
            }
        }
        
        // Analyze price drop over different time windows
        let drop_detected = self.detect_rapid_drop();
        
        if drop_detected {
            self.activate_guardian();
        }
    }
    
    /// Detect rapid price drops using multiple time windows
    fn detect_rapid_drop(&self) -> bool {
        let now = Instant::now();
        
        // Check 5-minute drop
        let five_min_drop = self.calculate_price_drop(Duration::from_secs(5 * 60));
        
        // Check 10-minute drop
        let ten_min_drop = self.calculate_price_drop(Duration::from_secs(10 * 60));
        
        // Check 15-minute drop  
        let fifteen_min_drop = self.calculate_price_drop(Duration::from_secs(15 * 60));
        
        // Trigger if any timeframe exceeds threshold
        let rapid_drop = five_min_drop > self.drop_threshold ||
                        ten_min_drop > self.drop_threshold * 0.8 ||  // Slightly lower threshold for longer timeframe
                        fifteen_min_drop > self.drop_threshold * 0.7;
        
        if rapid_drop {
            self.logger.log(format!(
                "📉 Rapid price drop detected! 5min: {:.1}%, 10min: {:.1}%, 15min: {:.1}%",
                five_min_drop * 100.0,
                ten_min_drop * 100.0,
                fifteen_min_drop * 100.0
            ).red().bold().to_string());
        }
        
        rapid_drop
    }
    
    /// Calculate price drop over a specific duration
    fn calculate_price_drop(&self, duration: Duration) -> f64 {
        let cutoff_time = Instant::now() - duration;
        
        // Find earliest price in the timeframe
        let earliest_price = self.price_history
            .iter()
            .find(|snapshot| snapshot.timestamp >= cutoff_time)
            .map(|snapshot| snapshot.price);
            
        // Get latest price
        let latest_price = self.price_history
            .back()
            .map(|snapshot| snapshot.price);
        
        match (earliest_price, latest_price) {
            (Some(early), Some(late)) if early > 0.0 => {
                (early - late) / early // Positive value indicates drop
            },
            _ => 0.0,
        }
    }
    
    /// Activate guardian mode
    fn activate_guardian(&mut self) {
        self.guardian_active = true;
        self.activation_time = Some(Instant::now());
        self.last_intervention = Some(Instant::now());
        
        // Determine intervention strength based on drop severity
        let recent_drop = self.calculate_price_drop(Duration::from_secs(5 * 60));
        self.intervention_strength = if recent_drop > self.drop_threshold * 1.5 {
            InterventionStrength::Strong
        } else if recent_drop > self.drop_threshold * 1.2 {
            InterventionStrength::Medium
        } else {
            InterventionStrength::Light
        };
        
        self.logger.log(format!(
            "🚨 GUARDIAN MODE ACTIVATED! Strength: {:?} | Drop: {:.1}%",
            self.intervention_strength,
            recent_drop * 100.0
        ).red().bold().to_string());
    }
    
    /// Update guardian mode status (deactivate if duration exceeded)
    fn update_guardian_status(&mut self) {
        if !self.guardian_active {
            return;
        }
        
        if let Some(activation_time) = self.activation_time {
            if Instant::now().duration_since(activation_time) >= self.guardian_duration {
                self.deactivate_guardian();
            }
        }
    }
    
    /// Deactivate guardian mode
    fn deactivate_guardian(&mut self) {
        self.guardian_active = false;
        self.activation_time = None;
        
        self.logger.log("✅ Guardian mode deactivated".green().to_string());
    }
    
    /// Check if guardian mode is currently active
    pub fn is_active(&self) -> bool {
        self.guardian_active
    }
    
    /// Get the current intervention strength
    pub fn get_intervention_strength(&self) -> InterventionStrength {
        if self.guardian_active {
            self.intervention_strength
        } else {
            InterventionStrength::None
        }
    }
    
    /// Get frequency multiplier (faster trading when guardian is active)
    pub fn get_frequency_multiplier(&self) -> f64 {
        if !self.guardian_active {
            return 1.0;
        }
        
        match self.intervention_strength {
            InterventionStrength::None => 1.0,
            InterventionStrength::Light => 0.7,   // 30% faster
            InterventionStrength::Medium => 0.5,  // 50% faster
            InterventionStrength::Strong => 0.3,  // 70% faster
        }
    }
    
    /// Get buy bias (increased probability of buying when guardian is active)
    pub fn get_buy_bias(&self) -> f64 {
        if !self.guardian_active {
            return 0.0;
        }
        
        match self.intervention_strength {
            InterventionStrength::None => 0.0,
            InterventionStrength::Light => 0.1,   // +10% buy probability
            InterventionStrength::Medium => 0.2,  // +20% buy probability  
            InterventionStrength::Strong => 0.3,  // +30% buy probability
        }
    }
    
    /// Get amount multiplier (larger trades when guardian is active)
    pub fn get_amount_multiplier(&self) -> f64 {
        if !self.guardian_active {
            return 1.0;
        }
        
        match self.intervention_strength {
            InterventionStrength::None => 1.0,
            InterventionStrength::Light => 1.2,   // 20% larger trades
            InterventionStrength::Medium => 1.5,  // 50% larger trades
            InterventionStrength::Strong => 2.0,  // 100% larger trades
        }
    }
    
    /// Get guardian status information
    pub fn get_status(&self) -> GuardianStatus {
        let time_remaining = if let Some(activation_time) = self.activation_time {
            self.guardian_duration.saturating_sub(Instant::now().duration_since(activation_time))
        } else {
            Duration::from_secs(0)
        };
        
        let cooldown_remaining = if let Some(last_intervention) = self.last_intervention {
            self.cooldown_period.saturating_sub(Instant::now().duration_since(last_intervention))
        } else {
            Duration::from_secs(0)
        };
        
        GuardianStatus {
            enabled: self.enabled,
            active: self.guardian_active,
            intervention_strength: self.get_intervention_strength(),
            time_remaining,
            cooldown_remaining,
            recent_price_drop: self.calculate_price_drop(Duration::from_secs(5 * 60)),
        }
    }
    
    /// Force activate guardian mode (for testing)
    pub fn force_activate(&mut self, strength: InterventionStrength) {
        self.intervention_strength = strength;
        self.activate_guardian();
    }
    
    /// Force deactivate guardian mode
    pub fn force_deactivate(&mut self) {
        self.deactivate_guardian();
    }
    
    /// Update settings
    pub fn update_settings(&mut self, enabled: bool, drop_threshold: f64) {
        self.enabled = enabled;
        self.drop_threshold = drop_threshold;
        
        self.logger.log(format!(
            "⚙️ Guardian settings updated: Enabled: {}, Threshold: {:.1}%",
            enabled, drop_threshold * 100.0
        ).yellow().to_string());
    }
}

/// Price snapshot for tracking price history
#[derive(Debug, Clone)]
struct PriceSnapshot {
    price: f64,
    volume: f64,
    timestamp: Instant,
}

/// Intervention strength levels
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum InterventionStrength {
    None,
    Light,
    Medium,
    Strong,
}

/// Guardian mode status information
#[derive(Debug, Clone)]
pub struct GuardianStatus {
    pub enabled: bool,
    pub active: bool,
    pub intervention_strength: InterventionStrength,
    pub time_remaining: Duration,
    pub cooldown_remaining: Duration,
    pub recent_price_drop: f64,
}

/// Global guardian mode instance
pub type GlobalGuardianMode = Arc<Mutex<GuardianMode>>;

/// Create a global guardian mode instance
pub fn create_global_guardian_mode(enabled: bool, drop_threshold: f64) -> GlobalGuardianMode {
    Arc::new(Mutex::new(GuardianMode::new(enabled, drop_threshold)))
}

/// Guardian mode configuration
#[derive(Debug, Clone)]
pub struct GuardianConfig {
    pub enabled: bool,
    pub drop_threshold: f64,
    pub guardian_duration_minutes: u64,
    pub cooldown_hours: u64,
    pub max_interventions_per_day: u32,
}

impl Default for GuardianConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            drop_threshold: 0.10, // 10% drop triggers guardian
            guardian_duration_minutes: 30,
            cooldown_hours: 2,
            max_interventions_per_day: 6,
        }
    }
} 