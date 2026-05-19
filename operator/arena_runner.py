#!/usr/bin/env python3
"""
Arena Runner — Imperial Perps Trading Loop

Fetches Phoenix/Imperial market data, runs the 4-agent scoring arena,
routes actionable signals through Imperial (dry_run by default),
and writes an audit trail to arena_executions.json + .agent/scratchpad.md.
Also pushes each pass to Convex for real-time visualization.

Usage:
    python arena_runner.py
    python arena_runner.py --symbols SOL BTC ETH
    python arena_runner.py --live          # IMPERIAL_LIVE=true override
    python arena_runner.py --once          # single pass, no loop
    python arena_runner.py --interval 60   # seconds between passes (default 60)

Environment (all optional, safe defaults):
    IMPERIAL_API_KEY      — required for order routing
    IMPERIAL_WALLET       — operator wallet pubkey
    IMPERIAL_PROFILE_INDEX— account profile index (default 0)
    IMPERIAL_API_BASE     — gateway base URL (default https://api.imperial.space/api/v1)
    IMPERIAL_LIVE         — "true" enables live submission (default: dry_run)
    IMPERIAL_MAX_SIZE_USD — hard cap per order USD (default 100)
    IMPERIAL_ALLOWED_SYMS — comma-separated override for tracked symbols
    BACKROOM_API_URL      — backroom FastAPI URL for enriched market data
                            (falls back to direct Phoenix API if unset)
    CONVEX_SITE_URL       — Convex HTTP actions URL for real-time push
    ARENA_INGEST_SECRET   — Bearer token checked by /arena/ingest endpoint
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

# Load .env from operator directory if python-dotenv is available, else parse manually
def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv(path, override=False)
    except ImportError:
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip("'\"")
            if key and key not in os.environ:
                os.environ[key] = val

OPERATOR_DIR = Path(__file__).parent
BACKROOM_DIR = OPERATOR_DIR.parent / "openclawd-framework" / "multiagents-infinite-backroom"
BACKROOM_API = BACKROOM_DIR / "api"

# Load envs: backroom .env.local first (lowest priority), then backroom .env,
# then operator .env — so operator-local values always win.
_load_dotenv(BACKROOM_DIR / ".env.local")
_load_dotenv(BACKROOM_DIR / ".env")
_load_dotenv(OPERATOR_DIR / ".env")

# ── Paths ────────────────────────────────────────────────────────────────────
AGENT_DIR = OPERATOR_DIR / ".agent"
EXECUTIONS_FILE = OPERATOR_DIR / "arena_executions.json"
SCRATCHPAD_FILE = AGENT_DIR / "scratchpad.md"

# Inject backroom api into path so we can import it directly
if str(BACKROOM_API) not in sys.path:
    sys.path.insert(0, str(BACKROOM_API.parent))

# ── Config ───────────────────────────────────────────────────────────────────

DEFAULT_SYMBOLS = ["SOL", "BTC", "ETH", "DOGE", "SUI"]
PHOENIX_API_BASE = "https://perp-api.phoenix.trade"

IMPERIAL_API_BASE = os.getenv("IMPERIAL_API_BASE", "https://api.imperial.space/api/v1")
IMPERIAL_API_KEY = os.getenv("IMPERIAL_API_KEY", "")
IMPERIAL_WALLET = os.getenv("IMPERIAL_WALLET", "")
IMPERIAL_PROFILE_INDEX = int(os.getenv("IMPERIAL_PROFILE_INDEX", "0"))
IMPERIAL_LIVE = os.getenv("IMPERIAL_LIVE", "").lower() == "true"
IMPERIAL_MAX_SIZE_USD = float(os.getenv("IMPERIAL_MAX_SIZE_USD", "100"))
IMPERIAL_ALLOWED_SYMS = [
    s.strip().upper()
    for s in os.getenv("IMPERIAL_ALLOWED_SYMS", ",".join(DEFAULT_SYMBOLS)).split(",")
    if s.strip()
]

# Convex real-time push
CONVEX_SITE_URL = os.getenv("CONVEX_SITE_URL", "").rstrip("/")
ARENA_INGEST_SECRET = os.getenv("ARENA_INGEST_SECRET", "")

# ── Arena agents (mirrors backroom trading_arena.py) ────────────────────────

ARENA_AGENTS = [
    {"name": "Momentum Mantis", "style": "trend-following scalper", "bias": "chases positive carry and price drift"},
    {"name": "Basis Wraith", "style": "basis arbitrage analyst", "bias": "hunts mark/oracle dislocations"},
    {"name": "Liquidity Kraken", "style": "depth and OI watcher", "bias": "prefers markets with crowded open interest"},
    {"name": "Contrarian Clawd", "style": "mean-reversion lobster", "bias": "fades crowded funding and overheated moves"},
]

# ── Data models ──────────────────────────────────────────────────────────────

@dataclass
class MarketView:
    symbol: str
    mark_price: float = 0.0
    oracle_price: float = 0.0
    mid_price: float = 0.0
    funding_rate: float = 0.0
    annual_funding: float = 0.0
    open_interest: float = 0.0
    basis_pct: float = 0.0
    spread_bps: float = 0.0
    top_bid: float | None = None
    top_ask: float | None = None
    imperial_mark: float | None = None
    imperial_funding: float | None = None
    ts: int = field(default_factory=lambda: int(time.time() * 1000))


@dataclass
class AgentSignal:
    agent_name: str
    symbol: str
    decision: str  # "buy" | "sell" | "watch"
    confidence: float
    score: float
    rationale: str


@dataclass
class ExecutionRecord:
    id: str
    ts: int
    wallet: str
    profile_index: int
    venue: str
    symbol: str
    side: str
    action: str
    size_usd: float
    dry_run: bool
    request: dict[str, Any]
    response: Any
    status: str  # "preview" | "submitted" | "failed" | "blocked"
    error: str | None = None
    tx_signature: str | None = None


# ── Market fetching ──────────────────────────────────────────────────────────

def _http_get(url: str, api_key: str = "") -> dict[str, Any] | None:
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        print(f"  [warn] GET {url} → {exc}", file=sys.stderr)
        return None


def _http_post(url: str, body: dict[str, Any], api_key: str = "") -> dict[str, Any] | None:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:
        print(f"  [warn] POST {url} → {exc}", file=sys.stderr)
        return None


def fetch_phoenix_market(symbol: str) -> MarketView | None:
    url = f"{PHOENIX_API_BASE}/market/{symbol.upper()}/stats"
    data = _http_get(url)
    if not data:
        return None
    market = data.get("market", {})
    book = market.get("l2Orderbook", {}) or {}

    def f(v: Any, default: float = 0.0) -> float:
        try:
            return float(v) if v is not None else default
        except (TypeError, ValueError):
            return default

    mark = f((market.get("markPrice") or {}).get("price"), f(book.get("mid")))
    oracle = f((market.get("spotPrice") or {}).get("price"), mark)
    mid = f(book.get("mid"), mark)
    funding = f(market.get("currentFundingRatePercentage")) / 100.0
    annual = f(market.get("annualizedFundingRatePercentage")) / 100.0
    oi = f((market.get("openInterest") or {}).get("ui"))
    basis = ((mark - oracle) / oracle * 100.0) if oracle else 0.0
    spread = abs(mark - mid) / mark * 10000.0 if mark else 0.0  # bps

    # Imperial mark/funding overlay
    imp_marks = _fetch_imperial_marks()
    imp_funding = _fetch_imperial_funding()
    sym_up = symbol.upper()
    imp_mark = imp_marks.get(sym_up) if imp_marks else None
    imp_fund_info = (imp_funding or {}).get(sym_up)
    imp_fund = imp_fund_info.get("current") if isinstance(imp_fund_info, dict) else None

    return MarketView(
        symbol=market.get("symbol") or sym_up,
        mark_price=mark,
        oracle_price=oracle,
        mid_price=mid,
        funding_rate=funding,
        annual_funding=annual,
        open_interest=oi,
        basis_pct=basis,
        spread_bps=spread,
        imperial_mark=imp_mark,
        imperial_funding=imp_fund,
    )


_imperial_marks_cache: tuple[int, dict[str, float]] | None = None
_imperial_funding_cache: tuple[int, Any] | None = None
_CACHE_TTL = 30  # seconds


def _fetch_imperial_marks() -> dict[str, float] | None:
    global _imperial_marks_cache
    if not IMPERIAL_API_KEY:
        return None
    now = int(time.time())
    if _imperial_marks_cache and now - _imperial_marks_cache[0] < _CACHE_TTL:
        return _imperial_marks_cache[1]
    result = _http_get(f"{IMPERIAL_API_BASE}/mark-prices", IMPERIAL_API_KEY)
    if result:
        _imperial_marks_cache = (now, result)
    return result


def _fetch_imperial_funding() -> Any:
    global _imperial_funding_cache
    if not IMPERIAL_API_KEY:
        return None
    now = int(time.time())
    if _imperial_funding_cache and now - _imperial_funding_cache[0] < _CACHE_TTL:
        return _imperial_funding_cache[1]
    result = _http_get(f"{IMPERIAL_API_BASE}/funding-rates", IMPERIAL_API_KEY)
    if result:
        _imperial_funding_cache = (now, result)
    return result


def fetch_all_markets(symbols: list[str]) -> list[MarketView]:
    views = []
    for sym in symbols:
        v = fetch_phoenix_market(sym)
        if v:
            views.append(v)
    return views


# ── Scoring (4-agent arena) ──────────────────────────────────────────────────

import math


def score_market(agent: dict[str, str], market: MarketView) -> AgentSignal:
    funding = market.funding_rate
    annual = market.annual_funding
    basis = market.basis_pct
    oi = market.open_interest
    spread = market.spread_bps / 10000.0  # normalize bps → fraction

    oi_score = min(1.0, math.log10(max(oi, 1.0) + 10.0) / 8.0)
    name = agent["name"]

    if name == "Momentum Mantis":
        raw = funding * 650.0 + basis * 0.08 + oi_score * 0.45 - spread * 0.12
    elif name == "Basis Wraith":
        raw = basis * 0.45 + annual * 0.55 - spread * 0.2
    elif name == "Liquidity Kraken":
        raw = oi_score * 1.2 + abs(funding) * 260.0 - spread * 0.35
    else:  # Contrarian Clawd
        raw = -(funding * 720.0 + basis * 0.12) + (0.35 - oi_score) * 0.25

    confidence = max(0.05, min(0.98, abs(raw)))
    if raw > 0.28:
        decision = "buy"
    elif raw < -0.28:
        decision = "sell"
    else:
        decision = "watch"

    rationale = (
        f"{agent['bias']}; funding {funding * 100:.4f}%, "
        f"basis {basis:+.3f}%, OI {oi:,.0f}, spread {market.spread_bps:.1f}bps"
    )
    return AgentSignal(
        agent_name=name,
        symbol=market.symbol,
        decision=decision,
        confidence=round(confidence, 3),
        score=round(raw, 3),
        rationale=rationale,
    )


def run_arena(markets: list[MarketView]) -> list[AgentSignal]:
    """All 4 agents score all markets; each agent returns its top pick."""
    signals: list[AgentSignal] = []
    for agent in ARENA_AGENTS:
        ranked = sorted(
            (score_market(agent, m) for m in markets),
            key=lambda s: s.confidence,
            reverse=True,
        )
        if ranked:
            signals.append(ranked[0])
    return signals


# ── Imperial order routing ───────────────────────────────────────────────────

def route_order(signal: AgentSignal, dry_run: bool = True) -> ExecutionRecord:
    sym = signal.symbol.upper()
    if sym not in IMPERIAL_ALLOWED_SYMS:
        return ExecutionRecord(
            id=f"imp-{uuid.uuid4().hex[:8]}",
            ts=int(time.time() * 1000),
            wallet=IMPERIAL_WALLET,
            profile_index=IMPERIAL_PROFILE_INDEX,
            venue="phoenix-imperial",
            symbol=sym,
            side="long" if signal.decision == "buy" else "short",
            action="increase",
            size_usd=0.0,
            dry_run=dry_run,
            request={},
            response=None,
            status="blocked",
            error=f"{sym} not in IMPERIAL_ALLOWED_SYMS",
        )

    side = 0 if signal.decision == "buy" else 1
    payload = {
        "symbol": sym,
        "side": side,
        "action": 0,
        "profileIndex": IMPERIAL_PROFILE_INDEX,
        "sizeUsd": IMPERIAL_MAX_SIZE_USD,
        "orderType": 0,
        "underwriter": 2,
        "dry_run": dry_run,
    }

    response = None
    status = "failed"
    error = None
    tx_sig = None

    if not IMPERIAL_API_KEY:
        error = "IMPERIAL_API_KEY not set — order blocked"
        status = "blocked"
    else:
        url = f"{IMPERIAL_API_BASE}/mobile/orders"
        response = _http_post(url, payload, IMPERIAL_API_KEY)
        if response is not None:
            status = "preview" if dry_run else "submitted"
            tx_sig = (response or {}).get("txSignature") or (response or {}).get("signature")
        else:
            status = "failed"
            error = f"No response from {url}"

    return ExecutionRecord(
        id=f"imp-{uuid.uuid4().hex[:8]}",
        ts=int(time.time() * 1000),
        wallet=IMPERIAL_WALLET,
        profile_index=IMPERIAL_PROFILE_INDEX,
        venue="phoenix-imperial",
        symbol=sym,
        side="long" if side == 0 else "short",
        action="increase",
        size_usd=IMPERIAL_MAX_SIZE_USD,
        dry_run=dry_run,
        request=payload,
        response=response,
        status=status,
        error=error,
        tx_signature=tx_sig,
    )


# ── Audit trail ──────────────────────────────────────────────────────────────

def load_executions() -> list[dict[str, Any]]:
    if EXECUTIONS_FILE.exists():
        try:
            return json.loads(EXECUTIONS_FILE.read_text())
        except Exception:
            return []
    return []


def save_executions(records: list[dict[str, Any]]) -> None:
    EXECUTIONS_FILE.write_text(json.dumps(records, indent=2))


def append_executions(new_records: list[ExecutionRecord]) -> None:
    existing = load_executions()
    existing.extend(asdict(r) for r in new_records)
    # keep last 500 records
    save_executions(existing[-500:])


# ── Scratchpad ───────────────────────────────────────────────────────────────

def update_scratchpad(
    pass_num: int,
    markets: list[MarketView],
    signals: list[AgentSignal],
    records: list[ExecutionRecord],
) -> None:
    AGENT_DIR.mkdir(exist_ok=True)
    ts = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    lines = [
        f"# Arena Runner — Pass {pass_num} @ {ts}\n",
        "## Market Tape\n",
    ]
    for m in markets:
        lines.append(
            f"- **{m.symbol}** mark={m.mark_price:.4f} oracle={m.oracle_price:.4f} "
            f"funding={m.funding_rate * 100:.4f}% ann={m.annual_funding * 100:.2f}% "
            f"OI={m.open_interest:,.0f} basis={m.basis_pct:+.3f}% spread={m.spread_bps:.1f}bps\n"
        )
    lines.append("\n## Agent Signals\n")
    for s in signals:
        emoji = "🟢" if s.decision == "buy" else "🔴" if s.decision == "sell" else "⚪"
        lines.append(
            f"- {emoji} **{s.agent_name}** → {s.decision.upper()} {s.symbol} "
            f"(confidence={s.confidence:.0%}, score={s.score:+.3f})\n"
            f"  {s.rationale}\n"
        )
    lines.append("\n## Executions\n")
    if not records:
        lines.append("- No actionable signals this pass.\n")
    else:
        for r in records:
            lines.append(
                f"- [{r.status.upper()}] {r.side.upper()} {r.symbol} "
                f"${r.size_usd:.0f} dry_run={r.dry_run} id={r.id}\n"
            )
            if r.error:
                lines.append(f"  error: {r.error}\n")
            if r.tx_signature:
                lines.append(f"  tx: {r.tx_signature}\n")

    mood_map: dict[str, int] = {"buy": 0, "sell": 0, "watch": 0}
    for s in signals:
        mood_map[s.decision] = mood_map.get(s.decision, 0) + 1
    if mood_map["buy"] > mood_map["sell"]:
        mood = "RISK-ON 📈"
    elif mood_map["sell"] > mood_map["buy"]:
        mood = "RISK-OFF 📉"
    else:
        mood = "MIXED ↔️"
    lines.append(f"\n**Arena mood:** {mood}  |  buy={mood_map['buy']} sell={mood_map['sell']} watch={mood_map['watch']}\n")

    SCRATCHPAD_FILE.write_text("".join(lines))


# ── Convex real-time push ─────────────────────────────────────────────────────

def push_to_convex(
    pass_num: int,
    mode: str,
    symbols: list[str],
    markets: list[MarketView],
    signals: list[AgentSignal],
    records: list[ExecutionRecord],
) -> None:
    if not CONVEX_SITE_URL:
        return

    long_count = sum(1 for s in signals if s.decision == "buy")
    short_count = sum(1 for s in signals if s.decision == "sell")
    watch_count = sum(1 for s in signals if s.decision == "watch")
    mood: str
    if long_count > short_count:
        mood = "risk-on"
    elif short_count > long_count:
        mood = "risk-off"
    else:
        mood = "mixed"

    payload = {
        "passNum": pass_num,
        "mode": mode,
        "symbols": symbols,
        "marketCount": len(markets),
        "mood": mood,
        "longCount": long_count,
        "shortCount": short_count,
        "watchCount": watch_count,
        "executionCount": len(records),
        "ts": int(time.time() * 1000),
        "signals": [
            {
                "agentName": s.agent_name,
                "symbol": s.symbol,
                "decision": s.decision,
                "confidence": s.confidence,
                "score": s.score,
                "rationale": s.rationale,
            }
            for s in signals
        ],
        "markets": [
            {
                "symbol": m.symbol,
                "markPrice": m.mark_price,
                "oraclePrice": m.oracle_price,
                "midPrice": m.mid_price,
                "fundingRate": m.funding_rate,
                "annualFunding": m.annual_funding,
                "openInterest": m.open_interest,
                "basisPct": m.basis_pct,
                "spreadBps": m.spread_bps,
                **({"imperialMark": m.imperial_mark} if m.imperial_mark is not None else {}),
                **({"imperialFunding": m.imperial_funding} if m.imperial_funding is not None else {}),
            }
            for m in markets
        ],
        "executions": [
            {
                "externalId": r.id,
                "wallet": r.wallet,
                "venue": r.venue,
                "symbol": r.symbol,
                "side": r.side,
                "action": r.action,
                "sizeUsd": r.size_usd,
                "dryRun": r.dry_run,
                "status": r.status,
                **({"error": r.error} if r.error else {}),
                **({"txSignature": r.tx_signature} if r.tx_signature else {}),
            }
            for r in records
        ],
    }

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if ARENA_INGEST_SECRET:
        headers["Authorization"] = f"Bearer {ARENA_INGEST_SECRET}"

    url = f"{CONVEX_SITE_URL}/arena/ingest"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            print(f"  [convex] pushed pass {pass_num} → runId={result.get('runId', '?')}")
    except Exception as exc:
        print(f"  [convex] push failed: {exc}", file=sys.stderr)


# ── Main loop ────────────────────────────────────────────────────────────────

def run_pass(pass_num: int, symbols: list[str], live: bool) -> dict[str, Any]:
    dry_run = not live
    mode = "LIVE" if live else "DRY-RUN"
    print(f"\n{'=' * 60}")
    print(f"  Arena Pass {pass_num} | {mode} | {time.strftime('%H:%M:%S UTC', time.gmtime())}")
    print(f"  Symbols: {', '.join(symbols)}")
    print(f"{'=' * 60}")

    # Observe
    print("  [1/4] Fetching market data...")
    markets = fetch_all_markets(symbols)
    if not markets:
        print("  [warn] No market data fetched — Phoenix API may be down.")
        return {"pass": pass_num, "markets": 0, "signals": [], "executions": []}
    print(f"  Got {len(markets)} markets.")

    # Orient
    print("  [2/4] Running 4-agent scoring arena...")
    signals = run_arena(markets)
    for sig in signals:
        print(f"    {sig.agent_name}: {sig.decision.upper()} {sig.symbol} @ {sig.confidence:.0%}")

    # Decide & Act
    print("  [3/4] Routing actionable signals...")
    records: list[ExecutionRecord] = []
    for sig in signals:
        if sig.decision != "watch":
            rec = route_order(sig, dry_run=dry_run)
            records.append(rec)
            status_str = f"[{rec.status.upper()}]"
            print(f"    {status_str} {rec.side.upper()} {rec.symbol} ${rec.size_usd:.0f}" + (f" — {rec.error}" if rec.error else ""))

    # Log
    print("  [4/4] Writing audit trail...")
    if records:
        append_executions(records)
    update_scratchpad(pass_num, markets, signals, records)
    push_to_convex(pass_num, "live" if live else "dry-run", symbols, markets, signals, records)

    long_count = sum(1 for s in signals if s.decision == "buy")
    short_count = sum(1 for s in signals if s.decision == "sell")
    mood = "risk-on" if long_count > short_count else "risk-off" if short_count > long_count else "mixed"
    print(f"\n  Mood: {mood.upper()} | longs={long_count} shorts={short_count}")
    print(f"  Executions logged: {len(records)}")
    print(f"  Scratchpad: {SCRATCHPAD_FILE}")

    return {
        "pass": pass_num,
        "markets": len(markets),
        "mood": mood,
        "signals": [asdict(s) for s in signals],
        "executions": [asdict(r) for r in records],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Imperial Perps Arena Runner")
    parser.add_argument("--symbols", nargs="+", default=None, help="Symbols to track")
    parser.add_argument("--live", action="store_true", help="Enable live order submission")
    parser.add_argument("--once", action="store_true", help="Run one pass and exit")
    parser.add_argument("--interval", type=int, default=60, help="Seconds between passes")
    parser.add_argument("--max-passes", type=int, default=0, help="Max passes (0=unlimited)")
    args = parser.parse_args()

    symbols = [s.upper() for s in (args.symbols or IMPERIAL_ALLOWED_SYMS)]
    live = args.live or IMPERIAL_LIVE

    if live:
        print("\n⚠️  LIVE MODE ENABLED — orders will be submitted to chain.")
        print("   Set IMPERIAL_LIVE=false or remove --live to use dry-run mode.\n")
    else:
        print("\n✅ DRY-RUN mode — orders previewed, not submitted.\n")

    pass_num = 1
    while True:
        try:
            run_pass(pass_num, symbols, live)
        except KeyboardInterrupt:
            print("\n\nInterrupted. Exiting.")
            break
        except Exception as exc:
            print(f"\n  [error] Pass {pass_num} failed: {exc}", file=sys.stderr)

        if args.once or (args.max_passes > 0 and pass_num >= args.max_passes):
            break

        pass_num += 1
        print(f"\n  Waiting {args.interval}s before next pass...")
        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n\nInterrupted. Exiting.")
            break


if __name__ == "__main__":
    main()
