# @agentwallet/core

> Agentic wallet vault — encrypted Solana + EVM keypair management with E2B sandbox and Cloudflare Workers deployment

A TypeScript npm package for managing encrypted wallet keypairs, exposing an HTTP API, and deploying to secure sandboxes for remote agent access.

## Features

- 🔐 **AES-256-GCM Encryption** — All private keys encrypted at rest
- 🌐 **Multi-Chain Support** — Solana (Ed25519) and EVM (secp256k1) keypairs
- 🚀 **HTTP API Server** — RESTful endpoints for wallet CRUD operations
- ☁️ **E2B Sandbox Deployment** — Deploy to isolated code execution environments
- ⚡ **Cloudflare Workers** — Edge deployment for global low-latency access
- 📦 **CLI Tool** — Command-line interface for quick management

## Installation

```bash
npm install @agentwallet/core

# Optional: install deployment dependencies
npm install e2b        # for E2B sandbox deployment
npm install wrangler   # for Cloudflare Workers deployment
```

## Quick Start

### CLI Usage

```bash
# Start the vault server
npx agentwallet serve --port 9099

# Create a new wallet
npx agentwallet wallet create my-solana-wallet --chain solana
npx agentwallet wallet create my-eth-wallet --chain evm

# List wallets
npx agentwallet wallet list

# Import existing wallet
npx agentwallet wallet import my-wallet "base58-or-hex-private-key" --chain solana

# Pause/unpause wallet
npx agentwallet wallet pause <wallet-id>
npx agentwallet wallet unpause <wallet-id>

# Export vault (encrypted backup)
npx agentwallet vault export > backup.json

# Deploy to E2B sandbox
npx agentwallet deploy e2b --api-key $E2B_API_KEY

# Deploy to Cloudflare Workers
npx agentwallet deploy cloudflare --account-id $CLOUDFLARE_ACCOUNT_ID
```

### Programmatic Usage

```typescript
import { Vault, startServer, generateSolanaKeypair } from "@agentwallet/core";

// Create or load a vault
const vault = await Vault.create({
  storePath: "./vault-data",
  passphrase: process.env.VAULT_PASSPHRASE!,
});

// Generate and store a new Solana wallet
const keypair = await generateSolanaKeypair();
await vault.addWallet(
  undefined, // auto-generate ID
  "my-solana-wallet",
  "solana",
  0, // chain ID (not used for Solana)
  keypair.address,
  keypair.privateKey
);

// List all wallets
const wallets = vault.listWallets();
console.log(wallets);

// Get private key (decrypted)
const privateKey = vault.getPrivateKey(wallets[0].id);

// Start HTTP server
await startServer(vault, { port: 9099 });
```

## HTTP API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/wallets` | List all wallets |
| `GET` | `/api/wallets/:id` | Get wallet by ID |
| `POST` | `/api/wallets` | Create new wallet |
| `POST` | `/api/wallets/import` | Import existing wallet |
| `GET` | `/api/wallets/:id/private-key` | Get decrypted private key |
| `POST` | `/api/wallets/:id/pause` | Pause wallet |
| `POST` | `/api/wallets/:id/unpause` | Unpause wallet |
| `DELETE` | `/api/wallets/:id` | Delete wallet |
| `GET` | `/api/vault/export` | Export encrypted vault |
| `POST` | `/api/vault/import` | Import vault data |

### Example Requests

```bash
# Create a new Solana wallet
curl -X POST http://localhost:9099/api/wallets \
  -H "Content-Type: application/json" \
  -d '{"label": "my-wallet", "chainType": "solana"}'

# List wallets
curl http://localhost:9099/api/wallets

# Get private key (with auth)
curl http://localhost:9099/api/wallets/abc123/private-key \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## Deployment

### E2B Sandbox

Deploy to an isolated E2B sandbox for secure remote agent access:

```typescript
import { deployToE2B } from "@agentwallet/core/deploy/e2b";

const instance = await deployToE2B({
  apiKey: process.env.E2B_API_KEY!,
  vaultPassphrase: process.env.VAULT_PASSPHRASE,
  timeout: 300, // 5 minutes
  envVars: {
    CUSTOM_VAR: "value",
  },
});

console.log(`Vault running at: ${instance.url}`);
```

### Cloudflare Workers

Deploy to Cloudflare's edge network:

```typescript
import { deployToCloudflare } from "@agentwallet/core/deploy/cloudflare";

const instance = await deployToCloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  workerName: "my-vault",
  vaultPassphrase: process.env.VAULT_PASSPHRASE,
});

console.log(`Worker deployed at: ${instance.url}`);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VAULT_PASSPHRASE` | Master encryption passphrase | Required for production |
| `SOLANA_PRIVATE_KEY` | Fallback passphrase derivation | - |
| `VAULT_PORT` | Server port | `9099` |
| `VAULT_HOST` | Server host | `0.0.0.0` |
| `VAULT_API_TOKEN` | Bearer token for API auth | Optional |
| `E2B_API_KEY` | E2B API key for sandbox deployment | - |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | - |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | - |

## Security Considerations

1. **Passphrase**: Always set a strong `VAULT_PASSPHRASE` in production. The default passphrase is not secure.

2. **API Token**: Use `VAULT_API_TOKEN` to protect the HTTP API, especially when exposing private key endpoints.

3. **File Permissions**: Vault files are stored with `0600` permissions (owner read/write only).

4. **Encryption**: Private keys are encrypted with AES-256-GCM. The master key is derived from the passphrase using SHA-256.

5. **Sandbox Isolation**: E2B sandboxes provide isolated execution environments. Use for untrusted agent access.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      @agentwallet/core                       │
├─────────────────────────────────────────────────────────────┤
│  CLI (cli.ts)          │  HTTP Server (server.ts)           │
│  - serve               │  - Express router                  │
│  - wallet create/list  │  - CORS + Auth middleware          │
│  - vault export/import │  - REST endpoints                  │
│  - deploy e2b/cf       │                                    │
├─────────────────────────────────────────────────────────────┤
│  Vault (vault.ts)                                            │
│  - Encrypted wallet storage                                  │
│  - AES-256-GCM encryption                                    │
│  - JSON file persistence                                     │
├─────────────────────────────────────────────────────────────┤
│  Keypair Generation (keygen.ts)                              │
│  - Solana: Ed25519 (tweetnacl)                               │
│  - EVM: secp256k1 (ethers.js)                                │
├─────────────────────────────────────────────────────────────┤
│  Deployment (deploy/)                                        │
│  - E2B Sandbox (e2b.ts)                                      │
│  - Cloudflare Workers (cloudflare.ts)                        │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT

## Repository

[github.com/x402agent/solana-claude](https://github.com/x402agent/solana-claude)