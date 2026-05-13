import logging
import asyncio
from typing import List, Optional
from research.planner import planner
from research.search_tools import search_provider
from research.reranker import reranker
from research.synthesizer import research_synthesizer
from research.models import ResearchPlan, SearchResult
from conversational_context.models import ConversationState

logger = logging.getLogger(__name__)

class ResearchService:
    async def perform_research(self, user_input: str, state: Optional[ConversationState] = None) -> str:
        """
        Full research pipeline: Plan -> Search -> Rerank -> Synthesize.
        """
        # 1. Generate Plan
        logger.info(f"Generating research plan for: {user_input}")
        plan = await planner.generate_plan(user_input, state)
        
        all_results: List[SearchResult] = []
        
        # 2. Execute Steps Concurrently
        search_tasks = []
        for step in plan.steps:
            if step.tool == "web_search" and step.query:
                logger.info(f"Adding research step to queue: {step.description}")
                search_tasks.append(search_provider.search(step.query))
        
        if search_tasks:
            results_list = await asyncio.gather(*search_tasks)
            for results in results_list:
                all_results.extend(results)
            
        # 3. Rerank results
        logger.info(f"Reranking top 20 of {len(all_results)} results for query: {user_input}")
        top_results = reranker.rerank(user_input, all_results[:20], top_n=5)
        
        # 4. Synthesize into high-quality briefing
        if not top_results:
            return "No relevant information found during research."
            
        logger.info("Synthesizing research results into structured report...")
        report = await research_synthesizer.synthesize(user_input, top_results, state)
        
        return report

research_service = ResearchService()
