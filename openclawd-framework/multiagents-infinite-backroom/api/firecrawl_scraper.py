"""
Firecrawl integration — crawl, scrape, and map websites in real-time.
Fetched content is injected into the agent conversation and stored in Convex.
"""

from __future__ import annotations

import json
import os
import time
import threading
from typing import Any

import requests

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "")
FIRECRAWL_BASE = "https://api.firecrawl.dev/v2"
CONVEX_SITE_URL = os.getenv("CONVEX_SITE_URL") or os.getenv("CONVEX_URL", "")

# In-memory store: job_id -> {status, pages, injected_chars, ...}
_crawl_jobs: dict[str, dict] = {}
_lock = threading.Lock()


def _headers() -> dict[str, str]:
    if not FIRECRAWL_API_KEY:
        raise RuntimeError("FIRECRAWL_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
        "Content-Type": "application/json",
    }


def _push_to_convex(payload: dict) -> None:
    """Push crawl results to Convex /crawl/store HTTP action (best-effort)."""
    if not CONVEX_SITE_URL:
        return
    try:
        url = CONVEX_SITE_URL.rstrip("/") + "/crawl/store"
        requests.post(url, json=payload, timeout=15)
    except Exception:
        pass


# ──────────────────────────────────────────────────────────────────────────────
# Core Firecrawl wrappers
# ──────────────────────────────────────────────────────────────────────────────

def scrape_url(url: str, formats: list[str] | None = None, only_main_content: bool = True) -> dict:
    """Scrape a single URL and return clean markdown."""
    payload: dict[str, Any] = {
        "url": url,
        "formats": formats or ["markdown"],
        "onlyMainContent": only_main_content,
    }
    resp = requests.post(f"{FIRECRAWL_BASE}/scrape", json=payload, headers=_headers(), timeout=60)
    resp.raise_for_status()
    return resp.json()


