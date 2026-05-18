use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, Instant};
use rand::Rng;
use colored::Colorize;
use chrono::Datelike;
use crate::common::logger::Logger;

/// Dynamic ratio manager that changes buy/sell ratios weekly
pub struct DynamicRatioManager {
    current_buy_ratio: f64,
    min_buy_ratio: f64,
    max_buy_ratio: f64,
    last_change_time: Instant,
    change_interval: Duration,
    logger: Logger,
}

impl DynamicRatioManager {
    /// Create a new dynamic ratio manager
    pub fn new(min_buy_ratio: f64, max_buy_ratio: f64, change_interval_hours: u64) -> Self {
        let mut rng = rand::thread_rng();
        let initial_ratio = min_buy_ratio + (max_buy_ratio - min_buy_ratio) * rng.gen::<f64>();
        
        let logger = Logger::new("[DYNAMIC-RATIOS] => ".purple().bold().to_string());
        logger.log(format!("🎲 Dynamic ratio manager initialized with initial buy ratio: {:.1}%", 
            initial_ratio * 100.0).purple().to_string());
        
        Self {
            current_buy_ratio: initial_ratio,
            min_buy_ratio,
            max_buy_ratio,
            last_change_time: Instant::now(),
            change_interval: Duration::from_secs(change_interval_hours * 3600),
            logger,
        }
    }
    
    /// Get the current buy ratio, updating it if needed
    pub fn get_current_buy_ratio(&mut self) -> f64 {
        let now = Instant::now();
        
        // Check if it's time to change the ratio
        if now.duration_since(self.last_change_time) >= self.change_interval {
            self.update_ratio();
        }
        
        self.current_buy_ratio
    }
    
    /// Force update the ratio (for testing or manual changes)
    pub fn update_ratio(&mut self) {
        let mut rng = rand::thread_rng();
        let old_ratio = self.current_buy_ratio;
        
        // Generate new random ratio within bounds
        self.current_buy_ratio = self.min_buy_ratio + 
            (self.max_buy_ratio - self.min_buy_ratio) * rng.gen::<f64>();
        
        self.last_change_time = Instant::now();
        
        self.logger.log(format!(
            "🔄 Buy ratio changed from {:.1}% to {:.1}% (Sell ratio: {:.1}%)",
            old_ratio * 100.0,
            self.current_buy_ratio * 100.0,
            (1.0 - self.current_buy_ratio) * 100.0
        ).purple().bold().to_string());
    }
    
    /// Get time until next ratio change
    pub fn time_until_next_change(&self) -> Duration {
        let elapsed = Instant::now().duration_since(self.last_change_time);
        if elapsed >= self.change_interval {
            Duration::from_secs(0)
        } else {
            self.change_interval - elapsed
        }
    }
    
    /// Get ratio statistics
    pub fn get_ratio_stats(&self) -> RatioStats {
        RatioStats {
            current_buy_ratio: self.current_buy_ratio,
            current_sell_ratio: 1.0 - self.current_buy_ratio,
            min_buy_ratio: self.min_buy_ratio,
            max_buy_ratio: self.max_buy_ratio,
            last_change_ago: Instant::now().duration_since(self.last_change_time),
            next_change_in: self.time_until_next_change(),
        }
    }
    
    /// Set custom bounds for buy ratio
    pub fn set_ratio_bounds(&mut self, min_buy_ratio: f64, max_buy_ratio: f64) {
        self.min_buy_ratio = min_buy_ratio.max(0.0).min(1.0);
        self.max_buy_ratio = max_buy_ratio.max(0.0).min(1.0);
        
        // Ensure min <= max
        if self.min_buy_ratio > self.max_buy_ratio {
            std::mem::swap(&mut self.min_buy_ratio, &mut self.max_buy_ratio);
        }
        
        // Update current ratio if it's outside new bounds
        if self.current_buy_ratio < self.min_buy_ratio {
            self.current_buy_ratio = self.min_buy_ratio;
        } else if self.current_buy_ratio > self.max_buy_ratio {
            self.current_buy_ratio = self.max_buy_ratio;
        }
        
        self.logger.log(format!(
            "⚙️ Ratio bounds updated: {:.1}% - {:.1}% (Current: {:.1}%)",
            self.min_buy_ratio * 100.0,
            self.max_buy_ratio * 100.0,
            self.current_buy_ratio * 100.0
        ).yellow().to_string());
    }
    
