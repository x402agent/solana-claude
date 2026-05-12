# Mnemosyne Cross-Provider Importers — Implementation Plan

**Date:** 2026-05-02
**Author:** 0x90 / Abdias J.

## Goal

Build a provider-agnostic import system so users can migrate from any major memory provider into Mnemosyne with a single command. Cover both programmatic extraction (APIs) and agentic extraction (LLM-guided migration for providers without export APIs).

---

## Phase 0: Research Summary

### Provider Matrix

| Provider | Storage | Has Export API? | Extraction Method | Mnemosyne Mapping |
|---|---|---|---|---|
| **Honcho** | PostgreSQL + pgvector | No bulk export | API: iterate sessions → `context()` | Peer → author_id, Session → session_id, Message → content |
| **Mem0** | 24 vector stores, SQLite history | `get_all()` paginated, `create_memory_export()` structured | API: paginate `get_all()` | user_id/agent_id → author_id, metadata → metadata, memory → content |
| **Zep** | Cloud-only (Neo4j graph) | No bulk export | API: list users → list sessions → `memory.get(session_id)` per session | user_id → author_id, session_id → session_id, messages → content |
| **Cognee** | Kùzu graph + LanceDB vectors + SQLite | `get_graph_data()` programmatic, `visualize_graph()` HTML | Direct: `get_graph_data()` → nodes/edges | nodes → episodic, edges → triples |
| **Letta** | PostgreSQL + pgvector | `.af` AgentFile export format | Direct: `export_file()` API | blocks → working_memory per block, archival → episodic with source="letta" |
| **SuperMemory** | Cloud API | No bulk export | API: search + documents.list() | documents → content, containerTag → channel_id |

### Provider Priority (by popularity + ease)

1. **Mem0** — most popular, best export API, highest ROI
2. **Letta** — clean `.af` format, dedicated migration tooling
3. **Zep** — enterprise, high demand despite tedious extraction
4. **Cognee** — graph-based, maps well to Mnemosyne triples
5. **Honcho** — straightforward entity model, PostgreSQL
6. **SuperMemory** — documented migrations from others already exist

---

## Phase 1: Core Importer Architecture

### 1.1 Module Structure

```
mnemosyne/core/importers/
├── __init__.py          # Public API: import_from_provider(), list_providers()
├── base.py              # BaseImporter abstract class
├── mem0.py              # Mem0 importer
├── letta.py             # Letta importer
├── zep.py               # Zep importer
├── cognee.py            # Cognee importer
├── honcho.py            # Honcho importer
├── supermemory.py       # SuperMemory importer
└── agentic.py           # Agentic/LLM-guided fallback importer
```

### 1.2 BaseImporter Class

```python
class BaseImporter(ABC):
    """Base class for all memory provider importers."""
    
    provider_name: str   # e.g., "mem0", "zep"
    
    @abstractmethod
    def extract(self, **kwargs) -> List[Dict]:
        """Extract all memories from the source provider.
        Returns list of dicts with keys: content, source, importance, metadata, timestamp, author_id, author_type, channel_id
        """
    
    @abstractmethod
    def validate(self, data: List[Dict]) -> bool:
        """Validate extracted data before import."""
    
    @abstractmethod
    def transform(self, raw_data) -> List[Dict]:
        """Transform provider-specific format to Mnemosyne-compatible format."""

class ImporterResult:
    total: int
    imported: int
    skipped: int
    failed: int
    errors: List[str]
    memory_ids: List[str]
```

### 1.3 CLI Integration

Add to `hermes_memory_provider/cli.py`:

```bash
# Import from a provider
hermes mnemosyne import --from mem0 --api-key sk-xxx [--user-id alice] [--dry-run]

# Import from a JSON export file (pre-exported data)
hermes mnemosyne import --from mem0 --file export.json [--dry-run]

# Import via agentic extraction (LLM-guided)
hermes mnemosyne import --from zep --api-key sk-xxx --agentic [--dry-run]

# List supported importers
hermes mnemosyne import --list

# Agentic migration: generate a migration script for the user's provider
hermes mnemosyne import --from <provider> --agentic --generate-script
```

### 1.4 Provider-Specific Importer Details

#### Mem0 Importer (`mem0.py`)
- **Extraction:** Use `client.get_all(filters={"user_id": "*"}, page=N, page_size=200)` with pagination loop
- **Alternative:** If platform API, use `create_memory_export()` for structured export
- **Mapping:**
  - `memory` → `content`
  - `user_id` / `agent_id` → `author_id` (prefixed: `mem0_user:alice`)
  - `metadata` → `metadata`
  - `categories` → stored as metadata tags
  - `created_at` → `timestamp`
  - `app_id` → `channel_id`
  - Inferred `importance` from metadata or default 0.5