def map_site(url: str, limit: int = 100, search: str | None = None) -> dict:
    """Map a website — returns all discovered URLs extremely fast."""
    payload: dict[str, Any] = {"url": url, "limit": limit}
    if search:
        payload["search"] = search
    resp = requests.post(f"{FIRECRAWL_BASE}/map", json=payload, headers=_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def start_crawl(
    url: str,
    limit: int = 50,
    exclude_paths: list[str] | None = None,
    include_paths: list[str] | None = None,
    max_depth: int | None = None,
    only_main_content: bool = True,
) -> dict:
    """Submit an async crawl job. Returns {id, url}."""
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
    resp = requests.post(f"{FIRECRAWL_BASE}/crawl", json=payload, headers=_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_crawl_status(job_id: str) -> dict:
    """Poll a crawl job for status and partial/complete results."""
    resp = requests.get(f"{FIRECRAWL_BASE}/crawl/{job_id}", headers=_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


# ──────────────────────────────────────────────────────────────────────────────
# Context extraction helpers
# ──────────────────────────────────────────────────────────────────────────────

DREAMS_URL = "https://dreams-of-an-electric-mind.webflow.io"


def _extract_context_block(pages: list[dict], max_chars: int = 12000) -> str:
    """Flatten crawled pages into a context string agents can consume."""
    parts: list[str] = []
    total = 0
    for page in pages:
        md = page.get("markdown") or ""
        meta = page.get("metadata") or {}
        src = meta.get("sourceURL", "")
        title = meta.get("title", "")
        if not md.strip():
            continue
        chunk = f"### {title or src}\n_Source: {src}_\n\n{md.strip()}"
        if total + len(chunk) > max_chars:
            remaining = max_chars - total
            if remaining > 200:
                parts.append(chunk[:remaining] + "\n…[truncated]")
            break
        parts.append(chunk)
        total += len(chunk)
    return "\n\n---\n\n".join(parts)


def _convex_pages_payload(pages: list[dict]) -> list[dict]:
    out = []
    for p in pages:
        md = p.get("markdown") or ""
        meta = p.get("metadata") or {}
        if not md.strip():
            continue
        out.append({
            "sourceUrl": meta.get("sourceURL", ""),
            "title": meta.get("title"),
            "markdown": md[:50000],
            "statusCode": meta.get("statusCode"),
        })
    return out


# ──────────────────────────────────────────────────────────────────────────────
# High-level injection helpers
# ──────────────────────────────────────────────────────────────────────────────

def crawl_dreams_and_inject(terminal, limit: int = 30) -> dict:
    """
    Crawl the Dreams of an Electric Mind site, inject into agent context,
    and store results in Convex. Blocks up to 120 s.
    """
    job = start_crawl(DREAMS_URL, limit=limit, max_depth=3)
    job_id = job.get("id", "")

    deadline = time.time() + 120
    status_data: dict = {}
    while time.time() < deadline:
        status_data = get_crawl_status(job_id)
        if status_data.get("status") in ("completed", "failed"):
            break
        time.sleep(4)

    pages = status_data.get("data") or []
    context_block = _extract_context_block(pages)

    injected_chars = 0
    if context_block and terminal is not None:
        injection = (
            "\n\n[REALTIME CONTEXT INJECTION — Dreams of an Electric Mind]\n"
            + context_block
            + "\n[END CONTEXT INJECTION]\n\n"
        )
        terminal.conversation += injection
        injected_chars = len(injection)

    _push_to_convex({
        "jobId": job_id,
        "url": DREAMS_URL,
        "crawlSource": "dreams",
        "status": status_data.get("status", "unknown"),
        "pagesCompleted": len(pages),
        "creditsUsed": status_data.get("creditsUsed"),
        "injectedChars": injected_chars,
        "pages": _convex_pages_payload(pages),
    })

    with _lock:
        _crawl_jobs[job_id] = {
            "status": status_data.get("status", "unknown"),
            "pages": len(pages),
            "injected_chars": injected_chars,
            "completed": status_data.get("completed", 0),
            "total": status_data.get("total", 0),
            "credits_used": status_data.get("creditsUsed", 0),
        }

    return {
        "job_id": job_id,
        "pages_crawled": len(pages),
        "injected_chars": injected_chars,
        "status": status_data.get("status", "unknown"),
    }


def async_crawl_and_inject(url: str, terminal, limit: int = 50) -> str:
    """
    Start a crawl for any URL and inject results into the terminal
    in a background thread. Returns the job_id immediately.
    """
    job = start_crawl(url, limit=limit)
    job_id = job.get("id", "")

    with _lock:
        _crawl_jobs[job_id] = {"status": "scraping", "pages": 0, "injected_chars": 0}

    def _worker():
        deadline = time.time() + 180
        while time.time() < deadline:
            try:
                status_data = get_crawl_status(job_id)
                if status_data.get("status") in ("completed", "failed"):
                    pages = status_data.get("data") or []
                    context_block = _extract_context_block(pages)
                    injected_chars = 0
                    if context_block and terminal is not None:
                        injection = (
                            f"\n\n[REALTIME CRAWL INJECTION — {url}]\n"
                            + context_block
                            + "\n[END CRAWL INJECTION]\n\n"
                        )
                        terminal.conversation += injection
                        injected_chars = len(injection)
                    _push_to_convex({
                        "jobId": job_id,
                        "url": url,
                        "crawlSource": url,
                        "status": status_data.get("status"),
                        "pagesCompleted": len(pages),
                        "creditsUsed": status_data.get("creditsUsed"),
                        "injectedChars": injected_chars,
                        "pages": _convex_pages_payload(pages),
                    })
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

    threading.Thread(target=_worker, daemon=True).start()
    return job_id


def get_job_info(job_id: str) -> dict | None:
    with _lock:
        return _crawl_jobs.get(job_id)


def firecrawl_status() -> dict:
    return {
        "configured": bool(FIRECRAWL_API_KEY),
        "active_jobs": len(_crawl_jobs),
        "dreams_url": DREAMS_URL,
        "convex_push": bool(CONVEX_SITE_URL),
    }
