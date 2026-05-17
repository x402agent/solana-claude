"""
Firecrawl integration for generic scraping plus normalized Dreams site ingestion.
"""

from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests

FIRECRAWL_BASE = "https://api.firecrawl.dev/v2"
DREAMS_URL = "https://dreams-of-an-electric-mind.webflow.io"

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DREAMS_CACHE_DIR = DATA_DIR / "dreams_firecrawl"
DREAMS_STORIES_FILE = DREAMS_CACHE_DIR / "stories.json"
DREAMS_STATE_FILE = DREAMS_CACHE_DIR / "state.json"

_crawl_jobs: dict[str, dict[str, Any]] = {}
_dreams_sync_jobs: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _headers() -> dict[str, str]:
    api_key = os.getenv("FIRECRAWL_API_KEY", "")
    if not api_key:
        raise RuntimeError("FIRECRAWL_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _safe_slug(url: str) -> str:
    path = urlparse(url).path.strip("/")
    if path.startswith("dreams/"):
        path = path[7:]
    path = path.replace("/", "_").strip()
    return path or "index"


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return default


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True))


def _normalize_story(page: dict[str, Any]) -> dict[str, Any]:
    metadata = page.get("metadata") or {}
    url = metadata.get("sourceURL") or page.get("url") or ""
    title = metadata.get("title") or _safe_slug(url)
    description = metadata.get("description") or ""
    markdown = (page.get("markdown") or "").strip()
    html = page.get("html") or ""
    links = page.get("links") or []

    scenario = ""
    for line in markdown.splitlines():
        stripped = line.strip()
        if stripped.lower().startswith("scenario"):
            scenario = stripped.split(":", 1)[-1].strip()
            break

    return {
        "slug": _safe_slug(url),
        "url": url,
        "title": title,
        "description": description,
        "scenario": scenario,
        "markdown": markdown,
        "html": html,
        "links": links,
        "metadata": metadata,
        "scraped_at": _utcnow_iso(),
        "content_chars": len(markdown),
    }


def _extract_context_block(stories: list[dict[str, Any]], max_chars: int = 24000) -> str:
    parts: list[str] = []
    total = 0
    for story in stories:
        markdown = (story.get("markdown") or "").strip()
        if not markdown:
            continue
        section = (
            f"## {story.get('title') or story.get('slug')}\n"
            f"Source: {story.get('url', '')}\n"
            f"Scenario: {story.get('scenario', '') or 'unknown'}\n\n"
            f"{markdown}"
        )
        if total + len(section) > max_chars:
            remaining = max_chars - total
            if remaining > 400:
                parts.append(section[:remaining] + "\n...[truncated]")
            break
        parts.append(section)
        total += len(section)
    return "\n\n---\n\n".join(parts)


def _inject_into_terminal(terminal: Any, context_block: str, label: str) -> int:
    if terminal is None or not context_block:
        return 0
    injection = f"\n\n[{label}]\n{context_block}\n[END {label}]\n\n"
    terminal.conversation += injection
    return len(injection)


def load_dreams_cache() -> dict[str, Any]:
    stories = _read_json(DREAMS_STORIES_FILE, [])
    state = _read_json(
        DREAMS_STATE_FILE,
        {
            "last_sync_at": None,
            "story_count": 0,
            "source": DREAMS_URL,
            "last_job_id": None,
        },
    )
    return {"stories": stories, "state": state}


def save_dreams_cache(stories: list[dict[str, Any]], state: dict[str, Any]) -> None:
    _write_json(DREAMS_STORIES_FILE, stories)
    _write_json(DREAMS_STATE_FILE, state)


# Generic Firecrawl wrappers
def scrape_url(url: str, formats: list[str] | None = None, only_main_content: bool = True) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "url": url,
        "formats": formats or ["markdown"],
        "onlyMainContent": only_main_content,
    }
    resp = requests.post(f"{FIRECRAWL_BASE}/scrape", json=payload, headers=_headers(), timeout=90)
    resp.raise_for_status()
    return resp.json()


def map_site(url: str, limit: int = 100, search: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"url": url, "limit": limit}
    if search:
        payload["search"] = search
    resp = requests.post(f"{FIRECRAWL_BASE}/map", json=payload, headers=_headers(), timeout=60)
    resp.raise_for_status()
    return resp.json()


