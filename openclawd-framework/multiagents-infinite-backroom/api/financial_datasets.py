"""
Financial Datasets integration for US equities.

This module keeps the API key server-side, normalizes a few high-value endpoints,
and exposes agent-ready context for the backroom loop and 2D frontend.
"""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any


FINANCIAL_DATASETS_BASE = os.getenv("FINANCIAL_DATASETS_BASE", "https://api.financialdatasets.ai")
FINANCIAL_DATASETS_API_KEY = (
    os.getenv("FINANCIALDATASET_API_KEY")
    or os.getenv("FINANCIALDATASETS_API_KEY")
    or os.getenv("FINANCIAL_DATASETS_API_KEY")
)
DEFAULT_STOCK_TICKERS = [
    ticker.strip().upper()
    for ticker in os.getenv("STOCK_CONTEXT_TICKERS", "AAPL,MSFT,NVDA,TSLA,GOOGL").split(",")
    if ticker.strip()
]
DEFAULT_STOCK_LIMIT = 6
REQUEST_TIMEOUT_SECONDS = 8
CACHE_TTL_SECONDS = int(os.getenv("FINANCIAL_DATASETS_CACHE_SECONDS", "60"))

_cache_lock = threading.Lock()
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


class FinancialDatasetsError(RuntimeError):
    """Raised when the upstream Financial Datasets API cannot satisfy a request."""


def _now_ms() -> int:
    return int(time.time() * 1000)


def _cache_key(method: str, path: str, params: dict[str, Any] | None, body: dict[str, Any] | None) -> str:
    return json.dumps(
        {
            "method": method,
            "path": path,
            "params": params or {},
            "body": body or {},
        },
        sort_keys=True,
        separators=(",", ":"),
    )


def _from_cache(key: str) -> dict[str, Any] | None:
    if CACHE_TTL_SECONDS <= 0:
        return None
    with _cache_lock:
        entry = _cache.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if expires_at < time.time():
        with _cache_lock:
            _cache.pop(key, None)
        return None
    return value


def _store_cache(key: str, value: dict[str, Any]) -> None:
    if CACHE_TTL_SECONDS <= 0:
        return
    with _cache_lock:
        _cache[key] = (time.time() + CACHE_TTL_SECONDS, value)


def _request(
    path: str,
    *,
    params: dict[str, Any] | None = None,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    timeout: int = REQUEST_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    if not FINANCIAL_DATASETS_API_KEY:
        raise FinancialDatasetsError("FINANCIALDATASET_API_KEY is not configured")

    normalized_params = {
        key: value
        for key, value in (params or {}).items()
        if value is not None and value != ""
    }
    key = _cache_key(method, path, normalized_params, body)
    cached = _from_cache(key)
    if cached is not None:
        return cached

    query = urllib.parse.urlencode(normalized_params, doseq=True)
    url = f"{FINANCIAL_DATASETS_BASE.rstrip('/')}{path}"
    if query:
        url = f"{url}?{query}"

    payload = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "Accept": "application/json",
        "X-API-KEY": FINANCIAL_DATASETS_API_KEY,
    }
    if payload is not None:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        message = exc.read().decode("utf-8", errors="replace")
        raise FinancialDatasetsError(f"Financial Datasets {exc.code}: {message}") from exc
    except Exception as exc:
        raise FinancialDatasetsError(f"Financial Datasets request failed: {exc}") from exc

    if not isinstance(data, dict):
        raise FinancialDatasetsError("Financial Datasets returned a non-object response")
    _store_cache(key, data)
    return data


def _ticker(value: str) -> str:
    return value.strip().upper()


def _clean_tickers(tickers: list[str] | tuple[str, ...] | None, limit: int = DEFAULT_STOCK_LIMIT) -> list[str]:
    selected = tickers or DEFAULT_STOCK_TICKERS
    cleaned: list[str] = []
    for raw in selected:
        ticker = _ticker(str(raw))
        if ticker and ticker not in cleaned:
            cleaned.append(ticker)
        if len(cleaned) >= max(1, min(limit, 20)):
            break
    return cleaned


