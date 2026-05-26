import os
import json
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv
from typing import Optional
from execution_planner.models import ExecutionPlan
from execution_planner.prompts import PLANNING_SYSTEM_PROMPT
from prompt_interpreter.models import UserConstraints

load_dotenv()
logger = logging.getLogger(__name__)

class ExecutionPlannerService:
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

    async def generate_plan(self, user_input: str, constraints: Optional[UserConstraints] = None) -> ExecutionPlan:
        """
        Calls the LLM to generate a step-by-step execution plan.
        Optionally injects structured user constraints for constraint-preserving planning.
        """
        logger.info(f"Generating execution plan for: {user_input}")

        # Build user message — inject constraints block if available
        if constraints:
            constraints_json = constraints.model_dump_json(indent=2)
            user_message = f"""USER REQUEST:
{user_input}

USER CONSTRAINTS (you MUST honor all of these in your plan):
{constraints_json}"""
        else:
            user_message = user_input

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": PLANNING_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            raw_content = response.choices[0].message.content
            logger.info(f"RAW PLAN JSON: {raw_content}")
            data = json.loads(self._clean_json(raw_content))
            
            # Unwrap if LLM incorrectly nests the plan inside a key
            for wrapper_key in ["ExecutionPlan", "execution_plan", "plan", "result"]:
                if wrapper_key in data and isinstance(data[wrapper_key], dict):
                    data = data[wrapper_key]
                    logger.info(f"Unwrapped plan from key: '{wrapper_key}'")
                    break
            
            # Normalize steps if wrapped in a list-of-list
            if "steps" in data and isinstance(data["steps"], list):
                normalized_steps = []
                for i, step in enumerate(data["steps"]):
                    if isinstance(step, dict):
                        # Ensure step_number exists
                        if "step_number" not in step:
                            step["step_number"] = i + 1
                        normalized_steps.append(step)
                data["steps"] = normalized_steps
            
            # Ensure required root fields
            if "total_steps" not in data:
                data["total_steps"] = len(data.get("steps", []))
            if "estimated_impact" not in data:
                data["estimated_impact"] = "medium"
            
            return ExecutionPlan(**data)

        except Exception as e:
            logger.error(f"Execution Planning failed: {type(e).__name__}: {e}")
            return self._get_fallback_plan(user_input)

    def _clean_json(self, raw: str) -> str:
        if "```json" in raw:
            return raw.split("```json")[1].split("```")[0].strip()
        if "```" in raw:
            return raw.split("```")[1].split("```")[0].strip()
        return raw.strip()

    def _get_fallback_plan(self, goal: str) -> ExecutionPlan:
        return ExecutionPlan(
            goal=goal,
            steps=[{
                "step_number": 1,
                "action": "direct_response",
                "parameters": {"message": "I was unable to generate a multi-step plan. I will try to address your request directly."},
                "reasoning": "Fallback due to planning error."
            }],
            total_steps=1,
            estimated_impact="None"
        )

# Global singleton
execution_planner = ExecutionPlannerService()