def start_crawl(
    url: str,
    limit: int = 50,
    exclude_paths: list[str] | None = None,
    include_paths: list[str] | None = None,
    max_depth: int | None = None,
    only_main_content: bool = True,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "url": url,
        "limit": limit,
        "scrapeOptions": {"formats": ["markdown"], "onlyMainContent": only_main_content},
    }
    if exclude_paths:
        payload["excludePaths"] = exclude_paths
    if include_paths:
        payload["includePaths"] = include_paths
    if max_depth is not None:
        payload["maxDiscoveryDepth"] = max_depth
    resp = requests.post(f"{FIRECRAWL_BASE}/crawl", json=payload, headers=_headers(), timeout=60)
    resp.raise_for_status()
    return resp.json()


def get_crawl_status(job_id: str) -> dict[str, Any]:
    resp = requests.get(f"{FIRECRAWL_BASE}/crawl/{job_id}", headers=_headers(), timeout=60)
    resp.raise_for_status()
    return resp.json()


def batch_scrape_urls(
    urls: list[str],
    formats: list[str] | None = None,
    only_main_content: bool = True,
    max_age: int = 0,
    poll_interval: float = 2.0,
    timeout_seconds: int = 180,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "urls": urls,
        "formats": formats or ["markdown"],
        "onlyMainContent": only_main_content,
        "maxAge": max_age,
    }
    resp = requests.post(f"{FIRECRAWL_BASE}/batch/scrape", json=payload, headers=_headers(), timeout=60)
    resp.raise_for_status()
    job = resp.json()

    if job.get("status") == "completed":
        return job

    job_id = job.get("id")
    if not job_id:
        raise RuntimeError(f"Unexpected batch scrape response: {job}")

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        status_resp = requests.get(f"{FIRECRAWL_BASE}/batch/scrape/{job_id}", headers=_headers(), timeout=60)
        status_resp.raise_for_status()
        status_data = status_resp.json()
        if status_data.get("status") == "completed":
            return status_data
        if status_data.get("status") == "failed":
            raise RuntimeError(f"Firecrawl batch scrape failed: {status_data}")
        time.sleep(poll_interval)

    raise TimeoutError(f"Timed out waiting for Firecrawl batch scrape job {job_id}")


def _discover_dream_urls(limit: int = 200) -> list[str]:
    mapped = map_site(DREAMS_URL, limit=limit)
    raw_links = mapped.get("links") or mapped.get("urls") or mapped.get("data") or []
    urls = []
    for item in raw_links:
        url = item.get("url") if isinstance(item, dict) else item
        if isinstance(url, str) and "/dreams/" in url:
            urls.append(url.rstrip("/"))
    return sorted(set(urls))


def sync_dreams_site(
    terminal: Any = None,
    limit: int = 100,
    inject: bool = True,
    max_chars: int = 24000,
) -> dict[str, Any]:
    stories_limit = max(1, min(limit, 200))
    story_urls = _discover_dream_urls(limit=max(stories_limit * 3, 100))
    story_urls = story_urls[:stories_limit]
    if not story_urls:
        raise RuntimeError("No Dreams story URLs were discovered")

    batch = batch_scrape_urls(
        story_urls,
        formats=["markdown", "html", "links"],
        only_main_content=False,
        max_age=0,
    )
    pages = batch.get("data") or []
    stories = [_normalize_story(page) for page in pages if (page.get("markdown") or "").strip()]
    stories.sort(key=lambda item: item.get("slug") or "")

    context_block = _extract_context_block(stories, max_chars=max_chars)
    injected_chars = _inject_into_terminal(terminal, context_block, "DREAMS STORY CORPUS") if inject else 0

    state = {
        "last_sync_at": _utcnow_iso(),
        "story_count": len(stories),
        "source": DREAMS_URL,
        "last_job_id": batch.get("id"),
        "credits_used": batch.get("creditsUsed"),
        "requested_limit": stories_limit,
        "discovered_urls": len(story_urls),
        "injected_chars": injected_chars,
    }
    save_dreams_cache(stories, state)

    return {
        "source": DREAMS_URL,
        "story_count": len(stories),
        "stories": stories,
        "state": state,
        "injected": bool(injected_chars),
        "injected_chars": injected_chars,
        "job_id": batch.get("id"),
        "credits_used": batch.get("creditsUsed"),
    }


