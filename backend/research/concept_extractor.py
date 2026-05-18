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

class ExtractedConcept(BaseModel):
    name: str
    type: str # "framework", "methodology", "principle", "mental_model", "causal_mechanism"
    description: str
    implications: List[str]
    tradeoffs: List[str] = []

class ConceptExtractor:
    """
    Identifies high-level conceptual frameworks and causal relationships from clustered evidence.
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def extract(self, query: str, context_text: str) -> List[ExtractedConcept]:
        prompt = f"""
        Analyze the research context for "{query}" and extract core high-level concepts.
        
        Focus on:
        - Methodologies and Frameworks (e.g. First Principles, Scrum, SWOT)
        - Causal Mechanisms (How X leads to Y)
        - Principles and Mental Models
        - Tradeoffs (Benefits vs Costs)
        
        CONTEXT:
        {context_text}
        
        OUTPUT:
        Return ONLY a JSON object with a 'concepts' key containing a list of objects matching this schema:
        {{
            "concepts": [
                {{
                    "name": "string",
                    "type": "framework | methodology | principle | mental_model | causal_mechanism",
                    "description": "expert-level definition",
                    "implications": ["strategic implication 1", "strategic implication 2"],
                    "tradeoffs": ["pro 1 vs con 1", "pro 2 vs con 2"]
                }}
            ]
        }}
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
            concepts_data = data.get("concepts", [])
            return [ExtractedConcept(**c) for c in concepts_data if isinstance(c, dict)]
            
        except Exception as e:
            logger.error(f"Concept extraction failed: {e}")
            return []

concept_extractor = ConceptExtractor()
