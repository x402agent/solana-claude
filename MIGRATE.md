# Migrate from OpenClaw to solana-clawd

This guide walks you through migrating an existing **OpenClaw** (or legacy `~/.clawdbot/` / `~/.moldbot/`) installation to **solana-clawd v1.4+**. The `clawd migrate` command handles the heavy lifting automatically, but this document explains what happens under the hood and how to verify the result.

> **solana-clawd** is a Solana-native agentic engine with 31 MCP tools, blockchain buddies, OODA trading loops, and 3-tier epistemological memory. If you were using OpenClaw for general-purpose agent work and want to keep that config while gaining Solana superpowers, this migration is for you.

---

## Table of Contents

- [Quick Start](#quick-start)
- [What Gets Migrated](#what-gets-migrated)
- [Solana-Specific Migration](#solana-specific-migration)
- [Config Key Mappings](#config-key-mappings)
- [API Key Resolution Order](#api-key-resolution-order)
- [What Gets Archived](#what-gets-archived)
- [After Migration Checklist](#after-migration-checklist)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Preview first (recommended)

```bash
clawd migrate --dry-run
```

This scans your system for OpenClaw / legacy config directories and prints a detailed plan of what will be copied, converted, or skipped — without touching any files.

Example output:

```
[dry-run] Detected source: ~/.clawdbot (OpenClaw v0.8.3)
[dry-run] SOUL.md → ~/.clawd/SOUL.md (merge with existing: no)
[dry-run] MEMORY.md → 3-tier memory conversion:
           14 KNOWN entries  (ephemeral, will expire in 60s)
           31 LEARNED entries (→ Honcho persistent store)
            9 INFERRED entries (→ local vault markdown)
[dry-run] 7 skills → ~/.clawd/skills/openclaw-imports/
[dry-run] mcp_servers.json → ~/.clawd/mcp_servers.json (3 servers)
[dry-run] model: gpt-4-turbo → openrouter (minimax/minimax-m2.7)
[dry-run] wallet: paper_trading → buddy wallet migration
[dry-run] 2 Helius webhooks detected
[dry-run] No files were modified. Run `clawd migrate` to apply.
```

### Apply the migration

```bash
clawd migrate
```

Add `--verbose` for step-by-step output, or `--source <path>` to point at a non-default config directory:

```bash
clawd migrate --source ~/.moldbot --verbose
```

### Additional flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without writing anything |
| `--source <path>` | Override auto-detected source directory |
| `--no-backup` | Skip creating a `.bak` of the source (not recommended) |
| `--force` | Overwrite existing `~/.clawd/` files without prompting |
| `--skip-memory` | Migrate config and skills only, leave memory untouched |
| `--skip-wallet` | Do not migrate wallet configs or paper trading state |
| `--verbose` | Print every file operation |

---

## What Gets Migrated

### 1. Persona (SOUL.md)

| Source | Destination |
|--------|-------------|
| `~/.clawdbot/SOUL.md` | `~/.clawd/SOUL.md` |
| `~/.moldbot/persona.md` | `~/.clawd/SOUL.md` |
| `~/.openclaw/agent.yaml` `persona:` field | `~/.clawd/SOUL.md` |

The migrator preserves your custom persona text and wraps it in solana-clawd's SOUL.md format, which includes the epistemological model headers (`## How I Think`, `## My Principles`, etc.). Your original persona content is inserted under `## Who I Am (migrated)`.

If `~/.clawd/SOUL.md` already exists, the migrator appends a `## Legacy Persona (OpenClaw)` section rather than overwriting.

### 2. Memory (MEMORY.md / memory.json)

OpenClaw stores memory as a flat markdown file or JSON array. solana-clawd uses a **3-tier epistemological memory model**:

| OpenClaw Memory Type | solana-clawd Tier | Storage | Behavior |
|----------------------|-------------------|---------|----------|
| Timestamped facts, API snapshots | **KNOWN** | Ephemeral session state | Expires ~60s; live data only |
| User preferences, learned patterns | **LEARNED** | Honcho persistent store | Durable, cross-session, high trust |
| Hypotheses, weak correlations | **INFERRED** | Local vault (markdown) | Tentative, revisable |

The migrator classifies each memory entry using pattern matching:

- Entries containing price data, balances, or timestamps → **KNOWN** (marked as already-expired since they are stale)
- Entries about user preferences, trading patterns, or repeated observations → **LEARNED**
- Everything else → **INFERRED**

Each converted entry includes a `source: "openclaw-migration"` tag and the original creation timestamp.

```
~/.clawd/memory/
  learned.jsonl        # LEARNED tier (syncs to Honcho on next session)
  inferred/            # INFERRED tier (searchable markdown vault)
    openclaw-import-001.md
    openclaw-import-002.md
    ...
```

### 3. Skills

| Source | Destination |
|--------|-------------|
| `~/.clawdbot/skills/*.md` | `~/.clawd/skills/openclaw-imports/` |
| `~/.openclaw/plugins/*.yaml` | `~/.clawd/skills/openclaw-imports/` (converted to SKILL.md) |

OpenClaw skills are converted to solana-clawd's `SKILL.md` format with YAML frontmatter:

```yaml
---
name: my-openclaw-skill
description: "Migrated from OpenClaw"
version: "1.0.0-migrated"
author: "openclaw-migration"
tags: ["migrated", "openclaw"]
permissionLevel: "safe"
enabled: true
---

<!-- Original skill content below -->
```

The skill registry (`~/.nanosolana/skills/` and bundled `skills/` directory) automatically picks up files from `~/.clawd/skills/openclaw-imports/` on next launch.

### 4. MCP Servers Config

| Source | Destination |
|--------|-------------|
| `~/.clawdbot/mcp_servers.json` | `~/.clawd/mcp_servers.json` |
| `~/.openclaw/mcp.yaml` | `~/.clawd/mcp_servers.json` (converted) |

Server entries are preserved as-is. The migrator validates each server's `command` and `args` fields and warns if binaries are not found on `$PATH`.

### 5. Model and Provider Config

OpenClaw's model configuration is mapped to solana-clawd's tri-provider model catalog:

| OpenClaw `model` | solana-clawd `model.id` | Provider |
|-------------------|--------------------------|----------|
| `gpt-4-turbo` | `minimax/minimax-m2.7` | `openrouter` |
| `gpt-4o` | `minimax/minimax-m2.7` | `openrouter` |
| `gpt-3.5-turbo` | `openai/gpt-5.4-nano` | `openrouter` |
| `claude-3-opus` | `claude-sonnet-4-6` | `anthropic` |
| `claude-3-sonnet` | `claude-sonnet-4-6` | `anthropic` |
| `claude-3-haiku` | `claude-sonnet-4-6` | `anthropic` |
| `grok-*` | `grok-4-1-fast` | `xai` |
| Any OpenRouter model ID | Preserved as-is | `openrouter` |

If the source config specifies a custom OpenRouter model ID (e.g., `openrouter/mistral-large`), it is carried forward directly.

### 6. Agent Behavior

| OpenClaw Setting | solana-clawd Equivalent | Notes |
|------------------|-------------------------|-------|
| `timeout: 300` | `maxTurns: 25` | Rough conversion: 12s per turn average |
| `timeout: 600` | `maxTurns: 50` | Adjustable post-migration |
| `auto_approve: true` | `permissionMode: "auto"` | Auto-approve reads, ask for writes |
| `auto_approve: false` | `permissionMode: "ask"` | Default; prompt before irreversible actions |
| `sandbox: true` | `permissionMode: "readOnly"` | Deny all writes/trades at engine level |
| `dangerous_mode: true` | `permissionMode: "bypassAll"` | Dev only; skip all permission checks |
| `allowed_tools: [...]` | `alwaysAllowTools: [...]` | Tool names auto-approved in session |
| `denied_tools: [...]` | `alwaysDenyTools: [...]` | Tool names always rejected |

Permission rules in solana-clawd use a **deny-first** evaluation order: `deny > ask > allow > default`. The permission engine also supports glob-style patterns:

```
trading.buy(*)         → matches any buy call
trading.buy(BONK)      → matches BONK buy only
solana.*               → matches all solana namespace tools
```

### 7. Blockchain-Specific Config

| OpenClaw Setting | solana-clawd Equivalent |
|------------------|-------------------------|
| `rpc_url` | `SOLANA_RPC_URL` env / `helius.cluster` config |
| `helius_key` | `HELIUS_API_KEY` env / `helius.apiKey` config |
| `wallet_path` | Buddy wallet system (see [Wallet Migration](#wallet-migration)) |
| `network: mainnet` | `helius.cluster: "mainnet"` |
| `network: devnet` | `helius.cluster: "devnet"` |

---

## Solana-Specific Migration

These migration paths are unique to solana-clawd and have no equivalent in general-purpose agent migration tools.

### Wallet Migration

OpenClaw wallet configurations are migrated to solana-clawd's **Buddy Wallet** system. Each wallet becomes a `BuddyWallet` with:

| Field | Source | Default |
|-------|--------|---------|
| `address` | OpenClaw `wallet.publicKey` | Generated from buddy ID |
| `isSimulated` | `true` if OpenClaw was in paper mode | `true` |
| `solBalance` | OpenClaw `wallet.balance` | `0` |
| `tokenBalances` | OpenClaw `wallet.tokens` | `{}` |
| `totalPnlUsd` | OpenClaw `wallet.pnl` | `0` |
| `winRate` | Calculated from trade history | `0` |
| `tradeCount` | OpenClaw `wallet.trades.length` | `0` |

Paper trading wallets are migrated automatically. **Live wallet private keys are never read, copied, or stored** by the migrator. If your OpenClaw config references a live wallet keypair file, the migrator logs a warning and skips it:

```
[warn] Skipping live wallet keypair at ~/.clawdbot/wallet.json
       solana-clawd does not store private keys. Use permissionMode: "ask"
       and connect your wallet through the MCP client at runtime.
```

### Buddy Companion Migration

If you had companion/pet configurations in OpenClaw, they map to solana-clawd's **Blockchain Buddy** system:

| OpenClaw | solana-clawd Buddy Field |
|----------|--------------------------|
| `companion.name` | `BlockchainBuddy.name` |
| `companion.type` | `BlockchainBuddy.species` (mapped to nearest `BlockchainSpecies`) |
| `companion.avatar` | `BlockchainBuddy.eye` + `BlockchainBuddy.hat` (re-rolled via seeded PRNG) |
| `companion.level` | `BlockchainBuddy.level` |
| `companion.xp` | `BlockchainBuddy.experience` |

Available blockchain species: `soldog`, `bonk`, `wif`, `jupiter`, `raydium`, `whale`, `bull`, `bear`, `shark`, `octopus`, `degod`, `y00t`, `okaybear`, `pepe`, `pumpfun`, `sniper`, `validator`, `rpc`.

If the source companion type does not map to any blockchain species, the migrator defaults to `soldog` and preserves the original type name in a `migrationNote` field.

### Trading Personality Profiles

OpenClaw trading strategy settings are converted to solana-clawd's `TradingPersonality` type:

| OpenClaw Strategy | solana-clawd Personality | Risk Tolerance |
|-------------------|--------------------------|----------------|
| `conservative` | `diamond_hands` | `low` |
| `moderate` | `sniper` | `medium` |
| `aggressive` | `degen` | `high` |
| `scalper` | `bot` | `medium` |
| `swing` | `ninja` | `medium` |
| `hodl` | `diamond_hands` | `low` |
| `yolo` | `ape` | `degen` |

Each personality comes with pre-configured base stats (`ALPHA`, `GAS_EFF`, `RUG_DETECT`, `TIMING`, `SIZE`, `PATIENCE`, `CHAOS`, `SNARK`) that influence the buddy's autonomous trading behavior.

### OODA Strategy Configs

OpenClaw's simple `strategy` or `loop_config` settings are upgraded to solana-clawd's full OODA cycle:

```
OpenClaw loop:
  scan → analyze → trade → sleep

solana-clawd OODA cycle:
  observe → orient → decide → act → learn → idle
```

| OpenClaw | solana-clawd OODA Phase | Description |
|----------|-------------------------|-------------|
| `scan` | `observe` | Gather on-chain data, Helius streams, price feeds |
| `analyze` | `orient` | Pattern match, cross-reference memory tiers |
| `decide` | `decide` | Generate trade plan, risk check, confidence score |
| `trade` | `act` | Execute (or simulate) the trade via MCP tools |
| *(none)* | `learn` | Extract memories, update LEARNED/INFERRED tiers |
| `sleep` | `idle` | Cooldown, wait for next trigger |

The migrator converts loop timing settings:

```yaml
# OpenClaw
loop_interval: 30    # seconds between scans
max_iterations: 100  # total loops before stop

# Becomes (solana-clawd)
ooda:
  cycleDurationMs: 30000
  maxCycles: 100
  learnAfterEveryAct: true
  autoStartOnBoot: false
```

### Helius Webhook Migration

If your OpenClaw config includes Helius webhook definitions, they are migrated to solana-clawd's `HeliusWebhookConfig` format:

| OpenClaw Field | solana-clawd Field |
|----------------|---------------------|
| `webhook.url` | `webhookURL` |
| `webhook.types` | `transactionTypes` |
| `webhook.accounts` | `accountAddresses` |
| `webhook.format` | `webhookType` (`"enhanced"` / `"raw"` / `"discord"`) |
| `webhook.auth` | `authHeader` |

The migrator does **not** re-register webhooks with Helius. It writes the config so solana-clawd can manage them on next launch. Run `clawd helius webhooks list` after migration to verify.

---

## Config Key Mappings

Complete mapping of OpenClaw configuration keys to solana-clawd equivalents:

| OpenClaw Key | solana-clawd Key | Type | Notes |
|--------------|------------------|------|-------|
| `model` | `model.id` | `string` | See [Model and Provider Config](#5-model-and-provider-config) |
| `provider` | `model.provider` | `"openrouter" \| "anthropic" \| "xai"` | |
| `api_key` | `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `XAI_API_KEY` | env | See [API Key Resolution](#api-key-resolution-order) |
| `temperature` | `model.temperature` | `number` | Preserved as-is |
| `max_tokens` | `model.maxTokens` | `number` | |
| `system_prompt` | `SOUL.md` | file | Converted to SOUL.md format |
| `memory_file` | `memory/learned.jsonl` + `memory/inferred/` | dir | 3-tier split |
| `timeout` | `maxTurns` | `number` | ~12s per turn conversion |
| `auto_approve` | `permissionMode` | `PermissionMode` | See behavior mapping |
| `allowed_tools` | `alwaysAllowTools` | `string[]` | |
| `denied_tools` | `alwaysDenyTools` | `string[]` | |
| `mcp_servers` | `mcp_servers.json` | file | Direct copy |
| `rpc_url` | `SOLANA_RPC_URL` | env | |
| `helius_key` | `HELIUS_API_KEY` | env | |
| `network` | `helius.cluster` | `"mainnet" \| "devnet"` | |
| `wallet_path` | *(removed)* | — | Buddy wallet system instead |
| `companion` | `buddy` | `BlockchainBuddy` | Species mapping applied |
| `strategy` | `ooda` | `OODAConfig` | Cycle mapping applied |
| `loop_interval` | `ooda.cycleDurationMs` | `number` | Seconds → milliseconds |
| `max_iterations` | `ooda.maxCycles` | `number` | |
| `webhooks` | `helius.webhooks` | `HeliusWebhookConfig[]` | |
| `log_level` | `LOG_LEVEL` | env | `debug \| info \| warn \| error` |
| `data_dir` | `~/.clawd/` | dir | Fixed location |
| `skills_dir` | `~/.clawd/skills/` | dir | Also loads from `~/.nanosolana/skills/` |
| `plugin_dir` | `~/.clawd/skills/openclaw-imports/` | dir | Plugins become skills |

---

## API Key Resolution Order

solana-clawd resolves API keys in this priority order (highest to lowest):

```
1. Explicit config    ~/.clawd/config.json  →  "anthropicApiKey": "sk-..."
2. Environment var    ANTHROPIC_API_KEY=sk-...
3. .env file          ~/.clawd/.env  →  ANTHROPIC_API_KEY=sk-...
4. Auth profile       ~/.clawd/auth/anthropic.json  →  { "apiKey": "sk-..." }
5. System keychain    (macOS Keychain / Linux secret-service, if available)
```

The migrator checks for API keys in your OpenClaw config and places them in `~/.clawd/.env` (option 3) by default. It does **not** write keys to `config.json` to avoid accidental git commits.

| OpenClaw Key | Environment Variable | Auth Profile |
|--------------|----------------------|--------------|
| `openai_api_key` | `OPENROUTER_API_KEY` | `~/.clawd/auth/openrouter.json` |
| `anthropic_api_key` | `ANTHROPIC_API_KEY` | `~/.clawd/auth/anthropic.json` |
| `xai_api_key` | `XAI_API_KEY` | `~/.clawd/auth/xai.json` |
| `helius_api_key` | `HELIUS_API_KEY` | `~/.clawd/auth/helius.json` |
| `openrouter_api_key` | `OPENROUTER_API_KEY` | `~/.clawd/auth/openrouter.json` |

> **Security note:** The migrator never logs API key values. Keys are read from the source, written to the destination, and the in-memory copy is zeroed immediately.

---

## What Gets Archived

Some OpenClaw features have no direct equivalent in solana-clawd. These are copied to `~/.clawd/archive/openclaw/` for reference but are not actively used:

| OpenClaw Feature | Why It Is Archived | Alternative in solana-clawd |
|------------------|--------------------|-----------------------------|
| `chat_history/` | solana-clawd uses session-scoped tool call records, not persistent chat logs | Use `memory/` tiers for durable knowledge |
| `fine_tune_data/` | No fine-tuning pipeline in solana-clawd | Use SKILL.md files for behavioral customization |
| `embeddings/` | solana-clawd uses pattern-based memory extraction, not vector embeddings | LEARNED + INFERRED tiers replace RAG |
| `custom_functions/` | Function-calling is replaced by MCP tool protocol | Convert to MCP server or SKILL.md |
| `proxy_config` | solana-clawd connects to providers directly | Set `HTTP_PROXY` env if needed |
| `telemetry_config` | No telemetry in solana-clawd | — |
| `team_config` | No multi-user support in current version | Single-agent model |

The archive is a plain directory copy. You can safely delete `~/.clawd/archive/` after verifying migration.

---

## After Migration Checklist

Run through this checklist after `clawd migrate` completes:

### Core verification

- [ ] **Config loads cleanly**
  ```bash
  clawd doctor
  ```
  This validates config structure, API key availability, and Helius connectivity.

- [ ] **SOUL.md is correct**
  ```bash
  cat ~/.clawd/SOUL.md
  ```
  Verify your persona text appears under `## Who I Am (migrated)`.

- [ ] **Memory tiers populated**
  ```bash
  clawd memory stats
  ```
  Expected output shows KNOWN/LEARNED/INFERRED counts matching dry-run preview.

- [ ] **Skills are discoverable**
  ```bash
  clawd skills list
  ```
  Look for your migrated skills under the `openclaw-imports` namespace.

- [ ] **MCP servers connect**
  ```bash
  clawd mcp status
  ```
  Each server should show `connected` or `ready`.

### Model and provider

- [ ] **Model resolves**
  ```bash
  clawd config get model
  ```
  Should show a valid model ID from the catalog (`minimax/minimax-m2.7`, `claude-sonnet-4-6`, `grok-4-1-fast`, or `openai/gpt-5.4-nano`).

- [ ] **API key works**
  ```bash
  clawd auth test
  ```
  Tests connectivity to the configured provider.

### Solana-specific

- [ ] **Helius connection**
  ```bash
  clawd helius status
  ```
  Should show cluster (`mainnet`/`devnet`) and API key status.

- [ ] **Buddy companion exists**
  ```bash
  clawd buddy show
  ```
  Shows your migrated buddy with species, personality, and wallet.

- [ ] **Webhooks registered** (if applicable)
  ```bash
  clawd helius webhooks list
  ```

- [ ] **Permission mode is set correctly**
  ```bash
  clawd config get permissionMode
  ```
  Default is `"ask"`. If you had `auto_approve: true`, it should be `"auto"`.

- [ ] **OODA config loaded** (if applicable)
  ```bash
  clawd ooda status
  ```
  Shows cycle duration, max cycles, and current phase (`idle` after fresh migration).

### Cleanup

- [ ] **Review archived files**
  ```bash
  ls ~/.clawd/archive/openclaw/
  ```
  Delete when satisfied.

- [ ] **Remove old config** (optional)
  ```bash
  # Only after verifying everything works
  rm -rf ~/.clawdbot.bak  # backup created by migrator
  ```

---

## Troubleshooting

### "No OpenClaw installation found"

The migrator checks these paths in order:

1. `~/.clawdbot/`
2. `~/.moldbot/`
3. `~/.openclaw/`
4. `~/.config/openclaw/`

If your config lives elsewhere, use `--source`:

```bash
clawd migrate --source /path/to/your/openclaw/config
```

### "Memory conversion failed: unsupported format"

The migrator supports these memory formats:

- `MEMORY.md` (markdown with `## Entry` headers)
- `memory.json` (JSON array of `{ content, timestamp, type }`)
- `memory.jsonl` (newline-delimited JSON)

If your memory file uses a custom format, convert it to JSONL first:

```bash
# Each line: { "content": "...", "timestamp": 1234567890, "type": "learned" }
cat custom_memory.txt | jq -R '{ content: ., timestamp: now | floor, type: "learned" }' > memory.jsonl
clawd migrate --source . --memory-file memory.jsonl
```

### "Model not found in catalog"

If your OpenClaw model is not in the mapping table, the migrator defaults to `minimax/minimax-m2.7` via OpenRouter. Override post-migration:

```bash
clawd config set model.id "claude-sonnet-4-6"
clawd config set model.provider "anthropic"
```

### "Permission denied writing to ~/.clawd/"

```bash
mkdir -p ~/.clawd && chmod 755 ~/.clawd
clawd migrate
```

### "Helius API key invalid after migration"

The migrator copies the key as-is. If it was expired or rotated:

1. Get a new key from [helius.dev](https://helius.dev)
2. Update:
   ```bash
   clawd config set helius.apiKey "your-new-key"
   # or
   echo "HELIUS_API_KEY=your-new-key" >> ~/.clawd/.env
   ```

### "Buddy species mapping failed"

If your OpenClaw companion type could not be mapped to a blockchain species:

```bash
# See available species
clawd buddy species

# Re-roll your buddy with a specific species
clawd buddy reroll --species bonk --keep-stats
```

### "Skills not loading after migration"

Verify the YAML frontmatter in each migrated skill:

```bash
head -10 ~/.clawd/skills/openclaw-imports/*.md
```

Each file must begin with `---` and end the frontmatter with `---`. Common issue: the migrator could not parse the original skill format. Re-create the skill manually:

```bash
clawd skills create my-skill --from ~/.clawdbot/skills/original-skill.md
```

### "OODA cycle not starting"

OODA auto-start is disabled by default after migration (`autoStartOnBoot: false`). To start:

```bash
clawd ooda start
```

To enable auto-start:

```bash
clawd config set ooda.autoStartOnBoot true
```

### Rolling back

The migrator creates a backup of your source directory before modifying anything:

```bash
# Backup location (printed during migration)
ls ~/.clawdbot.bak/

# To roll back: remove clawd config and restore backup
rm -rf ~/.clawd
mv ~/.clawdbot.bak ~/.clawdbot
```

---

## Further Reading

- [SOUL.md](../SOUL.md) — solana-clawd's identity and epistemological model
- [Permission Engine](../src/engine/permission-engine.ts) — deny-first permission resolution
- [Memory Extraction](../src/memory/extract-memories.ts) — 3-tier memory classification
- [Skill Registry](../src/skills/skill-registry.ts) — SKILL.md loading and NanoHub discovery
- [Buddy System](../src/buddy/) — blockchain companion species and trading personalities
- [Helius Client](../src/helius/helius-client.ts) — RPC, DAS, and webhook integration

---

*solana-clawd v1.4.0 -- MIT -- github.com/x402agent/solana-clawd*
