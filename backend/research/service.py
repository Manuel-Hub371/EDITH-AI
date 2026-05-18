import logging
import asyncio
import json
from typing import List, Optional
from conversational_context.models import ConversationState

# New Analytical Components
from research.domain_classifier import domain_classifier
from research.retrieval_router import retrieval_router
from research.narrative_planner import narrative_planner
from research.human_impact_analyzer import human_impact_analyzer
from research.evidence_clusterer import evidence_clusterer
from research.concept_extractor import concept_extractor
from research.insight_engine import insight_engine
from research.synthesizer import analytical_synthesizer
from research.citation_builder import citation_builder

logger = logging.getLogger(__name__)

class ResearchService:
    """
    Expert-grade Research Intelligence Orchestrator for EDITH.
    Transitioned to 'Narrative-First Reasoning' model.
    """
    
    async def perform_research(self, user_input: str, state: Optional[ConversationState] = None) -> str:
        try:
            # 1. Domain Classification
            logger.info("Stage 1: Classifying research domain...")
            domain_info = await domain_classifier.classify(user_input)
            
            # 2. Routed & Authority-Aware Retrieval
            logger.info(f"Stage 2: Executing routed retrieval for {domain_info.domain}...")
            search_results = await retrieval_router.execute_retrieval(user_input, domain_info)
            
            if not search_results:
                return "Analysis concluded: No high-authority information found on this topic."

            # Register sources for citations
            citation_builder.register_sources(search_results[:12])
            
            # Prepare raw data for reasoning layers
            raw_findings = "\n\n".join([f"[{i+1}] {res.title}\n{res.snippet}" for i, res in enumerate(search_results[:12])])

            # 3. Narrative Planning (Identifying the Story & Tensions)
            logger.info("Stage 3: Developing narrative plan...")
            narrative_plan = await narrative_planner.plan(user_input, raw_findings)

            # 4. Human Impact Analysis (Grounding in Reality)
            logger.info("Stage 4: Analyzing human & business impact...")
            impact_analysis = await human_impact_analyzer.analyze(user_input, raw_findings, narrative_plan.central_story)
            
            # 5. Evidence Clustering (Semantic Grouping)
            logger.info("Stage 5: Clustering evidence by semantic concept...")
            evidence_data = [
                {"url": res.url, "content": f"{res.title}: {res.snippet}"} 
                for res in search_results[:12]
            ]
            clusters = await evidence_clusterer.cluster(user_input, evidence_data)
            
            # 6. Concept & Relationship Extraction
            logger.info("Stage 6: Extracting frameworks and causal mechanisms...")
            cluster_text = "\n\n".join([f"Concept: {c.concept_name}\nSummary: {c.summary}" for c in clusters])
            concepts = await concept_extractor.extract(user_input, cluster_text)
            
            # 7. Insight Generation
            logger.info("Stage 7: Generating strategic insights...")
            intelligence_context = f"{cluster_text}\n\nConcepts: {str([c.dict() for c in concepts])}"
            insights = await insight_engine.generate_insights(user_input, intelligence_context)
            
            # 8. Narrative Synthesis (Composing the Narrative)
            logger.info("Stage 8: Synthesizing analytical narrative...")
            bundle = {
                "narrative_plan": narrative_plan.dict(),
                "impact_analysis": impact_analysis.dict(),
                "clusters": [c.dict() for c in clusters],
                "concepts": [c.dict() for c in concepts],
                "insights": [i.dict() for i in insights]
            }
            
            report = await analytical_synthesizer.synthesize(user_input, json.dumps(bundle), state)
            
            # 9. Grounding (Citations)
            reference_list = citation_builder.build_reference_list()
            
            return f"{report}\n{reference_list}"

        except Exception as e:
            logger.error(f"Advanced Research Pipeline failed: {e}")
            return "An internal error occurred during technical analysis. Please refine your query."

research_service = ResearchService()

