#!/usr/bin/env python3
"""
DexScreener Solana Scanner — Full orchestration script.

This script provides the data models and orchestration logic for scanning
dexscreener.com/solana. The actual browser automation (Playwright/Puppeteer)
is handled by the agent's browser tooling — this script handles the data
parsing, filtering, and ranking once scraped data is collected.

Usage:
    scan_dexscreener.py          # Run full scan (requires browser tooling)
    scan_dexscreener.py --dry    # Show the workflow steps without executing
"""

import argparse
import json
import sys
import time
from dataclasses import dataclass, field, asdict
from typing import Optional


# ── Data Models ──────────────────────────────────────────────────────────────

@dataclass
class DexToken:
    """Normalized token data from DexScreener."""
    rank: str = ""
    name: str = ""
    symbol: str = ""
    pair_address: str = ""
    contract_address: str = ""
    price_usd: float = 0.0
    price_change_5m: float = 0.0
    price_change_1h: float = 0.0
    price_change_6h: float = 0.0
    price_change_24h: float = 0.0
    volume_24h: float = 0.0
    liquidity_usd: float = 0.0
    market_cap: float = 0.0
    age_hours: float = 999.0
    txns: int = 0
    holders: int = 0
    fdv_liquidity_ratio: float = 0.0
    top_10_holder_pct: float = 0.0
    source_tab: str = ""
    social_twitter: str = ""
    social_telegram: str = ""
    social_website: str = ""
    is_flagged: bool = False
    flag_reason: str = ""


@dataclass
class ScanConfig:
    """Configuration for a DexScreener scan."""
    tabs: list = field(default_factory=lambda: ["Trending", "New", "Gainers"])
    scroll_count: int = 2
    min_liquidity: float = 10_000
    min_volume: float = 50_000
    max_age_hours: float = 48
    min_holders: int = 50
    min_txns: int = 100
    max_fdv_liq_ratio: float = 50
    max_results: int = 20
    detailed_check: bool = True  # Whether to click through for detail analysis
    headless: bool = True


@dataclass
class ScanResult:
    """Results from a full DexScreener scan."""
    tabs_scanned: list = field(default_factory=list)
    total_tokens_scanned: int = 0
    passed_screening: list = field(default_factory=list)
    flagged_tokens: list = field(default_factory=list)
    scan_duration_seconds: float = 0.0
    errors: list = field(default_factory=list)


# ── Parsing Utilities ───────────────────────────────────────────────────────

def parse_value(raw_str):
    """Parse '$1.2M', '45K', '500' into float."""
    if not raw_str:
        return 0.0
    s = raw_str.strip().upper()
    if s.startswith("$"):
        s = s[1:]
    if s.endswith("B"):
        return float(s[:-1]) * 1_000_000_000
    elif s.endswith("M"):
        return float(s[:-1]) * 1_000_000
    elif s.endswith("K"):
        return float(s[:-1]) * 1_000
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return 0.0


def parse_age_hours(raw_str):
    """Parse '3m', '1h', '2d' into hours."""
    if not raw_str:
        return 999
    s = raw_str.strip().lower()
    if s.endswith("d"):
        return float(s[:-1]) * 24
    elif s.endswith("h"):
        return float(s[:-1])
    elif s.endswith("m"):
        return float(s[:-1]) / 60
    elif s.endswith("s"):
        return float(s[:-1]) / 3600
    try:
        return float(s)
    except ValueError:
        return 999


def parse_txns(raw_str):
    """Parse '1.2K / 800' into total count."""
    if not raw_str:
        return 0
    parts = raw_str.strip().split("/")
    if parts:
        return int(parse_value(parts[0].strip()))
    return 0


# ── Screening Logic ─────────────────────────────────────────────────────────

