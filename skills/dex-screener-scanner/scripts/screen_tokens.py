#!/usr/bin/env python3
"""
Standalone token screening/filtering for DexScreener data.

Can be used independently on cached CSV/JSON data.
Accepts configurable thresholds via stdin or arguments.

Usage:
    screen_tokens.py < input_tokens.json
    screen_tokens.py --min-liquidity 5000 --min-volume 25000 input_tokens.json
"""

import argparse
import json
import sys
from pathlib import Path


DEFAULT_CONFIG = {
    "min_liquidity": 10_000,        # Minimum USD liquidity
    "min_volume": 50_000,           # Minimum 24h volume in USD
    "max_age_hours": 48,            # Maximum age in hours
    "min_holders": 50,              # Minimum unique holders
    "min_txns": 100,                # Minimum transaction count
    "max_fdv_liq_ratio": 50,        # Maximum FDV/Liquidity ratio
    "min_price_change_5m": 0,       # Minimum 5m price change % (0 = no filter)
    "top_holder_max_pct": 20,       # Max % for top 10 holders
    "max_results": 20,              # Max number of results to return
}


def parse_value(raw_str):
    """Parse a human-readable value like '$1.2M' or '45K' into a float."""
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
    """Parse an age string like '3m', '1h', '2d' into hours."""
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


def parse_transactions(raw_str):
    """Parse a transaction string like '1.2K / 800' into total count."""
    if not raw_str:
        return 0
    parts = raw_str.strip().split("/")
    if parts:
        return parse_value(parts[0].strip())
    return 0


def normalize_token(raw_token):
    """Convert a raw scraped token dict into a normalized format with parsed numeric values."""
    return {
        "rank": raw_token.get("rank", ""),
        "name": raw_token.get("name", ""),
        "symbol": raw_token.get("symbol", ""),
        "pair_address": raw_token.get("pair_address", ""),
        "contract_address": raw_token.get("contract_address", ""),
        "price_usd": parse_value(raw_token.get("price", "0")),
        "price_change_5m": parse_value(raw_token.get("change_5m", "0")),
        "price_change_1h": parse_value(raw_token.get("change_1h", "0")),
        "price_change_6h": parse_value(raw_token.get("change_6h", "0")),
        "price_change_24h": parse_value(raw_token.get("change_24h", "0")),
        "volume_24h": parse_value(raw_token.get("volume", "0")),
        "liquidity_usd": parse_value(raw_token.get("liquidity", "0")),
        "market_cap": parse_value(raw_token.get("market_cap", "0")),
        "age_hours": parse_age_hours(raw_token.get("age", "")),
        "txns": parse_transactions(raw_token.get("txns", "0")),
        "holders": int(parse_value(raw_token.get("holders", "0"))),
        "fdv_liquidity_ratio": parse_value(raw_token.get("fdv_liq_ratio", "0")),
        "top_10_holder_pct": float(raw_token.get("top_10_holder_pct", "0")),
        "source_tab": raw_token.get("source_tab", ""),
    }


def screen_tokens(tokens, config=None):
    """
    Screen a list of token dicts against configurable thresholds.

    Args:
        tokens: List of raw token dicts
        config: Override dict for any threshold

    Returns:
        List of (normalized_token, passing_reasons) tuples, sorted by volume descending
    """
    cfg = {**DEFAULT_CONFIG, **(config or {})}

    passed = []
    for raw in tokens:
        t = normalize_token(raw)
        reasons = []

        if t["liquidity_usd"] >= cfg["min_liquidity"]:
            reasons.append(f"liq=${t['liquidity_usd']:,.0f}")
        if t["volume_24h"] >= cfg["min_volume"]:
            reasons.append(f"vol=${t['volume_24h']:,.0f}")
        if t["age_hours"] <= cfg["max_age_hours"]:
            reasons.append(f"age={t['age_hours']:.1f}h")
        if t["holders"] >= cfg["min_holders"]:
            reasons.append(f"holders={t['holders']}")
        if t["txns"] >= cfg["min_txns"]:
            reasons.append(f"txns={t['txns']}")
        if t["fdv_liquidity_ratio"] == 0 or t["fdv_liquidity_ratio"] <= cfg["max_fdv_liq_ratio"]:
            reasons.append(f"fdv/liq={t['fdv_liquidity_ratio']:.1f}x")
        if t["price_change_5m"] >= cfg["min_price_change_5m"]:
            reasons.append(f"5m={t['price_change_5m']:.1f}%")
        if t["top_10_holder_pct"] == 0 or t["top_10_holder_pct"] <= cfg["top_holder_max_pct"]:
            reasons.append(f"top10={t['top_10_holder_pct']:.1f}%")

        if reasons:
            passed.append((t, reasons))

    # Sort by volume descending
    passed.sort(key=lambda x: x[0]["volume_24h"], reverse=True)

    # Limit results
    passed = passed[: cfg["max_results"]]

    return passed


