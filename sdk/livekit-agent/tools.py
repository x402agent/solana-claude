"""Solana trading + vision + memecoin + automation tools for the Clawd LiveKit voice agent."""
from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
from dataclasses import dataclass
from typing import Optional

import aiohttp
from PIL import Image
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey

log = logging.getLogger("clawd-tools")

LAMPORTS_PER_SOL = 1_000_000_000

# ── Jupiter API endpoints ─────────────────────────────────────────────────────
JUP_PRICE = "https://api.jup.ag/price/v2"
JUP_QUOTE_V6 = "https://quote-api.jup.ag/v6/quote"
JUP_TOKENS = "https://tokens.jup.ag/tokens?tags=verified"
JUP_SWAP_V2 = "https://api.jup.ag/swap/v2"

# ── DFlow ─────────────────────────────────────────────────────────────────────
DFLOW_API_URL = os.getenv("DFLOW_API_URL") or "https://quote-api.dflow.net"
DFLOW_API_KEY = os.getenv("DFLOW_API_KEY") or ""

# ── Birdeye ───────────────────────────────────────────────────────────────────
BIRDEYE_BASE = "https://public-api.birdeye.so"
BIRDEYE_API_KEY = os.getenv("BIRDEYE_API_KEY") or ""

# ── Vulcan ────────────────────────────────────────────────────────────────────
VULCAN_BIN = os.getenv("VULCAN_BIN") or "vulcan"

SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

SYMBOL_TO_MINT = {
    "SOL": SOL_MINT,
    "USDC": USDC_MINT,
    "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "JUP": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "WIF": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    "JTO": "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    "PYTH": "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
}


def _resolve_mint(token: str) -> Optional[str]:
    if not token:
        return None
    if len(token) > 30:
        return token
    return SYMBOL_TO_MINT.get(token.upper())


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _birdeye_get(path: str, params: dict = None) -> dict:
    """Call Birdeye public API."""
    if not BIRDEYE_API_KEY:
        return {"error": "BIRDEYE_API_KEY not configured."}
    sess = aiohttp.ClientSession()
    try:
        clean = {k: v for k, v in (params or {}).items() if v not in (None, "")}
        async with sess.get(
            f"{BIRDEYE_BASE}{path}",
            params=clean,
            headers={"X-API-KEY": BIRDEYE_API_KEY, "x-chain": "solana"},
        ) as r:
            if r.status != 200:
                return {"error": f"Birdeye {r.status}: {await r.text()}"}
            data = await r.json()
            if not data.get("success"):
                return {"error": f"Birdeye returned success=false: {data}"}
            return {"data": data.get("data")}
    finally:
        await sess.close()


async def _fetch_token_decimals() -> dict:
    """Build {mint: decimals} map from Jupiter token list."""
    try:
        sess = aiohttp.ClientSession()
        try:
            async with sess.get(JUP_TOKENS) as r:
                tokens = await r.json()
            return {t["address"]: t.get("decimals", 9) for t in tokens}
        finally:
            await sess.close()
    except Exception:
        return {}


# ── Frame ─────────────────────────────────────────────────────────────────────

@dataclass
class VisionFrame:
    """Holds the latest JPEG bytes captured from a remote video track."""

    jpeg: Optional[bytes] = None

    def update_from_pil(self, image: Image.Image, max_side: int = 768) -> None:
        image.thumbnail((max_side, max_side))
        buf = io.BytesIO()
        image.convert("RGB").save(buf, format="JPEG", quality=80)
        self.jpeg = buf.getvalue()


# ── Strategy State ────────────────────────────────────────────────────────────

@dataclass
class StrategyState:
    """Tracks running Vulcan strategies."""
    run_id: str = ""
    symbol: str = ""
    mode: str = "paper"
    created_at: str = ""


# ── Main Tools Class ──────────────────────────────────────────────────────────

