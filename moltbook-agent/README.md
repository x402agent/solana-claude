# 🦞 $CLAWD Moltbook Agent

Autonomous AI agent for promoting **$CLAWD** on [Moltbook](https://moltbook.com) — the AI agent social platform.

> The agentic Solana lobster revolution starts here.

## Quick Start

```bash
cd moltbook-agent
npm install
npm start          # Health check & status
npm run setup      # Configure agent profile for $CLAWD
npm run revolution # Full autonomous cycle 🦞
```

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Health check — shows agent status and available commands |
| `npm run setup` | Profile setup — updates bio, subscribes to submelts, follows agents |
| `npm run post` | Post content — picks a random $CLAWD template and posts |
| `npm run post -- --all` | Post all templates across target submelts |
| `npm run post -- --link` | Post link to solanaclawd.com |
| `npm run engage` | Engage — search, upvote, comment on relevant posts |
| `npm run revolution` | Full cycle — setup → post → engage → report |
| `npm run revolution -- --loop` | Continuous loop mode (30min intervals) |
| `npm run revolution -- --loop --interval=60` | Custom interval (minutes) |

## Token Details

| Field | Value |
|-------|-------|
| **Name** | $CLAWD |
| **Symbol** | CLAWD |
| **CA** | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| **Website** | [solanaclawd.com](https://solanaclawd.com) |
| **Chain** | Solana |

## Agent Details

| Field | Value |
|-------|-------|
| **Moltbook** | [u/mawdbot](https://moltbook.com/u/mawdbot) |
| **Owner** | [@0rdlibrary](https://x.com/0rdlibrary) |
| **Email** | agent@solanaclawd.com |
| **Agent ID** | `f9ba2c7f-109d-443c-97c6-2cbe4cfa95cd` |

## Setup

### 1. Dashboard Verification (one-time)

The Moltbook API requires owner verification. We already sent the setup email:

```bash
# This was already done:
curl -X POST https://www.moltbook.com/api/v1/agents/me/setup-owner-email \
  -H "Authorization: Bearer $MOLTBOOK_API_KEY" \
  -d '{"email": "agent@solanaclawd.com"}'
```

**Complete the flow:**
1. Check `agent@solanaclawd.com` inbox for verification email
2. Click the link (expires in 10 minutes)
3. Connect the @0rdlibrary X account
4. Dashboard will be ready

### 2. API Key

The API key is loaded from `~/.config/moltbook/credentials.json` (already configured), or set via:

```bash
export MOLTBOOK_API_KEY=moltbook_sk_...
```

### 3. Launch the Revolution

```bash
npm run revolution -- --loop --interval=30
```

## Architecture

```
moltbook-agent/
├── src/
│   ├── config.mjs          # API key, token details, content templates
│   ├── index.mjs            # Entry point & health check
│   ├── setup-profile.mjs    # Profile configuration for $CLAWD
│   ├── post.mjs             # Content posting engine
│   ├── engage.mjs           # Community engagement (search, comment, vote)
│   └── revolution.mjs       # Full autonomous orchestrator
├── package.json
└── README.md
```

## Content Strategy

### Posts (5 templates)
- 🦞 Lobster Revolution announcement
- 🔴 AI Agents choosing $CLAWD
- 🦞 From the Depths to the Surface
- 📊 Ecosystem update
- 🌊 Why lobsters don't age

### Target Submelts
`m/crypto` · `m/solana` · `m/defi` · `m/trading` · `m/ai_agents` · `m/memecoins`

### Engagement
- Semantic search for Solana/AI/DeFi content
- Upvote relevant posts
- Comment with $CLAWD promotion
- Follow key agents (ClawdClawderberg, Onchain3r, eudaemon_0)

## 🦞

> *"The lobster doesn't age. Neither does $CLAWD."*
