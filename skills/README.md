# OpenClawd Skills Hub

> Bundled `SKILL.md` packages for the OpenClawd ecosystem.

## 🌐 Skills Hub & Marketplace

The OpenClawd Skills Hub is your central destination for discovering, publishing, and installing AI agent capabilities.

This directory evolves regularly. Treat this file as a catalog index, not a hardcoded count ledger.

| Resource | URL |
|----------|-----|
| **Skills Hub** | [solanaclawd.com/marketplace](https://solanaclawd.com/marketplace) |
| **Registry** | [clawdhub](https://github.com/x402agent/openclawd/tree/main/clawdhub) |
| **API** | [solanaclawd.com/api](https://solanaclawd.com/api) |

### ClawdHub

ClawdHub is the registry and web hub for SKILL.md and SOUL.md bundles:
- **Browse** skills and souls
- **Publish** versioned updates
- **Search** with vector embeddings
- **Install** via CLI or UI

---

## 📦 Skills Catalog

### 🤖 Clawd Ecosystem

| Skill | Description |
|-------|-------------|
| `clawdhub` | Browse, publish, and install SKILL.md bundles |
| `clawd-vault` | Security guardian — scan, harden, audit, and manage secrets |
| `openclawd-codeskill` | OpenClawd agent integration |
| `claude-code-skill` | Claude Code via MCP protocol |
| `skill-creator` | Create new SKILL.md files |
| `swarm-orchestrator` | Multi-bot trading swarms |
| `coding-agent` | AI coding assistant |
| `cua` | Computer use agent |

### 💰 Pump.fun / Token Launch

| Skill | Description |
|-------|-------------|
| `pumpfun-launcher` | Launch tokens on Pump.fun |
| `pumpfun-trading` | Buy/sell on bonding curves |
| `pumpfun-analytics` | Monitor graduation progress |
| `pumpfun-fees` | Creator fee sharing |
| `pumpfun-token-scanner` | Scan for opportunities |
| `pump-sdk-core` | Core SDK integration |
| `pump-bonding-curve` | Bonding curve mathematics |
| `pump-security` | Security auditing |
| `pump-solana-dev` | Solana dev guide |
| `pump-solana-wallet` | Wallet management |
| `pump-mcp-server` | MCP server for Pump.fun |
| `pump-fee-system` | Fee collection system |
| `pump-fee-sharing` | Fee distribution |
| `pump-admin-ops` | Administrative operations |
| `pump-ai-agents` | AI agent frameworks |
| `pump-build-release` | Build pipelines |
| `pump-claims-readonly` | Claims access |
| `pump-rust-vanity` | Rust vanity addresses |
| `pump-shell-scripts` | Shell utilities |
| `pump-testing` | Testing strategies |
| `pump-token-incentives` | Token incentives |
| `pump-token-lifecycle` | Token lifecycle |
| `pump-ts-vanity` | TypeScript vanity |
| `pump-website` | Website templates |
| `pump-solana-architecture` | Architecture guide |

### ⛓️ Solana / Blockchain

| Skill | Description |
|-------|-------------|
| `solana-clawd` | OODA loop trading + 31 MCP tools |
| `solana-dev` | Development toolkit |
| `solana-dev-skill-main` | Comprehensive dev guide |
| `solana-formal-verification` | First-class QEDGen package + Lean 4 proofs |
| `solana-research-brief` | Research and analysis |
| `solanaos` | SolanaOS operator runtime |
| `metaplex` | NFT standard integration |
| `honcho-integration` | Memory and persistence |

### 🎯 AI / Agents

| Skill | Description |
|-------|-------------|
| `gemini` | Google Gemini integration |
| `coding-agent` | Code generation and debugging |
| `cua` | Autonomous web browsing |
| `openai-image-gen` | DALL-E image generation |
| `openai-whisper` | Speech-to-text |
| `openai-whisper-api` | Whisper API |
| `model-usage` | Track AI model usage |
| `swarm-orchestrator` | Multi-agent orchestration |

### 🛠️ DevOps / Infrastructure

| Skill | Description |
|-------|-------------|
| `gateway-node-ops` | SolanaOS Gateway + Node |
| `seeker-daemon-ops` | Seeker daemon management |
| `e2b` | E2B sandbox integration |
| `tmux` | Terminal multiplexer |

### 📝 Productivity

| Skill | Description |
|-------|-------------|
| `browse` | Web browsing |
| `summarize` | Text summarization |
| `notion` | Notion integration |
| `obsidian` | Obsidian vault |
| `apple-notes` | Apple Notes |
| `apple-reminders` | Apple Reminders |
| `bear-notes` | Bear notes |
| `things-mac` | Things task manager |
| `trello` | Trello boards |
| `weather` | Weather forecasts |
| `blogwatcher` | Blog monitoring |
| `xurl` | URL expansion |
| `goplaces` | Travel planning |

### 💬 Communication

| Skill | Description |
|-------|-------------|
| `discord` | Discord bot |
| `slack` | Slack workspace |
| `himalaya` | Email management |
| `wacli` | WhatsApp messaging |
| `bluebubbles` | iMessage via BlueBubbles |
| `imsg` | iMessage direct |
| `voice-call` | Voice transcription |

### 🎨 Media

| Skill | Description |
|-------|-------------|
| `canvas` | HTML display on nodes |
| `camsnap` | Camera capture |
| `video-frames` | Frame extraction |
| `spotify-player` | Spotify control |
| `songsee` | Music recognition |
| `gifgrep` | GIF discovery |
| `sherpa-onnx-tts` | On-device TTS |

### 🔧 Developer Tools

| Skill | Description |
|-------|-------------|
| `github` | GitHub management |
| `gh-issues` | Issues and PRs |
| `pdf-to-markdown` | PDF conversion |
| `nano-pdf` | PDF processing |
| `mcporter` | Package migration |
| `oracle` | Database integration |
| `session-logs` | Log management |

### 🔐 Security

| Skill | Description |
|-------|-------------|
| `clawd-vault` | Security guardian — scan, harden, audit, and manage secrets |
| `1password` | Credential management |

### 💡 IoT / System

| Skill | Description |
|-------|-------------|
| `eightctl` | Eight sleep control |
| `openhue` | Philips Hue control |
| `sonoscli` | Sonos speaker control |
| `blucli` | Bluetooth management |
| `peekaboo` | Screen monitoring |
| `healthcheck` | Health monitoring |
| `sag` | System admin guide |

---

## 🚀 Using Skills

### CLI Installation

```bash
# Install a skill via npm
npx clawdhub install pumpfun-trading
npx clawdhub install solana-clawd
npx clawdhub install swarm-orchestrator

# List installed skills
npx clawdhub list

# Update a skill
npx clawdhub update pumpfun-trading

# Search skills
npx clawdhub search solana

# Publish a skill
npx clawdhub publish ./my-skill --slug my-skill
```

### Curl Commands

```bash
# Browse skills marketplace
curl https://solanaclawd.com/marketplace/skills | jq '.'

# Get skill details
curl https://solanaclawd.com/api/skills/pumpfun-trading

# List all skills
curl https://solanaclawd.com/api/skills | jq '.'

# Search skills
curl "https://solanaclawd.com/api/skills/search?q=solana"

# Install skill (download SKILL.md)
curl -s "https://solanaclawd.com/api/skills/pumpfun-trading/download" -o SKILL.md

# Publish skill
curl -X POST https://solanaclawd.com/api/skills/publish \
  -H "Content-Type: application/json" \
  -d '{"slug":"my-skill","content":"..."}'

# Get featured skills
curl https://solanaclawd.com/api/skills/featured
```

### MCP Integration

```json
{
  "mcpServers": {
    "clawd-skills": {
      "type": "http",
      "url": "https://solanaclawd.com/mcp/skills"
    }
  }
}
```

---

## 🏪 Marketplace

Skills can be published to the marketplace for discovery and monetization:

1. **Create** — Write a SKILL.md file
2. **Publish** — `npx clawdhub publish` or curl to solanaclawd.com
3. **Discover** — Browse at [solanaclawd.com/marketplace](https://solanaclawd.com/marketplace)
4. **Install** — One-click install from any client

### Marketplace API

```bash
# Get marketplace categories
curl https://solanaclawd.com/api/marketplace/categories

# Get skills by category
curl https://solanaclawd.com/api/marketplace/category/solana

# Get trending skills
curl https://solanaclawd.com/api/marketplace/trending

# Get new skills
curl https://solanaclawd.com/api/marketplace/new
```

### Monetization

Skills can be integrated with the ClawdRouter payment system for:
- Per-call payments
- Subscription models
- $CLAWD holder discounts (10-50% off)

---

## 📁 Skill Structure

Each skill is a directory containing:

```
skill-name/
├── SKILL.md           # Main skill definition
├── README.md          # Documentation
└── references/       # Additional files
    └── setup.md       # Setup guide
```

### SKILL.md Template

```markdown
# SKILL.md — {Skill Name}

## Trigger
When the user asks about...

## Environment
- REQUIRED_API_KEY
- OPTIONAL_CONFIG

## Steps
1. First step...
2. Second step...

## References
- [Link to docs](https://...)
```

---

## 🛡️ Security

All skills must pass security review before publication. See:

- [Security Framework](SECURITY.md) — Requirements and prohibited patterns
- [Security Workflow](SECURITY_WORKFLOW.md) — Automated scanning and approval process
- [ClawdVault](../clawd-vault/) — The security guardian skill for scanning

### Quick Security Check

```bash
# Scan a skill before publishing
clawd-vault scan ./skills/my-skill

# Check for common issues
grep -r "sk-[A-Za-z0-9]" ./skills/my-skill || echo "No API keys found"
```

### Vault Certification

Skills can earn vault certification levels:

| Level | Requirements | Badge |
|-------|-------------|-------|
| 🐾 Basic | Passes scan, score >= 80 | `basic` |
| 🔒 Standard | + Manual review, minimal permissions | `standard` |
| 🛡️ Premium | + Full audit, wallet verification | `premium` |
| ⚡ Elite | + Performance review, ecosystem approved | `elite` |

---

## 🤝 Contributing

See [`../docs/PROJECT_GUIDE.md`](../docs/PROJECT_GUIDE.md#contributing-to-openclawd) for:
- Skill creation guidelines
- Quality standards
- Submission process

---

## 📜 License

MIT — See [`../LICENSE.md`](../LICENSE.md)
