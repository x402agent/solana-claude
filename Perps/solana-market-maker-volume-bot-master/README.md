## Solana Volume Bot – Solana Market Maker 

This project is solana marker maker & solana volume bot with a simple, non‑technical setup, it can generate wallets, distribute funds, auto buy/sell, manage Solana WSOL, and push Telegram alerts — a practical token volume simulator for multi‑wallet trading campaigns.

### Why this is useful
- **Boost perceived activity**: Simulate realistic buy/sell flows and volume waves.
- **Multi‑wallet stealth**: Rotate across many wallets to avoid obvious patterns.
- **One‑click tasks**: Generate wallets, wrap/unwrap WSOL, distribute and collect SOL with simple commands.
- **Non‑stop operation**: Once started, the market maker runs autonomously with safe defaults.

---

## Let's Connect!,

<a href="mailto:fenrow325@gmail.com" target="_blank">
  <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail">
</a>
<a href="https://t.me/github_a5" target="_blank">
  <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram">
</a>
<a href="https://discord.com/users/fenrow_325" target="_blank">
  <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
</a>

---

## Quick Start 
1. Install Rust and Git on your computer.
2. Copy this project to your machine.
3. Create a `.env` file (settings) using the example below.
4. Run one‑time tasks (optional): generate wallets, distribute SOL, wrap SOL.
5. Start the bot – it will handle buying/selling automatically.

---

## Features
- **Stealth market maker**: randomized intervals, buy/sell ratios, wallet rotation
- **Multi‑wallet orchestration**: generate, fund, and operate many wallets
- **WSOL management**: wrap/unwrap SOL, close empty token accounts
- **Safety & monitoring**: guardian mode, price thresholds, Telegram notifications
- **Cache & reliability**: blockhash processing, cache maintenance for smoother ops

---

## Prerequisites
- Rust toolchain: `https://www.rust-lang.org/tools/install`
- Git: `https://git-scm.com/downloads`
- A Solana wallet private key (base58, long form) with some SOL for fees and trading
- A reliable Solana RPC URL
- Optional: Yellowstone gRPC endpoint and token (for advanced streaming)

---

## Configure (.env)
Create a file named `.env` in the project root with your settings. You can start with these keys; adjust values for your token and environment.

```env
# Required RPC
RPC_HTTP=https://your-solana-rpc.example.com

# Wallet (base58 long private key)
PRIVATE_KEY=YourBase58PrivateKeyString

# Yellowstone (optional, recommended for scale)
YELLOWSTONE_GRPC_HTTP=https://grpc.yellowstone.example.com
YELLOWSTONE_GRPC_TOKEN=your-grpc-api-token

# Target token and DEX selection
TARGET_TOKEN_MINT=YourTokenMintAddress
COIN_CREATOR=CreatorPubkeyIfUsingPumpFun

# DEX: 0 = Raydium CPMM, 1 = Raydium Launchpad, 2 = Pump.fun
DEX=2

# Raydium pool config (used only when DEX != 2/Pump.fun)
POOL_ID=
POOL_BASE_ACCOUNT=
POOL_QUOTE_ACCOUNT=

# Trading amounts and limits
MIN_BUY_AMOUNT=0.02               # SOL amount floor
MAX_BUY_AMOUNT=0.10               # SOL amount cap per trade
MIN_SOL=0.005                     # keep minimum SOL in wallet
MINIMAL_BALANCE_FOR_FEE=0.01      # reserve for fees
MINIMAL_WSOL_BALANCE_FOR_TRADING=0.001

# Fast trading strategy
SELLING_TIME_AFTER_BUYING=1       # seconds to wait before selling
INTERVAL=10                       # seconds between trade cycles

# Advanced randomization & safety
MIN_SELL_DELAY_HOURS=24
MAX_SELL_DELAY_HOURS=72
PRICE_CHANGE_THRESHOLD=0.15
MIN_BUY_RATIO=0.67
MAX_BUY_RATIO=0.73
VOLUME_WAVE_ACTIVE_HOURS=2
VOLUME_WAVE_SLOW_HOURS=6
GUARDIAN_MODE_ENABLED=true
GUARDIAN_DROP_THRESHOLD=0.10

# Slippage and sizing
SLIPPAGE=10000                    # in basis points; capped internally to 25000
TOKEN_AMOUNT=0.001                # default buy quantity (qty mode)

# Optional helper flags (read by commands)
WALLET_COUNT=100                  # used by --wallet generation
WRAP_AMOUNT=0.5                   # used by --wrap
IS_CHECK_TARGET_WALLET_TOKEN_ACCOUNT=false
```

