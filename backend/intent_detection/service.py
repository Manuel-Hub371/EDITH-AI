import os
import json
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv
from intent_detection.models import IntentDetectionResponse
from intent_detection.prompts import build_intent_prompt

load_dotenv()

logger = logging.getLogger(__name__)

class LLMIntentService:
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

    async def detect_intent(self, text: str, history: str = "", state_context: str = "") -> IntentDetectionResponse:
        """
        Truly asynchronous inference for production-grade intent detection.
        Now includes conversation history for context-aware routing.
        """
        if not text:
            return self._get_empty_response()

        prompt = build_intent_prompt(text, history=history, state_context=state_context)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )

            raw_content = response.choices[0].message.content
            logger.info(f"RAW INTENT JSON: {raw_content}")
            data = json.loads(self._clean_json(raw_content))
            
            return IntentDetectionResponse(**data)

        except Exception as e:
            logger.error(f"LLM Intent Detection failed: {e}")
            return self._get_fallback_response(text)

    def _clean_json(self, raw: str) -> str:
        if "```json" in raw:
            return raw.split("```json")[1].split("```")[0].strip()
        if "```" in raw:
            return raw.split("```")[1].split("```")[0].strip()
        return raw.strip()

    def _get_empty_response(self) -> IntentDetectionResponse:
        return IntentDetectionResponse(
            interaction_style="conversational",
            intents=[],
            is_multi_intent=False,
            execution_strategy={
                "requires_tools": False,
                "requires_planning": False,
                "execution_mode": "direct_response"
            },
            capabilities_required=[],
            ambiguity_detected=True,
            reasoning="Empty input provided."
        )

    def _get_fallback_response(self, text: str) -> IntentDetectionResponse:
        return IntentDetectionResponse(
            interaction_style="conversational",
            intents=[{
                "primary_intent": "conversational", 
                "sub_intent": "casual_conversation", 
                "confidence": 0.5
            }],
            is_multi_intent=False,
            execution_strategy={
                "requires_tools": False,
                "requires_planning": False,
                "execution_mode": "direct_response"
            },
            capabilities_required=[],
            ambiguity_detected=True,
            reasoning="Fallback due to inference error."
        )

# Global singleton
intent_service = LLMIntentService()