def _num(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _fmt_money(value: Any) -> str:
    number = _num(value)
    if number is None:
        return "n/a"
    abs_value = abs(number)
    if abs_value >= 1_000_000_000_000:
        return f"${number / 1_000_000_000_000:.2f}T"
    if abs_value >= 1_000_000_000:
        return f"${number / 1_000_000_000:.2f}B"
    if abs_value >= 1_000_000:
        return f"${number / 1_000_000:.2f}M"
    return f"${number:,.2f}"


def _fmt_pct(value: Any) -> str:
    number = _num(value)
    if number is None:
        return "n/a"
    return f"{number:+.2f}%"


def financial_datasets_status() -> dict[str, Any]:
    return {
        "configured": bool(FINANCIAL_DATASETS_API_KEY),
        "baseUrl": FINANCIAL_DATASETS_BASE,
        "cacheSeconds": CACHE_TTL_SECONDS,
        "defaultTickers": DEFAULT_STOCK_TICKERS,
        "cacheEntries": len(_cache),
    }


def company_facts(ticker: str | None = None, cik: str | None = None) -> dict[str, Any]:
    return _request("/company/facts", params={"ticker": _ticker(ticker) if ticker else None, "cik": cik}).get("company_facts") or {}


def price_snapshot(ticker: str) -> dict[str, Any]:
    return _request("/prices/snapshot", params={"ticker": _ticker(ticker)}).get("snapshot") or {}


def financial_metrics_snapshot(ticker: str) -> dict[str, Any]:
    return _request("/financial-metrics/snapshot", params={"ticker": _ticker(ticker)}).get("snapshot") or {}


def financial_metrics(ticker: str, period: str = "ttm", limit: int = 4) -> list[dict[str, Any]]:
    data = _request(
        "/financial-metrics",
        params={"ticker": _ticker(ticker), "period": period, "limit": max(1, min(limit, 40))},
    )
    return data.get("financial_metrics") or []


def financials(ticker: str, period: str = "ttm", limit: int = 4) -> dict[str, Any]:
    return _request(
        "/financials",
        params={"ticker": _ticker(ticker), "period": period, "limit": max(1, min(limit, 40))},
    ).get("financials") or {}


def earnings(ticker: str | None = None, limit: int = 4) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"limit": max(1, min(limit, 40))}
    if ticker:
        params["ticker"] = _ticker(ticker)
    return _request("/earnings", params=params).get("earnings") or []


def news(ticker: str | None = None, limit: int = 5) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"limit": max(1, min(limit, 10))}
    if ticker:
        params["ticker"] = _ticker(ticker)
    return _request("/news", params=params).get("news") or []


def interest_rates_snapshot(bank: str | None = None) -> list[dict[str, Any]]:
    return _request("/macro/interest-rates/snapshot", params={"bank": bank}).get("interest_rates") or []


def search_line_items(tickers: list[str], line_items: list[str], period: str = "ttm", limit: int = 1) -> list[dict[str, Any]]:
    body = {
        "tickers": _clean_tickers(tickers, limit=50),
        "line_items": [item.strip() for item in line_items if item.strip()],
        "period": period,
        "limit": max(1, min(limit, 40)),
    }
    return _request("/financials/search/line-items", method="POST", body=body).get("search_results") or []


def _safe(label: str, fn, *args, **kwargs) -> tuple[str, Any, str | None]:
    try:
        return label, fn(*args, **kwargs), None
    except Exception as exc:
        return label, None, str(exc)


def build_stock_record(ticker: str, include_news: bool = True, include_earnings: bool = True) -> dict[str, Any]:
    symbol = _ticker(ticker)
    errors: dict[str, str] = {}
    values: dict[str, Any] = {}
    fetches = [
        ("facts", company_facts, symbol),
        ("price", price_snapshot, symbol),
        ("metrics", financial_metrics_snapshot, symbol),
    ]
    if include_earnings:
        fetches.append(("earnings", earnings, symbol, 2))
    if include_news:
        fetches.append(("news", news, symbol, 4))

    for item in fetches:
        label, fn, *args = item
        name, value, error = _safe(label, fn, *args)
        if error:
            errors[name] = error
        else:
            values[name] = value

    facts = values.get("facts") or {}
    price = values.get("price") or {}
    metrics = values.get("metrics") or {}
    earnings_rows = values.get("earnings") or []
    latest_earnings = earnings_rows[0] if earnings_rows else {}

    return {
        "ticker": symbol,
        "name": facts.get("name") or symbol,
        "sector": facts.get("sector"),
        "industry": facts.get("industry"),
        "exchange": facts.get("exchange"),
        "facts": facts,
        "price": price,
        "metrics": metrics,
        "earnings": {
            "latest": latest_earnings,
            "items": earnings_rows,
        },
        "news": values.get("news") or [],
        "signals": _stock_signals(price, metrics, latest_earnings),
        "errors": errors,
    }


def _stock_signals(price: dict[str, Any], metrics: dict[str, Any], earnings_row: dict[str, Any]) -> dict[str, Any]:
    day_change = _num(price.get("day_change_percent"))
    pe = _num(metrics.get("price_to_earnings_ratio"))
    revenue_growth = _num(metrics.get("revenue_growth"))
    earnings_growth = _num(metrics.get("earnings_growth"))
    gross_margin = _num(metrics.get("gross_margin"))
    eps_surprise = None
    quarterly = earnings_row.get("quarterly") if isinstance(earnings_row, dict) else None
    if isinstance(quarterly, dict):
        eps_surprise = quarterly.get("eps_surprise") or quarterly.get("revenue_surprise")

    score = 0.0
    if day_change is not None:
        score += max(-1.5, min(1.5, day_change / 3.0))
    if revenue_growth is not None:
        score += max(-1.0, min(1.0, revenue_growth * 2.0))
    if earnings_growth is not None:
        score += max(-1.0, min(1.0, earnings_growth * 1.5))
    if gross_margin is not None:
        score += max(-0.4, min(0.8, gross_margin))
    if pe is not None and pe > 0:
        score += 0.4 if pe < 25 else -0.35 if pe > 60 else 0.0
    if eps_surprise == "BEAT":
        score += 0.6
    elif eps_surprise == "MISS":
        score -= 0.6

    action = "accumulate" if score > 1.1 else "trim" if score < -0.8 else "watch"
    return {
        "score": round(score, 3),
        "action": action,
        "dayChangePercent": day_change,
        "pe": pe,
        "revenueGrowth": revenue_growth,
        "earningsGrowth": earnings_growth,
        "epsOrRevenueSurprise": eps_surprise,
    }


