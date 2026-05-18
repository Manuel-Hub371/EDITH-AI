import os
import json
import logging
from typing import Optional, List
from openai import AsyncOpenAI
from pydantic import BaseModel
from dotenv import load_dotenv
from research.utils import retry_with_backoff

load_dotenv()

logger = logging.getLogger(__name__)

class DomainClassification(BaseModel):
    domain: str
    sub_domain: Optional[str] = None
    confidence: float
    reasoning: str
    suggested_source_types: List[str]
    technical_depth_required: str # "introductory", "intermediate", "expert"

class DomainClassifier:
    """
    Classifies the research domain to drive specialized retrieval and synthesis.
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def classify(self, query: str) -> DomainClassification:
        prompt = f"""
        Analyze the following research query and classify its primary academic or professional domain.
        
        QUERY: "{query}"
        
        DOMAINS:
        - engineering
        - artificial intelligence / computer science
        - robotics
        - psychology / cognitive science
        - systems thinking
        - medicine / biology
        - economics / finance
        - philosophy
        - cybersecurity
        - law / policy
        - history / sociology
        - physics / mathematics
        
        OUTPUT REQUIREMENTS:
        Return ONLY a JSON object with the following schema:
        {{
            "domain": "string",
            "sub_domain": "string or null",
            "confidence": 0.0 to 1.0,
            "reasoning": "brief explanation",
            "suggested_source_types": ["academic papers", "technical documentation", "books", etc.],
            "technical_depth_required": "introductory | intermediate | expert"
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
            return DomainClassification(**data)
            
        except Exception as e:
            logger.error(f"Domain classification failed: {e}")
            return DomainClassification(
                domain="general",
                confidence=0.5,
                reasoning="Fallback due to error",
                suggested_source_types=["general web"],
                technical_depth_required="intermediate"
            )

domain_classifier = DomainClassifier()