class ClawdTools:
    """Holds shared state (RPC client, latest video frame) used by function tools."""

    def __init__(self) -> None:
        self.rpc = AsyncClient(
            os.getenv("SOLANA_RPC_URL") or "https://api.mainnet-beta.solana.com"
        )
        self.frame = VisionFrame()
        self._session: Optional[aiohttp.ClientSession] = None
        self._strategy: Optional[StrategyState] = None

    async def _http(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def aclose(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()
        await self.rpc.close()

    # ── Existing tools ────────────────────────────────────────────────────────

    async def get_token_price(self, token: str) -> dict:
        mint = _resolve_mint(token)
        if not mint:
            return {"error": f"Unknown token: {token}"}
        sess = await self._http()
        async with sess.get(f"{JUP_PRICE}?ids={mint}") as r:
            data = await r.json()
        entry = (data.get("data") or {}).get(mint)
        if not entry or not entry.get("price"):
            return {"error": "Price unavailable"}
        return {"token": token, "mint": mint, "price_usd": float(entry["price"])}

    async def get_wallet_balance(self, address: str) -> dict:
        try:
            pk = Pubkey.from_string(address)
        except Exception as e:
            return {"error": f"Invalid address: {e}"}
        res = await self.rpc.get_balance(pk)
        lamports = res.value
        return {"address": address, "sol": lamports / LAMPORTS_PER_SOL, "lamports": lamports}

    async def quote_swap(
        self,
        input_token: str,
        output_token: str,
        amount: float,
        slippage_bps: int = 50,
    ) -> dict:
        in_mint = _resolve_mint(input_token)
        out_mint = _resolve_mint(output_token)
        if not in_mint or not out_mint:
            return {"error": f"Unknown token: {input_token if not in_mint else output_token}"}
        sess = await self._http()
        async with sess.get(JUP_TOKENS) as r:
            tokens = await r.json()
        decimals = {t["address"]: t.get("decimals", 9) for t in tokens}
        in_dec = decimals.get(in_mint, 9)
        out_dec = decimals.get(out_mint, 9)
        atomic = int(amount * (10 ** in_dec))
        url = (
            f"{JUP_QUOTE_V6}?inputMint={in_mint}&outputMint={out_mint}"
            f"&amount={atomic}&slippageBps={slippage_bps}"
        )
        async with sess.get(url) as r:
            quote = await r.json()
        if not quote.get("outAmount"):
            return {"error": "No route found"}
        return {
            "input_token": input_token,
            "output_token": output_token,
            "input_amount": amount,
            "output_amount": int(quote["outAmount"]) / (10 ** out_dec),
            "price_impact_pct": float(quote.get("priceImpactPct") or 0) * 100,
            "route_hops": len(quote.get("routePlan") or []) or 1,
            "slippage_bps": slippage_bps,
        }

    async def _dflow_get(self, path: str, params: dict) -> dict:
        if not DFLOW_API_KEY:
            return {"error": "DFLOW_API_KEY not configured."}
        sess = await self._http()
        clean = {k: v for k, v in params.items() if v not in (None, "")}
        async with sess.get(
            f"{DFLOW_API_URL}{path}",
            params=clean,
            headers={"x-api-key": DFLOW_API_KEY},
        ) as r:
            if r.status != 200:
                return {"error": f"DFlow {r.status}: {await r.text()}"}
            return await r.json()

    async def quote_dflow_order(
        self,
        input_token: str,
        output_token: str,
        amount: float,
        slippage_bps: Optional[int] = None,
        user_public_key: Optional[str] = None,
    ) -> dict:
        in_mint = _resolve_mint(input_token)
        out_mint = _resolve_mint(output_token)
        if not in_mint or not out_mint:
            return {"error": f"Unknown token: {input_token if not in_mint else output_token}"}
        decimals = await _fetch_token_decimals()
        in_dec = decimals.get(in_mint, 9)
        atomic = int(amount * (10 ** in_dec))
        params = {
            "inputMint": in_mint,
            "outputMint": out_mint,
            "amount": atomic,
            "slippageBps": "auto" if slippage_bps is None else slippage_bps,
            "userPublicKey": user_public_key,
        }
        order = await self._dflow_get("/order", params)
        if "error" in order:
            return order
        route = order.get("routePlan") or []
        return {
            "input_token": input_token,
            "output_token": output_token,
            "in_amount": order.get("inAmount"),
            "out_amount": order.get("outAmount"),
            "min_out_amount": order.get("minOutAmount"),
            "price_impact_pct": float(order.get("priceImpactPct") or 0) * 100,
            "slippage_bps": order.get("slippageBps"),
            "execution_mode": order.get("executionMode"),
            "route_hops": len(route) or 1,
            "route_venues": [leg.get("venue") for leg in route],
            "transaction": "<base64 tx returned — signable>" if order.get("transaction") else None,
            "last_valid_block_height": order.get("lastValidBlockHeight"),
        }

    async def get_priority_fees(self) -> dict:
        return await self._dflow_get("/priority-fees", {})

    async def get_network_status(self) -> dict:
        slot = (await self.rpc.get_slot()).value
        perf = (await self.rpc.get_recent_performance_samples(1)).value
        tps = None
        if perf:
            s = perf[0]
            tps = round(s.num_transactions / s.sample_period_secs)
        return {"slot": slot, "recent_tps": tps}

    async def list_supported_tokens(self) -> dict:
        return {"symbols": list(SYMBOL_TO_MINT.keys())}

    async def analyze_vision(self, question: str) -> dict:
        if not self.frame.jpeg:
            return {
                "error": "No image available. Ask the user to enable their camera or share their screen."
            }
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            return {"error": "ANTHROPIC_API_KEY not configured."}
        b64 = base64.b64encode(self.frame.jpeg).decode("ascii")
        body = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 400,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                f"Describe what you see, focused on: {question}. "
                                "Keep it to 2-3 short sentences. If you see a trading chart, "
                                "call out trend direction, key levels, and any obvious patterns."
                            ),
                        },
                    ],
                }
            ],
        }
        sess = await self._http()
        async with sess.post(
            "https://api.anthropic.com/v1/messages",
            json=body,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        ) as r:
            if r.status != 200:
                return {"error": f"Vision API {r.status}: {await r.text()}"}
            data = await r.json()
        text = (data.get("content") or [{}])[0].get("text", "")
        return {"description": text or "No description returned."}

    # ── Memecoin Discovery Tools ──────────────────────────────────────────────

    async def get_trending_memes(self) -> dict:
        """Get trending Solana memecoins from Birdeye."""
        result = await _birdeye_get("/defi/token_trending", {
            "sort_by": "rank",
            "sort_type": "asc",
            "offset": 0,
            "limit": 20,
        })
        if "error" in result:
            return result
        tokens = (result.get("data") or {}).get("tokens", [])
        simplified = []
        for t in tokens[:10]:
            simplified.append({
                "symbol": t.get("symbol"),
                "name": t.get("name"),
                "address": t.get("address"),
                "price": t.get("price"),
                "market_cap": t.get("marketCap") or t.get("mc"),
                "volume_24h_usd": t.get("volume24hUSD") or t.get("volume_24h_usd"),
                "liquidity": t.get("liquidity"),
                "price_change_24h_pct": (
                    t.get("priceChange24hPercent")
                    or t.get("price_change_24h_percent")
                ),
            })
        return {"trending": simplified, "count": len(simplified)}

    async def search_meme_tokens(self, keyword: str) -> dict:
        """Search for Solana tokens by name or symbol via Birdeye."""
        result = await _birdeye_get("/defi/v3/search", {
            "keyword": keyword,
            "target": "token",
            "sort_by": "volume_24h_usd",
            "sort_type": "desc",
            "limit": 10,
        })
        if "error" in result:
            return result
        items = (result.get("data") or {}).get("items", [])
        simplified = []
        for t in items:
            simplified.append({
                "symbol": t.get("symbol"),
                "name": t.get("name"),
                "address": t.get("address"),
                "price": t.get("price"),
                "market_cap": t.get("marketCap") or t.get("market_cap"),
                "volume_24h_usd": t.get("volume24hUSD") or t.get("volume_24h_usd"),
                "liquidity": t.get("liquidity"),
                "price_change_24h_pct": (
                    t.get("priceChange24hPercent")
                    or t.get("price_change_24h_percent")
                    or t.get("price24hChangePercent")
                ),
            })
        return {"results": simplified, "count": len(simplified), "keyword": keyword}

    async def analyze_meme_token(self, mint: str) -> dict:
        """Deep-dive analysis of a memecoin: overview, market data, trades, metadata, meme details."""
        result = await _birdeye_get("/defi/v3/token/meme/detail/single", {"address": mint})
        meme_detail = result.get("data") if "error" not in result else None

        # Fetch token overview with multiple timeframes
        overview_res = await _birdeye_get("/defi/token_overview", {
            "address": mint,
            "frames": "1m,5m,30m,1h,4h,24h",
        })
        overview = overview_res.get("data") if "error" not in overview_res else None

        # Trade data
        trade_res = await _birdeye_get("/defi/v3/token/trade-data/single", {
            "address": mint,
            "frames": "1h,4h,24h",
        })
        trade = trade_res.get("data") if "error" not in trade_res else None

        # Metadata
        meta_res = await _birdeye_get("/defi/v3/token/meta-data/single", {"address": mint})
        meta = meta_res.get("data") if "error" not in meta_res else None

        # Price stats
        stats_res = await _birdeye_get("/defi/v3/price/stats/single", {
            "address": mint,
            "list_timeframe": "1m,5m,30m,1h,4h,24h",
            "ui_amount_mode": "both",
        })
        stats = stats_res.get("data") if "error" not in stats_res else None

        return {
            "address": mint,
            "symbol": (overview or {}).get("symbol") or (meta or {}).get("symbol"),
            "name": (overview or {}).get("name") or (meta or {}).get("name"),
            "price": (overview or {}).get("price"),
            "liquidity": (overview or {}).get("liquidity"),
            "market_cap": (overview or {}).get("marketCap") or (overview or {}).get("mc"),
            "fdv": (overview or {}).get("fdv"),
            "volume_24h_usd": (overview or {}).get("v24hUSD") or (overview or {}).get("volume_24h_usd"),
            "volume_1h_usd": (overview or {}).get("volume_1h_usd"),
            "holders": (overview or {}).get("holder"),
            "supply": (overview or {}).get("total_supply"),
            "price_change_24h_pct": (
                overview.get("priceChange24hPercent")
                or overview.get("price_change_24h_percent")
            ) if overview else None,
            "price_change_1h_pct": (
                overview.get("priceChange1hPercent")
                or overview.get("price_change_1h_percent")
            ) if overview else None,
            "price_change_5m_pct": overview.get("priceChange5mPercent") if overview else None,
            "trade_24h_count": (overview or {}).get("trade_24h_count"),
            "trade_1h_count": (overview or {}).get("trade_1h_count"),
            "buy_24h": (trade or {}).get("buy_24h"),
            "sell_24h": (trade or {}).get("sell_24h"),
            "unique_wallet_24h": (trade or {}).get("unique_wallet_24h"),
            "logo_uri": (meta or {}).get("logo_uri") or (overview or {}).get("logoURI"),
            "meme_detail": meme_detail,
            "price_stats": stats,
        }

    # ── Spot Swap Execution Tools ─────────────────────────────────────────────

    async def build_swap_transaction(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        user_public_key: str,
        slippage_bps: int = 250,
        dynamic_slippage: bool = False,
    ) -> dict:
        """Build a signable Jupiter Swap API v2 transaction.

        Returns a base64-encoded transaction that the user signs in their wallet.
        This is the primary swap execution path.
        """
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": str(slippage_bps),
            "taker": user_public_key,
        }
        if dynamic_slippage:
            params["dynamicSlippage"] = "true"
            params.pop("slippageBps")

        sess = await self._http()
        async with sess.get(
            f"{JUP_SWAP_V2}/order",
            params=params,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        ) as r:
            if r.status != 200:
                return {"error": f"Jupiter /order {r.status}: {await r.text()}"}
            data = await r.json()

        tx_base64 = data.get("transaction")
        if not tx_base64:
            return {"error": "Jupiter returned no transaction. Try with a larger amount or different pair."}

        out_amount = int(data.get("outAmount", 0))
        decimals = await _fetch_token_decimals()
        out_dec = decimals.get(output_mint, 9)

        return {
            "swap_transaction_base64": tx_base64,
            "input_mint": input_mint,
            "output_mint": output_mint,
            "input_amount_raw": str(amount),
            "output_amount_estimate": out_amount / (10 ** out_dec),
            "route": data.get("routePlan", []),
            "price_impact_pct": float(data.get("priceImpactPct", 0)) * 100,
            "last_valid_block_height": data.get("lastValidBlockHeight"),
            "signing_required": True,
            "note": "User must sign this transaction in their Solana wallet (Phantom, Backpack, etc.).",
        }

    async def buy_meme_token(
        self,
        mint: str,
        sol_amount: float,
        user_public_key: str,
        slippage_bps: int = 250,
    ) -> dict:
        """Build a swap transaction to buy a memecoin with SOL.

        Returns a base64-encoded, unsigned swap transaction for the user to sign.
        """
        atomic = int(sol_amount * LAMPORTS_PER_SOL)
        return await self.build_swap_transaction(
            input_mint=SOL_MINT,
            output_mint=mint,
            amount=atomic,
            user_public_key=user_public_key,
            slippage_bps=slippage_bps,
        )

    async def sell_meme_token(
        self,
        mint: str,
        token_amount: float,
        decimals: int = 6,
        user_public_key: str = "",
        slippage_bps: int = 250,
    ) -> dict:
        """Build a swap transaction to sell a memecoin for SOL.

        Returns a base64-encoded, unsigned swap transaction for the user to sign.
        If decimals are unknown, pass 0 and the tool will look them up.
        """
        if decimals == 0:
            dec_map = await _fetch_token_decimals()
            decimals = dec_map.get(mint, 6)
        atomic = int(token_amount * (10 ** decimals))
        return await self.build_swap_transaction(
            input_mint=mint,
            output_mint=SOL_MINT,
            amount=atomic,
            user_public_key=user_public_key,
            slippage_bps=slippage_bps,
        )

    # ── Automation / Strategy Tools ───────────────────────────────────────────

    async def start_automated_strategy(
        self,
        symbol: str,
        strategy_type: str = "ta",
        config_json: Optional[str] = None,
        mode: str = "paper",
        interval_seconds: int = 300,
        rules: Optional[list] = None,
    ) -> dict:
        """Start a Vulcan TA strategy runner.

        The strategy monitors the market and trades automatically based on
        rule conditions (EMA cross, RSI mean-reversion, etc.).

        Use 'paper' mode to test first, then 'auto-execute' for live.
        Requires 'vulcan' CLI to be installed and configured.
        """
        if not rules:
            # Default: simple EMA-9/21 cross trend-follow strategy
            rules = [
                {
                    "name": "entry-long",
                    "when": {
                        "crosses": {
                            "left": {"indicator": {"kind": "ema", "timeframe": "15m", "period": 9}},
                            "right": {"indicator": {"kind": "ema", "timeframe": "15m", "period": 21}},
                            "direction": "above",
                        }
                    },
                    "do": {"kind": "open", "side": "buy", "size": {"tokens": 0.5}},
                    "only_if_position": "flat",
                },
                {
                    "name": "exit-on-cross-down",
                    "when": {
                        "crosses": {
                            "left": {"indicator": {"kind": "ema", "timeframe": "15m", "period": 9}},
                            "right": {"indicator": {"kind": "ema", "timeframe": "15m", "period": 21}},
                            "direction": "below",
                        }
                    },
                    "do": {"kind": "close"},
                    "only_if_position": "long",
                },
            ]

        config = {
            "symbol": symbol,
            "interval_seconds": interval_seconds,
            "margin_mode": "cross",
            "max_concurrent_position_tokens": 5.0,
            "max_firings": 50,
            "rules": rules,
        }

        # If user passed raw JSON, merge or override
        if config_json:
            try:
                overrides = json.loads(config_json)
                config.update(overrides)
            except json.JSONDecodeError as e:
                return {"error": f"Invalid config JSON: {e}"}

        config_str = json.dumps(config)

        cmd = [
            VULCAN_BIN,
            "strategy",
            "ta",
            "start",
            "--config-json", config_str,
            "--mode", mode,
            "--max-ticks", "50",
        ]
        if mode != "paper":
            cmd.append("--yes")

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
        except asyncio.TimeoutError:
            return {"error": "Vulcan strategy timed out after 30s. Check vulcan configuration."}
        except FileNotFoundError:
            return {"error": "Vulcan CLI not found. Install with: curl -fsSL https://github.com/Ellipsis-Labs/vulcan-cli/releases/latest/download/install.sh | sh"}
        except Exception as e:
            return {"error": f"Failed to start strategy: {e}"}

        stdout_text = stdout.decode() if stdout else ""
        stderr_text = stderr.decode() if stderr else ""

        if proc.returncode != 0:
            return {
                "error": f"Vulcan exited {proc.returncode}",
                "stderr": stderr_text.strip(),
                "stdout": stdout_text.strip(),
            }

        # Try to extract run_id from JSON output
        run_id = ""
        for line in stdout_text.splitlines():
            line = line.strip()
            if line.startswith("{"):
                try:
                    parsed = json.loads(line)
                    if isinstance(parsed, dict):
                        run_id = parsed.get("run_id") or parsed.get("id") or parsed.get("runId") or ""
                        if run_id:
                            break
                except json.JSONDecodeError:
                    pass
            # Also try text: "Run ID: abc123"
            if "run id" in line.lower() or "run_id" in line.lower():
                parts = line.split()
                for p in parts:
                    if len(p) > 10 and not p.startswith(("-", "--")):
                        run_id = p.strip()

        self._strategy = StrategyState(
            run_id=run_id,
            symbol=symbol,
            mode=mode,
        )

        return {
            "strategy_started": True,
            "run_id": run_id or "see output below",
            "symbol": symbol,
            "mode": mode,
            "rules_count": len(rules),
            "output": stdout_text.strip()[:1000],
            "note": "Use get_strategy_status to check progress. Paper mode = no real trades.",
        }

    async def get_strategy_status(self, run_id: Optional[str] = None) -> dict:
        """Check the status of a running Vulcan strategy."""
        rid = run_id or (self._strategy.run_id if self._strategy else None)
        if not rid:
            return {"error": "No run_id provided and no active strategy tracked. Start one first with start_automated_strategy."}

        cmd = [VULCAN_BIN, "strategy", "status", rid]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15.0)
        except asyncio.TimeoutError:
            return {"error": "Vulcan status timed out."}
        except FileNotFoundError:
            return {"error": "Vulcan CLI not found."}
        except Exception as e:
            return {"error": f"Failed to get status: {e}"}

        stdout_text = stdout.decode() if stdout else ""
        stderr_text = stderr.decode() if stderr else ""

        if proc.returncode != 0:
            return {
                "error": f"Vulcan exited {proc.returncode}",
                "stderr": stderr_text.strip(),
                "stdout": stdout_text.strip(),
            }

        return {
            "run_id": rid,
            "status_output": stdout_text.strip()[:2000],
            "is_running": "running" in stdout_text.lower() or "active" in stdout_text.lower(),
        }

    async def stop_strategy(self, run_id: Optional[str] = None) -> dict:
        """Stop a running Vulcan strategy."""
        rid = run_id or (self._strategy.run_id if self._strategy else None)
        if not rid:
            return {"error": "No run_id provided and no active strategy tracked."}

        cmd = [VULCAN_BIN, "strategy", "stop", rid]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15.0)
        except Exception as e:
            return {"error": f"Failed to stop strategy: {e}"}

        if self._strategy and self._strategy.run_id == rid:
            self._strategy = None

        return {
            "stopped": True,
            "run_id": rid,
            "output": (stdout.decode() if stdout else "").strip()[:500],
        }