def raw_to_token(raw: dict, source_tab: str = "") -> DexToken:
    """Convert a raw scraped row dict into a DexToken."""
    return DexToken(
        rank=raw.get("rank", ""),
        name=raw.get("name", ""),
        symbol=raw.get("symbol", ""),
        pair_address=raw.get("pair_address", ""),
        contract_address=raw.get("contract_address", ""),
        price_usd=parse_value(raw.get("price", "0")),
        price_change_5m=parse_value(raw.get("change_5m", "0")),
        price_change_1h=parse_value(raw.get("change_1h", "0")),
        price_change_6h=parse_value(raw.get("change_6h", "0")),
        price_change_24h=parse_value(raw.get("change_24h", "0")),
        volume_24h=parse_value(raw.get("volume", "0")),
        liquidity_usd=parse_value(raw.get("liquidity", "0")),
        market_cap=parse_value(raw.get("market_cap", "0")),
        age_hours=parse_age_hours(raw.get("age", "")),
        txns=parse_txns(raw.get("txns", "0")),
        holders=int(parse_value(raw.get("holders", "0"))),
        fdv_liquidity_ratio=parse_value(raw.get("fdv_liq_ratio", "0")),
        source_tab=source_tab,
    )


def screen_tokens(tokens: list[DexToken], config: ScanConfig) -> list[tuple[DexToken, list[str]]]:
    """Screen tokens against configurable thresholds. Returns (token, reasons) pairs."""
    passed = []
    for t in tokens:
        reasons = []

        if t.liquidity_usd >= config.min_liquidity:
            reasons.append(f"liq=${t.liquidity_usd:,.0f}")
        if t.volume_24h >= config.min_volume:
            reasons.append(f"vol=${t.volume_24h:,.0f}")
        if t.age_hours <= config.max_age_hours:
            reasons.append(f"age={t.age_hours:.1f}h")
        if t.holders >= config.min_holders:
            reasons.append(f"holders={t.holders}")
        if t.txns >= config.min_txns:
            reasons.append(f"txns={t.txns}")
        if t.fdv_liquidity_ratio == 0 or t.fdv_liquidity_ratio <= config.max_fdv_liq_ratio:
            reasons.append(f"fdv/liq={t.fdv_liquidity_ratio:.1f}x")

        if reasons:
            passed.append((t, reasons))

    # Sort by volume descending
    passed.sort(key=lambda x: x[0].volume_24h, reverse=True)
    passed = passed[: config.max_results]
    return passed


def score_token(t: DexToken) -> float:
    """Score a token for ranking. Higher = better. Max ~20 points."""
    score = 0.0
    score += min(t.volume_24h / 100_000, 10)        # up to 10 pts for volume
    score += min(t.liquidity_usd / 50_000, 10)       # up to 10 pts for liquidity
    score += 5 if t.age_hours < 1 else 0             # brand new bonus
    score += 3 if t.price_change_5m > 10 else 0       # strong momentum bonus
    score += 2 if t.holders > 200 else 0              # wide distribution bonus
    score -= 5 if t.fdv_liquidity_ratio > 100 else 0  # penalty for high FDV/liq
    return round(score, 1)


# ── Browser Automation Functions ────────────────────────────────────────────
# These are called by the agent using Playwright / Puppeteer / browser-use.
# The agent should implement these using their available browser tooling.

def scrape_tab(page, tab_name: str) -> list[dict]:
    """
    BROWSER ACTION: Click a tab, wait for table to load, scrape all rows.

    Args:
        page: Playwright/Puppeteer browser page object
        tab_name: Name of the tab to click ("New", "Trending", etc.)

    Returns:
        List of raw token row dicts

    Implementation (by agent):
        1. Click the tab button:
           await page.click('button:has-text("{tab_name}")')
           await page.wait_for_timeout(2500)  # Wait for re-render

        2. Scroll to load more tokens:
           for _ in range(scroll_count):
               await page.evaluate('window.scrollBy(0, 800)')
               await page.wait_for_timeout(1500)

        3. Extract rows:
           rows = await page.query_selector_all('tr[data-id], [data-group="token-row"]')

        4. Parse each row into a dict with keys: rank, name, symbol, price,
           change_5m, change_1h, change_6h, change_24h, volume, liquidity,
           market_cap, age, txns, holders, pair_address, contract_address

        5. Return the list of dicts
    """
    raise NotImplementedError("Implemented by agent using browser tooling")


