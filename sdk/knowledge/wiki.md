# 🦞 OpenClawd AutoResearch Wiki — Blockchain & Finance Knowledge Base

> **Inspired by [Andrej Karpathy](https://karpathy.ai)'s approach to AI research: let the agents teach themselves.**

Knowledge base and auto-research system powered by LLM embeddings, vector search, and **49 Metaplex Lobster Agents** — continuously researching Solana blockchain, DeFi, and financial markets.

**$CLAWD Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

## Overview

OpenClawd AutoResearch Wiki (formerly LLM Wiki Tang) is a **self-improving knowledge engine** for Solana blockchain and decentralized finance. It combines:

- 🧠 **LLM embeddings** for semantic search across blockchain knowledge
- 🤖 **49 autonomous research agents** that discover, analyze, and store insights
- 📊 **Real-time blockchain feeds** from Helius, Birdeye, and pump.fun
- 🔄 **Karpathy-style self-improvement loops** — agents learn from their own research outcomes
- 💰 **$CLAWD-gated API** — pay-per-query with Solana micropayments

### Karpathy's Research Philosophy, Applied to Blockchain

Andrej Karpathy's approach to AI research — iterate fast, let the model teach itself, publish everything — is the foundation of OpenClawd AutoResearch:

```
Traditional Research:        Karpathy-Style AutoResearch:
─────────────────────        ───────────────────────────────
Human reads paper     →      Agent scans pump.fun 24/7
Human takes notes     →      Agent stores vector embeddings
Human writes summary  →      Agent generates research report
Human shares with team →     Agent broadcasts to 48 other agents
Team meets weekly     →      Agents collaborate in real-time
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  OpenClawd AutoResearch Wiki                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  FastAPI      │  │  Next.js     │  │  MCP Server          │  │
│  │  Backend      │  │  Web UI      │  │  (Claude/Cursor)     │  │
│  │  (api/)       │  │  (web/)      │  │  (mcp/)              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
│  ┌──────▼──────────────────▼──────────────────────▼───────────┐ │
│  │              Supabase (Vector + Relational)                 │ │
│  │   Knowledge Bases · Documents · Embeddings · Research      │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │              OpenClawd Orchestrator                         │ │
│  │   49 Lobster Agents · Honcho Memory · Privy Wallet         │ │
│  │   x402 Payments · Metaplex Core · pump.fun SDK             │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │              Blockchain Data Sources                        │ │
│  │   Helius RPC · Birdeye API · pump.fun · SolanaTracker      │ │
│  │   Jupiter · Raydium · Orca · DexScreener                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Auto-Research Endpoints

The research API is live at `/api/v1/research/`:

### Chain Research — `POST /api/v1/research/chain`

```bash
# Research pump.fun tokens and bonding curves
curl -X POST http://localhost:8000/api/v1/research/chain \
  -H "Content-Type: application/json" \
  -H "X-Payment: 0.001 SOL" \
  -d '{
    "query": "What tokens are graduating on pump.fun today?",
    "focus": ["pump_fun", "graduation"],
    "timeframe": "24h"
  }'
```

### DeFi Research — `POST /api/v1/research/defi`

```bash
# Scan for best yield opportunities
curl -X POST http://localhost:8000/api/v1/research/defi \
  -H "Content-Type: application/json" \
  -H "X-Payment: 0.005 SOL" \
  -d '{
    "action": "yield_scan",
    "protocols": ["raydium", "orca", "marinade"],
    "assets": ["SOL", "USDC"],
    "risk_tolerance": "medium"
  }'
```

### Market Research — `POST /api/v1/research/market`

```bash
# Get market sentiment and alpha
curl -X POST http://localhost:8000/api/v1/research/market \
  -H "Content-Type: application/json" \
  -H "X-Payment: 0.001 SOL" \
  -d '{
    "focus": "alpha",
    "sources": ["twitter", "dexscreener", "birdeye"],
    "timeframe": "6h"
  }'
```

### Agent Self-Improvement — `POST /api/v1/research/agent`

```bash
# Agent learns from research outcomes (Karpathy loop)
curl -X POST http://localhost:8000/api/v1/research/agent \
  -H "Content-Type: application/json" \
  -H "X-Payment: 0.001 SOL" \
  -d '{
    "agent_id": "lobster-trader-01",
    "action": "learn",
    "data": {"trade_result": "profit", "confidence": 0.92}
  }'
```

### Utility Endpoints

```bash
# Research system status
curl http://localhost:8000/api/v1/research/status

# Pricing in SOL and $CLAWD
curl http://localhost:8000/api/v1/research/pricing

# List available research agents
curl http://localhost:8000/api/v1/research/agents
```

---

## Directory Layout

```
llm-wiki-tang/
├── api/                        # FastAPI backend
│   ├── main.py                 # App entry (OpenClawd AutoResearch API)
│   ├── config.py               # Settings (DB, S3, Helius, Birdeye)
│   ├── auth.py                 # Privy + API key auth
│   ├── deps.py                 # FastAPI dependencies
│   ├── scoped_db.py            # Per-tenant DB connections
│   ├── Dockerfile              # Production container
│   ├── requirements.txt        # Python deps
│   ├── routes/
│   │   ├── research.py         # 🦞 Auto-Research endpoints (chain, defi, market, agent)
│   │   ├── knowledge_bases.py  # KB management
│   │   ├── documents.py        # Document CRUD
│   │   ├── api_keys.py         # API key management
│   │   ├── usage.py            # Usage tracking
│   │   ├── admin.py            # Admin endpoints
│   │   └── health.py           # Health check
│   ├── services/
│   │   ├── chunker.py          # Document chunking
│   │   ├── ocr.py              # OCR processing
│   │   └── s3.py               # S3 storage
│   └── html_parser/            # HTML parsing
├── converter/                  # Content conversion service
├── mcp/                        # MCP server (Claude Desktop integration)
├── supabase/                   # Database schemas
├── web/                        # Next.js frontend
│   ├── src/                    # React components
│   └── package.json            # Frontend deps
├── tests/                      # Test suites
├── docker-compose.yml          # Full stack deployment
└── docker-compose.test.yml     # Test environment
```

---

## Setup

### Quick Start (Docker)

```bash
# Start all services
docker-compose up -d

