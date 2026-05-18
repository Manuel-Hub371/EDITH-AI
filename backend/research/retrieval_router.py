import logging
from typing import List
from research.models import SearchResult
from research.search_tools import search_provider
from research.authority_ranker import authority_ranker

logger = logging.getLogger(__name__)

class RetrievalRouter:
    """
    Orchestrates the retrieval strategy based on domain classification.
    Determines search breadth, depth, and target source types.
    """
    async def execute_retrieval(self, query: str, domain_info: any) -> List[SearchResult]:
        logger.info(f"Executing routed retrieval for domain: {domain_info.domain}")
        
        # Modify query or strategy based on domain
        search_query = query
        if domain_info.technical_depth_required == "expert":
            search_query += " technical documentation whitepaper academic"
            
        # Execute search
        results = await search_provider.search(search_query)
        
        # Immediate Authority Ranking
        ranked_results = authority_ranker.rank_results(results)
        
        return ranked_results

retrieval_router = RetrievalRouter()
