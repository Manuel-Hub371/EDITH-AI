import os
import json
import logging
from typing import List, Dict
from openai import AsyncOpenAI
from pydantic import BaseModel
from dotenv import load_dotenv
from utils.network import retry_with_backoff

load_dotenv()

logger = logging.getLogger(__name__)

class ImpactAnalysis(BaseModel):
    citizen_impact: str
    business_consequences: str
    behavioral_shifts: str
    quality_of_life_effects: str

class HumanImpactAnalyzer:
    """
    Ensures research stays grounded in reality by analyzing human and operational consequences.
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def analyze(self, query: str, raw_findings: str, narrative_plan: str) -> ImpactAnalysis:
        prompt = f"""
        Act as a Sociopolitical & Economic Impact Specialist.
        Analyze the HUMAN IMPACT of the findings for the query: "{query}"
        
        NARRATIVE CONTEXT:
        {narrative_plan}
        
        RAW FINDINGS:
        {raw_findings}
        
        INSTRUCTIONS:
        Focus on concrete, lived-experience consequences. 
        - citizen_impact: How does this affect the average person's wallet, table, and daily life?
        - business_consequences: How do local businesses, SMEs, or industries adapt or suffer?
        - behavioral_shifts: What changes in consumer or social behavior are emerging?
        - quality_of_life_effects: What is the net effect on societal well-being or operational stress?
        
        STRICT RULES:
        - Output MUST be valid JSON.
        - Use EXACTLY these lowercase snake_case keys: citizen_impact, business_consequences, behavioral_shifts, quality_of_life_effects.
        """
        
        try:
            response = await retry_with_backoff(
                self.client.chat.completions.create,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            data = json.loads(response.choices[0].message.content)
            
            # 1. Handle potential root-level wrapping
            if len(data) == 1 and isinstance(list(data.values())[0], dict):
                data = list(data.values())[0]
            
            # 2. Normalize keys and flatten nested dicts
            normalized_data = {}
            for k, v in data.items():
                norm_k = k.lower().replace(" ", "_")
                # If the value is a nested dict, flatten it into a readable string
                if isinstance(v, dict):
                    v = ". ".join([f"{sub_k.replace('_', ' ').capitalize()}: {sub_v}" for sub_k, sub_v in v.items()])
                normalized_data[norm_k] = v
                
            return ImpactAnalysis(**normalized_data)
        except Exception as e:
            logger.error(f"Human impact analysis failed: {e}")
            return ImpactAnalysis(
                citizen_impact="Increased cost of living and reduced purchasing power.",
                business_consequences="Operational pressure and reduced margins.",
                behavioral_shifts="Shift toward essential spending.",
                quality_of_life_effects="General increase in household stress."
            )

human_impact_analyzer = HumanImpactAnalyzer()
