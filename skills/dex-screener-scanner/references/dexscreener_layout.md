# DexScreener Solana Layout Reference

> **⚠️ Layout changes frequently.** Always verify selectors against the live page before scraping. This doc is a best-effort snapshot.

## URL

```
https://dexscreener.com/solana
```

## Page Structure

### Token Listing Table

The main Solana board displays a table of token pairs. The page uses a data-driven table component.

**Likely selectors (check live):**

- Table rows: `div[data-group="token-row"]` or `tr.ds-dex-table-row` or `tbody > tr`
- Row data attributes: `data-chain-id`, `data-pair-address`
- Table wrapper: `div[class*="table"]` or `div[data-testid="dex-table"]`

### Tab Bar

Tabs filter which tokens are shown. Typical selectors:

```css
/* Tab container */
div[class*="tabs"] button, nav[class*="tabs"] button

/* Or by text */
button:has-text("New")
button:has-text("Trending")  
button:has-text("Gainers")
button:has-text("Recently Copied")
```

### Column Order (Approximate)

| Index | Data | Selector Hint |
|-------|------|---------------|
| 0 | Rank | `td:nth-child(1)` |
| 1 | Token (name + symbol) | `td:nth-child(2)` |
| 2 | Price | `td:nth-child(3)` |
| 3 | Price Change | `td:nth-child(4)` |
| 4 | Volume | `td:nth-child(5)` |
| 5 | Liquidity | `td:nth-child(6)` |
| 6 | Market Cap / FDV | `td:nth-child(7)` |
| 7 | Age | `td:nth-child(8)` |
| 8 | Transactions | `td:nth-child(9)` |
| 9 | Holders | `td:nth-child(10)` |

**Note:** Column count and order change frequently. DexScreener A/B tests layouts. Always count `td` elements inside the first row and map accordingly.

### Pair Detail Page

When clicking a token row, you navigate to:

```
https://dexscreener.com/solana/<pair_address>
```

On the detail page, key elements:

- **Token address**: Usually displayed near the token name or in a "Contract" section. Look for a monospace text element with a copy button.
- **Social links**: Twitter/X, Telegram, Website — look for `a[href*="twitter.com"]`, `a[href*="t.me"]`, etc.
- **Chart**: Embedded TradingView chart — not scrapeable, but visually inspect for patterns.
- **Holder distribution**: Sometimes shown as a pie chart or bar graph below the chart.
- **Creator info**: Shown in the "Pairs" section, may list creator wallet address.

## Known Layout Variations

- **Mobile vs Desktop**: DexScreener uses different layouts. Desktop shows more columns. Mobile collapses some columns.
- **Logged-in vs Anonymous**: Logged-in users may see different UI elements (watchlist, alerts).
- **A/B Tests**: DexScreener frequently A/B tests table layouts. Be prepared for variance.

## Anti-Scraping Measures

- Uses **Cloudflare** protection — may present a challenge page
- Rate limiting after rapid requests
- Dynamic CSS class names that change per session
- Lazy loading via IntersectionObserver (scroll-triggered)
- Some data may be served client-rendered via WebSocket updates

## Recommended Verification Approach

Before scraping, always run this diagnostic in the browser console:

```javascript
// Quick diagnostic to map cell indices
const firstRow = document.querySelector('tr[data-id], [data-group="token-row"]');
if (firstRow) {
  const cells = firstRow.querySelectorAll('td, div[class*="cell"]');
  cells.forEach((cell, i) => console.log(i, cell.textContent.trim()));
}
```

This will show you the actual column order for the current session.