def score_token(t):
    """Score a normalized token for ranking. Higher = better."""
    score = 0
    score += min(t.get("volume_24h", 0) / 100_000, 10)       # up to 10 pts for volume
    score += min(t.get("liquidity_usd", 0) / 50_000, 10)     # up to 10 pts for liquidity
    score += 5 if t.get("age_hours", 999) < 1 else 0         # brand new bonus
    score += 3 if t.get("price_change_5m", 0) > 10 else 0    # strong momentum
    score += 2 if t.get("holders", 0) > 200 else 0            # wide distribution
    score -= 5 if t.get("fdv_liquidity_ratio", 0) > 100 else 0  # penalty for high FDV/liq
    return round(score, 1)


def format_results(passed_tokens):
    """Format screened tokens into a human-readable output."""
    if not passed_tokens:
        return "No tokens passed the screening criteria."

    lines = ["## DexScreener Scan Results\n"]
    lines.append("### Top Picks (Passed Screening)\n")

    for i, (t, reasons) in enumerate(passed_tokens, 1):
        s = score_token(t)
        lines.append(f"{i}. **{t.get('symbol', t['name'])}** — Score: {s}/20")
        lines.append(f"   Price: ${t['price_usd']:.6f} | "
                      f"Vol: ${t['volume_24h']:,.0f} | "
                      f"Liq: ${t['liquidity_usd']:,.0f} | "
                      f"Age: {t['age_hours']:.1f}h | "
                      f"Holders: {t['holders']}")
        lines.append(f"   Passed: {', '.join(reasons)}")
        if t.get("contract_address"):
            lines.append(f"   CA: {t['contract_address']}")
        if t.get("pair_address"):
            lines.append(f"   Pair: https://dexscreener.com/solana/{t['pair_address']}")
        lines.append("")

    lines.append(f"### Summary")
    lines.append(f"- Total tokens scanned: {len(passed_tokens)}")
    lines.append(f"- Tokens passed screening: {len(passed_tokens)}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Screen DexScreener token data against configurable thresholds"
    )
    parser.add_argument("input", nargs="?", help="Input JSON file (reads from stdin if omitted)")
    parser.add_argument("--min-liquidity", type=float, help=f"Min liquidity USD (default: {DEFAULT_CONFIG['min_liquidity']})")
    parser.add_argument("--min-volume", type=float, help=f"Min 24h volume USD (default: {DEFAULT_CONFIG['min_volume']})")
    parser.add_argument("--max-age", type=float, help=f"Max age in hours (default: {DEFAULT_CONFIG['max_age_hours']})")
    parser.add_argument("--min-holders", type=int, help=f"Min holders (default: {DEFAULT_CONFIG['min_holders']})")
    parser.add_argument("--min-txns", type=int, help=f"Min transactions (default: {DEFAULT_CONFIG['min_txns']})")
    parser.add_argument("--max-results", type=int, help=f"Max results (default: {DEFAULT_CONFIG['max_results']})")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of formatted text")
    parser.add_argument("--scores", action="store_true", help="Include ranking scores in output")

    args = parser.parse_args()

    # Build config from CLI args
    config = {}
    if args.min_liquidity is not None:
        config["min_liquidity"] = args.min_liquidity
    if args.min_volume is not None:
        config["min_volume"] = args.min_volume
    if args.max_age is not None:
        config["max_age_hours"] = args.max_age
    if args.min_holders is not None:
        config["min_holders"] = args.min_holders
    if args.min_txns is not None:
        config["min_txns"] = args.min_txns
    if args.max_results is not None:
        config["max_results"] = args.max_results

    # Read input
    if args.input:
        with open(Path(args.input)) as f:
            tokens = json.load(f)
    else:
        tokens = json.load(sys.stdin)

    if not isinstance(tokens, list):
        tokens = [tokens]

    # Screen
    results = screen_tokens(tokens, config)

    if args.json:
        if args.scores:
            output = [
                {**t, "score": score_token(t), "reasons": r}
                for t, r in results
            ]
        else:
            output = [t for t, _ in results]
        print(json.dumps(output, indent=2))
    else:
        print(format_results(results))
        if args.scores and results:
            print("\n### Scores")
            for t, _ in results:
                print(f"  {t.get('symbol', t['name'])}: {score_token(t)}/20")


if __name__ == "__main__":
    main()
