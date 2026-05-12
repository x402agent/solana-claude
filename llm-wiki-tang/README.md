# Clawd Vault

[![Package](https://img.shields.io/badge/module-solana--clawd-orange)](../README.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](https://opensource.org/licenses/Apache-2.0)

Clawd Vault turns raw documents into a living Solana research wiki. Upload whitepapers, wallet notes, governance posts, screenshots, and execution logs; then connect `solana-clawd` over MCP so the agent can search, read, write, and maintain structured pages for tokens, wallets, protocols, and strategies.

![Clawd Vault — a compiled wiki page with citations and table of contents](wiki-page.png)

## What ships here

- `web/`: Next.js dashboard for auth, uploads, browsing, and wiki rendering
- `api/`: FastAPI backend for auth, uploads, OCR/document ingestion, and persistence
- `mcp/`: MCP server that exposes `guide`, `search`, `read`, `write`, and `delete`
- `converter/`: isolated Office-to-PDF conversion microservice
- `supabase/migrations/`: Postgres schema and RLS setup
- `tests/`: unit and integration coverage for parser, chunker, and API isolation

## Demo architecture

```text
Next.js web  ->  FastAPI API  ->  Postgres / Supabase
                    |
                    +-> S3-compatible storage
                    |
                    +-> MCP server for solana-clawd
                    |
                    +-> optional converter for Office docs
```

## Hackathon quickstart

### Prerequisites

- Node.js 20 or 22
- npm 10+
- Python 3.11+
- Docker
- A Supabase project for auth, or equivalent env values for local development
- An S3-compatible bucket if you want real uploads beyond local API bring-up

`.nvmrc` pins Node `22`. Avoid Node `25`; the current Next.js toolchain in this repo is not validated there.

### 1. Start Postgres

From this directory:

```bash
docker compose up -d
```

This starts a local Postgres instance on `localhost:5432` and automatically applies [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).

### 2. Configure environment

```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

Minimum values to change:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If you are only demoing API health, page rendering, and local flows, you can leave OCR and S3 credentials empty. Upload processing needs the S3 variables filled in.

### 3. Run the API

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

### 4. Run the MCP server

In another shell:

```bash
cd mcp
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8080
```

Health check:

```bash
curl http://localhost:8080/health
```

### 5. Run the web app

In another shell:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

### 6. Optional converter service

Only needed for `doc`, `docx`, `ppt`, and `pptx` ingestion.

```bash
cd converter
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8090
```

Set `CONVERTER_URL=http://localhost:8090` in `.env`.

## Connecting solana-clawd

Point your MCP client at:

```text
http://localhost:8080/mcp
```

After auth, the agent can:

- `guide`: explain the workflow and list knowledge bases
- `search`: keyword search or list files
- `read`: read pages, PDFs, images, and matched paths
- `write`: create or edit wiki pages and assets
- `delete`: archive pages by path or glob

## Tests

Install the Python test dependencies and start the dedicated test database:

```bash
python -m pip install -r tests/requirements.txt -r api/requirements.txt
docker compose -f docker-compose.test.yml up -d
pytest
```

The test suite expects Postgres on `localhost:5434` and seeds schema from [`tests/helpers/schema.sql`](tests/helpers/schema.sql).

## Deployment notes

- `web/`, `api/`, `mcp/`, and `converter/` each include a `Dockerfile`
- `api/`, `mcp/`, and `converter/` each include `railway.toml`
- `netlify.toml` is included for the frontend

For a hackathon demo, the smallest stable deploy is:

1. Netlify or Railway for `web/`
2. Railway for `api/`
3. Railway for `mcp/`
4. Managed Postgres/Supabase
5. S3 or R2 for storage

## Current known constraints

- Upload processing depends on S3-compatible storage and optional OCR credentials
- Office document conversion requires LibreOffice in the converter container/runtime
- The frontend package is validated for Node 20/22, not bleeding-edge Node 25

## License

Apache 2.0
