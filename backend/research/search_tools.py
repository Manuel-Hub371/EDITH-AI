import os
import aiohttp
import logging
from typing import List
from research.models import SearchResult

logger = logging.getLogger(__name__)

class WebSearchProvider:
    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")

    async def search(self, query: str) -> List[SearchResult]:
        if not self.api_key:
            logger.warning("SERPER_API_KEY not found. Returning mock results.")
            return self._mock_results(query)

        url = "https://google.serper.dev/search"
        payload = {"q": query}
        headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        results = []
                        # Organic results
                        for item in data.get('organic', []):
                            results.append(SearchResult(
                                title=item.get('title', ''),
                                url=item.get('link', ''),
                                snippet=item.get('snippet', ''),
                                source="google/serper"
                            ))
                        return results
                    else:
                        logger.error(f"Serper API failed: {resp.status}")
                        return self._mock_results(query)
        except Exception as e:
            logger.error(f"Search error: {e}")
            return self._mock_results(query)

    def _mock_results(self, query: str) -> List[SearchResult]:
        return [
            SearchResult(
                title=f"Mock result for {query}",
                url="https://example.com/mock1",
                snippet=f"This is a simulated search result for the query: {query}. In a real environment, this would be replaced by actual web data.",
                source="mock"
            ),
            SearchResult(
                title=f"Advanced insights on {query}",
                url="https://example.com/mock2",
                snippet=f"Further information regarding {query} can be found here. This snippet is intended to test the reranking logic.",
                source="mock"
            )
        ]

search_provider = WebSearchProvider()
