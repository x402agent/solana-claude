"""CoinGecko API Client for Real-Time Cryptocurrency Data"""

import httpx
from typing import Optional, List, Dict, Any


class CoinGeckoClient:
    """Client for CoinGecko Pro API"""

    def __init__(self, api_key: str, use_pro: bool = True):
        """
        Initialize CoinGecko client.

        Args:
            api_key: CoinGecko Pro API key
            use_pro: Use Pro API endpoint (default: True)
        """
        self.api_key = api_key
        self.base_url = "https://pro-api.coingecko.com/api/v3" if use_pro else "https://api.coingecko.com/api/v3"

        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "x-cg-pro-api-key": api_key,
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    async def get_price(
        self,
        coin_ids: List[str],
        vs_currencies: List[str] = ["usd"],
        include_market_cap: bool = True,
        include_24hr_vol: bool = True,
        include_24hr_change: bool = True,
        include_last_updated_at: bool = True,
    ) -> Dict[str, Any]:
        """
        Get current prices for coins by their IDs.

        Args:
            coin_ids: List of coin IDs (e.g., ["bitcoin", "ethereum"])
            vs_currencies: Target currencies (default: ["usd"])
            include_market_cap: Include market cap data
            include_24hr_vol: Include 24hr volume
            include_24hr_change: Include 24hr price change
            include_last_updated_at: Include last updated timestamp

        Returns:
            Dict with price data for each coin
        """
        params = {
            "ids": ",".join(coin_ids),
            "vs_currencies": ",".join(vs_currencies),
            "include_market_cap": str(include_market_cap).lower(),
            "include_24hr_vol": str(include_24hr_vol).lower(),
            "include_24hr_change": str(include_24hr_change).lower(),
            "include_last_updated_at": str(include_last_updated_at).lower(),
        }

        response = await self._client.get("/simple/price", params=params)
        response.raise_for_status()
        return response.json()

    async def get_coin_markets(
        self,
        vs_currency: str = "usd",
        ids: Optional[List[str]] = None,
        category: Optional[str] = None,
        order: str = "market_cap_desc",
        per_page: int = 100,
        page: int = 1,
        sparkline: bool = False,
        price_change_percentage: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get market data for coins (price, market cap, volume, etc.).

        Args:
            vs_currency: Target currency (default: "usd")
            ids: Filter by coin IDs
            category: Filter by category
            order: Sort order (market_cap_desc, volume_desc, etc.)
            per_page: Results per page (max 250)
            page: Page number
            sparkline: Include 7-day sparkline
            price_change_percentage: Include price change for periods (e.g., "1h,24h,7d")

        Returns:
            List of coin market data
        """
        params = {
            "vs_currency": vs_currency,
            "order": order,
            "per_page": per_page,
            "page": page,
            "sparkline": str(sparkline).lower(),
        }

        if ids:
            params["ids"] = ",".join(ids)
        if category:
            params["category"] = category
        if price_change_percentage:
            params["price_change_percentage"] = price_change_percentage

        response = await self._client.get("/coins/markets", params=params)
        response.raise_for_status()
        return response.json()

    async def get_coin_data(
        self,
        coin_id: str,
        localization: bool = False,
        tickers: bool = False,
        market_data: bool = True,
        community_data: bool = False,
        developer_data: bool = False,
        sparkline: bool = False,
    ) -> Dict[str, Any]:
        """
        Get detailed data for a specific coin.

        Args:
            coin_id: Coin ID (e.g., "bitcoin")
            localization: Include localized data
            tickers: Include ticker data
            market_data: Include market data
            community_data: Include community data
            developer_data: Include developer data
            sparkline: Include sparkline

        Returns:
            Detailed coin data
        """
        params = {
            "localization": str(localization).lower(),
            "tickers": str(tickers).lower(),
            "market_data": str(market_data).lower(),
            "community_data": str(community_data).lower(),
            "developer_data": str(developer_data).lower(),
            "sparkline": str(sparkline).lower(),
        }

        response = await self._client.get(f"/coins/{coin_id}", params=params)
        response.raise_for_status()
        return response.json()

    async def get_market_chart(
        self,
        coin_id: str,
        vs_currency: str = "usd",
        days: int = 30,
        interval: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get historical market data (price, market cap, volume).

        Args:
            coin_id: Coin ID (e.g., "bitcoin")
            vs_currency: Target currency (default: "usd")
            days: Number of days (1/7/14/30/90/180/365/max)
            interval: Data interval (daily for 90+ days, leave None for auto)

        Returns:
            Historical chart data with prices, market caps, volumes
        """
        params = {
            "vs_currency": vs_currency,
            "days": days,
        }

        if interval:
            params["interval"] = interval

        response = await self._client.get(f"/coins/{coin_id}/market_chart", params=params)
        response.raise_for_status()
        return response.json()

    async def get_trending(self) -> Dict[str, Any]:
        """
        Get trending search coins in the last 24 hours.

        Returns:
            Trending coins data
        """
        response = await self._client.get("/search/trending")
        response.raise_for_status()
        return response.json()

    async def get_global_data(self) -> Dict[str, Any]:
        """
        Get global cryptocurrency market data.

        Returns:
            Global market data (total market cap, volume, BTC dominance, etc.)
        """
        response = await self._client.get("/global")
        response.raise_for_status()
        return response.json()

    async def search_coins(self, query: str) -> Dict[str, Any]:
        """
        Search for coins, categories, and markets.

        Args:
            query: Search query

        Returns:
            Search results
        """
        params = {"query": query}
        response = await self._client.get("/search", params=params)
        response.raise_for_status()
        return response.json()

    async def get_coin_ohlc(
        self,
        coin_id: str,
        vs_currency: str = "usd",
        days: int = 7,
    ) -> List[List[float]]:
        """
        Get OHLC (Open, High, Low, Close) chart data.

        Args:
            coin_id: Coin ID (e.g., "bitcoin")
            vs_currency: Target currency (default: "usd")
            days: Number of days (1/7/14/30/90/180/365)

        Returns:
            OHLC data [[timestamp, open, high, low, close], ...]
        """
        params = {
            "vs_currency": vs_currency,
            "days": days,
        }

        response = await self._client.get(f"/coins/{coin_id}/ohlc", params=params)
        response.raise_for_status()
        return response.json()

    async def get_top_gainers_losers(self) -> Dict[str, Any]:
        """
        Get top 30 coins with largest price gain and loss (requires Pro API).

        Returns:
            Top gainers and losers data
        """
        response = await self._client.get("/coins/top_gainers_losers")
        response.raise_for_status()
        return response.json()

    async def get_categories(self) -> List[Dict[str, Any]]:
        """
        Get all coin categories with market data.

        Returns:
            List of categories with market data
        """
        response = await self._client.get("/coins/categories")
        response.raise_for_status()
        return response.json()

    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


# Factory function for easy initialization
def create_coingecko_client(api_key: Optional[str] = None) -> Optional[CoinGeckoClient]:
    """
    Create a CoinGecko client from environment variables or parameters.

    Args:
        api_key: CoinGecko API key (or COINGECKO_API_KEY env var)

    Returns:
        CoinGeckoClient instance or None if API key is missing
    """
    import os

    api_key = api_key or os.getenv("COINGECKO_API_KEY")

    if not api_key:
        return None

    return CoinGeckoClient(api_key=api_key)
