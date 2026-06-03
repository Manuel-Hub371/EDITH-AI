import os
import json
import logging
from utils.env_loader import load_env
load_env()
from openai import AsyncOpenAI
from typing import List, Optional
from research.models import ResearchPlan, ResearchStep
from conversational_context.models import ConversationState

logger = logging.getLogger(__name__)

class QueryPlanner:
    def __init__(self):
        api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("NVIDIA_API_KEY is not set. Using dummy key to prevent startup crash.")
            api_key = "dummy-api-key-for-startup-continuity"
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=api_key
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def generate_plan(self, user_input: str, state: Optional[ConversationState] = None) -> ResearchPlan:
        """
        Generates a multi-step research plan based on the user query and current state.
        """
        history = state.history_as_text() if state else "No prior history."
        
        prompt = f"""
        SYSTEM:
        You are the EDITH Strategic Query Planner.
        Your job is to break down a complex user request into a series of logical, executable research steps.
        
        RULES:
        - Output ONLY valid JSON.
        - Steps must be sequential and necessary.
        - tools allowed: [web_search, filesystem, memory, knowledge_base].
        - Use web_search for current info, memory for past interactions, and knowledge_base for static docs.
        
        USER INPUT:
        "{user_input}"
        
        CONVERSATION HISTORY:
        {history}
        
        EXPECTED JSON:
        {{
          "goal": "Clear summary of what the user wants",
          "steps": [
            {{
              "id": "step_1",
              "description": "What this step does",
              "query": "The optimized search query for this step",
              "tool": "web_search | filesystem | memory"
            }}
          ]
        }}
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            data = json.loads(response.choices[0].message.content)
            steps = [ResearchStep(**s) for s in data.get("steps", [])]
            
            return ResearchPlan(
                session_id=state.session_id if state else "unknown",
                goal=data.get("goal", user_input),
                steps=steps
            )
        except Exception as e:
            logger.error(f"Planning failed: {e}")
            # Fallback plan: single web search step
            return ResearchPlan(
                session_id=state.session_id if state else "unknown",
                goal=user_input,
                steps=[ResearchStep(
                    id="step_1", 
                    description=f"Direct search for: {user_input}",
                    query=user_input,
                    tool="web_search"
                )]
            )

planner = QueryPlanner()
