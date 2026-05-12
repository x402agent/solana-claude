"""Birdeye API Client for Token Price and Market Data"""

import httpx
import websockets
import json
import asyncio
from typing import Optional, Any, Callable, Dict, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


BIRDEYE_API_BASE_URL = "https://public-api.birdeye.so"
BIRDEYE_WSS_URL = "wss://public-api.birdeye.so/socket/solana"


class BirdeyeWSEvent(str, Enum):
    """Birdeye WebSocket event types"""
    SUBSCRIBE_PRICE = "SUBSCRIBE_PRICE"
    SUBSCRIBE_BASE_QUOTE_PRICE = "SUBSCRIBE_BASE_QUOTE_PRICE"
    SUBSCRIBE_TOKEN_NEW_LISTING = "SUBSCRIBE_TOKEN_NEW_LISTING"
    SUBSCRIBE_NEW_PAIR = "SUBSCRIBE_NEW_PAIR"
    SUBSCRIBE_LARGE_TRADE_TXS = "SUBSCRIBE_LARGE_TRADE_TXS"
    SUBSCRIBE_WALLET_TXS = "SUBSCRIBE_WALLET_TXS"
    SUBSCRIBE_TOKEN_STATS = "SUBSCRIBE_TOKEN_STATS"


@dataclass
class TokenPrice:
    """Token price info"""
    mint: str
    symbol: str
    name: str
    price: float
    price_change_24h: float
    volume_24h: float
    liquidity: float
    timestamp: datetime


@dataclass
class TokenOverview:
    """Comprehensive token overview"""
    mint: str
    symbol: str
    name: str
    decimals: int
    price: float
    price_change_24h: float
    price_change_1h: float
    volume_24h: float
    volume_change_24h: float
    liquidity: float
    market_cap: float
    supply: float
    holder_count: int
    extensions: dict