def detail_page(page, pair_address: str) -> dict:
    """
    BROWSER ACTION: Navigate to pair detail page and extract additional info.

    Args:
        page: Browser page object
        pair_address: Solana pair address

    Returns:
        Dict with contract_address, social links, flags, top_holder_pct

    Implementation (by agent):
        1. Navigate: await page.goto(f"https://dexscreener.com/solana/{pair_address}")
        2. Wait for detail page to render
        3. Extract token address from contract section
        4. Check for rug/scam warnings
        5. Extract social links
        6. Extract holder distribution if available
        7. Return dict with findings
    """
    raise NotImplementedError("Implemented by agent using browser tooling")


# ── Orchestration ───────────────────────────────────────────────────────────

def deduplicate(tokens: list[DexToken]) -> list[DexToken]:
    """Remove duplicates by pair address, keeping the first occurrence."""
    seen = set()
    unique = []
    for t in tokens:
        if t.pair_address and t.pair_address in seen:
            continue
        if t.pair_address:
            seen.add(t.pair_address)
        unique.append(t)
    return unique


def run_scan(config: ScanConfig) -> ScanResult:
    """
    Run a full DexScreener scan.

    NOTE: This is an orchestration blueprint. The agent executing this
    skill will implement the browser-level interactions using their
    available tooling (Playwright, Puppeteer, or browser-use skill).

    Args:
        config: Scan configuration

    Returns:
        ScanResult with findings
    """
    start = time.time()
    result = ScanResult(tabs_scanned=config.tabs[:])

    all_tokens = []

    for tab_name in config.tabs:
        # Agent: call browser tooling to scrape this tab
        # raw_rows = await scrape_tab(page, tab_name)
        raw_rows = []  # Placeholder — agent fills this in

        tokens = [raw_to_token(row, source_tab=tab_name) for row in raw_rows]
        all_tokens.extend(tokens)

        print(f"  [Tab] {tab_name}: {len(tokens)} tokens scraped")

    # Deduplicate across tabs
    all_tokens = deduplicate(all_tokens)
    result.total_tokens_scanned = len(all_tokens)

    # Screen
    passed = screen_tokens(all_tokens, config)
    result.passed_screening = passed

    # Optional: detailed check on top picks
    if config.detailed_check:
        for t, _ in passed[:5]:  # Check top 5
            if t.pair_address:
                # Agent: browser_action detail_page
                pass

    # Find any flagged tokens
    result.flagged_tokens = [t for t in all_tokens if t.is_flagged]

    result.scan_duration_seconds = round(time.time() - start, 1)
    return result


def format_result(result: ScanResult) -> str:
    """Format scan results into a human-readable report."""
    lines = ["## DexScreener Scan Results\n"]

    if result.errors:
        lines.append("### ⚠️ Errors Encountered\n")
        for err in result.errors:
            lines.append(f"- {err}")
        lines.append("")

    if result.passed_screening:
        lines.append("### Top Picks (Passed Screening)\n")
        for i, (t, reasons) in enumerate(result.passed_screening, 1):
            s = score_token(t)
            lines.append(f"{i}. **{t.symbol or t.name}** — Score: {s}/20")
            lines.append(f"   Price: ${t.price_usd:.6f} | "
                          f"Vol: ${t.volume_24h:,.0f} | "
                          f"Liq: ${t.liquidity_usd:,.0f} | "
                          f"Age: {t.age_hours:.1f}h | "
                          f"Holders: {t.holders}")
            lines.append(f"   Passed: {', '.join(reasons)}")
            if t.contract_address:
                lines.append(f"   CA: {t.contract_address}")
            if t.pair_address:
                lines.append(f"   Pair: https://dexscreener.com/solana/{t.pair_address}")
            if t.is_flagged:
                lines.append(f"   ⚠️ Flagged: {t.flag_reason}")
            lines.append("")

        lines.append(f"### Summary")
        lines.append(f"- Tabs scanned: {', '.join(result.tabs_scanned)}")
        lines.append(f"- Total unique tokens: {result.total_tokens_scanned}")
        lines.append(f"- Passed screening: {len(result.passed_screening)}")
        lines.append(f"- Flagged tokens: {len(result.flagged_tokens)}")
        lines.append(f"- Scan duration: {result.scan_duration_seconds}s")
    else:
        lines.append("No tokens passed the screening criteria.")
        lines.append(f"\nConsider loosening thresholds (e.g., lower min liquidity "
                      f"or volume) or scanning different market conditions.")

    return "\n".join(lines)