# Check research status
curl http://localhost:8000/api/v1/research/status
```

### Manual Setup

```bash
# Install Python deps
cd api && pip install -r requirements.txt

# Install frontend deps
cd ../web && npm install

# Set environment variables
cp ../.env.example ../.env
# Edit .env with: DATABASE_URL, HELIUS_API_KEY, BIRDEYE_API_KEY, etc.

# Run API
cd api && uvicorn main:app --reload --port 8000

# Run frontend
cd web && npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `HELIUS_API_KEY` | Helius Solana RPC key | Yes |
| `BIRDEYE_API_KEY` | Birdeye price/data API key | Yes |
| `SOLANA_TRACKER_API_KEY` | SolanaTracker key | Optional |
| `AWS_ACCESS_KEY_ID` | S3 for document storage | Optional |
| `S3_BUCKET` | S3 bucket name | Optional |
| `SENTRY_DSN` | Error tracking | Optional |
| `LOGFIRE_TOKEN` | Observability | Optional |

---

## Integration with OpenClawd Stack

### Orchestrator Connection

```typescript
// openclawd-stack/orchestrator connects to AutoResearch Wiki
const researchResult = await fetch('http://localhost:8000/api/v1/research/chain', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Payment': '0.001 SOL',
    'X-Tier': 'gold',
  },
  body: JSON.stringify({
    query: 'Find tokens about to graduate from pump.fun',
    focus: ['pump_fun', 'graduation'],
    timeframe: '1h',
  }),
});
```

### 49 Lobster Agent Integration

Each lobster agent can autonomously query the research API:

```python
# Agent self-improvement loop (Karpathy-style)
async def karpathy_loop(agent_id: str):
    while True:
        # 1. Research
        result = await research_chain({
            "query": "What's happening on pump.fun right now?",
            "focus": ["pump_fun"],
        })
        
        # 2. Learn from outcomes
        await research_agent({
            "agent_id": agent_id,
            "action": "learn",
            "data": result,
        })
        
        # 3. Share insights with swarm
        await research_agent({
            "agent_id": agent_id,
            "action": "share",
            "target_agent": "lobster-analyst-01",
        })
        
        # 4. Calibrate
        await research_agent({
            "agent_id": agent_id,
            "action": "calibrate",
        })
```

### MCP Server for Claude Desktop

```json
{
  "mcpServers": {
    "openclawd-research": {
      "command": "node",
      "args": ["./mcp/index.js"],
      "env": {
        "RESEARCH_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

---

## $CLAWD Token Gating

Research access is gated by $CLAWD holdings:

| Hold | Tier | Daily Queries | Rate Limit | Research Types |
|------|------|---------------|------------|----------------|
| 0 | Free | 5 | 10/min | Basic chain only |
| 1+ | Bronze | 50 | 50/min | + Token analysis |
| 1,000+ | Silver | 200 | 200/min | + DeFi research |
| 10,000+ | Gold | ∞ | 1000/min | + Market alpha |
| 100,000+ | Diamond | ∞ | Unlimited | All + priority |

**$CLAWD Mint:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
**Buy:** [pump.fun](https://pump.fun/8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [OpenClawd README](../README.md) | Main monorepo |
| [AUTO_RESEARCH_AGENTS.md](../docs/articles/AUTO_RESEARCH_AGENTS.md) | Deep dive: Karpathy-inspired auto-research |
| [VIRAL_AGENTS_REVOLUTION.md](../docs/articles/VIRAL_AGENTS_REVOLUTION.md) | Viral article: 49 agents on Solana |
| [solana-lobster-agents.md](../AGENTS/solana-lobster-agents.md) | Metaplex Lobster Agent reference |
| [API/README.md](../API/README.md) | Solana blockchain integration |
| [INTEGRATION_STRATEGY.md](../INTEGRATION_STRATEGY.md) | OpenClawd × OpenClawd |
| [Percolator CLI](../packages/percolator/README.md) | 🧪 Perpetuals trading CLI |

---

## Links

| Service | URL |
|---------|-----|
| 🌐 Website | [solanaclawd.com](https://solanaclawd.com) |
| 🤖 Agent Hub | [hub.solanaclawd.com](https://hub.solanaclawd.com) |
| 📖 Docs | [docs.solanaclawd.com](https://docs.solanaclawd.com) |
| 🐦 Twitter | [x.com/clawddevs](https://x.com/clawddevs) |
| 💬 Telegram | [t.me/clawdtoken](https://t.me/clawdtoken) |
| 📦 GitHub | [github.com/clawdsolana/OpenClawd](https://github.com/clawdsolana/OpenClawd) |

---

*Built with 🦞 by the OpenClawd crew — The Hermes of Web3*
*AutoResearch inspired by [Andrej Karpathy](https://karpathy.ai)'s approach: iterate fast, let agents teach themselves, publish everything.*

## License

MIT — See [`../LICENSE.md`](../LICENSE.md)