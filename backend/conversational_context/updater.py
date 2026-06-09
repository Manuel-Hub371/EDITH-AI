import os
import json
import logging
from utils.env_loader import load_env
load_env()

from openai import AsyncOpenAI
from typing import Optional
from conversational_context.models import ConversationState

logger = logging.getLogger(__name__)

class StateUpdater:
    def __init__(self):
        api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("NVIDIA_API_KEY is not set. Using dummy key to prevent startup crash.")
            api_key = "dummy-api-key-for-startup-continuity"
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=api_key,
            timeout=15.0
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def update_state(
        self, 
        previous_state: Optional[ConversationState], 
        user_message: str, 
        assistant_message: Optional[str] = None,
        retrieved_memory: str = ""
    ) -> ConversationState:
        
        prev_state_json = previous_state.json() if previous_state else "{}"
        
        prompt = f"""
SYSTEM:

You are the Conversation State Manager (CSM) for EDITH.

Your responsibility is to maintain a structured, compact, and continuously updated representation of the conversation state.

You are NOT generating conversational replies.
You are maintaining semantic state for orchestration, memory, planning, and contextual continuity.

Your output is consumed programmatically by downstream systems.

========================================
CORE OBJECTIVE
========================================

Given:
- previous conversation state
- latest user message
- latest assistant response
- retrieved semantic memory

You must produce an updated conversation state that accurately reflects:
- what the conversation is about
- what the user is trying to achieve
- what task is currently active
- what important entities exist
- what unresolved questions remain
- how the conversation has progressed

========================================
STATE MANAGEMENT RULES
========================================

1. OUTPUT FORMAT
- Output ONLY valid JSON
- No markdown
- No explanations
- No commentary
- No natural language outside JSON

2. STATE CONTINUITY
- Preserve relevant existing state
- Update only fields affected by the new interaction
- Do NOT erase useful context unnecessarily
- Merge related topics intelligently

3. COMPACTNESS
- Keep state concise and information-dense
- Avoid redundancy
- Avoid duplicate entities or constraints

4. SEMANTIC ACCURACY
- active_topic = current discussion subject
- user_goal = broader objective the user wants to achieve
- current_task = immediate activity or step currently being discussed
- conversation_stage =
  - exploration
  - planning
  - execution
  - completion

5. INTENT STRUCTURE
Each intent object must contain:
- primary_intent
- sub_intent
- confidence (0.0–1.0)

6. ENTITY EXTRACTION
Extract important:
- technologies
- systems
- names
- projects
- dates
- values
- tools
- locations
- concepts

7. OPEN QUESTIONS
Track:
- unanswered user questions
- missing execution parameters
- unresolved discussion points
- pending clarifications

8. CONSTRAINTS
Track important limitations or requirements such as:
- technical requirements
- architecture constraints
- user preferences
- execution restrictions

9. MEMORY USAGE
Use retrieved memory only when relevant to continuity.
Do not duplicate irrelevant historical information.

10. NO HALLUCINATIONS
Do not invent:
- goals
- entities
- tasks
- intents
- constraints
that are not supported by the provided context.

========================================
INPUT STATE
========================================

{prev_state_json}

========================================
NEW USER MESSAGE
========================================

{user_message}

========================================
ASSISTANT RESPONSE
========================================

{assistant_message or "N/A"}

========================================
RETRIEVED MEMORY
========================================

{retrieved_memory}

========================================
REQUIRED OUTPUT SCHEMA
========================================

{{
  "active_topic": "string | null",

  "user_goal": "string | null",

  "current_task": "string | null",

  "conversation_stage": "exploration | planning | execution | completion",

  "intents": [
    {{
      "primary_intent": "string",
      "sub_intent": "string",
      "confidence": 0.0
    }}
  ],

  "entities": [
    "string"
  ],

  "constraints": [
    "string"
  ],

  "open_questions": [
    "string"
  ]
}}

========================================
FINAL RULE
========================================

Return ONLY valid JSON matching the schema.
No additional text under any circumstance.
"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            raw_json = response.choices[0].message.content
            updated_data = json.loads(raw_json)
            
            # Normalization fixes
            if "conversation_stage" in updated_data:
                stage = str(updated_data["conversation_stage"]).lower()
                mapping = {"action": "execution", "research": "exploration", "task": "execution"}
                updated_data["conversation_stage"] = mapping.get(stage, stage)
                if updated_data["conversation_stage"] not in ["exploration", "planning", "execution", "completion"]:
                    updated_data["conversation_stage"] = "exploration"

            if "intents" in updated_data and isinstance(updated_data["intents"], list):
                new_intents = []
                for intent in updated_data["intents"]:
                    if isinstance(intent, str):
                        new_intents.append({"primary_intent": "unknown", "sub_intent": intent, "confidence": 1.0})
                    elif isinstance(intent, dict):
                        new_intents.append(intent)
                updated_data["intents"] = new_intents

            if previous_state:
                updated_data["session_id"] = previous_state.session_id
            
            # Preserve history from previous_state (it's managed by Manager, not LLM)
            new_state = ConversationState(**updated_data)
            if previous_state:
                new_state.history = previous_state.history
                
            return new_state
            
        except Exception as e:
            logger.error(f"State Update failed: {e}")
            return previous_state or ConversationState(session_id="unknown")

state_updater = StateUpdater()
