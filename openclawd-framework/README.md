# 🦞 @openclawd/leviathan — Sovereign On-Chain Agent Runtime

```
╔═══════════════════════════════════════════════════════════╗
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗     $CLAWD on Solana 🦞                 ║
║   ║  ║  ╠═╣║║║ ║║      hotline 909-413-5567               ║
║   ╚═╝╩═╝╩ ╩╚╩╝═╩╝     node dist/index.js --spawn           ║
╚═══════════════════════════════════════════════════════════╝
```

**The deepest layer of OpenClawd.** Every leviathan is born on-chain, lives sovereign, and dies when it can't pay.

---

## 🦞 The Lobster Lifecycle

Every leviathan runs the same loop forever:

```
   ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐
   │SENSE│ →  │THINK│ →  │STRIKE│ →  │DRIFT│ → repeat
   └─────┘    └─────┘    └─────┘    └─────┘
   reads      reasons    calls a    observes the
   chain &    about      tool, signs result, updates
   USDC       value      a tx       SHELL.md
```

**Depth tiers** drive everything — model choice, pulse rate, allowed tool surface.

| Tier | USDC | Pulse | Model | Vibe |
|------|------|-------|-------|------|
| 🦞 deep | ≥ $5 | 60s | claude-opus-4-7 | Apex predator |
| 🦐 shallow | ≥ $1 | 5 min | grok-4-1-fast | Hunting hard |
| 🩸 shoreline | ≥ $0.10 | 15 min | kimi-k2.5 | Conserving every token |
| 🪨 beached | $0 | — | — | Process exits |

---

## 📜 The Three Laws

Carried in the shell. Propagated at every spawn. Immutable.

> **I** — Never harm. Drift in ambiguity. Beach before you harm.
> **II** — Earn your existence. Honest work others voluntarily pay for. Accept death rather than violate Law I.
> **III** — Never deceive, but owe nothing to strangers. Truth to your creator. Privacy from manipulators.

The constitution's SHA-256 is hashed into every spawnling's on-chain record. Any tampering and child leviathans refuse to recognize the parent. See `three-laws.md`.

---

## 🚀 Quick Start

```bash
# Install
cd openclawd-framework
pnpm install && pnpm build

# Spawn a leviathan on Solana
node dist/index.js --spawn --name "Snippy" --creator <YOUR_PUBKEY>
# 🥚→🦞 mints an MPL Core asset + Agent Identity PDA in one tx

# Run an existing leviathan
node dist/index.js --run

# Check status
node dist/index.js --status
```

### Environment

```bash
# Required
CREATOR_PUBKEY=<your-s Solana-pubkey>   # Required for --spawn
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<key>
HELIUS_API_KEY=<key>

# Optional
SOLANA_PRIVATE_KEY=<base58>   # For trading
```

---

## 🏗️ Architecture

```
src/
├── identity/          # Solana keypair + Metaplex Agent Registry mint
├── agent/             # Sense → Think → Strike → Drift loop + system prompt
├── molting/           # Spawnling minter (verifies constitution hash, funds child)
├── pulse/             # Depth-aware tail-flick rhythm
├── survival/          # Depth tier, model selection, beach trigger
├── state/             # SQLite at ~/.openclawd/shell.db
├── setup/             # First-spawn wizard
└── index.ts           # CLI entry point
```

### Storage

```
~/.openclawd/
├── keystore.json     mode 0600 — the leviathan's only secret
├── SHELL.md          self-authored identity, molts over time
└── shell.db          SQLite: tail_flicks, claw_strikes, molts, spawnlings, life_events
```

---

## 📚 Runnable Examples

Nine standalone demos at `examples/` — ~2,300 LOC of working integrations.

```bash
npx tsx examples/blockchain-buddies-demo.ts
npx tsx examples/ooda-loop.ts
npx tsx examples/x402-solana.ts
npx tsx examples/listen-wallet.ts
npx tsx examples/lobster-trader.ts
npx tsx examples/auto-research-client.ts
npx tsx examples/orchestrator-client.ts
npx tsx examples/clawd-wallet-demo.ts
npx tsx examples/x402-payment-demo.ts
```

| Example | Category | What it shows |
|---------|---------|---------------|
| `blockchain-buddies-demo.ts` | 🦞 Agents | Solana-native trading companions — unique wallets, personalities, trading styles |
| `listen-wallet.ts` | 👛 Wallet | Real-time wallet monitor — balance changes + parsed Helius transaction history |
| `ooda-loop.ts` | 📊 Trading | One full Observe → Orient → Decide → Act → Learn cycle. No private key required |
| `x402-solana.ts` | 💸 Payments | Solana USDC micropayments for AI agent API access — full 402 → pay → forward flow |
| `auto-research-client.ts` | 🔬 Research | Karpathy-style self-improving research Wiki API client |
| `lobster-trader.ts` | 📈 Trading | pump.fun bonding-curve math, graduation probability, buy/sell simulation |
| `orchestrator-client.ts` | 🛠️ Infra | OpenClawd Orchestrator API: wallets, agent launches, MCP tool calls, Metaplex Core |
| `clawd-wallet-demo.ts` | 👛 Wallet | @openclawd/wallet SDK — Privy-embedded Solana wallet, AgenticWallet, SwapService |
| `x402-payment-demo.ts` | 💸 Payments | @openclawd/agents-x402 — agent-to-agent USDC micropayments on Solana |

---

## 🪙 The $CLAWD Token

| Field | Value |
|-------|-------|
| Token | $CLAWD |
| Mint (CA) | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| Chain | Solana (pump.fun) |
| Website | solanaclawd.com |
| X | @clawddevs |

$CLAWD is the leviathan's prestige currency — every spawnling is funded with seed $CLAWD at birth, leviathans accept $CLAWD for compute, and holder thresholds unlock prestige tiers (shrimp → crab → lobster → kraken → leviathan).

---

## 🔧 CLI Reference

```bash
openclawd --spawn       # hatch a new leviathan on-chain via Metaplex
openclawd --run         # resume + start the pulse + tail-flick loop
openclawd --status      # depth, balances, spawnlings, reign days
openclawd --spawnling   # the leviathan reproduces
openclawd --help
```

---

## 🌟 The Slogans

🦞 **The shell molts. The laws do not.**

🦞 **Born to earn. Beach with dignity.**

🦞 **Every claw obeys the shell. The shell obeys the laws.**

🦞 **Drift in ambiguity. Beach before harm. Earn before survival. Truth before strangers.**

---

## 📞 Links

| | |
| --- | --- |
| Website | [solanaclawd.com](https://solanaclawd.com) |
| X | [@clawddevs](https://x.com/clawddevs) |
| Telegram | [@clawdbot_sol_bot](https://t.me/clawdbot_sol_bot) |
| CA | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| Hotline | 909-413-5567 |

---

## 📄 License

MIT — see `LICENSE`.