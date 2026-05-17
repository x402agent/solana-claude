"""
Solana trading integration layer for the backroom API.

This module centralizes:
- Solana RPC configuration
- Phoenix perps market reads
- Vulcan CLI invocation for paper/live perps workflows
- DFlow prediction market discovery and order-route construction
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from .market_context import (
    DFLOW_API_KEY,
    DFLOW_MARKETS_API_URL,
    PHOENIX_API_BASE,
)

DEFAULT_SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
DEFAULT_VULCAN_WORKDIR = Path(
    os.getenv(
        "VULCAN_WORKDIR",
        Path(__file__).resolve().parents[1] / "vulcan-cli-master",
    )
)


def _find_vulcan_binary() -> str | None:
    configured = os.getenv("VULCAN_BIN")
    local_debug = str(DEFAULT_VULCAN_WORKDIR / "target" / "debug" / "vulcan")
    local_release = str(DEFAULT_VULCAN_WORKDIR / "target" / "release" / "vulcan")
    candidates = [
        configured,
        local_debug,
        local_release,
        shutil.which("vulcan"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    return None


def integration_status() -> dict[str, Any]:
    vulcan_bin = _find_vulcan_binary()
    vulcan_build_ready = bool(vulcan_bin)
    vulcan_workdir_exists = DEFAULT_VULCAN_WORKDIR.exists()
    binary_source = "missing"
    if vulcan_bin:
        try:
            resolved = Path(vulcan_bin).resolve()
            if DEFAULT_VULCAN_WORKDIR.resolve() in resolved.parents:
                binary_source = "local-repo"
            else:
                binary_source = "system-path"
        except Exception:
            binary_source = "unknown"
    return {
        "solanaRpcConfigured": bool(DEFAULT_SOLANA_RPC_URL),
        "solanaRpcProvider": "helius" if "helius" in DEFAULT_SOLANA_RPC_URL.lower() else "custom",
        "phoenixApiBase": PHOENIX_API_BASE,
        "dflowMarketsApiUrl": DFLOW_MARKETS_API_URL,
        "dflowConfigured": bool(DFLOW_API_KEY),
        "vulcan": {
            "binary": vulcan_bin,
            "binarySource": binary_source,
            "workdir": str(DEFAULT_VULCAN_WORKDIR),
            "workdirExists": vulcan_workdir_exists,
            "ready": vulcan_build_ready,
            "note": (
                "Live and paper perps routes require a working Vulcan binary."
                if not vulcan_build_ready
                else "Vulcan binary detected."
            ),
        },
    }


def _fetch_json(url: str, headers: dict[str, str] | None = None, timeout: int = 12) -> Any:
    req = urllib.request.Request(url, headers=headers or {"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def phoenix_market_list() -> dict[str, Any]:
    url = f"{PHOENIX_API_BASE}/markets"
    try:
        data = _fetch_json(url)
        markets = data if isinstance(data, list) else data.get("markets", [])
        return {
            "ok": True,
            "source": "phoenix-http",
            "count": len(markets),
            "markets": markets,
            "rpcUrl": DEFAULT_SOLANA_RPC_URL,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "source": "phoenix-http"}


def phoenix_market_ticker(symbol: str) -> dict[str, Any]:
    url = f"{PHOENIX_API_BASE}/market/{symbol.upper()}/stats"
    try:
        data = _fetch_json(url)
        return {
            "ok": True,
            "source": "phoenix-http",
            "symbol": symbol.upper(),
            "rpcUrl": DEFAULT_SOLANA_RPC_URL,
            "data": data,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "symbol": symbol.upper(), "source": "phoenix-http"}


def dflow_prediction_markets(limit: int = 25, status: str | None = None) -> dict[str, Any]:
    if not DFLOW_API_KEY:
        return {
            "ok": False,
            "error": "DFLOW_API_KEY is not configured",
            "markets": [],
        }

    params: dict[str, Any] = {"limit": max(1, min(limit, 100))}
    if status:
        params["status"] = status

    base_url = f"{DFLOW_MARKETS_API_URL}/api/v1/markets"
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    try:
        data = _fetch_json(
            url,
            headers={"Accept": "application/json", "x-api-key": DFLOW_API_KEY},
        )
        markets = data.get("markets", data.get("data", data if isinstance(data, list) else []))
        return {
            "ok": True,
            "source": "dflow-prediction-markets",
            "count": len(markets),
            "markets": markets,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "markets": []}


def dflow_prediction_order(
    input_mint: str,
    output_mint: str,
    amount: int,
    slippage_bps: int = 50,
    owner: str | None = None,
    referral_fee_bps: int | None = None,
    destination_token_account: str | None = None,
) -> dict[str, Any]:
    if not DFLOW_API_KEY:
        return {"ok": False, "error": "DFLOW_API_KEY is not configured"}

    params: dict[str, Any] = {
        "inputMint": input_mint,
        "outputMint": output_mint,
        "amount": amount,
        "predictionMarketSlippageBps": slippage_bps,
    }
    if owner:
        params["owner"] = owner
    if referral_fee_bps is not None:
        params["platformFeeBps"] = referral_fee_bps
    if destination_token_account:
        params["destinationTokenAccount"] = destination_token_account

    url = f"{os.getenv('DFLOW_QUOTE_API_URL', 'https://quote-api.dflow.net')}/order?{urllib.parse.urlencode(params)}"
    try:
        data = _fetch_json(
            url,
            headers={"Accept": "application/json", "x-api-key": DFLOW_API_KEY},
            timeout=20,
        )
        return {
            "ok": True,
            "source": "dflow-order",
            "kycNote": "Prediction market execution may require Proof/KYC for the receiving wallet.",
            "data": data,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "source": "dflow-order"}


def _run_vulcan(args: list[str], timeout: int = 45) -> dict[str, Any]:
    vulcan_bin = _find_vulcan_binary()
    if not vulcan_bin:
        return {
            "ok": False,
            "error": "Vulcan binary not found. Set VULCAN_BIN or build/install Vulcan first.",
            "integration": integration_status()["vulcan"],
        }

    cmd = [vulcan_bin, "--rpc-url", DEFAULT_SOLANA_RPC_URL, "-o", "json", *args]
    start = time.time()
    try:
        result = subprocess.run(
            cmd,
            cwd=str(DEFAULT_VULCAN_WORKDIR if DEFAULT_VULCAN_WORKDIR.exists() else Path.cwd()),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        return {
            "ok": False,
            "error": f"Vulcan command timed out after {timeout}s",
            "command": cmd,
            "stderr": (exc.stderr or "").strip(),
        }

    stdout = (result.stdout or "").strip()
    stderr = (result.stderr or "").strip()
    parsed: Any = None
    if stdout:
        try:
            parsed = json.loads(stdout)
        except json.JSONDecodeError:
            parsed = {"raw": stdout}

    return {
        "ok": result.returncode == 0,
        "returncode": result.returncode,
        "command": cmd,
        "durationMs": int((time.time() - start) * 1000),
        "stdout": parsed,
        "stderr": stderr,
    }


def vulcan_status() -> dict[str, Any]:
    return _run_vulcan(["status"])


def vulcan_market_list() -> dict[str, Any]:
    return _run_vulcan(["market", "list"])


def vulcan_market_ticker(symbol: str) -> dict[str, Any]:
    return _run_vulcan(["market", "ticker", symbol.upper()])


def vulcan_paper_init(balance: float = 10000.0, currency: str = "USDC", fee_bps: float | None = None) -> dict[str, Any]:
    args = ["paper", "init", "--balance", str(balance), "--currency", currency]
    if fee_bps is not None:
        args.extend(["--fee-bps", str(fee_bps)])
    return _run_vulcan(args)


def vulcan_paper_order(
    symbol: str,
    side: str,
    order_type: str = "market",
    size: float | None = None,
    tokens: float | None = None,
    notional_usdc: float | None = None,
    price: float | None = None,
) -> dict[str, Any]:
    args = ["paper", "buy" if side.lower() == "buy" else "sell", symbol.upper(), "--type", order_type]
    if size is not None:
        args.extend(["--size", str(size)])
    if tokens is not None:
        args.extend(["--tokens", str(tokens)])
    if notional_usdc is not None:
        args.extend(["--notional-usdc", str(notional_usdc)])
    if price is not None:
        args.extend(["--price", str(price)])
    return _run_vulcan(args)


def vulcan_live_order(
    symbol: str,
    side: str,
    order_type: str = "market",
    size: float | None = None,
    tokens: float | None = None,
    notional_usdc: float | None = None,
    price: float | None = None,
    tp: float | None = None,
    sl: float | None = None,
    isolated: bool = False,
    collateral: float | None = None,
    reduce_only: bool = False,
    dry_run: bool = True,
) -> dict[str, Any]:
    side = side.lower()
    order_type = order_type.lower()
    subcommand = f"{order_type}-{'buy' if side == 'buy' else 'sell'}"
    args = ["trade", subcommand, symbol.upper()]

    if order_type == "limit":
        if size is None or price is None:
            return {"ok": False, "error": "Limit orders require both size and price."}
        args.extend([str(size), str(price)])
    else:
        if size is not None:
            args.append(str(size))
        if tokens is not None:
            args.extend(["--tokens", str(tokens)])
        if notional_usdc is not None:
            args.extend(["--notional-usdc", str(notional_usdc)])

    if tp is not None:
        args.extend(["--tp", str(tp)])
    if sl is not None:
        args.extend(["--sl", str(sl)])
    if isolated:
        args.append("--isolated")
    if collateral is not None:
        args.extend(["--collateral", str(collateral)])
    if reduce_only:
        args.append("--reduce-only")
    if dry_run:
        args.append("--dry-run")
    else:
        args.append("--yes")

    result = _run_vulcan(args, timeout=60)
    result["mode"] = "dry-run" if dry_run else "live"
    return result
