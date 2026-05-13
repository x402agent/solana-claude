# Clawd Memory Architecture

Clawd Memory is a local-first memory system for agents. It keeps the user-facing workflow Clawd-native while reusing the existing Mnemosyne SQLite engine for persistence, BEAM tiers, search, and integrations.

## Layers

```text
Clawd agents
    |
    | recall / remember / research / ingest-ooda
    v
ClawdBrain
    |
    | writes markdown notes, metadata, links, and memory entries
    v
Clawd vault + index
    |
    | note lookup, kind/source/tag filtering
    v
Mnemosyne engine
    |
    | working memory, episodic memory, scratchpad, triples
    v
SQLite files
```

## Clawd Brain Layer

The Clawd layer lives in `mnemosyne.clawd_brain`.

Key defaults:

| Setting | Default |
|---|---|
| Bank | `clawd` |
| Session | `clawd-brain` |
| Vault env var | `CLAWD_BRAIN_VAULT` |
| Vault path | `MemeBRain/vault` |
| Index database | `vault/90-indexes/clawd-brain.db` |

The vault layout is created on `init`:

```text
00-inbox/
10-research/
20-signals/
30-trades/
40-agents/
50-protocols/
60-wallets/
70-perps/
90-indexes/
```

Each Clawd note gets frontmatter, tags, kind, source, timestamps, an optional memory ID, and wiki link extraction. The index database tracks notes and links so recall can return both engine memories and matching vault notes.

## BEAM Engine

The underlying engine uses BEAM: Bilevel Episodic-Associative Memory.

```text
Working memory
    hot session/global context, TTL-based eviction, prompt injection

Episodic memory
    long-term consolidated memory, hybrid vector/FTS/importance recall

Scratchpad
    temporary reasoning workspace, not durable knowledge

Triples
    temporal subject-predicate-object facts with valid_from/valid_until
```

The engine is still imported as `mnemosyne`. That name is an implementation detail for Clawd docs unless you are writing Python against the lower-level API.

## Recall Pipeline

Clawd recall combines two sources:

1. Engine recall through `Mnemosyne.recall(query, top_k)`.
2. Vault lookup through the Clawd note index.

The engine pipeline can use:

- SQLite FTS5 for lexical search.
- sqlite-vec or fallback vector search for semantic search.
- Importance scores for agent-weighted memories.
- Recency and metadata filters in lower-level APIs.

The Clawd layer adds Solana-aware tags, note kinds, markdown links, and durable source metadata.

## Remember Pipeline

```text
remember(title, content, kind, source, tags, importance)
    |
    | detect domain tags and wiki links
    | write markdown note to vault folder for kind
    | write memory to default clawd bank
    | update vault index database
    v
JSON result with note path, tags, memory ID, and timestamps
```

Agents should remember durable state only. Temporary chain-of-thought, raw logs, and secrets do not belong in durable memory.

## Research Pipeline

```text
research(target)
    |
    | if target is URL: fetch title and readable text snippet
    | if target is topic: create queued research note
    | tag and index the note
    | store the summary as memory
    v
reusable research artifact
```

Use this for Solana protocol docs, x402/AP2 notes, venue risk, wallet investigations, and reusable agent research.

## OODA Ingestion

`ingest-ooda` reads an OODA journal JSONL file and converts observations into Clawd memory. This is how operational loops become durable context for later planning.

Default journal path:

```text
../ooda/journal/ticks.jsonl
```

## Persistence

Clawd Memory persists locally:

| Store | Purpose |
|---|---|
| `MemeBRain/vault` | Human-readable markdown research and memory notes |
| `vault/90-indexes/clawd-brain.db` | Note and wiki link index |
| `MNEMOSYNE_DATA_DIR` | Engine SQLite databases and named banks |
| `~/.hermes/mnemosyne/data` | Default engine data directory when unset |

Back up both the vault and engine data directory if you want a complete Clawd brain backup.

## Compatibility Boundaries

Do not rename these without a migration plan:

| Name | Why it stays |
|---|---|
| `mnemosyne-memory` | Published package/distribution name |
| `mnemosyne` | Python import path used across code and integrations |
| `mnemosyne_*` tools | Hermes/MCP compatibility surface |
| `MNEMOSYNE_*` env vars | Engine configuration |

Use these for new Clawd-facing workflows:

| Name | Purpose |
|---|---|
| `clawd-brain` | CLI |
| `ClawdBrain` | Python API |
| `CLAWD_BRAIN_VAULT` | Clawd vault override |
| `clawd` | Default memory bank |
