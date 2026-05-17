---
name: dex-screener-scanner
description: "Automate DexScreener Solana token discovery and screening via browser automation. Navigate dexscreener.com/solana, scrape real-time token listings, filter by volume/liquidity/age/holders, and identify the best opportunities. Triggers: scan dexscreener, find new tokens, find trending tokens, screen Solana tokens, best tokens on Solana, dexscreener scanner."
---

# DexScreener Solana Scanner

Autonomous agent skill for scanning and screening Solana tokens on DexScreener using browser automation (Playwright/Puppeteer). The goal is to navigate `dexscreener.com/solana`, extract token data from live listings, apply screening filters, and identify the best trading opportunities.

## Overview

This skill uses browser automation to:

1. Navigate to DexScreener's Solana board
2. Scrape live token listings (new, trending, gainers, etc.)
3. Extract key metrics for each token
4. Apply configurable screening filters to find the best opportunities
5. Return ranked results with rationale

## Workflow

### Step 1: Launch Browser & Navigate

Use a browser automation tool (Playwright or Puppeteer) to open `https://dexscreener.com/solana`.

```python
# Example with Playwright
page = await browser.new_page()
await page.goto("https://dexscreener.com/solana", wait_until="domcontentloaded")
```

**Important:** DexScreener is a heavy React SPA. Wait for the token table rows to render before scraping. The table typically appears within 3-8 seconds.

### Step 2: Wait for Token Table to Load

The token listing is a dynamic table. Watch for:

- CSS selector for table rows: `div[data-group="token-row"]` or `.ds-table-row` or `tr[data-id]`
- The table has multiple tabs: **New**, **Trending**, **Gainers**, **Recently Copied**, etc.
- Wait for at least one row to be visible before scraping

Recommended wait strategy:

```python
# Wait for first token row to appear
await page.wait_for_selector('[data-group="token-row"]', timeout=15000)
# Or wait for the table body
await page.wait_for_selector('table tbody tr', timeout=15000)
```

If the wait times out, the page may be loading slowly — retry once with a longer timeout.

### Step 3: Parse Token Listing Data

Each token row typically contains these fields (column order may vary slightly):

| Field | Description | Example |
|-------|-------------|---------|
| **#** | Rank/position | 1, 2, 3 |
| **Name/Symbol** | Token name + ticker | "dogwifhat / WIF" |
| **Price** | Current SOL or USD price | "$0.0042" |
| **Price Change** | 5m/1h/6h/24h change % | "+15.3%" |
| **Volume** | 24h trading volume | "$1.2M" |
| **Liquidity** | Pool liquidity | "$45K" |
| **Market Cap** | Fully diluted market cap | "$2.1M" |
| **Age** | How long since creation | "3m" (3 minutes), "1h" |
| **Txns** | Transaction count (buys/sells) | "1.2K / 800" |
| **Holders** | Unique holder count | "450" |
| **FDV / Liq** | FDV-to-Liquidity ratio | "12.5x" |

**Parsing approach:**

```python
rows = await page.query_selector_all('[data-group="token-row"]')
tokens = []
for row in rows:
    cells = await row.query_selector_all('td')
    # Extract based on cell index
    tokens.append({
        "rank": await cells[0].inner_text(),
        "name": await cells[1].inner_text(),
        "price": await cells[2].inner_text(),
        "change_5m": await cells[3].inner_text(),
        "volume": await cells[4].inner_text(),
        "liquidity": await cells[5].inner_text(),
        "market_cap": await cells[6].inner_text(),
        "age": await cells[7].inner_text(),
        "txns": await cells[8].inner_text(),
        "holders": await cells[9].inner_text(),
        # ... etc
    })
```

**Note:** Cell indices may shift if DexScreener updates their layout. Always inspect the actual DOM first. Use `page.evaluate()` for more robust scraping if query selectors are unreliable.

### Step 4: Switch Between Listing Tabs

DexScreener has multiple tabs that reveal different token sets. Click these to scan more broadly:

```python
# Available tabs (selectors may vary):
# New: Most recently created pairs
await page.click('button:has-text("New")')
# Trending: Hottest tokens right now
await page.click('button:has-text("Trending")')
# Gainers: Top gainers
await page.click('button:has-text("Gainers")')
# Recently Copied: Tokens being copied from other chains
await page.click('button:has-text("Recently Copied")')
```

Wait 2-3 seconds after clicking a tab for the table to re-render.

### Step 5: Scroll to Load More Tokens

DexScreener loads tokens in batches (about 25 per page). Scroll down to trigger lazy loading:

```python
# Scroll to bottom of table to load more
for _ in range(3):
    await page.evaluate('window.scrollBy(0, 800)')
    await page.wait_for_timeout(1500)
```

**Be respectful:** Don't hammer the page. 2-3 scrolls is enough to get a meaningful sample (~75-100 tokens per tab).

### Step 6: Apply Screening Filters

After collecting raw token data, apply filters to find the "best" tokens. These are the recommended default thresholds:

| Criterion | Recommended Threshold | Why |
|-----------|----------------------|-----|
| **Min Liquidity** | ≥ $10,000 | Below this = high slippage, rug risk |
| **Min Volume** | ≥ $50,000 (24h) | Shows organic interest |
| **Max Age** | ≤ 48 hours | Catches new launches |
| **Min Holders** | ≥ 50 unique | Indicates distribution, not a single dev wallet |
| **Max Holder Concentration** | Top 10 holders < 20% | Prevents whale manipulation |
| **Min Price Change (5m)** | ≥ 5% (for momentum) | Shows buying pressure |
| **FDV / Liquidity Ratio** | < 50x | Lower = less overvalued relative to available liquidity |
| **Min Txns** | ≥ 100 transactions | Shows real activity |