    /// Apply trend bias to ratios (for market conditions)
    pub fn apply_trend_bias(&mut self, bias: TrendBias) {
        let bias_factor = match bias {
            TrendBias::BullishStrong => 0.1,   // +10% towards buying
            TrendBias::BullishMild => 0.05,    // +5% towards buying
            TrendBias::Neutral => 0.0,         // No bias
            TrendBias::BearishMild => -0.05,   // +5% towards selling
            TrendBias::BearishStrong => -0.1,  // +10% towards selling
        };
        
        // Apply bias but keep within bounds
        let biased_ratio = (self.current_buy_ratio + bias_factor)
            .max(self.min_buy_ratio)
            .min(self.max_buy_ratio);
        
        if biased_ratio != self.current_buy_ratio {
            let old_ratio = self.current_buy_ratio;
            self.current_buy_ratio = biased_ratio;
            
            self.logger.log(format!(
                "📈 Trend bias applied ({:?}): {:.1}% -> {:.1}%",
                bias,
                old_ratio * 100.0,
                self.current_buy_ratio * 100.0
            ).blue().to_string());
        }
    }
}

/// Trend bias for adjusting ratios based on market conditions
#[derive(Debug, Clone, Copy)]
pub enum TrendBias {
    BullishStrong,
    BullishMild,
    Neutral,
    BearishMild,
    BearishStrong,
}

/// Statistics about current ratio state
#[derive(Debug, Clone)]
pub struct RatioStats {
    pub current_buy_ratio: f64,
    pub current_sell_ratio: f64,
    pub min_buy_ratio: f64,
    pub max_buy_ratio: f64,
    pub last_change_ago: Duration,
    pub next_change_in: Duration,
}

/// Global dynamic ratio manager instance
pub type GlobalDynamicRatioManager = Arc<Mutex<DynamicRatioManager>>;

/// Create a global dynamic ratio manager
pub fn create_global_dynamic_ratio_manager(
    min_buy_ratio: f64, 
    max_buy_ratio: f64, 
    change_interval_hours: u64
) -> GlobalDynamicRatioManager {
    Arc::new(Mutex::new(DynamicRatioManager::new(
        min_buy_ratio, 
        max_buy_ratio, 
        change_interval_hours
    )))
}

/// Weekly ratio manager with automatic Sunday changes
pub struct WeeklyRatioManager {
    dynamic_manager: DynamicRatioManager,
    last_sunday: Option<chrono::NaiveDate>,
}

impl WeeklyRatioManager {
    /// Create a weekly ratio manager that changes every Sunday
    pub fn new(min_buy_ratio: f64, max_buy_ratio: f64) -> Self {
        Self {
            dynamic_manager: DynamicRatioManager::new(min_buy_ratio, max_buy_ratio, 168), // 168 hours = 1 week
            last_sunday: None,
        }
    }
    
    /// Get current ratio, updating if it's a new week
    pub fn get_current_buy_ratio(&mut self) -> f64 {
        let now = chrono::Utc::now().naive_utc().date();
        let current_sunday = self.get_last_sunday(now);
        
        // Check if we've entered a new week
        if self.last_sunday.is_none() || self.last_sunday.unwrap() != current_sunday {
            self.dynamic_manager.update_ratio();
            self.last_sunday = Some(current_sunday);
            
            self.dynamic_manager.logger.log(format!(
                "📅 New week detected (Sunday {}). Ratio updated to {:.1}%",
                current_sunday,
                self.dynamic_manager.current_buy_ratio * 100.0
            ).purple().bold().to_string());
        }
        
        self.dynamic_manager.current_buy_ratio
    }
    
    /// Get the date of the last Sunday from a given date
    fn get_last_sunday(&self, date: chrono::NaiveDate) -> chrono::NaiveDate {
        let days_since_sunday = date.weekday().num_days_from_sunday();
        date - chrono::Duration::days(days_since_sunday as i64)
    }
    
    /// Get statistics
    pub fn get_stats(&self) -> RatioStats {
        self.dynamic_manager.get_ratio_stats()
    }
} 