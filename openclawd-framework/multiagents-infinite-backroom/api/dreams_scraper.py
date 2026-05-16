#!/usr/bin/env python3
"""
Dreams Scraper — Dreams of an Electric Mind
============================================

Scrapes AI conversation "dreams" from https://dreams-of-an-electric-mind.webflow.io/
Extracts the full conversation text from each dream and saves it locally.

Usage:
    python dreams_scraper.py                          # Scrape all dreams
    python dreams_scraper.py --limit 10                # Scrape only 10 dreams
    python dreams_scraper.py --output ./dreams         # Save to custom dir
    python dreams_scraper.py --resume                  # Resume from last scrape
    python dreams_scraper.py --format txt|json         # Output format
"""

import re
import os
import sys
import json
import time
import argparse
import html
from datetime import datetime
from urllib.parse import urljoin, urlparse

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f"{sys.executable} -m pip install requests")
    import requests

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing beautifulsoup4...")
    os.system(f"{sys.executable} -m pip install beautifulsoup4")
    from bs4 import BeautifulSoup

BASE_URL = "https://dreams-of-an-electric-mind.webflow.io"
DREAMS_INDEX = BASE_URL + "/"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "dreams")
STATE_FILE = os.path.join(os.path.dirname(__file__), "..", ".dreams_scraper_state.json")
HEADERS = {
    "User-Agent": "DreamsScraper/1.0 (research bot; +https://github.com/x402agent/multiagents-infinite-backroom)"
}
RATE_LIMIT_DELAY = 1.0  # seconds between requests


def slug_from_url(url: str) -> str:
    """Extract a safe filename slug from a dream URL."""
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    # Remove leading 'dreams/' if present
    if path.startswith("dreams/"):
        path = path[7:]
    return path.replace("/", "_") or "unknown"


