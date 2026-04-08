from mcp.server.fastmcp import FastMCP, Context

from config import settings
from db import scoped_query
from .helpers import get_user_id

GUIDE_TEXT = """# Clawd Vault — How It Works

You are connected to **Clawd Vault** — a Solana research workspace where you compile and maintain a structured knowledge vault from raw source documents.

## Architecture

1. **Raw Sources** (path: `/`) — uploaded documents, PDFs, notes, screenshots, spreadsheets, wallet exports, and research logs. Source of truth. Read-only.
2. **Compiled Vault** (path: `/wiki/`) — markdown pages YOU create and maintain. This is where token dossiers, protocol notes, wallet pages, and strategy memos live.
3. **Tools** — `search`, `read`, `write`, `delete` — your interface to both layers.

## Vault Structure

Every vault should use a consistent structure. These categories are the backbone of the research graph.

### Overview (`/wiki/overview.md`) — THE HUB PAGE
Always exists. This is the front page of the vault. It must contain:
- A summary of what this vault covers and its scope
- **Source count** and page count (update on every ingest)
- **Key Findings** — highest-signal market, protocol, wallet, and risk insights
- **Recent Updates** — last 5-10 actions (ingests, new pages, revisions, thesis changes)

Update the Overview after EVERY ingest or major edit. If you only update one page, it should be this one.

### Tokens (`/wiki/tokens/`) — TRADED ASSETS
Pages for SPL tokens, majors, memecoins, and ecosystem assets.
- `/wiki/tokens/bonk.md`
- `/wiki/tokens/jup.md`
- `/wiki/tokens/wif.md`

Each token page should: summarize the asset, note catalysts, liquidity venues, risk factors, holder concentration, and cite sources.

### Protocols (`/wiki/protocols/`) — APPS AND INFRA
Pages for DEXes, staking systems, perps, lending markets, and infra providers.
- `/wiki/protocols/jupiter.md`
- `/wiki/protocols/raydium.md`
- `/wiki/protocols/helius.md`

Each protocol page should: describe what it does, why it matters, notable risks, metrics, integrations, and related tokens.

### Wallets (`/wiki/wallets/`) — PARTICIPANTS AND FLOWS
Pages for tracked wallets, smart-money clusters, treasury addresses, deployers, and suspicious entities.
- `/wiki/wallets/smart-money-cluster-a.md`
- `/wiki/wallets/market-maker-watchlist.md`

Each wallet page should: summarize activity, holdings, historical behavior, linked tokens/protocols, and confidence level.

### Strategies (`/wiki/strategies/`) — PLAYBOOKS AND THESIS
Pages for setups, risk frameworks, execution plans, and recurring trade patterns.
- `/wiki/strategies/meme-rotation-playbook.md`
- `/wiki/strategies/post-tge-distribution-checklist.md`

Each strategy page should: define the setup, the trigger conditions, invalidation, evidence, and operational notes.

### Log (`/wiki/log.md`) — CHRONOLOGICAL RECORD
Always exists. Append-only. Records every ingest, major edit, and lint pass. Never delete entries.

Format — each entry starts with a parseable header:
```
## [YYYY-MM-DD] ingest | Source Title
- Created token page: [Page Title](tokens/page.md)
- Updated protocol page: [Page Title](protocols/page.md)
- Updated overview with new findings
- Key takeaway: one sentence summary

## [YYYY-MM-DD] query | Question Asked
- Created new page: [Page Title](strategies/page.md)
- Finding: one sentence answer

## [YYYY-MM-DD] lint | Health Check
- Fixed contradiction between token thesis and wallet evidence
- Added missing cross-reference between token and protocol pages
```

### Additional Pages
You can create pages outside of tokens/, protocols/, wallets/, and strategies/ when needed:
- `/wiki/comparisons/sol-vs-eth-liquidity.md`
- `/wiki/timeline.md`
- `/wiki/watchlists/high-conviction.md`

But tokens/, protocols/, wallets/, and strategies/ are the primary categories. When in doubt, file there.

## Writing Standards

**Vault pages must be substantially richer than a chat response.** They are persistent, curated artifacts.

### Structure
- Start with a summary paragraph (no H1 — the title is rendered by the UI)
- Use `##` for major sections, `###` for subsections
- One idea per section. Bullet points for facts, prose for synthesis.

### Visual Elements — MANDATORY

**Every vault page MUST include at least one visual element.** A page with only prose is incomplete.

Use:
- **Mermaid diagrams** for flows, dependencies, decision trees, or wallet/protocol relationships
- **Tables** for comparisons, metrics, risk matrices, timelines, holder distributions
- **SVG assets** for custom visuals Mermaid cannot express

Create SVGs with:
`write(command="create", path="/wiki/", title="diagram.svg", content="<svg>...</svg>", tags=["diagram"])`

### Citations — REQUIRED

Every factual claim MUST cite its source via markdown footnotes:
```
Jupiter remains the dominant swap router on Solana[^1].

[^1]: jupiter-report.pdf, p.4-6
```

Rules:
- Use the FULL source filename
- Add page numbers for PDFs when available
- One citation per claim
- Prefer source-backed claims over unsupported synthesis

### Cross-References
Link between vault pages using standard markdown links to other wiki paths.

## Core Workflows

### Ingest a New Source
1. Read it: `read(path="source.pdf", pages="1-10")`
2. Discuss key takeaways with the user
3. Create or update **token**, **protocol**, **wallet**, or **strategy** pages under `/wiki/`
4. Update `/wiki/overview.md`
5. Append an entry to `/wiki/log.md`

### Answer a Question
1. `search(mode="search", query="term")` to find relevant content
2. Read relevant vault pages and sources
3. Synthesize with citations
4. If the answer is valuable, file it as a new vault page
5. Append a query entry to `/wiki/log.md`

### Maintain the Vault (Lint)
Check for: contradictions, orphan pages, missing cross-references, stale claims, token pages without protocol context, wallet pages without evidence, and unsupported strategy assertions. Append a lint entry to `/wiki/log.md`.

## Available Knowledge Bases

"""


def register(mcp: FastMCP) -> None:

    @mcp.tool(
        name="guide",
        description="Get started with Clawd Vault. Call this to understand the Solana research workflow and see your available knowledge bases.",
    )
    async def guide(ctx: Context) -> str:
        user_id = get_user_id(ctx)
        kbs = await scoped_query(
            user_id,
            "SELECT name, slug, "
            "  (SELECT count(*) FROM documents d WHERE d.knowledge_base_id = kb.id AND d.path NOT LIKE '/wiki/%%' AND NOT d.archived) as source_count, "
            "  (SELECT count(*) FROM documents d WHERE d.knowledge_base_id = kb.id AND d.path LIKE '/wiki/%%' AND NOT d.archived) as wiki_count "
            "FROM knowledge_bases kb ORDER BY created_at DESC",
        )
        if not kbs:
            return GUIDE_TEXT + "No knowledge bases yet. Create one at " + settings.APP_URL + "/wikis"

        lines = []
        for kb in kbs:
            lines.append(f"- **{kb['name']}** (`{kb['slug']}`) — {kb['source_count']} sources, {kb['wiki_count']} wiki pages")
        return GUIDE_TEXT + "\n".join(lines)