def build_stocks_snapshot(
    tickers: list[str] | tuple[str, ...] | None = None,
    *,
    include_news: bool = True,
    include_earnings: bool = True,
    limit: int = DEFAULT_STOCK_LIMIT,
) -> dict[str, Any]:
    selected = _clean_tickers(tickers, limit=limit)
    stocks: list[dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=min(6, max(1, len(selected)))) as pool:
        future_map = {
            pool.submit(build_stock_record, ticker, include_news, include_earnings): ticker
            for ticker in selected
        }
        for future in as_completed(future_map):
            try:
                stocks.append(future.result())
            except Exception as exc:
                symbol = future_map[future]
                stocks.append({"ticker": symbol, "name": symbol, "errors": {"snapshot": str(exc)}})

    rank = {ticker: idx for idx, ticker in enumerate(selected)}
    stocks.sort(key=lambda item: rank.get(item.get("ticker", ""), 999))
    gainers = sum(1 for stock in stocks if _num((stock.get("price") or {}).get("day_change_percent")) and _num((stock.get("price") or {}).get("day_change_percent")) > 0)
    losers = sum(1 for stock in stocks if _num((stock.get("price") or {}).get("day_change_percent")) and _num((stock.get("price") or {}).get("day_change_percent")) < 0)
    pe_values = [
        pe
        for pe in (_num((stock.get("metrics") or {}).get("price_to_earnings_ratio")) for stock in stocks)
        if pe is not None and pe > 0
    ]

    macro = {}
    try:
        macro["interestRates"] = interest_rates_snapshot()
    except Exception as exc:
        macro["error"] = str(exc)

    return {
        "source": "Financial Datasets",
        "generatedAt": _now_ms(),
        "configured": bool(FINANCIAL_DATASETS_API_KEY),
        "tickers": selected,
        "stocks": stocks,
        "macro": macro,
        "summary": {
            "count": len(stocks),
            "gainers": gainers,
            "losers": losers,
            "averagePe": round(sum(pe_values) / len(pe_values), 2) if pe_values else None,
        },
    }


def build_stocks_context(tickers: list[str] | tuple[str, ...] | None = None, max_chars: int = 16000) -> dict[str, Any]:
    snapshot = build_stocks_snapshot(tickers=tickers, include_news=True, include_earnings=True)
    lines = [
        "REAL-TIME US EQUITY DATA (Financial Datasets)",
        "=" * 47,
    ]
    for stock in snapshot["stocks"]:
        price = stock.get("price") or {}
        metrics = stock.get("metrics") or {}
        signals = stock.get("signals") or {}
        earnings_row = ((stock.get("earnings") or {}).get("latest") or {})
        quarterly = earnings_row.get("quarterly") if isinstance(earnings_row, dict) else {}
        eps = quarterly.get("earnings_per_share") if isinstance(quarterly, dict) else None
        revenue = quarterly.get("revenue") if isinstance(quarterly, dict) else None
        lines.append(
            " | ".join(
                [
                    f"{stock.get('ticker')}: {stock.get('name')}",
                    f"price {_fmt_money(price.get('price'))}",
                    f"day {_fmt_pct(price.get('day_change_percent'))}",
                    f"mcap {_fmt_money(metrics.get('market_cap'))}",
                    f"P/E {metrics.get('price_to_earnings_ratio', 'n/a')}",
                    f"rev {_fmt_money(revenue)}",
                    f"EPS {eps if eps is not None else 'n/a'}",
                    f"signal {signals.get('action')} ({signals.get('score')})",
                ]
            )
        )
        for article in (stock.get("news") or [])[:2]:
            title = article.get("title")
            source = article.get("source")
            if title:
                lines.append(f"  news: {title[:140]} ({source or 'unknown'})")

    rates = (snapshot.get("macro") or {}).get("interestRates") or []
    if rates:
        lines.append("Macro rates:")
        for rate in rates[:6]:
            lines.append(f"  {rate.get('bank')} {rate.get('name')}: {rate.get('rate')} on {rate.get('date')}")

    text = "\n".join(lines).strip()
    if len(text) > max_chars:
        text = text[:max_chars].rsplit("\n", 1)[0] + "\n[truncated]"
    return {
        "source": snapshot["source"],
        "generatedAt": snapshot["generatedAt"],
        "tickers": snapshot["tickers"],
        "context": text,
        "chars": len(text),
    }