#### Letta Importer (`letta.py`)
- **Extraction:** Use `client.agents.export_file(agent_id)` to get `.af` file
- **Parse AgentFile format:** Memory blocks → per-block working_memory entries
- **Archival memory:** Retrieve via SDK search, batch import as episodic memories
- **Mapping:**
  - Memory block `label` + `value` → `content` (formatted: `[{label}] {value}`)
  - `block_id` → preserved in metadata
  - Message history → `source="letta_message"`
  - Agent ID → `author_id`

#### Zep Importer (`zep.py`)
- **Extraction:** Three-step iterator:
  1. `client.user.list_ordered()` → get all users
  2. For each user: `client.user.get_sessions(user_id)` → get all sessions
  3. For each session: `client.memory.get(session_id)` → messages + facts + summary
- **Mapping:**
  - Messages → individual memories with `source="zep_message"`, `author_id=role`, `timestamp=created_at`
  - Summary → single memory with `importance=0.8`, `source="zep_summary"`
  - Relevant facts (edges) → triples via `mnemosyne_triple_add()`
  - `user_id` → `channel_id`
  - `session_id` → preserved in metadata

#### Cognee Importer (`cognee.py`)
- **Extraction:** Use `graph_db.get_graph_data()` for full node/edge dump
- **Alternative:** REST API `GET /datasets/{id}/data` for document-level
- **Mapping:**
  - Nodes → episodic memories (enriched with graph properties)
  - Edges → triples via `subject → predicate → object`
  - Node `type` → `author_type`
  - Dataset ID → `channel_id`

#### Honcho Importer (`honcho.py`)
- **Extraction:** 
  1. List peers via SDK
  2. For each peer: list sessions → get `context()` with summary
  3. For each session: get messages
- **Mapping:**
  - Messages → `content` with `source="honcho_message"`
  - Peer ID → `author_id`
  - Session ID → preserved in metadata
  - Summary → episodic with `importance=0.7`
  - Workspace ID → `channel_id`

#### SuperMemory Importer (`supermemory.py`)
- **Extraction:** Use `client.documents.list()` + `client.search.execute()` per container tag
- **Mapping:**
  - Document content → `content`
  - `containerTag` → `channel_id`
  - `metadata` → `metadata`
  - `isStatic` → `importance=0.9` if static, else 0.5

### 1.5 Agentic Importer (`agentic.py`)

For providers without programmatic export, or when the user can't access the API directly:

```python
class AgenticImporter:
    """LLM-guided migration: generate instructions and scripts for the user's provider.
    
    For any provider not natively supported, this generates:
    1. A Python script the user can run in THEIR environment
    2. Step-by-step instructions for manual export
    3. Instructions the user can give to THEIR AI agent to perform the migration
    """
    
    def generate_migration_script(self, provider: str, provider_docs_url: str) -> str:
        """Use LLM to generate a migration script based on the provider's docs."""
    
    def generate_agent_instructions(self, provider: str) -> str:
        """Generate instructions the user can paste to their AI agent."""
    
    def process_agent_output(self, output_json_path: str) -> ImporterResult:
        """Import data that was extracted by the user's agent."""
```

This covers the "agentic extraction" use case:
- User tells THEIR agent (Claude, ChatGPT, etc.) to export memories from Provider X
- Agent follows Mnemosyne-provided instructions to produce a JSON file
- User runs `hermes mnemosyne import --file export.json` to ingest

---

## Phase 2: Documentation Layer

### 2.1 Project Repo Updates

#### `README.md`
- Add "Migration from Other Providers" section
- Quick-start table: provider → command
- Link to full migration docs

#### `CHANGELOG.md`
- Entry for migration feature

#### `mnemosyne/__init__.py`
- Bump version (2.2 or 2.1.1)

### 2.2 Documentation Site (`mnemosyne-docs`)

New pages:
- `content/migration/overview.mdx` — Migration philosophy, supported providers, quick comparison
- `content/migration/from-mem0.mdx` — Step-by-step Mem0 migration
- `content/migration/from-letta.mdx` — Step-by-step Letta migration
- `content/migration/from-zep.mdx` — Step-by-step Zep migration
- `content/migration/from-cognee.mdx` — Step-by-step Cognee migration
- `content/migration/from-honcho.mdx` — Step-by-step Honcho migration
- `content/migration/from-supermemory.mdx` — Step-by-step SuperMemory migration
- `content/migration/agentic-migration.mdx` — How to use agentic extraction for any provider
- `content/migration/mapping-reference.mdx` — Field mapping reference table

