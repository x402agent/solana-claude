# ClawdRouter Configuration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWDROUTER_PORT` | `8402` | Local proxy port |
| `CLAWDROUTER_PROFILE` | `auto` | Routing profile: `auto`, `eco`, `premium` |
| `CLAWDROUTER_SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |
| `CLAWDROUTER_NETWORK` | `solana-mainnet` | Network: `solana-mainnet` or `solana-devnet` |
| `CLAWDROUTER_MAX_PER_REQUEST` | `0.10` | Maximum USDC per single request |
| `CLAWDROUTER_MAX_PER_SESSION` | `5.00` | Maximum USDC per session |
| `CLAWDROUTER_DEBUG` | `false` | Enable debug logging |
| `CLAWDROUTER_UPSTREAM` | `https://api.blockrun.ai` | Upstream API endpoint |

## File Locations

| File | Path | Description |
|------|------|-------------|
| Wallet | `~/.clawd/clawdrouter/wallet.json` | Solana keypair (0600 perms) |
| Exclusions | `~/.clawd/clawdrouter/exclude-models.json` | Blocked models list |

## Recommended RPC Endpoints

For production use, consider a dedicated Solana RPC:

```bash
# Helius (recommended for solana-clawd)
export CLAWDROUTER_SOLANA_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

# Triton
export CLAWDROUTER_SOLANA_RPC_URL="https://solana-clawd-mainnet.rpcpool.com"

# QuickNode
export CLAWDROUTER_SOLANA_RPC_URL="https://YOUR_ENDPOINT.solana-mainnet.quiknode.pro/YOUR_KEY/"
```

## Example Configurations

### Development (free models, devnet)

```bash
export CLAWDROUTER_PROFILE=eco
export CLAWDROUTER_NETWORK=solana-devnet
export CLAWDROUTER_SOLANA_RPC_URL=https://api.devnet.solana.com
export CLAWDROUTER_DEBUG=true
```

### Production (balanced, mainnet)

```bash
export CLAWDROUTER_PROFILE=auto
export CLAWDROUTER_NETWORK=solana-mainnet
export CLAWDROUTER_MAX_PER_REQUEST=0.05
export CLAWDROUTER_MAX_PER_SESSION=10.00
```

### CI/CD (premium, strict limits)

```bash
export CLAWDROUTER_PROFILE=premium
export CLAWDROUTER_MAX_PER_REQUEST=0.15
export CLAWDROUTER_MAX_PER_SESSION=2.00
```
