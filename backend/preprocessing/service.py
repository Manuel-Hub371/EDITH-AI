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
from filesystem.service import filesystem_service

DetectorFactory.seed = 0
logger = logging.getLogger(__name__)

_spell = None

def get_spell_checker():
    global _spell
    if _spell is None:
        from spellchecker import SpellChecker
        logger.info("Loading SpellChecker dictionary...")
        _spell = SpellChecker()
        # Whitelist technical terms and file extensions
        technical_terms = [
            "pdf", "docx", "xlsx", "pptx", "txt", "md", "csv", "json", "yaml", "xml",
            "manuel2995", "edith", "backend", "frontend", "api", "repo", "git",
            "python", "javascript", "react", "flutter", "electron",
            "apps", "cpu", "gpu", "ram", "memory", "processes", "monitor", "system"
        ]
        _spell.word_frequency.load_words(technical_terms)
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
    """
    Optimized: Bypassed legacy spellchecker.
    Modern LLMs handle typos natively; local spell checking adds unnecessary latency.
    """
    return text

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
        # 1. Load latest state first (needed for context-aware intent detection)
        current_state = await context_manager.get_or_create_state(session_id)
        
        # 2. Detect intent with full conversation context
        history_text = current_state.history_as_text(max_turns=5)
        state_context = f"Topic: {current_state.active_topic}, Goal: {current_state.user_goal}, Task: {current_state.current_task}"
        
        intent_data = await intent_service.detect_intent(
            cleaned, 
            history=history_text, 
            state_context=state_context
        )
        
        logger.info(f"Intent detected with context: {intent_data.json()}")

        # 2. Generate response using the loaded state (contains full history)
        base_response = PreprocessedResponse(
            raw_input=user_input,
            cleaned_input=cleaned,
            language=lang,
            intent=intent_data
        )

        # 1. Planning Paths (Highest Priority for Complex Tasks)
        if intent_data.execution_strategy.execution_mode == "planner_required" or intent_data.execution_strategy.requires_planning:
            from execution_planner.service import execution_planner
            from execution_engine.service import execution_engine
            from prompt_interpreter.service import prompt_interpreter

            # Extract structured constraints from the user's full input BEFORE planning
            constraints = await prompt_interpreter.extract_constraints(user_input)
            logger.info(f"Constraints extracted: topic={constraints.primary_topic}, min_pages={constraints.min_pages}")

            plan = await execution_planner.generate_plan(cleaned, constraints=constraints)
            execution_results = await execution_engine.run(plan, constraints=constraints)
            ai_response = await response_service.generate_final_response(
                base_response,
                state=current_state,
                execution_results={
                    "plan": plan.model_dump() if hasattr(plan, 'model_dump') else plan.dict(),
                    "steps_executed": execution_results
                }
            )
        # 2. Specialized Tool Paths
        elif "filesystem_access" in intent_data.capabilities_required:
            fs_results = await filesystem_service.execute_operation(intent_data)
            ai_response = await response_service.generate_final_response(
                base_response,
                state=current_state,
                execution_results=fs_results
            )
        # 3. General Orchestration Paths
        elif intent_data.execution_strategy.execution_mode == "direct_response" or intent_data.missing_parameters:
            ai_response = await response_service.generate_final_response(base_response, state=current_state)
        elif "web_search" in intent_data.capabilities_required:
            if "document_generation" in intent_data.capabilities_required:
                from execution_planner.service import execution_planner
                from execution_engine.service import execution_engine
                plan = await execution_planner.generate_plan(cleaned)
                execution_results = await execution_engine.run(plan)
                ai_response = await response_service.generate_final_response(
                    base_response,
                    state=current_state,
                    execution_results={
                        "plan": plan.dict(),
                        "steps_executed": execution_results
                    }
                )
            else:
                research_findings = await research_service.perform_research(cleaned, state=current_state)
                ai_response = await response_service.generate_final_response(
                    base_response, 
                    state=current_state, 
                    research_results=research_findings
                )
        else:
            ai_response = AIResponse(
                content=f"I've identified that this requires {intent_data.execution_strategy.execution_mode}, but my specialized tools for that are still initializing.",
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
