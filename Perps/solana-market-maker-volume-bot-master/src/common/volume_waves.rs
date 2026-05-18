use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, Instant};
use rand::Rng;
use colored::Colorize;
use crate::common::logger::Logger;

/// Volume wave manager that creates realistic trading patterns
pub struct VolumeWaveManager {
    current_phase: TradingPhase,
    phase_start_time: Instant,
    active_duration: Duration,
    slow_duration: Duration,
    logger: Logger,
    activity_multipliers: PhaseMultipliers,
}

impl VolumeWaveManager {
    /// Create a new volume wave manager
    pub fn new(active_hours: u64, slow_hours: u64) -> Self {
        let logger = Logger::new("[VOLUME-WAVES] => ".blue().bold().to_string());
        
        // Start with a random phase
        let mut rng = rand::thread_rng();
        let initial_phase = if rng.gen_bool(0.6) {
            TradingPhase::Active
        } else {
            TradingPhase::Slow
        };
        
        logger.log(format!("🌊 Volume wave manager initialized in {:?} phase", initial_phase).blue().to_string());
        
        Self {
            current_phase: initial_phase,
            phase_start_time: Instant::now(),
            active_duration: Duration::from_secs(active_hours * 3600),
            slow_duration: Duration::from_secs(slow_hours * 3600),
            logger,
            activity_multipliers: PhaseMultipliers::default(),
        }
    }
    
    /// Get the current trading phase, updating if necessary
    pub fn get_current_phase(&mut self) -> TradingPhase {
        let now = Instant::now();
        let elapsed = now.duration_since(self.phase_start_time);
        
        let should_switch = match self.current_phase {
            TradingPhase::Active => elapsed >= self.active_duration,
            TradingPhase::Slow => elapsed >= self.slow_duration,
            TradingPhase::Burst => elapsed >= Duration::from_secs(15 * 60), // Burst lasts 15 minutes
            TradingPhase::Dormant => elapsed >= Duration::from_secs(60 * 60),  // Dormant lasts 1 hour
        };
        
        if should_switch {
            self.switch_phase();
        }
        
        self.current_phase
    }
    
    /// Switch to the next trading phase
    fn switch_phase(&mut self) {
        let old_phase = self.current_phase;
        let mut rng = rand::thread_rng();
        
        self.current_phase = match self.current_phase {
            TradingPhase::Active => {
                // After active, go to slow with occasional burst
                if rng.gen_bool(0.15) { // 15% chance of burst
                    TradingPhase::Burst
                } else {
                    TradingPhase::Slow
                }
            },
            TradingPhase::Slow => {
                // After slow, go to active with occasional dormant
                if rng.gen_bool(0.1) { // 10% chance of dormant
                    TradingPhase::Dormant
                } else {
                    TradingPhase::Active
                }
            },
            TradingPhase::Burst => {
                // After burst, always go to slow to cool down
                TradingPhase::Slow
            },
            TradingPhase::Dormant => {
                // After dormant, always go to active
                TradingPhase::Active
            },
        };
        
        self.phase_start_time = Instant::now();
        
        let duration_text = match self.current_phase {
            TradingPhase::Active => format!("{:.1} hours", self.active_duration.as_secs_f64() / 3600.0),
            TradingPhase::Slow => format!("{:.1} hours", self.slow_duration.as_secs_f64() / 3600.0),
            TradingPhase::Burst => "15 minutes".to_string(),
            TradingPhase::Dormant => "1 hour".to_string(),
        };
        
        self.logger.log(format!(
            "🔄 Phase transition: {:?} -> {:?} (Duration: {})",
            old_phase, self.current_phase, duration_text
        ).blue().bold().to_string());
    }
    
    /// Get the frequency multiplier for the current phase
    pub fn get_frequency_multiplier(&self) -> f64 {
        match self.current_phase {
            TradingPhase::Active => self.activity_multipliers.active_frequency,
            TradingPhase::Slow => self.activity_multipliers.slow_frequency,
            TradingPhase::Burst => self.activity_multipliers.burst_frequency,
            TradingPhase::Dormant => self.activity_multipliers.dormant_frequency,
        }
    }
    
    /// Get the amount multiplier for the current phase
    pub fn get_amount_multiplier(&self) -> f64 {
        match self.current_phase {
            TradingPhase::Active => self.activity_multipliers.active_amount,
            TradingPhase::Slow => self.activity_multipliers.slow_amount,
            TradingPhase::Burst => self.activity_multipliers.burst_amount,
            TradingPhase::Dormant => self.activity_multipliers.dormant_amount,
        }
    }
    
    /// Get comprehensive wave information
    pub fn get_wave_info(&self) -> VolumeWaveInfo {
        let elapsed = Instant::now().duration_since(self.phase_start_time);
        let remaining = match self.current_phase {
            TradingPhase::Active => self.active_duration.saturating_sub(elapsed),
            TradingPhase::Slow => self.slow_duration.saturating_sub(elapsed),
            TradingPhase::Burst => Duration::from_secs(15 * 60).saturating_sub(elapsed),
            TradingPhase::Dormant => Duration::from_secs(60 * 60).saturating_sub(elapsed),
        };
        
        VolumeWaveInfo {
            current_phase: self.current_phase,
            time_in_phase: elapsed,
            time_remaining: remaining,
            frequency_multiplier: self.get_frequency_multiplier(),
            amount_multiplier: self.get_amount_multiplier(),
        }
    }
}

/// Trading phases for volume wave pattern
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TradingPhase {
    Active,
    Slow,
    Burst,
    Dormant,
}

/// Comprehensive wave information
#[derive(Debug, Clone)]
pub struct VolumeWaveInfo {
    pub current_phase: TradingPhase,
    pub time_in_phase: Duration,
    pub time_remaining: Duration,
    pub frequency_multiplier: f64,
    pub amount_multiplier: f64,
}

/// Phase multipliers for trading activity
#[derive(Debug, Clone)]
pub struct PhaseMultipliers {
    pub active_frequency: f64,
    pub active_amount: f64,
    pub slow_frequency: f64,
    pub slow_amount: f64,
    pub burst_frequency: f64,
    pub burst_amount: f64,
    pub dormant_frequency: f64,
    pub dormant_amount: f64,
}

impl Default for PhaseMultipliers {
    fn default() -> Self {
        Self {
            active_frequency: 1.0,
            active_amount: 1.0,
            slow_frequency: 0.5,
            slow_amount: 0.7,
            burst_frequency: 2.0,
            burst_amount: 1.5,
            dormant_frequency: 0.2,
            dormant_amount: 0.3,
        }
    }
}

/// Global volume wave manager instance
pub type GlobalVolumeWaveManager = Arc<Mutex<VolumeWaveManager>>;

/// Create a global volume wave manager
pub fn create_global_volume_wave_manager(
    active_hours: u64, 
    slow_hours: u64
) -> GlobalVolumeWaveManager {
    Arc::new(Mutex::new(VolumeWaveManager::new(active_hours, slow_hours)))
}