def get_dreams_context(max_chars: int = 24000) -> dict[str, Any]:
    cache = load_dreams_cache()
    stories = cache["stories"]
    return {
        "source": DREAMS_URL,
        "story_count": len(stories),
        "context": _extract_context_block(stories, max_chars=max_chars),
        "state": cache["state"],
    }


def inject_cached_dreams_context(terminal: Any, max_chars: int = 24000) -> dict[str, Any]:
    context = get_dreams_context(max_chars=max_chars)
    injected_chars = _inject_into_terminal(terminal, context["context"], "DREAMS STORY CORPUS")
    context["injected_chars"] = injected_chars
    context["injected"] = bool(injected_chars)
    return context


def crawl_dreams_and_inject(terminal: Any, limit: int = 30) -> dict[str, Any]:
    result = sync_dreams_site(terminal=terminal, limit=limit, inject=True)
    return {
        "job_id": result.get("job_id"),
        "pages_crawled": result.get("story_count", 0),
        "injected_chars": result.get("injected_chars", 0),
        "status": "completed",
    }


def async_crawl_and_inject(url: str, terminal: Any, limit: int = 50) -> str:
    job = start_crawl(url, limit=limit)
    job_id = job.get("id", "")

    with _lock:
        _crawl_jobs[job_id] = {"status": "scraping", "pages": 0, "injected_chars": 0}

    def _worker() -> None:
        deadline = time.time() + 180
        while time.time() < deadline:
            try:
                status_data = get_crawl_status(job_id)
                if status_data.get("status") in {"completed", "failed"}:
                    pages = status_data.get("data") or []
                    stories = [_normalize_story(page) for page in pages if (page.get("markdown") or "").strip()]
                    context_block = _extract_context_block(stories, max_chars=18000)
                    injected_chars = _inject_into_terminal(terminal, context_block, f"REALTIME CRAWL {url}")
                    with _lock:
                        _crawl_jobs[job_id] = {
                            "status": status_data.get("status"),
                            "pages": len(pages),
                            "injected_chars": injected_chars,
                            "completed": status_data.get("completed", 0),
                            "total": status_data.get("total", 0),
                            "credits_used": status_data.get("creditsUsed", 0),
                        }
                    return
            except Exception as exc:
                with _lock:
                    _crawl_jobs[job_id]["error"] = str(exc)
                return
            time.sleep(5)
        with _lock:
            _crawl_jobs[job_id]["status"] = "timeout"

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    return job_id


def async_sync_dreams_and_inject(terminal: Any = None, limit: int = 100, inject: bool = True) -> str:
    job_id = f"dreams-sync-{int(time.time() * 1000)}"
    with _lock:
        _dreams_sync_jobs[job_id] = {
            "status": "running",
            "source": DREAMS_URL,
            "requested_limit": limit,
            "inject": inject,
            "started_at": _utcnow_iso(),
        }

    def _worker() -> None:
        try:
            result = sync_dreams_site(terminal=terminal if inject else None, limit=limit, inject=inject)
            with _lock:
                _dreams_sync_jobs[job_id] = {
                    "status": "completed",
                    "source": DREAMS_URL,
                    "story_count": result.get("story_count", 0),
                    "injected_chars": result.get("injected_chars", 0),
                    "completed_at": _utcnow_iso(),
                    "firecrawl_job_id": result.get("job_id"),
                    "credits_used": result.get("credits_used"),
                }
        except Exception as exc:
            with _lock:
                _dreams_sync_jobs[job_id] = {
                    "status": "failed",
                    "source": DREAMS_URL,
                    "error": str(exc),
                    "completed_at": _utcnow_iso(),
                }

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    return job_id


def get_job_info(job_id: str) -> dict[str, Any] | None:
    with _lock:
        return _crawl_jobs.get(job_id) or _dreams_sync_jobs.get(job_id)


def firecrawl_status() -> dict[str, Any]:
    cache = load_dreams_cache()
    return {
        "configured": bool(os.getenv("FIRECRAWL_API_KEY", "")),
        "active_jobs": len(_crawl_jobs) + len(_dreams_sync_jobs),
        "dreams_url": DREAMS_URL,
        "dreams_cached_stories": len(cache["stories"]),
        "dreams_last_sync_at": cache["state"].get("last_sync_at"),
    }