@dataclass
class OHLCVData:
    """OHLCV candle data"""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class BirdeyeClient:
    """Client for Birdeye Token Data API"""
    
    def __init__(
        self,
        api_key: str,
        base_url: str = BIRDEYE_API_BASE_URL,
        chain: str = "solana",
    ):
        """
        Initialize Birdeye client.
        
        Args:
            api_key: Birdeye API key
            base_url: API base URL
            chain: Blockchain (default: solana)
        """
        self.api_key = api_key
        self.base_url = base_url
        self.chain = chain
        
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "X-API-KEY": api_key,
                "x-chain": chain,
            },
            timeout=30.0
        )
    
    async def _get(self, endpoint: str, params: dict = None) -> Any:
        """Make GET request to Birdeye API"""
        response = await self._client.get(endpoint, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success", True):
            raise Exception(f"Birdeye API error: {data.get('message', 'Unknown error')}")
        
        return data.get("data", data)
    
    # =====================
    # Price Methods
    # =====================
    
    async def get_token_price(self, mint: str) -> dict:
        """
        Get current price for a token.
        
        Args:
            mint: Token mint address
            
        Returns:
            Price data
        """
        return await self._get("/defi/price", params={"address": mint})
    
    async def get_multi_token_prices(self, mints: list[str]) -> dict:
        """
        Get prices for multiple tokens.
        
        Args:
            mints: List of token mint addresses
            
        Returns:
            Dict of mint -> price data
        """
        addresses = ",".join(mints)
        return await self._get("/defi/multi_price", params={"list_address": addresses})
    
    async def get_token_price_history(
        self,
        mint: str,
        address_type: str = "token",
        time_type: str = "24h",
    ) -> list[dict]:
        """
        Get price history for a token.
        
        Args:
            mint: Token mint address
            address_type: 'token' or 'pair'
            time_type: '24h', '7d', '30d', '1y'
            
        Returns:
            List of price points
        """
        return await self._get(
            "/defi/history_price",
            params={
                "address": mint,
                "address_type": address_type,
                "type": time_type,
            }
        )
    
    # =====================
    # Token Info Methods
    # =====================
    
    async def get_token_overview(self, mint: str) -> TokenOverview:
        """
        Get comprehensive token overview.
        
        Args:
            mint: Token mint address
            
        Returns:
            TokenOverview with all token data
        """
        data = await self._get("/defi/token_overview", params={"address": mint})
        
        return TokenOverview(
            mint=mint,
            symbol=data.get("symbol", ""),
            name=data.get("name", ""),
            decimals=data.get("decimals", 0),
            price=float(data.get("price", 0)),
            price_change_24h=float(data.get("priceChange24h", 0)),
            price_change_1h=float(data.get("priceChange1h", 0)),
            volume_24h=float(data.get("v24h", 0)),
            volume_change_24h=float(data.get("v24hChangePercent", 0)),
            liquidity=float(data.get("liquidity", 0)),
            market_cap=float(data.get("mc", 0)),
            supply=float(data.get("supply", 0)),
            holder_count=int(data.get("holder", 0)),
            extensions=data.get("extensions", {}),
        )
    
    async def get_token_security(self, mint: str) -> dict:
        """
        Get token security info (ownership, mintability, etc.).
        
        Args:
            mint: Token mint address
            
        Returns:
            Security info
        """
        return await self._get("/defi/token_security", params={"address": mint})
    
    async def get_token_creation_info(self, mint: str) -> dict:
        """
        Get token creation information.
        
        Args:
            mint: Token mint address
            
        Returns:
            Creation info including creator, timestamp, etc.
        """
        return await self._get("/defi/token_creation_info", params={"address": mint})
    
    async def get_token_metadata(self, mint: str) -> dict:
        """
        Get token metadata.
        
        Args:
            mint: Token mint address
            
        Returns:
            Token metadata
        """
        return await self._get("/defi/v3/token/meta-data/single", params={"address": mint})
    
    # =====================
    # Market Data Methods
    # =====================
    
    async def get_ohlcv(
        self,
        mint: str,
        time_type: str = "15m",
        time_from: Optional[int] = None,
        time_to: Optional[int] = None,
    ) -> list[OHLCVData]:
        """
        Get OHLCV (candlestick) data.
        
        Args:
            mint: Token mint address
            time_type: Candle interval ('1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', '6H', '8H', '12H', '1D', '3D', '1W', '1M')
            time_from: Start timestamp (unix)
            time_to: End timestamp (unix)
            
        Returns:
            List of OHLCV candles
        """
        params = {
            "address": mint,
            "type": time_type,
        }
        if time_from:
            params["time_from"] = time_from
        if time_to:
            params["time_to"] = time_to
        
        data = await self._get("/defi/ohlcv", params=params)
        items = data.get("items", []) if isinstance(data, dict) else data
        
        return [
            OHLCVData(
                timestamp=item.get("unixTime", 0),
                open=float(item.get("o", 0)),
                high=float(item.get("h", 0)),
                low=float(item.get("l", 0)),
                close=float(item.get("c", 0)),
                volume=float(item.get("v", 0)),
            )
            for item in items
        ]
    
    async def get_trades(
        self,
        mint: str,
        trade_type: str = "swap",
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """
        Get recent trades for a token.
        
        Args:
            mint: Token mint address
            trade_type: 'swap' or 'all'
            limit: Max trades to return
            offset: Pagination offset
            
        Returns:
            List of trades
        """
        return await self._get(
            "/defi/txs/token",
            params={
                "address": mint,
                "tx_type": trade_type,
                "limit": limit,
                "offset": offset,
            }
        )
    
    async def get_pair_trades(
        self,
        pair_address: str,
        trade_type: str = "swap",
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """
        Get recent trades for a liquidity pair.
        
        Args:
            pair_address: Pair/pool address
            trade_type: 'swap' or 'all'
            limit: Max trades to return
            offset: Pagination offset
            
        Returns:
            List of trades
        """
        return await self._get(
            "/defi/txs/pair",
            params={
                "address": pair_address,
                "tx_type": trade_type,
                "limit": limit,
                "offset": offset,
            }
        )
    
    # =====================
    # Wallet Methods
    # =====================
    
    async def get_wallet_portfolio(self, wallet: str) -> dict:
        """
        Get wallet portfolio with all token holdings.
        
        Args:
            wallet: Wallet address
            
        Returns:
            Portfolio data
        """
        return await self._get("/v1/wallet/token_list", params={"wallet": wallet})
    
    async def get_wallet_token_balance(self, wallet: str, mint: str) -> dict:
        """
        Get specific token balance for a wallet.
        
        Args:
            wallet: Wallet address
            mint: Token mint address
            
        Returns:
            Token balance info
        """
        return await self._get(
            "/v1/wallet/token_balance",
            params={"wallet": wallet, "token_address": mint}
        )
    
    async def get_wallet_transactions(
        self,
        wallet: str,
        limit: int = 50,
        before_time: Optional[int] = None,
    ) -> list[dict]:
        """
        Get wallet transaction history.

        Args:
            wallet: Wallet address
            limit: Max transactions
            before_time: Get transactions before this timestamp

        Returns:
            List of transactions
        """
        params = {"wallet": wallet, "limit": limit}
        if before_time:
            params["before_time"] = before_time

        return await self._get("/v1/wallet/tx_list", params=params)

    # =====================
    # Wallet Net Worth & PnL Methods
    # =====================

    async def get_wallet_net_worth(
        self,
        wallet: str,
        filter_value: Optional[float] = None,
        sort_by: str = "value",
        sort_type: str = "desc",
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """
        Get current net worth and portfolio of a wallet.

        Args:
            wallet: Wallet address
            filter_value: Filter assets >= this value
            sort_by: Sort field (default: 'value')
            sort_type: 'desc' or 'asc'
            limit: Max assets to return
            offset: Pagination offset

        Returns:
            Net worth data with asset list
        """
        params = {
            "wallet": wallet,
            "sort_by": sort_by,
            "sort_type": sort_type,
            "limit": limit,
            "offset": offset,
        }
        if filter_value is not None:
            params["filter_value"] = filter_value

        return await self._get("/wallet/v2/current-net-worth", params=params)

    async def get_wallet_net_worth_chart(
        self,
        wallet: str,
        count: int = 7,
        direction: str = "back",
        time: Optional[str] = None,
        time_type: str = "1d",
        sort_type: str = "desc",
    ) -> dict:
        """
        Get historical net worth chart data.

        Args:
            wallet: Wallet address
            count: Number of intervals (1-30)
            direction: 'back' or 'forward'
            time: Base timestamp (ISO 8601 UTC, e.g., '2025-07-31 23:59:59')
            time_type: '1h' or '1d'
            sort_type: 'desc' or 'asc'

        Returns:
            Historical net worth data
        """
        params = {
            "wallet": wallet,
            "count": count,
            "direction": direction,
            "type": time_type,
            "sort_type": sort_type,
        }
        if time:
            params["time"] = time

        return await self._get("/wallet/v2/net-worth", params=params)

    async def get_wallet_net_worth_details(
        self,
        wallet: str,
        time: Optional[str] = None,
        time_type: str = "1d",
        sort_type: str = "desc",
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """
        Get asset details of a wallet at a specific time.

        Args:
            wallet: Wallet address
            time: Timestamp (ISO 8601 UTC)
            time_type: '1h' or '1d' (time must be within 7 days for '1h')
            sort_type: 'desc' or 'asc'
            limit: Max assets
            offset: Pagination offset

        Returns:
            Asset details at specified time
        """
        params = {
            "wallet": wallet,
            "type": time_type,
            "sort_type": sort_type,
            "limit": limit,
            "offset": offset,
        }
        if time:
            params["time"] = time

        return await self._get("/wallet/v2/net-worth-details", params=params)

    async def get_wallet_pnl_summary(
        self,
        wallet: str,
        duration: str = "all",
    ) -> dict:
        """
        Get PnL (Profit & Loss) summary for a wallet.

        Args:
            wallet: Wallet address
            duration: 'all', '90d', '30d', '7d', '24h'

        Returns:
            PnL summary with realized/unrealized profit, trade counts, win rate
        """
        return await self._get(
            "/wallet/v2/pnl/summary",
            params={"wallet": wallet, "duration": duration}
        )

    async def _post(self, endpoint: str, json_data: dict = None) -> Any:
        """Make POST request to Birdeye API"""
        response = await self._client.post(endpoint, json=json_data)
        response.raise_for_status()
        data = response.json()

        if not data.get("success", True):
            raise Exception(f"Birdeye API error: {data.get('message', 'Unknown error')}")

        return data.get("data", data)

    async def get_wallet_pnl_details(
        self,
        wallet: str,
        token_addresses: Optional[list[str]] = None,
        sort_by: str = "value",
        sort_type: str = "desc",
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """
        Get detailed PnL broken down by token.

        Args:
            wallet: Wallet address
            token_addresses: Optional list of specific tokens (max 100)
            sort_by: 'value' or 'last_trade'
            sort_type: 'desc' or 'asc'
            limit: Max tokens
            offset: Pagination offset

        Returns:
            Detailed PnL per token
        """
        body = {
            "wallet": wallet,
            "sort_by": sort_by,
            "sort_type": sort_type,
            "limit": limit,
            "offset": offset,
        }
        if token_addresses:
            body["token_addresses"] = token_addresses

        return await self._post("/wallet/v2/pnl/details", json_data=body)
    
    # =====================
    # OHLCV & Price Chart Methods (Additional)
    # =====================

    async def get_ohlcv_pair(
        self,
        address: str,
        type: str = "15m",
        time_from: int = None,
        time_to: int = None,
    ) -> dict:
        """
        Get OHLCV candlestick data for a trading pair.

        Args:
            address: Pair address
            type: Time frame
            time_from: Unix timestamp in seconds
            time_to: Unix timestamp in seconds

        Returns:
            OHLCV data for the pair
        """
        import time

        if time_to is None:
            time_to = int(time.time())
        if time_from is None:
            time_from = time_to - 86400

        params = {
            "address": address,
            "type": type,
            "time_from": time_from,
            "time_to": time_to,
        }

        return await self._get("/defi/ohlcv/pair", params=params)

    async def get_ohlcv_base_quote(
        self,
        base_address: str,
        quote_address: str = "So11111111111111111111111111111111111111112",  # SOL
        type: str = "15m",
        time_from: int = None,
        time_to: int = None,
    ) -> dict:
        """
        Get OHLCV data for a base-quote pair.

        Args:
            base_address: Base token address
            quote_address: Quote token address (default: SOL)
            type: Time frame
            time_from: Unix timestamp in seconds
            time_to: Unix timestamp in seconds

        Returns:
            OHLCV data for base/quote pair
        """
        import time

        if time_to is None:
            time_to = int(time.time())
        if time_from is None:
            time_from = time_to - 86400

        params = {
            "base_address": base_address,
            "quote_address": quote_address,
            "type": type,
            "time_from": time_from,
            "time_to": time_to,
        }

        return await self._get("/defi/ohlcv/base_quote", params=params)

    # =====================
    # Search & Discovery Methods
    # =====================

    async def search_token(self, query: str, limit: int = 20) -> list[dict]:
        """
        Search for tokens by name or symbol.
        
        Args:
            query: Search query
            limit: Max results
            
        Returns:
            List of matching tokens
        """
        return await self._get(
            "/defi/v3/search",
            params={"keyword": query, "limit": limit}
        )
    
    async def get_trending_tokens(
        self,
        sort_by: str = "v24hUSD",
        sort_type: str = "desc",
        offset: int = 0,
        limit: int = 20,
    ) -> list[dict]:
        """
        Get trending/top tokens.
        
        Args:
            sort_by: Sort field ('v24hUSD', 'mc', 'liquidity', 'v24hChangePercent')
            sort_type: 'asc' or 'desc'
            offset: Pagination offset
            limit: Max results
            
        Returns:
            List of trending tokens
        """
        # Use v3 token list endpoint
        try:
            data = await self._get(
                "/defi/v3/token/list",
                params={
                    "sort_by": sort_by,
                    "sort_type": sort_type,
                    "offset": offset,
                    "limit": limit,
                }
            )
            return data.get("tokens", []) if isinstance(data, dict) else data
        except Exception:
            # Fallback to search for popular tokens
            return await self.search_token("SOL", limit=limit)
    
    async def get_new_listings(self, limit: int = 50) -> list[dict]:
        """
        Get newly listed tokens.
        
        Args:
            limit: Max results
            
        Returns:
            List of new tokens
        """
        return await self._get(
            "/defi/v2/tokens/new_listing",
            params={"limit": limit}
        )
    
    async def get_gainers_losers(
        self,
        time_type: str = "24h",
        sort_type: str = "desc",
        limit: int = 20,
    ) -> list[dict]:
        """
        Get top gainers or losers.
        
        Args:
            time_type: '24h', '7d', etc.
            sort_type: 'desc' for gainers, 'asc' for losers
            limit: Max results
            
        Returns:
            List of tokens
        """
        return await self._get(
            "/defi/price_change",
            params={
                "type": time_type,
                "sort_type": sort_type,
                "limit": limit,
            }
        )
    
    # =====================
    # Pair/Pool Methods
    # =====================
    
    async def get_token_markets(self, mint: str, limit: int = 20) -> list[dict]:
        """
        Get all markets/pairs for a token.
        
        Args:
            mint: Token mint address
            limit: Max results
            
        Returns:
            List of pairs
        """
        return await self._get(
            "/defi/v2/markets",
            params={"address": mint, "limit": limit}
        )
    
    async def get_pair_overview(self, pair_address: str) -> dict:
        """
        Get pair/pool overview.
        
        Args:
            pair_address: Pair address
            
        Returns:
            Pair data
        """
        return await self._get("/defi/pair_overview", params={"address": pair_address})
    
    # =====================
    # Utility Methods
    # =====================
    
    async def get_supported_chains(self) -> list[str]:
        """Get list of supported blockchains"""
        data = await self._get("/v1/public/chain/list")
        return [chain.get("name") for chain in data] if isinstance(data, list) else []
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
    
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


class BirdeyeWebSocketClient:
    """WebSocket client for real-time Birdeye data streams"""

    def __init__(self, api_key: str, chain: str = "solana"):
        """
        Initialize Birdeye WebSocket client.

        Args:
            api_key: Birdeye API key
            chain: Blockchain (default: solana)
        """
        self.api_key = api_key
        self.chain = chain
        self.ws_url = f"{BIRDEYE_WSS_URL}?x-api-key={api_key}"

        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.handlers: Dict[str, List[Callable]] = {}
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.ping_task: Optional[asyncio.Task] = None
        self.listen_task: Optional[asyncio.Task] = None

    async def connect(self):
        """Establish WebSocket connection"""
        try:
            self.websocket = await websockets.connect(self.ws_url)
            self.is_connected = True
            self.reconnect_attempts = 0
            print(f"✓ Connected to Birdeye WebSocket ({self.chain})")

            # Start ping-pong task
            self.ping_task = asyncio.create_task(self._ping_loop())

            # Start listening task
            self.listen_task = asyncio.create_task(self._listen_loop())

        except Exception as e:
            print(f"Failed to connect to Birdeye WebSocket: {e}")
            self.is_connected = False
            raise

    async def disconnect(self):
        """Close WebSocket connection"""
        self.is_connected = False

        if self.ping_task:
            self.ping_task.cancel()
        if self.listen_task:
            self.listen_task.cancel()

        if self.websocket:
            await self.websocket.close()

        print("Disconnected from Birdeye WebSocket")

    async def _ping_loop(self):
        """Send periodic ping to keep connection alive"""
        while self.is_connected:
            try:
                if self.websocket:
                    await self.websocket.ping()
                await asyncio.sleep(30)  # Ping every 30 seconds
            except Exception as e:
                print(f"Ping failed: {e}")
                await self._reconnect()

    async def _listen_loop(self):
        """Listen for incoming WebSocket messages"""
        while self.is_connected:
            try:
                if not self.websocket:
                    break

                message = await self.websocket.recv()
                data = json.loads(message)

                # Handle different message types
                event_type = data.get("type")
                if event_type and event_type in self.handlers:
                    for handler in self.handlers[event_type]:
                        try:
                            await handler(data)
                        except Exception as e:
                            print(f"Error in handler for {event_type}: {e}")

            except websockets.exceptions.ConnectionClosed:
                print("WebSocket connection closed")
                await self._reconnect()
            except Exception as e:
                print(f"Error in listen loop: {e}")
                await asyncio.sleep(1)

    async def _reconnect(self):
        """Attempt to reconnect"""
        if not self.is_connected or self.reconnect_attempts >= self.max_reconnect_attempts:
            return

        self.reconnect_attempts += 1
        print(f"Reconnecting... (attempt {self.reconnect_attempts}/{self.max_reconnect_attempts})")

        await asyncio.sleep(min(2 ** self.reconnect_attempts, 60))  # Exponential backoff

        try:
            await self.connect()
        except Exception as e:
            print(f"Reconnection failed: {e}")

    def on(self, event_type: str, handler: Callable):
        """
        Register an event handler.

        Args:
            event_type: Event type to listen for
            handler: Async callback function
        """
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)

    async def subscribe_price(self, address: str):
        """
        Subscribe to real-time OHLCV price updates.

        Args:
            address: Token address
        """
        await self._send({
            "type": BirdeyeWSEvent.SUBSCRIBE_PRICE,
            "data": {"address": address}
        })

    async def subscribe_base_quote_price(self, base_address: str, quote_address: str):
        """
        Subscribe to base-quote pair price updates.

        Args:
            base_address: Base token address
            quote_address: Quote token address
        """
        await self._send({
            "type": BirdeyeWSEvent.SUBSCRIBE_BASE_QUOTE_PRICE,
            "data": {
                "baseAddress": base_address,
                "quoteAddress": quote_address
            }
        })

    async def subscribe_new_listings(self):
        """Subscribe to new token listings"""
        await self._send({
            "type": BirdeyeWSEvent.SUBSCRIBE_TOKEN_NEW_LISTING,
            "data": {}
        })

    async def subscribe_new_pairs(self):
        """Subscribe to new liquidity pair listings"""
        await self._send({
            "type": BirdeyeWSEvent.SUBSCRIBE_NEW_PAIR,
            "data": {}
        })

    async def subscribe_large_trades(self, threshold_usd: float = 10000):
        """
        Subscribe to large trade transactions.

        Args:
            threshold_usd: Minimum trade value in USD
        """
        await self._send({
            "type": BirdeyeWSEvent.SUBSCRIBE_LARGE_TRADE_TXS,
            "data": {"threshold": threshold_usd}
        })

    async def subscribe_wallet_transactions(self, wallet_address: str):
        """
        Subscribe to transactions for a specific wallet.

        Args:
            wallet_address: Wallet address to monitor
        """
        await self._send({
            "type": BirdeyeWSEvent.SUBSCRIBE_WALLET_TXS,
            "data": {"address": wallet_address}
        })

    async def subscribe_token_stats(self, address: str):
        """
        Subscribe to token statistics updates.

        Args:
            address: Token address
        """
        await self._send({
            "type": BirdeyeWSEvent.SUBSCRIBE_TOKEN_STATS,
            "data": {"address": address}
        })

    async def _send(self, message: dict):
        """Send a message to the WebSocket"""
        if not self.websocket or not self.is_connected:
            raise Exception("WebSocket not connected")

        await self.websocket.send(json.dumps(message))

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
