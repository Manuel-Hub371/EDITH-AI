import os
import json
import logging
from typing import List, Optional, Dict
from openai import AsyncOpenAI
from pydantic import BaseModel
from dotenv import load_dotenv
from utils.network import retry_with_backoff

load_dotenv()

logger = logging.getLogger(__name__)

class ResearchNarrativePlan(BaseModel):
    central_story: str
    key_tensions: List[str]
    causal_relationships: List[str]
    human_impact_focus: List[str]
    strategic_questions: List[str]

class NarrativePlanner:
    """
    Identifies the 'central story' and analytical tensions before synthesis.
    Moves the system from 'summarizing' to 'reasoning'.
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def plan(self, query: str, raw_findings: str) -> ResearchNarrativePlan:
        prompt = f"""
        Act as a Lead Strategic Analyst.
        Develop a Narrative Research Plan for the query: "{query}"
        
        Based on these raw findings:
        {raw_findings}
        
        Your goal is to identify the 'Analytical Core' of this topic.
        
        INSTRUCTIONS:
        1. central_story: What is the primary narrative or transformation happening here?
        2. key_tensions: What are the conflicting forces or tradeoffs?
        3. causal_relationships: What is driving what?
        4. human_impact_focus: How does this concretely affect people's lived experience?
        5. strategic_questions: What are the high-level questions this research must answer?
        
        STRICT RULES:
        - Output MUST be valid JSON.
        - Use EXACTLY these lowercase snake_case keys: central_story, key_tensions, causal_relationships, human_impact_focus, strategic_questions.
        """
        
        try:
            response = await retry_with_backoff(
                self.client.chat.completions.create,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            data = json.loads(response.choices[0].message.content)
            
            # 1. Handle potential root-level wrapping
            if len(data) == 1 and isinstance(list(data.values())[0], dict):
                data = list(data.values())[0]
            
            # 2. Normalize keys and handle nested structures
            normalized_data = {}
            for k, v in data.items():
                norm_k = k.lower().replace(" ", "_")
                
                # If a field expecting a list gets a dict, take the dict values
                if isinstance(v, dict):
                    v = list(v.values())
                
                # Special case for central_story (should be a string)
                if norm_k == "central_story" and isinstance(v, list):
                    v = ". ".join(v)
                    
                normalized_data[norm_k] = v
                
            return ResearchNarrativePlan(**normalized_data)
        except Exception as e:
            logger.error(f"Narrative planning failed: {e}")
            return ResearchNarrativePlan(
                central_story=f"Analysis of {query}",
                key_tensions=["General uncertainty"],
                causal_relationships=["Direct correlation"],
                human_impact_focus=["Consumer pressure"],
                strategic_questions=["What is the long-term outlook?"]
            )

narrative_planner = NarrativePlanner()
