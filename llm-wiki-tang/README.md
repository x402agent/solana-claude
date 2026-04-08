# Clawd Vault

[![Package](https://img.shields.io/badge/module-solana--clawd-orange)](../README.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](https://opensource.org/licenses/Apache-2.0)

`llm-wiki-tang/` has been adapted into **Clawd Vault**: a Solana-native research vault for financial agents, trading workflows, and blockchain intelligence inside the `solana-clawd` build.

1. **Upload sources** — whitepapers, wallet exports, PDF research, governance docs, token dashboards, and trade journals.
2. **Connect Clawd** — via MCP. It reads your sources, writes vault pages, maintains cross-references, citations, and research logs.
3. **The vault compounds** — every new filing, wallet trace, strategy memo, and market question strengthens the knowledge base instead of resetting the analysis every time.

![Clawd Vault — a compiled wiki page with citations and table of contents](wiki-page.png)

### Three Layers

| Layer | Description |
|-------|-------------|
| **Raw Sources** | Whitepapers, filings, wallet notes, screenshots, DEX research, governance posts, transcripts. Immutable source of truth. |
| **The Vault** | LLM-generated markdown pages: token dossiers, protocol pages, wallet profiles, strategy memos, timelines, diagrams, tables. |
| **The Tools** | Search, read, write, and delete. Clawd connects through MCP and orchestrates the rest. |

### Core Operations

Clawd Vault ships an **MCP server** that `solana-clawd` clients can connect to directly. Once connected, the agent has tools to search, read, write, and delete across your research vault. You talk to the agent; it maintains the dossier.

**Ingest** — Drop in a source. The agent reads it, writes a summary, updates token, wallet, protocol, and strategy pages, and flags contradictions against existing theses.

**Query** — Ask complex questions across the compiled vault. Knowledge is already synthesized, linked, and citation-aware instead of being re-derived from chunks on every request.

**Lint** — Run health checks. Find stale theses, orphan pages, unsupported claims, missing links between tokens and protocols, and gaps in the research graph.

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   FastAPI   │────▶│  Supabase   │
│ Clawd Vault │     │   Backend   │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  MCP Server │◀──── solana-clawd
                    └─────────────┘
```

| Component | Stack | Responsibilities |
|-----------|-------|------------------|
| **Web** (`web/`) | Next.js 16, React 19, Tailwind, Radix UI | Dashboard, PDF/HTML viewer, wiki renderer, onboarding |
| **API** (`api/`) | FastAPI, asyncpg, aioboto3 | Auth, uploads, document processing, OCR, research-vault persistence |
| **Converter** (`converter/`) | FastAPI, LibreOffice | Isolated office-to-PDF conversion for office docs |
| **MCP** (`mcp/`) | MCP SDK, Supabase OAuth | Tools for Clawd: `guide`, `search`, `read`, `write`, `delete` |
| **Database** | Supabase (Postgres + RLS + PGroonga) | Documents, chunks, knowledge bases, users |
| **Storage** | S3-compatible | Raw uploads, extracted images, research assets |

---

## MCP Tools

Once connected, Clawd has full access to your research vault:

| Tool | Description |
|------|-------------|
| `guide` | Explains the Solana research workflow and lists available knowledge bases |
| `search` | Browse files (`list`) or keyword search with PGroonga ranking (`search`) |
| `read` | Read documents — PDFs with page ranges, inline images, glob batch reads |
| `write` | Create dossier pages, edit with `str_replace`, append. SVG and CSV asset support |
| `delete` | Archive documents by path or glob pattern |

---

## Getting Started

The fastest way to use Clawd Vault is inside this repo:

1. Start the API, MCP server, and web app locally
2. Create a knowledge base for a token, wallet cluster, protocol sector, or trading strategy
3. Upload sources such as PDFs, research notes, and wallet evidence
4. Connect `solana-clawd` through MCP and ask it to compile the vault

### Self-Hosting

#### Prerequisites

- Python 3.11+
- Node.js 20+
- A [Supabase](https://supabase.com) project (or local Docker setup)
- An S3-compatible bucket for uploaded research sources

#### 1. Database

```bash
psql $DATABASE_URL -f supabase/migrations/001_initial.sql
```

Or use local Docker: `docker compose up -d`

#### 2. API

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn main:app --reload --port 8000
```

#### 3. MCP Server

```bash
cd mcp
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8080
```

#### 4. Web

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

#### 5. Connect Clawd

1. Open **Settings** > **Connectors** in your MCP client
2. Add a custom connector pointing to `http://localhost:8080/mcp`
3. Sign in with your Supabase account when prompted

#### Environment Variables

**API** (`api/.env`)

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_JWT_SECRET=
VOYAGE_API_KEY=
TURBOPUFFER_API_KEY=
MISTRAL_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=clawdvault-documents
APP_URL=http://localhost:3000
CONVERTER_URL=
```

**Web** (`web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MCP_URL=http://localhost:8080/mcp
```

---

## Why This Works

The hard part of maintaining a trading research vault is not gathering information. It is keeping token pages, wallet theses, protocol risks, catalyst timelines, and contradictory claims in sync as the market moves.

Humans are bad at maintaining that graph by hand. Agents are not. They can update ten pages after one new filing, propagate a changed thesis across a strategy page and a token dossier, and keep the vault coherent over time.

Your job is to curate sources, set the research standard, and decide what matters. The agent's job is the bookkeeping, synthesis, and maintenance.

## License

Apache 2.0
