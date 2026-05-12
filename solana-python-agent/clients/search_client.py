"""SearchAPI Client for Real-Time Web Search"""

import httpx
from typing import Optional, Dict, Any, List
from dataclasses import dataclass


SEARCHAPI_BASE_URL = "https://www.searchapi.io/api/v1"


@dataclass
class SearchResult:
    """Single search result"""
    position: int
    title: str
    link: str
    snippet: str
    source: Optional[str] = None
    date: Optional[str] = None


@dataclass
class SearchResponse:
    """Complete search response"""
    query: str
    total_results: int
    results: List[SearchResult]
    ai_overview: Optional[str] = None
    knowledge_graph: Optional[Dict[str, Any]] = None
    answer_box: Optional[Dict[str, Any]] = None
    related_searches: Optional[List[str]] = None


class SearchAPIClient:
    """Client for SearchAPI real-time web search"""

    def __init__(self, api_key: str):
        """
        Initialize SearchAPI client.

        Args:
            api_key: SearchAPI API key
        """
        self.api_key = api_key
        self.base_url = SEARCHAPI_BASE_URL

        self._client = httpx.AsyncClient(
            timeout=30.0
        )

    async def search(
        self,
        query: str,
        location: str = "United States",
        num_results: int = 10,
        language: str = "en",
    ) -> SearchResponse:
        """
        Perform a Google search via SearchAPI.

        Args:
            query: Search query
            location: Geographic location for search
            num_results: Number of results to return
            language: Interface language

        Returns:
            SearchResponse with results and metadata
        """
        params = {
            "engine": "google",
            "q": query,
            "api_key": self.api_key,
            "location": location,
            "hl": language,
            "num": num_results,
        }

        response = await self._client.get(f"{self.base_url}/search", params=params)
        response.raise_for_status()
        data = response.json()

        # Parse organic results
        results = []
        for item in data.get("organic_results", [])[:num_results]:
            results.append(SearchResult(
                position=item.get("position", 0),
                title=item.get("title", ""),
                link=item.get("link", ""),
                snippet=item.get("snippet", ""),
                source=item.get("source"),
                date=item.get("date"),
            ))

        # Extract AI Overview if present
        ai_overview = None
        if "ai_overview" in data:
            ai_overview = data["ai_overview"].get("markdown") or data["ai_overview"].get("answer")

        # Extract related searches
        related = None
        if "related_searches" in data:
            related = [rs.get("query") for rs in data["related_searches"][:5]]

        return SearchResponse(
            query=query,
            total_results=data.get("search_information", {}).get("total_results", 0),
            results=results,
            ai_overview=ai_overview,
            knowledge_graph=data.get("knowledge_graph"),
            answer_box=data.get("answer_box"),
            related_searches=related,
        )

    async def search_news(
        self,
        query: str,
        time_period: str = "last_day",
    ) -> SearchResponse:
        """
        Search for recent news articles.

        Args:
            query: Search query
            time_period: Time period (last_hour, last_day, last_week, last_month)

        Returns:
            SearchResponse with news results
        """
        params = {
            "engine": "google",
            "q": query,
            "api_key": self.api_key,
            "time_period": time_period,
            "tbm": "nws",  # News search
        }

        response = await self._client.get(f"{self.base_url}/search", params=params)
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("organic_results", []):
            results.append(SearchResult(
                position=item.get("position", 0),
                title=item.get("title", ""),
                link=item.get("link", ""),
                snippet=item.get("snippet", ""),
                source=item.get("source"),
                date=item.get("date"),
            ))

        return SearchResponse(
            query=query,
            total_results=len(results),
            results=results,
        )

    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