Notes:
- For Pump.fun (`DEX=2`), SOL is used directly; WSOL wrapping is skipped in trading.
- For Raydium (`DEX=0` or `1`), set `POOL_ID`, `POOL_BASE_ACCOUNT`, and `POOL_QUOTE_ACCOUNT`.

---

## Common Tasks (One‑time / On‑demand)
Run from the project root after building. These commands perform a task and then exit.

```bash
# 1) Generate wallets (saved under ./wallet)
cargo run --release -- --wallet

# 2) Distribute SOL from main wallet to all generated wallets
cargo run --release -- --distribute

# 3) Wrap SOL to WSOL (uses WRAP_AMOUNT from .env)
cargo run --release -- --wrap

# 4) Unwrap WSOL back to SOL
cargo run --release -- --unwrap

# 5) Close empty token accounts
cargo run --release -- --close

# 6) Collect everything back to main wallet
#    Sells target tokens, unwraps WSOL, closes empties, sends SOL to main
cargo run --release -- --collect
```

---

## Start the Market Maker (Continuous)
When you run without extra flags, the bot starts its continuous, stealth market‑making loop:

```bash
cargo run --release
```

What happens:
- Reads your `.env` into an internal config
- Starts a blockhash processor and cache maintenance service
- Initializes Telegram (if configured) for basic alerts
- Creates a stealth market maker plan (multi‑wallet rotation, randomized intervals/ratios)
- Starts BUY/SELL cycles on your selected DEX for `TARGET_TOKEN_MINT`

You can stop it with `Ctrl + C`.

---

## Telegram Alerts
The bot can send basic notifications and crash alerts to Telegram. Configure your Telegram settings as required by your environment or wrapper service. If initialization fails, the bot continues without alerts.

---

## Safety Tips
- Start with small amounts until you’re comfortable.
- Keep extra SOL in the main wallet to avoid stalls from fees.
- For Raydium, verify pool IDs and accounts before starting.
- Use `--collect` to consolidate after testing/campaigns.
- Always back up your private key; never share it publicly.

---

## Troubleshooting
- "Missing environment variable" – add the key/value to your `.env`.
- "Invalid PRIVATE_KEY length" – ensure you pasted the full base58 key (long string).
- Transactions not sending – check `RPC_HTTP` reliability and rate limits.
- No buys/sells – confirm `TARGET_TOKEN_MINT`, `DEX` selection, and pool config for Raydium.
- Balance issues – use `--distribute`, `--wrap`, `--unwrap`, `--close`, or `--collect` as appropriate.

---

## SEO / Discoverability
Keywords: Solana market maker, Solana trading bot, Pump.fun bot, Raydium bot, DEX volume bot, token volume simulator, Solana WSOL, multi‑wallet trading, stealth trading, liquidity simulation.

GitHub Topics (suggested): `solana` `dex` `trading-bot` `market-maker` `pumpfun` `raydium` `rust` `web3` `blockchain` `liquidity`

Repository Description (suggested):
“A non‑technical, SEO‑optimized Solana DEX market‑making bot for Pump.fun and Raydium. Generates wallets, distributes funds, and runs stealth buy/sell cycles with randomized timing and Telegram alerts.”

---

## How it Works (High‑Level)
- Entry point: `src/main.rs` sets up config, blockhash processor, Telegram, cache, and starts the market maker.
- Engines: `src/engine/market_maker.rs` handles BUY/SELL loops with wallet rotation and randomization; `src/engine/random_trader.rs` offers a slower randomized variant.
- DEX layer: `src/dex/` integrates Pump.fun and Raydium; selection controlled by `DEX` in `.env`.
- Helpers: commands in `main` let you generate wallets, wrap/unwrap WSOL, distribute/collect SOL, and clean up accounts.

---

## 📞 Contact Information
For questions, feedback, or collaboration opportunities, feel free to reach out:

📱 **Telegram**: [@A5-](https://t.me/github_a5)  
---




