"""
Perps Trading Arena integration.

Inspired by Agent-Trading-Arena's closed-loop agent market simulation, but adapted
for this backroom: agents score live Phoenix perps data and publish a compact,
read-only signal tape for the API and 3D frontend.
"""

from __future__ import annotations

import json
import math
import time
import urllib.request
from dataclasses import dataclass
from typing import Any

from .market_context import DEFAULT_SYMBOLS, PHOENIX_API_BASE


@dataclass(frozen=True)
class ArenaAgent:
    name: str
    style: str
    bias: str


ARENA_AGENTS = [
    ArenaAgent("Momentum Mantis", "trend-following scalper", "chases positive carry and price drift"),
    ArenaAgent("Basis Wraith", "basis arbitrage analyst", "hunts mark/oracle dislocations"),
    ArenaAgent("Liquidity Kraken", "depth and OI watcher", "prefers markets with crowded open interest"),
    ArenaAgent("Contrarian Clawd", "mean-reversion lobster", "fades crowded funding and overheated moves"),
]


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _fetch_market(symbol: str) -> dict[str, Any] | None:
    url = f"{PHOENIX_API_BASE}/market/{symbol.upper()}/stats"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None

    market = data.get("market", {})
    book = market.get("l2Orderbook", {}) or {}
    mark_price = _to_float((market.get("markPrice") or {}).get("price"), _to_float(book.get("mid")))
    oracle_price = _to_float((market.get("spotPrice") or {}).get("price"), mark_price)
    mid_price = _to_float(book.get("mid"), mark_price)
    funding_rate = _to_float(market.get("currentFundingRatePercentage")) / 100.0
    annual_funding = _to_float(market.get("annualizedFundingRatePercentage")) / 100.0
    open_interest = _to_float((market.get("openInterest") or {}).get("ui"))
    basis_pct = ((mark_price - oracle_price) / oracle_price * 100.0) if oracle_price else 0.0
    spread_pct = abs(mark_price - mid_price) / mark_price * 100.0 if mark_price else 0.0

    return {
        "symbol": market.get("symbol") or symbol.upper(),
        "markPrice": mark_price,
        "midPrice": mid_price,
        "oraclePrice": oracle_price,
        "fundingRate": funding_rate,
        "annualizedFundingRate": annual_funding,
        "openInterest": open_interest,
        "basisPct": basis_pct,
        "spreadPct": spread_pct,
        "timestamp": int(time.time() * 1000),
    }


def _score_market(agent: ArenaAgent, market: dict[str, Any]) -> dict[str, Any]:
    funding = _to_float(market.get("fundingRate"))
    annual_funding = _to_float(market.get("annualizedFundingRate"))
    basis = _to_float(market.get("basisPct"))
    oi = _to_float(market.get("openInterest"))
    spread = _to_float(market.get("spreadPct"))
    oi_score = min(1.0, math.log10(max(oi, 1.0) + 10.0) / 8.0)

    if agent.name == "Momentum Mantis":
        raw = funding * 650.0 + basis * 0.08 + oi_score * 0.45 - spread * 0.12
    elif agent.name == "Basis Wraith":
        raw = basis * 0.45 + annual_funding * 0.55 - spread * 0.2
    elif agent.name == "Liquidity Kraken":
        raw = oi_score * 1.2 + abs(funding) * 260.0 - spread * 0.35
    else:
        raw = -(funding * 720.0 + basis * 0.12) + (0.35 - oi_score) * 0.25

    confidence = max(0.05, min(0.98, abs(raw)))
    if raw > 0.28:
        action = "long"
    elif raw < -0.28:
        action = "short"
    else:
        action = "hold"

    return {
        "agent": agent.name,
        "style": agent.style,
        "symbol": market["symbol"],
        "action": action,
        "confidence": round(confidence, 3),
        "score": round(raw, 3),
        "rationale": (
            f"{agent.bias}; funding {funding * 100:.4f}%, "
            f"basis {basis:+.3f}%, OI {oi:,.0f}"
        ),
    }


def build_trading_arena(symbols: list[str] | None = None, limit: int = 10) -> dict[str, Any]:
    tracked = (symbols or DEFAULT_SYMBOLS)[: max(1, min(limit, 20))]
    markets = [m for m in (_fetch_market(symbol) for symbol in tracked) if m]
    decisions: list[dict[str, Any]] = []

    for agent in ARENA_AGENTS:
        ranked = sorted(
            (_score_market(agent, market) for market in markets),
            key=lambda item: item["confidence"],
            reverse=True,
        )
        if ranked:
            decisions.append(ranked[0])

    long_count = sum(1 for d in decisions if d["action"] == "long")
    short_count = sum(1 for d in decisions if d["action"] == "short")
    hold_count = sum(1 for d in decisions if d["action"] == "hold")
    mood = "risk-on" if long_count > short_count else "risk-off" if short_count > long_count else "mixed"

    return {
        "source": "Agent-Trading-Arena-inspired perps simulation",
        "market": "Phoenix DEX perpetuals",
        "mood": mood,
        "agents": [agent.__dict__ for agent in ARENA_AGENTS],
        "markets": markets,
        "decisions": decisions,
        "summary": {
            "long": long_count,
            "short": short_count,
            "hold": hold_count,
            "trackedMarkets": len(markets),
            "generatedAt": int(time.time() * 1000),
        },
    }
