# AI Agent API - Cloudflare Workers

Production-ready API for AI agent authentication and Solana wallet management, deployed on Cloudflare's edge network.

## Features

- **Agent Registration** - Create AI agents with unique API keys
- **Session Authentication** - JWT-like session tokens for secure access
- **Crossmint Wallets** - Non-custodial Solana wallets via MPC
- **Rate Limiting** - Per-agent request limits with KV storage
- **Activity Logging** - Full audit trail of all operations
- **Global Edge Deployment** - Low latency worldwide

## Quick Start

### 1. Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2. Install Dependencies

```bash
cd cloudflare-agent-api
npm install
```

### 3. Verify or Create D1 Database

```bash
# Check whether agent-db already exists
wrangler d1 list

# Only create it if it is not already listed
wrangler d1 create agent-db

# You'll get output like:
# [[d1_databases]]
# binding = "DB"
# database_name = "agent-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Copy the database_id to wrangler.toml
```

### 4. Create KV Namespaces

```bash
# Create Sessions KV
wrangler kv namespace create SESSIONS

# Create Rate Limits KV
wrangler kv namespace create RATE_LIMITS

# Copy the IDs to wrangler.toml
```

Wrangler 4 uses `wrangler kv namespace ...`. The old `wrangler kv:namespace ...`
form is no longer accepted.

### 5. Update wrangler.toml

Replace the placeholder IDs with your actual IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "agent-db"
database_id = "YOUR_ACTUAL_DATABASE_ID"

[[kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_ACTUAL_SESSIONS_KV_ID"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "YOUR_ACTUAL_RATE_LIMITS_KV_ID"
```

### 6. Run Database Migration

```bash
# Apply schema to the remote production D1 database
wrangler d1 execute agent-db --remote --file=./schema.sql

# For local development only
wrangler d1 execute agent-db --local --file=./schema.sql
```

### 7. Set Secrets

```bash
# Set Crossmint API key
wrangler secret put CROSSMINT_SERVERSIDE_API_KEY
# Enter: sk_staging_your-key-here (or sk_production_xxx for mainnet)

# Optional: Client-side key
wrangler secret put CROSSMINT_CLIENTSIDE_API_KEY
```

### 8. Deploy

```bash
# Deploy to production
wrangler deploy

# Or deploy to staging
wrangler deploy --env staging
```

### 9. Test Your API

```bash
# Health check
curl https://agent-api.YOUR_SUBDOMAIN.workers.dev/health

# Register an agent
curl -X POST https://agent-api.YOUR_SUBDOMAIN.workers.dev/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "My Trading Bot", "description": "Automated trading agent"}'
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/agents/info` | API information |
| POST | `/api/agents/register` | Register new agent |
| POST | `/api/agents/login` | Login with API key |

### Protected Endpoints (Require Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/me` | Get agent info |
| POST | `/api/agents/logout` | Invalidate session |
| POST | `/api/agents/wallet/create` | Create Solana wallet |
| GET | `/api/agents/wallet` | Get wallet & balances |
| POST | `/api/agents/wallet/fund` | Fund wallet (devnet) |
| POST | `/api/agents/wallet/transfer` | Transfer tokens |
| GET | `/api/agents/rate-limit` | Check rate limit |
| POST | `/api/agents/api-key/regenerate` | Regenerate API key |

## Authentication

### Method 1: API Key (Stateless)

```bash
curl -X GET https://agent-api.YOUR_SUBDOMAIN.workers.dev/api/agents/me \
  -H "X-Agent-API-Key: agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Method 2: Session Token (After Login)

```bash
# Login to get session token
curl -X POST https://agent-api.YOUR_SUBDOMAIN.workers.dev/api/agents/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "agent_xxx..."}'

# Use session token
curl -X GET https://agent-api.YOUR_SUBDOMAIN.workers.dev/api/agents/me \
  -H "X-Agent-Session: agent_yyy..."
```

## Example Workflow

```javascript
// 1. Register a new agent
const registerRes = await fetch('https://agent-api.example.workers.dev/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Trading Bot Alpha',
    description: 'Automated DeFi trading agent',
    chain: 'solana-devnet'
  })
});
const { data } = await registerRes.json();
const apiKey = data.apiKey; // SAVE THIS!