**Screening function example:**

```python
def screen_tokens(tokens, config=None):
    defaults = {
        "min_liquidity": 10_000,
        "min_volume": 50_000,
        "max_age_hours": 48,
        "min_holders": 50,
        "min_txns": 100,
    }
    config = {**defaults, **(config or {})}
    
    passed = []
    for t in tokens:
        reasons = []
        if t.get("liquidity_usd", 0) >= config["min_liquidity"]:
            reasons.append(f"liquidity={t['liquidity_usd']}")
        if t.get("volume_24h", 0) >= config["min_volume"]:
            reasons.append(f"volume={t['volume_24h']}")
        if t.get("age_hours", 999) <= config["max_age_hours"]:
            reasons.append(f"age={t['age_hours']}h")
        if t.get("holders", 0) >= config["min_holders"]:
            reasons.append(f"holders={t['holders']}")
        if t.get("txns", 0) >= config["min_txns"]:
            reasons.append(f"txns={t['txns']}")
        if reasons:
            passed.append((t, reasons))
    
    # Sort by volume (descending) - highest volume = most liquid interest
    passed.sort(key=lambda x: x[0].get("volume_24h", 0), reverse=True)
    return passed
```

### Step 7: Click Through for Token Details

For tokens that pass screening, click through to the pair page for deeper analysis:

```python
# Click on a token row to navigate to its pair page
pair_link = await row.query_selector('a[href*="/solana/"]')
pair_url = await pair_link.get_attribute('href')
await page.goto(f"https://dexscreener.com{pair_url}")
```

On the pair page you can extract:
- **Full holder distribution** (top holders %)
- **Price chart context** (support/resistance levels)
- **Social links** (Twitter, Telegram, website)
- **Token contract address** (for further analysis)
- **Creator wallet** (check if it's a known rug deployer)

**Safety check on pair page:**

```python
# Check if the token CA has been rug-checked
# Look for "Rug Pull" or scam warnings in the UI
risk_warning = await page.query_selector('[class*="risk"], [class*="warning"], [class*="scam"]')
if risk_warning:
    warning_text = await risk_warning.inner_text()
    # Flag this token as potentially dangerous
```

## Token Ranking System

Rank screened tokens using a scoring system:

```python
def score_token(t):
    score = 0
    score += min(t.get("volume_24h", 0) / 100_000, 10)  # up to 10 pts for volume
    score += min(t.get("liquidity_usd", 0) / 50_000, 10)  # up to 10 pts for liquidity
    score += 5 if t.get("age_hours", 999) < 1 else 0  # bonus for brand new
    score += 3 if t.get("change_5m", 0) > 10 else 0  # bonus for strong momentum
    score += 2 if t.get("holders", 0) > 200 else 0  # bonus for wide distribution
    score -= 5 if t.get("fdv_liquidity_ratio", 0) > 100 else 0  # penalty for high FDV/liq
    return score
```

Return results sorted by score descending, with a brief rationale for each pick.

## Tab Strategy

Scan tabs in this priority order for best results:

1. **Trending** — Hottest tokens, highest chance of continuation
2. **New** — Recently created, potential early entries
3. **Gainers** — Strong momentum plays
4. **Recently Copied** — Arbitrage opportunities from other chains

For a comprehensive scan, scrape all 4 tabs and deduplicate by contract address.

## Edge Cases & Handling

| Situation | Handling |
|-----------|----------|
| **Cloudflare/rate limiting** | Add random delays (1-3s) between actions. If blocked, rotate user-agent |
| **No tokens pass filters** | Report honestly: "No tokens meet the criteria. Consider loosening thresholds" |
| **Table fails to load** | Retry with page refresh. If persistent, report error and suggest checking if dexscreener.com is accessible |
| **Dynamic class names** | Use stable data attributes (`[data-group]`) or text matchers instead of CSS classes |
| **Very new tokens (< 1 min)** | May not have full data. These are high-risk; flag them as "extremely early" |
| **Duplicate tokens across tabs** | Deduplicate by contract address to avoid double-counting |

## Output Format

Present findings in a structured format:

```
## DexScreener Scan Results

### Top Picks (Passed Screening)
1. **$TOKEN** — Score: 18/20
   - Price: $0.0042 | Vol: $1.2M | Liq: $45K | Age: 3m | Holders: 150
   - Rationale: Brand new, strong volume, good liquidity, wide holder distribution
   - CA: [contract_address]

2. **$TOKEN2** — Score: 14/20
   - ...

### Tokens Scanned
- Trending tab: 25 tokens
- New tab: 25 tokens
- Total unique: 48 tokens
- Passed screening: 2 tokens

### Market Notes
- Average liquidity across scanned tokens: $12K
- Heaviest volume: $TOKEN ($1.2M)
- Oldest token in top 25: 6h ago
```

## Scripts

### `scripts/scan_dexscreener.py`
Main scanning script that orchestrates: open browser → navigate → scrape → filter → rank → output.

### `scripts/screen_tokens.py`
Standalone screening/filtering logic that can be used independently on cached data. Accepts configurable thresholds via stdin or arguments.

## References

### `references/dexscreener_layout.md`
Current DOM structure and selectors for dexscreener.com/solana. Update this when DexScreener changes their layout. Always inspect the page before scraping to verify selectors are still valid.
