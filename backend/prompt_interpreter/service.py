import os
import json
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv
from typing import Optional
from prompt_interpreter.models import UserConstraints

load_dotenv()
logger = logging.getLogger(__name__)


INTERPRETER_SYSTEM_PROMPT = """
You are the EDITH Prompt Interpreter — a constraint extraction engine.

Your ONLY job is to read a user's request and extract every explicit and implicit specification they have provided.
You are NOT planning execution steps. You are NOT generating content. You are parsing the user's intent into a structured constraint specification.

Extract the following fields:

1. content_requirements   - A list of topics/sections the user explicitly wants covered (e.g., "causes of inflation", "comparison with Nigeria")
2. formatting_constraints - A list of formatting rules (e.g., "causes must be in bullet points", "use headers for each section")
3. structural_expectations - A list of structural requirements (e.g., "the report must have an introduction, body, and conclusion")
4. output_requirements    - A list of output-level requirements (e.g., "save as PDF", "save to Desktop", "file name must be Ghana_Inflation_Report")
5. quality_constraints    - A list of quality-level requirements (e.g., "at least 4 pages", "must be detailed", "must include data/statistics")
6. completion_criteria    - A list of things that must be true for the task to be considered done (e.g., "PDF must be created", "all sections must be covered")
7. comparison_targets     - A list of entities to compare (e.g., ["Ghana", "Nigeria"])
8. primary_topic          - The main subject of the request (e.g., "Ghana Inflation Rate")
9. enriched_research_query - A single comprehensive search query that captures ALL of the user's content requirements for the research step

RULES:
- If the user says "at least 4 pages" extract that as a quality_constraint AND set min_pages to 4.
- If the user says "compare X with Y", extract both X and Y into comparison_targets.
- If the user says "causes should be listed", that's a formatting_constraint.
- Always infer implicit constraints too (e.g., if they want 4 pages, the content must be comprehensive).
- The enriched_research_query must be rich enough to retrieve ALL the content needed to satisfy every content requirement.
- Output ONLY valid JSON. No markdown. No explanations.

OUTPUT SCHEMA:
{
  "primary_topic": "string",
  "content_requirements": ["string", ...],
  "formatting_constraints": ["string", ...],
  "structural_expectations": ["string", ...],
  "output_requirements": ["string", ...],
  "quality_constraints": ["string", ...],
  "completion_criteria": ["string", ...],
  "comparison_targets": ["string", ...],
  "min_pages": null,
  "enriched_research_query": "string"
}
"""


class PromptInterpreter:
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

    async def extract_constraints(self, user_input: str) -> UserConstraints:
        """
        Parses the user's raw input into a structured set of constraints
        that will be preserved and enforced throughout the full orchestration pipeline.
        """
        logger.info(f"PromptInterpreter: Extracting constraints from: {user_input[:100]}...")
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": INTERPRETER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            raw = response.choices[0].message.content
            data = json.loads(raw)
            constraints = UserConstraints(**data)
            logger.info(f"PromptInterpreter: Extracted constraints: topic={constraints.primary_topic}, min_pages={constraints.min_pages}, requirements={len(constraints.content_requirements)}")
            return constraints
        except Exception as e:
            logger.error(f"PromptInterpreter failed: {e}. Returning empty constraints.")
            return UserConstraints(
                primary_topic=user_input,
                enriched_research_query=user_input
            )


# Singleton
prompt_interpreter = PromptInterpreter()
