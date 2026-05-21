# 🧠 Clawd Memory

**Local-first persistent memory for Solana agents.**  
SQLite + FTS5 · zero cloud · works offline · TypeScript-native.

```
$CLAWD: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
```

---

## Install in one command

```bash
curl -fsSL https://solanaclawd.com/memory/install.sh | bash
```

Or install manually:

```bash
npm install -g @openclawdsolana/clawd-memory
cm init
```

**Requirements:** Node.js ≥ 20 · no Python · no cloud accounts.

---

## CLI (`cm`)

```bash
# Store a memory
cm remember "Helius RPC" "Use Helius for reliable Solana RPC calls" --kind research

# Search memories
cm recall "helius rpc"

# Get a context block for your agent prompt
cm context "what do I know about wallets?"

# Check stats
cm status

# Delete a memory
cm forget mem_01ABC...
```

### Memory kinds

| Kind | What to store |
|---|---|
| `agent` | Operating rules, user preferences, workflow decisions |
| `research` | URLs, protocol notes, market structure |
| `signal` | Market, social, token, infra signals |
| `trade` | Trade plans, entry/exit rationale, review notes |
| `protocol` | Solana protocol knowledge, integration notes |
| `wallet` | Wallet labels, behavior, portfolio context |
| `perp` | Perpetual venue risk, funding, liquidation notes |
| `note` | General (default) |

### Flags

```
--kind   <kind>   Memory kind (see table above)
--bank   <name>   Memory bank (default: "default")
--top    <n>      Number of recall results (default: 8)
--tags   <a,b,c>  Comma-separated tags
```

---

## TypeScript API

```typescript
import { remember, recall, getContext, stats } from '@openclawdsolana/clawd-memory'

// Store a memory
const entry = remember({
  title: 'Helius RPC',
  content: 'Use Helius for reliable Solana RPC — mainnet-beta endpoint',
  kind: 'research',
  tags: ['solana', 'rpc', 'helius'],
})

// Search
const result = recall({ query: 'helius rpc', topK: 5 })
for (const m of result.entries) {
  console.log(m.title, m.content)
}

// Get a formatted context block (drop into your system prompt)
const ctx = getContext('what do I know about Solana wallets?')
console.log(ctx)

// Stats
const s = stats()
console.log(`${s.total} memories in ${s.dbPath}`)
```

### Use with the OODA loop

```typescript
import { remember, recall, journalOoda } from '@openclawdsolana/clawd-memory'

// Observe phase — recall relevant context
const ctx = getContext('current solana market conditions')

// Act phase — store what you learned
remember({
  title: 'SOL price observation',
  content: 'SOL trading at $180, volume elevated, Helius indexing lag detected',
  kind: 'signal',
  tags: ['sol', 'price', 'ooda'],
})

// Journal the OODA tick
journalOoda('act', 'Executed rebalance after observing elevated SOL volume')
```

---

## Storage

All memories are stored locally in SQLite:

```
~/.clawd/memory/
├── memory.db          # default bank
└── banks/
    ├── trading/       # named bank: cm --bank trading
    └── research/      # named bank: cm --bank research
```

Override the data directory:

```bash
export CLAWD_MEMORY_DIR=/my/custom/path
```

---

## Architecture

Clawd Memory is a TypeScript-native simplification of the [MemeBRain](../MemeBRain) Python system. It implements the core **BEAM loop** (Bilevel Episodic-Associative Memory):

- **Working memory** — hot, recent context (auto-capped at 20 entries)
- **Episodic memory** — long-term SQLite + FTS5 full-text search
- **OODA journal** — timestamped agent tick records

For the full Python implementation with vector embeddings, LLM extraction, and Hermes plugin support, see [MemeBRain](../MemeBRain).

---

## Part of OpenClawd

- [`@openclawdsolana/leviathan`](https://npmjs.com/package/@openclawdsolana/leviathan) — full agent runtime
- [`@openclawdsolana/clawd-memory`](https://npmjs.com/package/@openclawdsolana/clawd-memory) — this package
- [`@mawdbotsonsolana/nanohub`](https://npmjs.com/package/@mawdbotsonsolana/nanohub) — skills hub CLI

MIT License · [solanaclawd.com](https://solanaclawd.com)