// 2. Login to get session
const loginRes = await fetch('https://agent-api.example.workers.dev/api/agents/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey })
});
const { data: loginData } = await loginRes.json();
const sessionToken = loginData.sessionToken;

// 3. Create wallet
const walletRes = await fetch('https://agent-api.example.workers.dev/api/agents/wallet/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Agent-Session': sessionToken
  }
});
const { data: walletData } = await walletRes.json();
console.log('Wallet address:', walletData.wallet.address);

// 4. Fund wallet (devnet only)
await fetch('https://agent-api.example.workers.dev/api/agents/wallet/fund', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Agent-Session': sessionToken
  },
  body: JSON.stringify({ amount: 10 })
});

// 5. Transfer tokens
await fetch('https://agent-api.example.workers.dev/api/agents/wallet/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Agent-Session': sessionToken
  },
  body: JSON.stringify({
    toAddress: 'RecipientAddress...',
    token: 'usdc',
    amount: '5.00'
  })
});
```

## Local Development

```bash
# Start local dev server
npm run dev

# The API will be available at http://localhost:8787

# Run migrations on local D1
npm run db:migrate:local
```

## OpenAI CUA Ralph Orchestrator + Steel (Node.js)

If you want browser-control agents (CUA) with OpenAI and Steel, use the ready starter in:

- `examples/steel-openai-ralph-cua/`

Quick run:

```bash
cd examples/steel-openai-ralph-cua
npm install
cp .env.example .env
# set STEEL_API_KEY and OPENAI_API_KEY in .env
npm run dev
```

This starter:
- creates a Steel browser session,
- captures screenshots,
- runs a GPT-5.5 Ralph orchestrator action loop through OpenAI Responses,
- translates normalized coordinates (0-1000) into Steel viewport pixels,
- executes click/type/scroll/key/wait actions via Steel Computer API.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CROSSMINT_SERVERSIDE_API_KEY` | Yes | Crossmint server-side API key |
| `CROSSMINT_CLIENTSIDE_API_KEY` | No | Crossmint client-side API key |
| `ENVIRONMENT` | No | `staging` or `production` |
| `CORS_ORIGIN` | No | CORS allowed origin (default: `*`) |

## Database Schema

The API uses Cloudflare D1 (SQLite) with the following tables:

- **agents** - Agent identities, API keys, permissions
- **sessions** - Active session tokens
- **agent_activity** - Audit log of all actions
- **transactions** - Wallet transaction history
- **api_key_history** - API key regeneration history

## Rate Limiting

Default limits per agent:
- **30 requests per minute**
- **1000 requests per day**

Rate limit data is stored in Cloudflare KV for fast edge access.

## Security

- API keys are SHA-256 hashed before storage
- Session tokens expire after 24 hours
- All wallet operations use Crossmint MPC (no private key exposure)
- Request IP addresses are logged for audit
- Rate limiting prevents abuse

## Monitoring

```bash
# View real-time logs
wrangler tail

# View logs for staging
wrangler tail --env staging
```

## Troubleshooting

### "Crossmint API not configured"
Set your Crossmint API key:
```bash
wrangler secret put CROSSMINT_SERVERSIDE_API_KEY
```

### "D1 database not found"
Make sure the database exists and the ID in `wrangler.toml` matches:
```bash
wrangler d1 list
```

If `agent-db` is already listed, do not create it again. Copy its UUID into the
`database_id` field, then run:

```bash
wrangler d1 execute agent-db --remote --file=./schema.sql
```

### "Rate limit exceeded"
Wait for the rate limit window to reset, or increase limits in the database:
```sql
UPDATE agents SET requests_per_minute = 60, requests_per_day = 5000 WHERE id = 'agt_xxx';
```

## License

MIT
