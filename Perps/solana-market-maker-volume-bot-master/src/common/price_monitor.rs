use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, Instant};
use colored::Colorize;
use crate::common::logger::Logger;

/// Price data point for tracking price history
#[derive(Debug, Clone)]
pub struct PricePoint {
    pub price: f64,
    pub timestamp: Instant,
    pub volume_sol: f64,
}

/// Price monitoring system for detecting sharp price movements
pub struct PriceMonitor {
    price_history: VecDeque<PricePoint>,
    logger: Logger,
    max_history_size: usize,
    price_change_threshold: f64,
    throttle_duration: Duration,
    last_throttle_time: Option<Instant>,
    is_throttling: bool,
}
