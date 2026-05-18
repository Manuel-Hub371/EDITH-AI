import os
import json
import logging
from typing import List
from openai import AsyncOpenAI
from pydantic import BaseModel
from dotenv import load_dotenv
from research.utils import retry_with_backoff

load_dotenv()

logger = logging.getLogger(__name__)

class ResearchInsight(BaseModel):
    title: str
    insight: str
    impact: str
    evidence_grounding: str # Reference to which concepts/data support this

class InsightEngine:
    """
    Generates high-level analytical insights and strategic implications from synthesized data.
    Moves from data reporting to intelligence generation.
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def generate_insights(self, query: str, conceptual_data: str) -> List[ResearchInsight]:
        prompt = f"""
        Act as a Senior Research Strategist. 
        Based on the conceptual analysis of "{query}", derive 3-5 high-signal, emergent insights.
        
        Do NOT state the obvious. 
        Identify:
        - Non-intuitive patterns
        - Strategic leverage points
        - Root causes of systemic issues
        - Future trends or shifts
        
        DATA:
        {conceptual_data}
        
        OUTPUT:
        Return ONLY a JSON object with an 'insights' key containing a list of objects matching this schema:
        {{
            "insights": [
                {{
                    "title": "Short punchy title",
                    "insight": "The deep analytical insight (high density)",
                    "impact": "The strategic or practical implication of this insight",
                    "evidence_grounding": "Briefly state which data points lead to this conclusion"
                }}
            ]
        }}
        """
        
        try:
            response = await retry_with_backoff(
                self.client.chat.completions.create,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2, # Slightly higher for creative synthesis
                response_format={"type": "json_object"}
            )
            
            data = json.loads(response.choices[0].message.content)
            insights_data = data.get("insights", [])
            return [ResearchInsight(**i) for i in insights_data if isinstance(i, dict)]
            
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            return []

insight_engine = InsightEngine()