Update:
- `content/navigation.tsx` / sidebar config
- `content/use-cases/overview.mdx` — add migration use case

### 2.3 Website (`mnemosyne-website`)

- Add "Migrate from Any Provider" section to homepage
- Update comparison table to include migration capability as differentiator
- Add migration destination to navigation
- Version badge bump

---

## Phase 3: Testing

### 3.1 Unit Tests (`tests/test_importers/`)

```
tests/test_importers/
├── test_base.py              # BaseImporter interface tests
├── test_mem0.py              # Mem0 transformation tests
├── test_letta.py             # Letta AgentFile parsing tests
├── test_zep.py               # Zep extraction logic tests
├── test_cognee.py            # Cognee graph conversion tests
├── test_honcho.py            # Honcho extraction tests
├── test_supermemory.py       # SuperMemory transformation tests
├── test_agentic.py           # Agentic script generation tests
└── fixtures/                 # Sample export data for each provider
    ├── mem0_export.json
    ├── letta_agent.af
    ├── zep_session.json
    └── ...
```

### 3.2 Test Strategy
- Mock API responses for each provider
- Test transform() with known fixtures
- Test error handling (rate limits, auth failures, empty datasets)
- Test idempotency (running import twice shouldn't duplicate)
- Test dry-run mode
- Integration: end-to-end with a real Mem0 sandbox account

---

## Phase 4: Implementation Order

### Wave 1: Foundation + Mem0 (highest impact)
1. Create `mnemosyne/core/importers/__init__.py` + `base.py`
2. Implement Mem0 importer (`mem0.py`)
3. Wire CLI: `hermes mnemosyne import --from mem0`
4. Mem0 fixture data + unit tests
5. Mem0 migration docs page

### Wave 2: Letta + Zep (agent-focused)
6. Implement Letta importer (`.af` parsing)
7. Implement Zep importer (session iterator)
8. CLI: add `--from letta` and `--from zep`
9. Tests + fixture data
10. Letta + Zep migration docs pages

### Wave 3: Cognee + Honcho + SuperMemory
11. Implement Cognee, Honcho, SuperMemory importers
12. CLI: add remaining providers
13. Tests + fixtures
14. Remaining docs pages

### Wave 4: Agentic + Polish
15. Implement `agentic.py` — script generation + agent instructions
16. CLI: `--agentic` flag and `--generate-script`
17. Agentic migration docs page
18. Overview/mapping-reference docs pages
19. Website updates
20. README + CHANGELOG updates

---

## Files to Change

| Repo | File | Change |
|---|---|---|
| **mnemosyne** | `mnemosyne/core/importers/*` | New module (8-9 files) |
| **mnemosyne** | `hermes_memory_provider/cli.py` | Add `import` subcommand |
| **mnemosyne** | `hermes_memory_provider/__init__.py` | Register import tool |
| **mnemosyne** | `hermes_plugin/tools.py` | Add `mnemosyne_import` schema + handler |
| **mnemosyne** | `hermes_plugin/plugin.yaml` | Register `mnemosyne_import` tool |
| **mnemosyne** | `hermes_plugin/__init__.py` | Wire import tool registration |
| **mnemosyne** | `README.md` | Migration section |
| **mnemosyne** | `CHANGELOG.md` | Entry |
| **mnemosyne** | `mnemosyne/__init__.py` | Version bump |
| **mnemosyne** | `tests/test_importers/*` | New test module |
| **mnemosyne-docs** | `content/migration/*.mdx` | 9 new doc pages |
| **mnemosyne-docs** | Navigation config | Add migration section |
| **mnemosyne-website** | Homepage | Migration section |
| **mnemosyne-website** | Comparison | Add migration row |
| **mnemosyne-website** | Version | Bump badge |

---

## Risks & Open Questions

1. **API key management:** Importers need provider API keys. Store in env vars (`MEM0_API_KEY`, `ZEP_API_KEY`, etc.) — never in code.
2. **Rate limiting:** Mem0's `get_all()` is paginated (200/page). Large datasets could take many requests. Add progress bar and checkpointing.
3. **Zep's cloud-only limitation:** No self-hosted Zep means testing requires a cloud account. Use mock fixtures for unit tests.
4. **Letta's AgentFile format:** The `.af` format is relatively new (v1.0). Need to handle version drift.
5. **Cognee's graph complexity:** Mapping graphs to flat triples loses relational structure. Document this tradeoff.
6. **Deduplication:** If user imports twice, we need dedup. Use content hash + source provider to detect duplicates.
7. **Importance inference:** Most providers don't have an importance score. Infer from metadata or use default 0.5.