# ── CLI ─────────────────────────────────────────────────────────────────────

def print_workflow():
    """Print the workflow steps for the agent executing this scan."""
    workflow = """
## DexScreener Scanner Workflow

This script provides the data models and orchestration logic.
You need to execute the browser steps using your available tooling.

### Full Scan Workflow:

1. **Launch browser** → Open `https://dexscreener.com/solana`
   - Use Playwright, Puppeteer, or browser-use skill
   - Wait for page to fully render

2. **Scrape each tab** (Trending → New → Gainers):
   a. Click the tab button
   b. Wait 2-3s for table to re-render
   c. Scroll down to load more tokens (2-3 scrolls)
   d. Extract all table rows
   e. Parse each row into a dict with keys:
      rank, name, symbol, price, change_5m, volume,
      liquidity, market_cap, age, txns, holders,
      pair_address, contract_address

3. **Run screening**: pipe scraped JSON through screen_tokens.py
   - `echo '<json>' | python3 screen_tokens.py`
   - Or pass thresholds: `--min-liquidity 5000 --min-volume 25000`

4. **Deep check top picks** (optional):
   - Click through to pair detail page
   - Extract contract address, social links
   - Check for rug/scam warnings
   - Check holder distribution

5. **Report findings** in the format from format_result()
"""
    print(workflow.strip())


def main():
    parser = argparse.ArgumentParser(
        description="DexScreener Solana Scanner — orchestrator for token discovery"
    )
    parser.add_argument("--dry", action="store_true", help="Show workflow steps without scanning")
    parser.add_argument("--config", help="Path to JSON config file")
    parser.add_argument("--min-liquidity", type=float, help="Min liquidity USD")
    parser.add_argument("--min-volume", type=float, help="Min 24h volume USD")
    parser.add_argument("--max-age", type=float, help="Max age in hours")
    parser.add_argument("--min-holders", type=int, help="Min holders")
    parser.add_argument("--max-results", type=int, help="Max results to return")
    parser.add_argument("--json-output", action="store_true", help="Output JSON instead of formatted text")

    args = parser.parse_args()

    if args.dry:
        print_workflow()
        return

    # Build config
    config = ScanConfig()

    if args.config:
        with open(args.config) as f:
            cfg_data = json.load(f)
        for key, val in cfg_data.items():
            if hasattr(config, key):
                setattr(config, key, val)

    if args.min_liquidity is not None:
        config.min_liquidity = args.min_liquidity
    if args.min_volume is not None:
        config.min_volume = args.min_volume
    if args.max_age is not None:
        config.max_age_hours = args.max_age
    if args.min_holders is not None:
        config.min_holders = args.min_holders
    if args.max_results is not None:
        config.max_results = args.max_results

    print(f"Starting DexScreener scan...")
    print(f"Config: tabs={config.tabs}, scrolls={config.scroll_count}")
    print(f"Filters: liq≥${config.min_liquidity:,.0f}, "
          f"vol≥${config.min_volume:,.0f}, "
          f"age≤{config.max_age_hours}h, "
          f"holders≥{config.min_holders}")
    print()

    result = run_scan(config)

    if args.json_output:
        output = {
            "tabs_scanned": result.tabs_scanned,
            "total_tokens_scanned": result.total_tokens_scanned,
            "passed_screening": [
                {
                    **asdict(t),
                    "score": score_token(t),
                    "reasons": r,
                }
                for t, r in result.passed_screening
            ],
            "flagged_tokens": [asdict(t) for t in result.flagged_tokens],
            "scan_duration_seconds": result.scan_duration_seconds,
            "errors": result.errors,
        }
        print(json.dumps(output, indent=2))
    else:
        print(format_result(result))


if __name__ == "__main__":
    main()
