"""
Real-time Solana Market Context Provider.
Fetches live data from Phoenix DEX perps, DFlow DEX quotes,
and DFlow prediction markets for AI agent context injection.
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
import logging

logger = logging.getLogger(__name__)

# Convex backend URL — where the perps data pipeline lives
CONVEX_URL = os.getenv(
    "CONVEX_URL",
    "https://original-vulture-742.convex.cloud",
)

# Fallback: direct Phoenix API (no Convex dependency)
PHOENIX_API_BASE = "https://perp-api.phoenix.trade"

# Tracked perps symbols
DEFAULT_SYMBOLS = ["SOL", "BTC", "ETH", "DOGE", "SUI", "XRP", "BNB", "AAVE", "HYPE", "SKR"]

# ── DFlow configuration ──────────────────────────────────────────────────
DFLOW_API_KEY = os.getenv("DFLOW_API_KEY")
DFLOW_QUOTE_API_URL = os.getenv("DFLOW_QUOTE_API_URL", "https://d.quote-api.dflow.net")
DFLOW_MARKETS_API_URL = os.getenv("DFLOW_MARKETS_API_URL", "https://d.prediction-markets-api.dflow.net")

# Solana token mints for DFlow quotes
_SOL_MINT = "So11111111111111111111111111111111111111112"
_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
_ETH_MINT = "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"
_BTC_MINT = "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"

# (label, inputMint, inputDecimals, outputMint, outputDecimals, amountIn)
DFLOW_QUOTE_PAIRS = [
    ("SOL/USDC", _SOL_MINT, 9, _USDC_MINT, 6, 1_000_000_000),
    ("ETH/USDC", _ETH_MINT, 8, _USDC_MINT, 6, 100_000_000),
    ("BTC/USDC", _BTC_MINT, 8, _USDC_MINT, 6, 100_000_000),
]


def fetch_perps_context() -> str:
    """
    Fetch real-time perps market data and return a formatted string
    suitable for injecting into AI agent prompts.
    """
    try:
        return _fetch_from_convex()
    except Exception as e:
        logger.warning(f"Convex perps fetch failed: {e}. Falling back to direct Phoenix API.")
        try:
            return _fetch_from_phoenix_direct()
        except Exception as e2:
            logger.error(f"Direct Phoenix fetch also failed: {e2}")
            return _empty_context()


def _fetch_from_convex() -> str:
    """Fetch perps summary from the Convex HTTP endpoint."""
    url = f"{CONVEX_URL}/perps/summary"
    req = urllib.request.Request(url, headers={"Accept": "text/plain"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        text = resp.read().decode("utf-8").strip()

    if not text:
        return _empty_context()

    lines = text.split("\n")
    # Build structured context
    header = "📊 REAL-TIME PERPETUALS MARKET DATA (Phoenix DEX)"
    sep = "=" * len(header)
    parts = [f"{header}\n{sep}"]
    for line in lines:
        parts.append(f"  │ {line}")
    parts.append(f"  │ (updated {_now_str()})\n")
    return "\n".join(parts)


def _fetch_from_phoenix_direct() -> str:
    """Fallback: fetch perps data directly from Phoenix DEX API."""
    lines = []
    for symbol in DEFAULT_SYMBOLS:
        try:
            url = f"{PHOENIX_API_BASE}/market/{symbol}/stats"
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                m = data.get("market", {})

                mark_price = m.get("markPrice", {}).get("price", "?")
                funding = m.get("currentFundingRatePercentage", 0)
                oi_raw = m.get("openInterest", {})
                oi = oi_raw.get("ui", "?")
                mid = m.get("l2Orderbook", {}).get("mid", "?")

                lines.append(
                    f"{symbol}: mark=${mark_price} | mid=${mid} | "
                    f"funding={funding}% | OI=${oi}"
                )
        except Exception as e:
            logger.debug(f"Failed to fetch {symbol}: {e}")
            continue

    if not lines:
        return _empty_context()

    header = "📊 REAL-TIME PERPETUALS MARKET DATA (Phoenix DEX — live)"
    sep = "=" * len(header)
    body = "\n".join(f"  │ {l}" for l in lines)
    return f"{header}\n{sep}\n{body}\n  │ (updated {_now_str()})\n"


def _empty_context() -> str:
    return ""


def _now_str() -> str:
    import datetime
    return datetime.datetime.now().strftime("%H:%M:%S UTC")


# ── DFlow DEX quote fetcher ──────────────────────────────────────────────

def fetch_dflow_quotes() -> str:
    """
    Fetch live DEX swap quotes from DFlow aggregator for key pairs.
    Returns a formatted string for agent prompt injection.
    """
    if not DFLOW_API_KEY:
        logger.info("DFLOW_API_KEY not configured; skipping DFlow quote fetch.")
        return ""

    lines = []
    for label, in_mint, in_dec, out_mint, out_dec, amount_in in DFLOW_QUOTE_PAIRS:
        try:
            params = urllib.parse.urlencode({
                "inputMint": in_mint,
                "outputMint": out_mint,
                "amount": amount_in,
                "slippageBps": 50,
                "onlyDirectRoutes": "false",
            })
            url = f"{DFLOW_QUOTE_API_URL}/quote?{params}"
            req = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "x-api-key": DFLOW_API_KEY,
            })
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            out_amount = int(data.get("outAmount", 0))
            price = out_amount / (10 ** out_dec)
            price_impact = data.get("priceImpactPct", "?")
            route_len = len(data.get("routePlan", []))
            lines.append(
                f"{label}: ${price:,.4f}  impact={price_impact}%  route={route_len} leg(s)"
            )
        except Exception as e:
            logger.debug(f"DFlow quote failed for {label}: {e}")

    if not lines:
        return ""

    header = "💱 DFLOW DEX LIVE QUOTES (aggregated best price)"
    sep = "─" * len(header)
    body = "\n".join(f"  │ {l}" for l in lines)
    return f"{header}\n{sep}\n{body}\n  │ (updated {_now_str()})\n"


def fetch_dflow_markets() -> str:
    """
    Fetch active prediction markets from DFlow.
    Returns a formatted string for agent prompt injection.
    """
    if not DFLOW_API_KEY:
        logger.info("DFLOW_API_KEY not configured; skipping DFlow market fetch.")
        return ""

    try:
        url = f"{DFLOW_MARKETS_API_URL}/markets"
        req = urllib.request.Request(url, headers={
            "Accept": "application/json",
            "x-api-key": DFLOW_API_KEY,
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
        if not markets:
            return ""

        lines = []
        for m in markets[:8]:
            name = m.get("name") or m.get("title") or m.get("question") or str(m.get("id", "?"))
            yes_price = m.get("yesPrice") or m.get("yes_price") or m.get("price")
            vol = m.get("volume") or m.get("volume24h") or 0
            status = m.get("status", "")
            price_str = f"YES={yes_price:.2f}" if isinstance(yes_price, (int, float)) else ""
            vol_str = f"  vol=${vol:,.0f}" if vol else ""
            lines.append(f"{name[:50]}: {price_str}{vol_str}  [{status}]")

        if not lines:
            return ""

        header = "🎯 DFLOW PREDICTION MARKETS (live)"
        sep = "─" * len(header)
        body = "\n".join(f"  │ {l}" for l in lines)
        return f"{header}\n{sep}\n{body}\n  │ (updated {_now_str()})\n"
    except Exception as e:
        logger.debug(f"DFlow markets fetch failed: {e}")
        return ""


# ── Agent conversation injector ─────────────────────────────────────────

def inject_market_context(conversation: str) -> str:
    """
    Inject real-time market context (Phoenix perps + DFlow quotes + prediction markets)
    into an agent conversation as a system-visible header block.
    """
    perps = fetch_perps_context()
    quotes = fetch_dflow_quotes()
    markets = fetch_dflow_markets()

    blocks = [b for b in [perps, quotes, markets] if b]
    if not blocks:
        return conversation

    combined = "\n".join(blocks)
    return (
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"{combined}\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"{conversation}"
    )
