import re
import unicodedata
import logging
import asyncio
from typing import Optional
from langdetect import detect, DetectorFactory

from preprocessing.models import PreprocessedResponse
from conversational_context.manager import context_manager
from intent_detection.service import intent_service
from response.service import response_service
from response.models import AIResponse
from research.service import research_service

DetectorFactory.seed = 0
logger = logging.getLogger(__name__)

_spell = None

def get_spell_checker():
    global _spell
    if _spell is None:
        from spellchecker import SpellChecker
        logger.info("Loading SpellChecker dictionary...")
        _spell = SpellChecker()
    return _spell

def normalize_text(text: str) -> str:
    if not text: return ""
    text = unicodedata.normalize('NFC', text)
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C")
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def detect_language(text: str) -> str:
    if not text or len(text) < 5:
        return "en"
    try: return detect(text)
    except: return "en"

def python_cleanse_text(text: str) -> str:
    if not text: return ""
    tokens = re.findall(r"[\w']+|[.,!?;]", text)
    corrected_tokens = []
    spell = get_spell_checker()
    for token in tokens:
        if re.match(r"^[a-zA-Z]+$", token) and token.lower() not in spell:
            correction = spell.correction(token)
            if correction: token = correction
        corrected_tokens.append(token)
    result = " ".join(corrected_tokens)
    result = re.sub(r'\s+([.,!?;])', r'\1', result)
    return result

from fastapi import BackgroundTasks

async def preprocess_message(user_input: str, session_id: str, background_tasks: Optional[BackgroundTasks] = None) -> PreprocessedResponse:
    """
    Highly optimized pipeline with background state processing.
    """
    normalized = normalize_text(user_input)
    lang = detect_language(normalized)
    cleaned = python_cleanse_text(normalized)

    # Use the session lock to ensure we don't load state while a previous turn is still committing
    async with context_manager._get_lock(session_id):
        # 1. Load latest state and detect intent concurrently
        intent_data, current_state = await asyncio.gather(
            intent_service.detect_intent(cleaned),
            context_manager.get_or_create_state(session_id)
        )

        # 2. Generate response using the loaded state (contains full history)
        base_response = PreprocessedResponse(
            raw_input=user_input,
            cleaned_input=cleaned,
            language=lang,
            intent=intent_data
        )

        if intent_data.execution_strategy.execution_mode == "direct_response" or intent_data.missing_parameters:
            ai_response = await response_service.generate_final_response(base_response, state=current_state)
        elif intent_data.execution_strategy.execution_mode == "planner_required" or "web_search" in intent_data.capabilities_required:
            # 2a. Trigger Research Pipeline
            research_findings = await research_service.perform_research(cleaned, state=current_state)
            # 2b. Synthesize final response with findings
            ai_response = await response_service.generate_final_response(
                base_response, 
                state=current_state, 
                research_results=research_findings
            )
        else:
            ai_response = AIResponse(
                content=f"I've identified that this requires {intent_data.execution_strategy.execution_mode}, but my specialized tools for that are still initializing. How else can I help?",
                metadata={"status": "routing", "strategy": intent_data.execution_strategy.execution_mode}
            )

        # 3. FAST PATH: Commit history immediately so the user doesn't wait for LLM metadata extraction
        assistant_content = ai_response.content if ai_response else ""
        await context_manager.commit_history(
            session_id=session_id,
            user_message=cleaned,
            assistant_message=assistant_content
        )

        # 4. SLOW PATH: Offload expensive metadata extraction and FAISS indexing to background
        if background_tasks:
            background_tasks.add_task(
                context_manager.background_update_state,
                session_id=session_id,
                user_message=cleaned,
                assistant_message=assistant_content
            )
        else:
            # Fallback if no background_tasks provided (e.g. in tests)
            asyncio.create_task(context_manager.background_update_state(
                session_id=session_id,
                user_message=cleaned,
                assistant_message=assistant_content
            ))

    return PreprocessedResponse(
        raw_input=user_input,
        cleaned_input=cleaned,
        language=lang,
        intent=intent_data,
        ai_response=ai_response
    )
