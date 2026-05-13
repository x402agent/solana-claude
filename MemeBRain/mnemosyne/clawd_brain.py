"""
Clawd Brain - persistent Solana-native memory and wiki layer.

This module adapts Mnemosyne into the OpenClawd brain:
- durable SQLite bank named "clawd"
- Obsidian-compatible markdown vault with wiki links and frontmatter
- Solana, perpetual trading, OODA, x402, A2A, and agent harness metadata
- lightweight auto-research ingestion for URLs and research prompts
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from mnemosyne.core.banks import BankManager
from mnemosyne.core.memory import Mnemosyne


DEFAULT_BANK = "clawd"
DEFAULT_SESSION = "clawd-brain"
DEFAULT_VAULT_ENV = "CLAWD_BRAIN_VAULT"
DEFAULT_DATA_ENV = "MNEMOSYNE_DATA_DIR"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_VAULT = REPO_ROOT / "MemeBRain" / "vault"
OODA_JOURNAL = REPO_ROOT / "ooda" / "journal" / "ticks.jsonl"

DOMAIN_TAGS = {
    "solana",
    "clawd",
    "memecoin",
    "perp",
    "perpetual",
    "trading",
    "jupiter",
    "raydium",
    "orca",
    "meteora",
    "pumpfun",
    "helius",
    "metaplex",
    "x402",
    "a2a",
    "ap2",
    "mpp",
    "ooda",
    "risk",
    "agent",
    "wallet",
    "usdc",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str, fallback: str = "note") -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value[:96] or fallback


def checksum(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def extract_wiki_links(content: str) -> List[str]:
    links = re.findall(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", content)
    return sorted({link.strip() for link in links if link.strip()})


def detect_tags(content: str, extra: Iterable[str] = ()) -> List[str]:
    haystack = content.lower()
    tags = {tag for tag in DOMAIN_TAGS if tag in haystack}
    tags.update(t.strip().lower().replace("#", "") for t in extra if t.strip())
    return sorted(tags)


def yaml_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace('"', '\\"')
    return f'"{text}"'


def frontmatter(metadata: Dict[str, Any]) -> str:
    lines = ["---"]
    for key in sorted(metadata):
        value = metadata[key]
        if value is None:
            continue
        if isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {yaml_scalar(item)}")
        else:
            lines.append(f"{key}: {yaml_scalar(value)}")
    lines.append("---")
    return "\n".join(lines)


def strip_html(html: str) -> str:
    html = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
    html = re.sub(r"(?s)<[^>]+>", " ", html)
    html = re.sub(r"\s+", " ", html)
    return html.strip()


def html_title(html: str, fallback: str) -> str:
    match = re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
    if not match:
        return fallback
    return re.sub(r"\s+", " ", strip_html(match.group(1))).strip() or fallback


@dataclass
class BrainConfig:
    bank: str = DEFAULT_BANK
    session_id: str = DEFAULT_SESSION
    vault_path: Path = field(
        default_factory=lambda: Path(os.environ.get(DEFAULT_VAULT_ENV, DEFAULT_VAULT))
    )
    author_id: str = "openclawd"
    author_type: str = "agent"
    channel_id: str = "solana-clawd"


class ClawdBrain:
    """Persistent Clawd memory system backed by Mnemosyne and markdown files."""

    def __init__(self, config: Optional[BrainConfig] = None):
        self.config = config or BrainConfig()
        self.config.vault_path = Path(self.config.vault_path)
        self._ensure_layout()
        self.memory = self._open_memory()
        self._init_index_db()

    def _ensure_layout(self) -> None:
        for dirname in (
            "00-inbox",
            "10-research",
            "20-signals",
            "30-trades",
            "40-agents",
            "50-protocols",
            "60-wallets",
            "70-perps",
            "90-indexes",
        ):
            (self.config.vault_path / dirname).mkdir(parents=True, exist_ok=True)

    def _open_memory(self) -> Mnemosyne:
        manager = BankManager()
        if self.config.bank != "default" and not manager.bank_exists(self.config.bank):
            manager.create_bank(self.config.bank)
        return Mnemosyne(
            session_id=self.config.session_id,
            bank=self.config.bank,
            author_id=self.config.author_id,
            author_type=self.config.author_type,
            channel_id=self.config.channel_id,
        )

    @property
    def index_db_path(self) -> Path:
        return self.config.vault_path / "90-indexes" / "clawd-brain.db"

    def _init_index_db(self) -> None:
        with sqlite3.connect(self.index_db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    path TEXT NOT NULL UNIQUE,
                    kind TEXT NOT NULL,
                    source TEXT,
                    tags_json TEXT NOT NULL,
                    memory_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS links (
                    source_id TEXT NOT NULL,
                    target_title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (source_id, target_title)
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_kind ON notes(kind)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_source ON notes(source)")

    def _folder_for_kind(self, kind: str) -> str:
        return {
            "research": "10-research",
            "signal": "20-signals",
            "trade": "30-trades",
            "agent": "40-agents",
            "protocol": "50-protocols",
            "wallet": "60-wallets",
            "perp": "70-perps",
        }.get(kind, "00-inbox")

    def remember(
        self,
        title: str,
        content: str,
        *,
        kind: str = "note",
        source: str = "clawd",
        tags: Iterable[str] = (),
        metadata: Optional[Dict[str, Any]] = None,
        importance: float = 0.65,
    ) -> Dict[str, Any]:
        note_id = checksum(f"{kind}:{source}:{title}:{content}")
        created_at = utc_now()
        all_tags = detect_tags(f"{title}\n{content}", tags)
        note_metadata: Dict[str, Any] = {
            "id": note_id,
            "title": title,
            "kind": kind,
            "source": source,
            "created": created_at,
            "updated": created_at,
            "bank": self.config.bank,
            "chain": "solana",
            "tags": all_tags,
        }
        if metadata:
            note_metadata.update(metadata)

        folder = self._folder_for_kind(kind)
        filename = f"{slugify(title)}-{note_id}.md"
        path = self.config.vault_path / folder / filename
        body = f"{frontmatter(note_metadata)}\n\n# {title}\n\n{content.strip()}\n"
        path.write_text(body, encoding="utf-8")

        memory_text = (
            f"{title}\n\n{content.strip()}\n\n"
            f"Kind: {kind}. Source: {source}. Tags: {', '.join(all_tags)}. "
            f"Vault: {path.relative_to(self.config.vault_path)}."
        )
        memory_id = self.memory.remember(
            memory_text,
            source=f"clawd:{kind}:{source}",
            importance=importance,
            metadata={
                "note_id": note_id,
                "title": title,
                "kind": kind,
                "source": source,
                "tags": all_tags,
                "vault_path": str(path),
                **(metadata or {}),
            },
            scope="global",
            extract_entities=True,
        )

        links = extract_wiki_links(content)
        with sqlite3.connect(self.index_db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO notes
                (id, title, path, kind, source, tags_json, memory_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    note_id,
                    title,
                    str(path),
                    kind,
                    source,
                    json.dumps(all_tags),
                    memory_id,
                    created_at,
                    created_at,
                ),
            )
            for link in links:
                conn.execute(
                    "INSERT OR IGNORE INTO links (source_id, target_title, created_at) VALUES (?, ?, ?)",
                    (note_id, link, created_at),
                )

        return {
            "id": note_id,
            "memory_id": memory_id,
            "path": str(path),
            "tags": all_tags,
            "links": links,
        }

    def recall(self, query: str, top_k: int = 8) -> Dict[str, Any]:
        memories = self.memory.recall(query, top_k=top_k)
        notes = self._search_notes(query, top_k=top_k)
        return {"query": query, "memories": memories, "notes": notes}

    def _search_notes(self, query: str, top_k: int = 8) -> List[Dict[str, Any]]:
        terms = [t for t in re.split(r"\W+", query.lower()) if len(t) > 2]
        if not terms:
            return []
        results: List[Dict[str, Any]] = []
        with sqlite3.connect(self.index_db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
        for row in rows:
            text = f"{row['title']} {row['kind']} {row['source']} {row['tags_json']}".lower()
            score = sum(1 for term in terms if term in text)
            if score:
                item = dict(row)
                item["score"] = score
                item["tags"] = json.loads(item.pop("tags_json"))
                results.append(item)
        return sorted(results, key=lambda item: item["score"], reverse=True)[:top_k]

    def auto_research(self, target: str, *, tags: Iterable[str] = ()) -> Dict[str, Any]:
        """Archive a URL or create a research task note for a topic."""
        if target.startswith(("http://", "https://")):
            title, content = self._fetch_url(target)
            return self.remember(
                title,
                content,
                kind="research",
                source=target,
                tags=[*tags, "auto-research"],
                metadata={"url": target, "research_status": "archived"},
                importance=0.72,
            )

        prompt = (
            f"Research target: [[{target}]]\n\n"
            "Checklist:\n"
            "- Solana token, wallet, protocol, or perp venue relevance\n"
            "- On-chain evidence to verify with Helius or RPC tools\n"
            "- Liquidity, holder, volume, unlock, and routing risks\n"
            "- Trading thesis, invalidation, and risk controls\n"
            "- Follow-up URLs and data sources\n"
        )
        return self.remember(
            f"Research Queue - {target}",
            prompt,
            kind="research",
            source="auto-research",
            tags=[*tags, "research-queue"],
            metadata={"research_status": "queued"},
            importance=0.55,
        )

    def _fetch_url(self, url: str) -> tuple[str, str]:
        req = Request(url, headers={"User-Agent": "OpenClawdBrain/1.0"})
        try:
            with urlopen(req, timeout=15) as response:
                raw = response.read(750_000)
                content_type = response.headers.get("content-type", "")
        except URLError as exc:
            raise RuntimeError(f"research fetch failed for {url}: {exc}") from exc

        text = raw.decode("utf-8", errors="replace")
        parsed = urlparse(url)
        fallback = parsed.netloc + parsed.path
        if "html" in content_type.lower() or "<html" in text[:500].lower():
            title = html_title(text, fallback)
            content = strip_html(text)[:25_000]
        else:
            title = fallback
            content = text[:25_000]
        return title, f"Source URL: {url}\n\n{content}"

    def ingest_ooda_journal(self, journal_path: Path = OODA_JOURNAL, limit: int = 100) -> Dict[str, Any]:
        journal_path = Path(journal_path)
        if not journal_path.exists():
            raise FileNotFoundError(f"OODA journal not found: {journal_path}")
        lines = [line for line in journal_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        imported = 0
        for line in lines[-limit:]:
            entry = json.loads(line)
            tick = entry.get("tick", imported + 1)
            decision = entry.get("decision", {})
            title = f"OODA Tick {tick} - {decision.get('action', 'unknown')}"
            content = (
                "```json\n"
                f"{json.dumps(entry, indent=2, sort_keys=True)}\n"
                "```\n\n"
                f"Decision: {decision.get('action', 'unknown')} "
                f"{decision.get('side', '')}. Outcome: {entry.get('outcome')}."
            )
            self.remember(
                title,
                content,
                kind="signal",
                source="ooda-journal",
                tags=["ooda", "trading", "paper"],
                metadata={"tick": tick, "outcome": entry.get("outcome")},
                importance=0.6,
            )
            imported += 1
        return {"journal": str(journal_path), "imported": imported, "bank": self.config.bank}

    def status(self) -> Dict[str, Any]:
        with sqlite3.connect(self.index_db_path) as conn:
            conn.row_factory = sqlite3.Row
            note_count = conn.execute("SELECT COUNT(*) AS c FROM notes").fetchone()["c"]
            by_kind = {
                row["kind"]: row["c"]
                for row in conn.execute("SELECT kind, COUNT(*) AS c FROM notes GROUP BY kind")
            }
            link_count = conn.execute("SELECT COUNT(*) AS c FROM links").fetchone()["c"]
        stats = self.memory.get_stats()
        return {
            "bank": self.config.bank,
            "vault": str(self.config.vault_path),
            "index_db": str(self.index_db_path),
            "notes": note_count,
            "links": link_count,
            "by_kind": by_kind,
            "memory": stats,
        }


def _print_json(value: Any) -> None:
    print(json.dumps(value, indent=2, default=str))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="OpenClawd persistent brain and wiki")
    parser.add_argument("--vault", default=None, help="Vault path. Defaults to CLAWD_BRAIN_VAULT or MemeBRain/vault.")
    parser.add_argument("--bank", default=DEFAULT_BANK, help="Mnemosyne bank. Defaults to clawd.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="Create the vault layout and memory bank")

    remember = sub.add_parser("remember", help="Write a wiki note and memory")
    remember.add_argument("title")
    remember.add_argument("content")
    remember.add_argument("--kind", default="note")
    remember.add_argument("--source", default="clawd")
    remember.add_argument("--tag", action="append", default=[])
    remember.add_argument("--importance", type=float, default=0.65)

    recall = sub.add_parser("recall", help="Recall memories and matching vault notes")
    recall.add_argument("query")
    recall.add_argument("--top-k", type=int, default=8)

    research = sub.add_parser("research", help="Archive URL or queue topic research")
    research.add_argument("target")
    research.add_argument("--tag", action="append", default=[])

    ingest = sub.add_parser("ingest-ooda", help="Import OODA ticks into memory")
    ingest.add_argument("--journal", default=str(OODA_JOURNAL))
    ingest.add_argument("--limit", type=int, default=100)

    sub.add_parser("status", help="Show brain status")
    return parser


def run_cli(argv: Optional[List[str]] = None) -> None:
    args = build_parser().parse_args(argv)
    config = BrainConfig(bank=args.bank)
    if args.vault:
        config.vault_path = Path(args.vault)
    brain = ClawdBrain(config)

    if args.command == "init":
        _print_json(brain.status())
    elif args.command == "remember":
        _print_json(
            brain.remember(
                args.title,
                args.content,
                kind=args.kind,
                source=args.source,
                tags=args.tag,
                importance=args.importance,
            )
        )
    elif args.command == "recall":
        _print_json(brain.recall(args.query, top_k=args.top_k))
    elif args.command == "research":
        _print_json(brain.auto_research(args.target, tags=args.tag))
    elif args.command == "ingest-ooda":
        _print_json(brain.ingest_ooda_journal(Path(args.journal), limit=args.limit))
    elif args.command == "status":
        _print_json(brain.status())
    else:
        raise SystemExit(f"unknown command: {args.command}")


if __name__ == "__main__":
    try:
        run_cli()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
