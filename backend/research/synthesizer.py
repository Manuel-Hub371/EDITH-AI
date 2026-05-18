import os
import logging
from typing import Optional
from openai import AsyncOpenAI
from conversational_context.models import ConversationState
from dotenv import load_dotenv
from utils.network import retry_with_backoff

load_dotenv()

logger = logging.getLogger(__name__)

class AnalyticalSynthesizer:
    """
    Final stage of the research pipeline. Composes a coherent analytical narrative.
    Moves away from 'sections' to 'flow'.
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def synthesize(self, query: str, intelligence_bundle: str, state: Optional[ConversationState] = None) -> str:
        prompt = f"""
        Act as a Senior Intelligence Director & Strategic Advisor.
        Compose a high-stakes Analytical Briefing for the query: "{query}"
        
        TONE & VOICE:
        - Decisive, composed, and intellectually rigorous.
        - Senior technical expert tone (think Stratfor, McKinsey Quarterly, or Central Bank Briefing).
        - ZERO FLUFF: No "This report explores...", "It is important to...", or "The data shows...".
        - Start directly with the core analytical tension or the primary finding.
        
        DATA BUNDLE (Narrative Plan, Impact Analysis, Concepts, Insights):
        {intelligence_bundle}
        
        COMPOSITION RULES:
        1. NARRATIVE COMMAND: Drive a single, coherent analytical story. Every paragraph must flow from the previous one.
        2. NO TEMPLATES: Do not use predictable section titles. Use headers only if they add strategic clarity.
        3. REALITY GROUNDING: Heavily integrate the 'Human Impact Analysis'. Explain how macro trends manifest in micro-level reality (e.g., household stress, operational logistics).
        4. CAUSAL RIGOR: Explain the 'Why' behind the 'What'. Use the causal relationships from the plan.
        5. CITATION MAPPING: Use [1], [2] to ground every strategic claim in the source data.
        
        OUTPUT TARGET:
        - An expert-level briefing that reveals hidden dynamics and provides strategic clarity.
        - Focus on the 'Key Tensions' and 'Human Impact' as the narrative anchor.
        - The writing must be dense, insightful, and sophisticated.
        """
        
        try:
            response = await retry_with_backoff(
                self.client.chat.completions.create,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Narrative synthesis failed: {e}")
            return "An internal error occurred during narrative composition. The analytical intelligence bundle was generated but the final report rendering failed."

analytical_synthesizer = AnalyticalSynthesizer()