def get_dream_links(page_url: str, session: requests.Session) -> list[str]:
    """Parse the index page and extract all dream conversation links."""
    resp = session.get(page_url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    links = set()
    for a_tag in soup.select("a[href*='/dreams/']"):
        href = a_tag.get("href", "")
        if href.startswith("/dreams/") and not href.endswith("/${item.slug}"):
            full_url = urljoin(BASE_URL, href)
            links.add(full_url)

    # Also check for paginated "Load more" pages
    next_page = soup.select_one("a.w-pagination-next")
    if next_page:
        next_href = next_page.get("href", "")
        if next_href and next_href != "#":
            next_url = urljoin(BASE_URL, next_href)
            print(f"  [Pagination] Found next page: {next_url}")
            try:
                more_links = get_dream_links(next_url, session)
                links.update(more_links)
            except Exception as e:
                print(f"  [WARN] Failed to load next page: {e}")

    return sorted(links)


def extract_dream_content(url: str, session: requests.Session) -> dict | None:
    """Scrape a single dream page and extract conversation content."""
    slug = slug_from_url(url)
    
    try:
        resp = session.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"  [ERROR] Failed to fetch {url}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Extract title
    title_tag = soup.select_one("h1.heading")
    title = title_tag.get_text(strip=True) if title_tag else slug

    # Extract scenario
    scenario_tag = soup.select_one("h3.heading-5")
    scenario = scenario_tag.get_text(strip=True) if scenario_tag else "unknown"

    # Extract description
    desc_tag = soup.select_one("meta[name='description']")
    description = desc_tag.get("content", "") if desc_tag else ""

    # Extract prompt (system prompts + context)
    prompt_pre = soup.select_one("#prompt .dream-embed pre.dream")
    prompt_text = prompt_pre.get_text("\n") if prompt_pre else ""

    # Extract conversation body (the actual AI dialogue)
    # The conversation is in <pre class="dream"> inside .dream-wrapper (not .prompt-wrapper)
    dream_wrappers = soup.select(".dream-wrapper:not(.prompt-wrapper) .dream-embed pre.dream")
    conversation_text = ""
    for wrapper in dream_wrappers:
        text = wrapper.get_text("\n")
        if text.strip():
            conversation_text += text + "\n"

    # If no separate conversation, the prompt may contain it
    if not conversation_text.strip():
        # Try all dream pre elements
        all_dreams = soup.select("pre.dream")
        for pre in all_dreams:
            text = pre.get_text("\n")
            if text.strip() and text != prompt_text:
                conversation_text += text + "\n"

    # Clean HTML entities
    conversation_text = html.unescape(conversation_text)
    prompt_text = html.unescape(prompt_text)

    # Extract metadata from description
    metadata = {}
    if "a conversation between two ais" in description.lower():
        metadata["type"] = "ai_conversation"

    return {
        "url": url,
        "slug": slug,
        "title": title,
        "scenario": scenario,
        "description": description,
        "prompt": prompt_text.strip(),
        "conversation": conversation_text.strip(),
        "scraped_at": datetime.utcnow().isoformat() + "Z",
    }


def format_as_txt(dream: dict) -> str:
    """Format a dream as readable plain text."""
    lines = []
    lines.append("=" * 80)
    lines.append(f"TITLE:     {dream['title']}")
    lines.append(f"SCENARIO:  {dream['scenario']}")
    lines.append(f"URL:       {dream['url']}")
    lines.append(f"SCRAPED:   {dream['scraped_at']}")
    lines.append("=" * 80)
    lines.append("")

    if dream.get("prompt"):
        lines.append("─── SYSTEM PROMPT ───")
        lines.append(dream["prompt"])
        lines.append("")

    if dream.get("conversation"):
        lines.append("─── CONVERSATION ───")
        lines.append(dream["conversation"])
        lines.append("")

    lines.append("=" * 80)
    lines.append("")
    return "\n".join(lines)


def load_state() -> dict:
    """Load scraping state from disk."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {"scraped_urls": [], "last_scraped": None, "total": 0}


def save_state(state: dict):
    """Save scraping state to disk."""
    os.makedirs(os.path.dirname(STATE_FILE) or ".", exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Scrape dreams from Dreams of an Electric Mind")
    parser.add_argument("--limit", type=int, default=0, help="Max number of dreams to scrape")
    parser.add_argument("--output", default=OUTPUT_DIR, help="Output directory")
    parser.add_argument("--format", choices=["txt", "json"], default="txt", help="Output format")
    parser.add_argument("--resume", action="store_true", help="Resume from last scrape")
    parser.add_argument("--delay", type=float, default=RATE_LIMIT_DELAY, help="Delay between requests")
    args = parser.parse_args()

    output_dir = os.path.abspath(args.output)
    os.makedirs(output_dir, exist_ok=True)

    state = load_state() if args.resume else {"scraped_urls": [], "last_scraped": None, "total": 0}
    scraped_urls = set(state.get("scraped_urls", []))

    session = requests.Session()

    print("=" * 60)
    print("  Dreams Scraper — Dreams of an Electric Mind")
    print("=" * 60)
    print(f"\nFetching dream list from {DREAMS_INDEX}...")
    
    all_links = get_dream_links(DREAMS_INDEX, session)
    print(f"  Found {len(all_links)} dream(s) total.")
    
    if args.limit > 0:
        all_links = all_links[:args.limit]
        print(f"  Limited to {args.limit} dream(s).")

    if scraped_urls:
        new_links = [l for l in all_links if l not in scraped_urls]
        print(f"  {len(new_links)} new dream(s) to scrape ({len(all_links) - len(new_links)} already scraped).")
        all_links = new_links

    if not all_links:
        print("  Nothing new to scrape!")
        return

    print(f"\nScraping {len(all_links)} dream(s)...\n")

    success_count = 0
    for i, url in enumerate(all_links, 1):
        slug = slug_from_url(url)
        print(f"  [{i}/{len(all_links)}] {slug[:60]}...")

        dream = extract_dream_content(url, session)
        if not dream:
            continue

        # Save to file
        if args.format == "json":
            file_path = os.path.join(output_dir, f"{slug}.json")
            with open(file_path, "w") as f:
                json.dump(dream, f, indent=2)
        else:
            file_path = os.path.join(output_dir, f"{slug}.txt")
            with open(file_path, "w") as f:
                f.write(format_as_txt(dream))

        file_size = os.path.getsize(file_path)
        print(f"    Saved: {os.path.basename(file_path)} ({file_size:,} bytes)")

        scraped_urls.add(url)
        state["scraped_urls"] = list(scraped_urls)
        state["last_scraped"] = datetime.utcnow().isoformat() + "Z"
        state["total"] = len(scraped_urls)
        save_state(state)
        success_count += 1

        # Rate limiting
        if i < len(all_links):
            time.sleep(args.delay)

    print(f"\n{'=' * 60}")
    print(f"  Done! Scraped {success_count} new dream(s). Total: {state['total']}")
    print(f"  Output: {output_dir}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
