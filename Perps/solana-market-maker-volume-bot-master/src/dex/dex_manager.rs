use anyhow::Result;
use colored::Colorize;
use std::sync::Arc;
use anchor_client::solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
};

use crate::{
    common::{config::SwapConfig, logger::Logger},
    engine::{swap::SwapDirection, transaction_parser::DexType},
    dex::{
        raydium_cpmm::RaydiumCPMM,
        pump_fun::Pump,
        raydium_launchpad::RaydiumLaunchpad,
    },
};

#[derive(Clone)]
pub enum DexInstance {
    RaydiumCPMM(RaydiumCPMM),
    PumpFun(Pump),
    RaydiumLaunchpad(RaydiumLaunchpad),
}

#[derive(Clone)]
pub struct DexManager {
    dex_instance: DexInstance,
    logger: Logger,
    mint: String,
    coin_creator: String,
}

