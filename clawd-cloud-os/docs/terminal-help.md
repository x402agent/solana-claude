# CLAWD Cloud OS Terminal Help

```
╔════════════════════════════════════════════════════════════╗
║   CLAWD CLOUD OS · SOLANAOS + SOLANA-CLAWD QUICKSTART    ║
╚════════════════════════════════════════════════════════════╝
```

## Quick Start Commands

### 1. Initial Setup
```bash
# Run the bootstrap
./scripts/bootstrap.sh

# Reload your shell
source ~/.bashrc

# Verify Go installation
go version
```

### 2. SolanaOS Configuration
```bash
# Run onboarding wizard
~/.solanaos/bin/solanaos onboard

# Check version
~/.solanaos/bin/solanaos version

# Start Control UI (port 7777)
~/.solanaos/bin/solanaos server

# Start operator daemon
~/.solanaos/bin/solanaos daemon
```

### 3. Solana-Clawd Launch
```bash
# Navigate to solana-clawd
cd ~/src/solana-clawd

# Run demo mode
npm run demo

# Start MCP HTTP server
npm run mcp:http

# Launch web UI
npm --prefix web run dev
```

## Terminal Tools

### clawd-cli.sh
Connect to solanaclawd.com via terminal:

```bash
# Check agent status
./tools/clawd-cli.sh status

# List registered agents
./tools/clawd-cli.sh agents

# View wallet info
./tools/clawd-cli.sh wallet

# Get live token prices
./tools/clawd-cli.sh prices

# Connect to solanaclawd.com
./tools/clawd-cli.sh connect

# Register on Metaplex Agent Registry
./tools/clawd-cli.sh register
```

### clawd-connect.sh
Alternative connection script with similar functionality:

```bash
# Connect to API
./tools/clawd-connect.sh connect

# Check status
./tools/clawd-connect.sh status

# List agents
./tools/clawd-connect.sh agents

# View wallet
./tools/clawd-connect.sh wallet

# Get prices
./tools/clawd-connect.sh prices
```

### clawd-register.ts
Register your agent on Metaplex Agent Registry:

```bash
# First, set your Helius API key in the file
# Then run with tsx
npx tsx tools/clawd-register.ts
```

## Environment Variables Reference

### Essential Keys
```bash
# xAI API key (for Grok)
export XAI_API_KEY="your_key"

# Helius API key (for Solana RPC)
export HELIUS_API_KEY="your_key"

# SolanaTracker API key (for market data)
export SOLANA_TRACKER_API_KEY="your_key"
```

### Optional Keys
```bash
# Telegram bot token
export TELEGRAM_BOT_TOKEN="your_token"

# OpenAI API key (fallback)
export OPENAI_API_KEY="your_key"

# Birdeye API key (market data)
export BIRDEYE_API_KEY="your_key"
```

## Common Tasks

### Check System Status
```bash
# SolanaOS status
~/.solanaos/bin/solanaos status

# Solana-clawd agent status
./tools/clawd-cli.sh status
```

### View Logs
```bash
# SolanaOS logs
tail -f ~/.solanaos/logs/daemon.log

# Solana-clawd logs
cd ~/src/solana-clawd
npm run logs
```

### Restart Services
```bash
# Restart SolanaOS daemon
~/.solanaos/bin/solanaos restart

# Restart solana-clawd
cd ~/src/solana-clawd
npm run restart
```

## Troubleshooting

### Go not found
If you see "go: command not found", run:
```bash
source ~/.bashrc
```

### Permission denied
Make scripts executable:
```bash
chmod +x scripts/*.sh
chmod +x tools/*.sh
```

### Port already in use
Kill the process using the port:
```bash
# For port 7777 (SolanaOS)
lsof -ti:7777 | xargs kill -9

# For port 3000 (solana-clawd)
lsof -ti:3000 | xargs kill -9
```

### Missing dependencies
Install required tools:
```bash
# Install jq for JSON parsing
apt-get install jq || brew install jq

# Install tsx for TypeScript execution
npm install -g tsx
```

## Configuration Files

### Agent Registration Configs
- `config/clawd-openclaw-config.json` - OpenClaw compatibility config
- `config/clawd-registration.json` - Full registration metadata
- `config/solana-clawd-registration.json` - Simplified registration

### Environment Config
- `.env.example` - Template for environment variables
- Copy to `.env` and fill in your values

## Useful Aliases

Add to your ~/.bashrc:
```bash
# SolanaOS shortcuts
alias sos='~/.solanaos/bin/solanaos'
alias sos-start='~/.solanaos/bin/solanaos server & ~/.solanaos/bin/solanaos daemon'
alias sos-stop='~/.solanaos/bin/solanaos stop'

# Solana-clawd shortcuts
alias clawd='cd ~/src/solana-clawd'
alias clawd-start='cd ~/src/solana-clawd && npm run demo'
alias clawd-status='~/clawd-cloud-os/tools/clawd-cli.sh status'

# Combined start
alias clawdos='sos-start && clawd-start'
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                  CLAWD CLOUD OS COMMANDS                 │
├─────────────────────────────────────────────────────────┤
│ Bootstrap:     ./scripts/bootstrap.sh                   │
│ Onboard:       ~/.solanaos/bin/solanaos onboard        │
│ Start UI:      ~/.solanaos/bin/solanaos server         │
│ Start Daemon:  ~/.solanaos/bin/solanaos daemon         │
│                                                         │
│ Clawd Demo:    cd ~/src/solana-clawd && npm run demo   │
│ Clawd MCP:     npm run mcp:http                        │
│ Clawd Web:     npm --prefix web run dev                │
│                                                         │
│ Agent Status:  ./tools/clawd-cli.sh status             │
│ Wallet Info:   ./tools/clawd-cli.sh wallet             │
│ Token Prices:  ./tools/clawd-cli.sh prices             │
└─────────────────────────────────────────────────────────┘