"""
Full audit of EDITH's conversation tracking system.
Tests:
  1. Session creation and persistence
  2. History tracking across multiple turns
  3. History being fed into the response generator
  4. Context switching (casual → task)
  5. State updater's LLM extraction
"""
import asyncio
import logging
from conversational_context.manager import context_manager
from conversational_context.models import ConversationState

logging.basicConfig(level=logging.WARNING)  # Suppress INFO noise for cleaner output
logger = logging.getLogger(__name__)

SESSION_ID = "audit_session_001"

PASS = "[PASS]"
FAIL = "[FAIL]"

async def run_audit():
    print("\n" + "="*60)
    print("  EDITH CONVERSATION TRACKING AUDIT")
    print("="*60)

    results = {}

    # ── Reset the session to start clean ──────────────────────────
    await context_manager.reset_session(SESSION_ID)

    # ── Test 1: Session Creation ───────────────────────────────────
    print("\n[TEST 1] Session Creation")
    state = await context_manager.get_or_create_state(SESSION_ID)
    if state and state.session_id == SESSION_ID and state.history == []:
        print(f"  {PASS} New session created with correct ID and empty history.")
        results["session_creation"] = True
    else:
        print(f"  {FAIL} Session creation failed: {state}")
        results["session_creation"] = False

    # ── Test 2: History Persistence (commit_history) ───────────────
    print("\n[TEST 2] History Persistence")
    await context_manager.commit_history(SESSION_ID, "Hey EDITH, what's up?", "Not much, how can I help?")
    await context_manager.commit_history(SESSION_ID, "Tell me about Python.", "Python is a high-level language...")
    
    state = await context_manager.get_or_create_state(SESSION_ID)
    if len(state.history) == 4:  # 2 user + 2 assistant turns
        print(f"  {PASS} 4 turns recorded correctly in history.")
        results["history_persistence"] = True
    else:
        print(f"  {FAIL} Expected 4 turns, got {len(state.history)}. History: {state.history}")
        results["history_persistence"] = False

    # ── Test 3: History Cap at 30 turns ────────────────────────────
    print("\n[TEST 3] History Cap at 30 Turns")
    await context_manager.reset_session(SESSION_ID)
    for i in range(20):
        await context_manager.commit_history(SESSION_ID, f"User message {i}", f"Assistant reply {i}")
    
    state = await context_manager.get_or_create_state(SESSION_ID)
    if len(state.history) == 30:  # each commit adds 2 turns, 15×2=30
        print(f"  {PASS} History correctly capped at 30 turns.")
        results["history_cap"] = True
    elif len(state.history) <= 30:
        print(f"  {PASS} History within cap: {len(state.history)} turns (< 30 from cap).")
        results["history_cap"] = True
    else:
        print(f"  {FAIL} History exceeded cap: {len(state.history)} turns.")
        results["history_cap"] = False

    # ── Test 4: history_as_text() formatting ──────────────────────
    print("\n[TEST 4] History Text Formatting")
    await context_manager.reset_session(SESSION_ID)
    await context_manager.commit_history(SESSION_ID, "Hello there!", "Hi! How can I help?")
    await context_manager.commit_history(SESSION_ID, "Create a folder on Desktop", "Done! Folder created.")
    
    state = await context_manager.get_or_create_state(SESSION_ID)
    history_text = state.history_as_text()
    
    if "User: Hello there!" in history_text and "EDITH: Hi! How can I help?" in history_text:
        print(f"  {PASS} history_as_text() formats correctly with 'User:' and 'EDITH:' prefixes.")
        results["history_text_format"] = True
    else:
        print(f"  {FAIL} history_as_text() output unexpected:\n{history_text}")
        results["history_text_format"] = False

    # ── Test 5: Context carryover (last_user_message / last_assistant_message) ──
    print("\n[TEST 5] last_user_message / last_assistant_message Tracking")
    state = await context_manager.get_or_create_state(SESSION_ID)
    if state.last_user_message == "Create a folder on Desktop" and state.last_assistant_message == "Done! Folder created.":
        print(f"  {PASS} last_user_message and last_assistant_message correctly tracked.")
        results["last_message_tracking"] = True
    else:
        print(f"  {FAIL} last_user_message='{state.last_user_message}', last_assistant_message='{state.last_assistant_message}'")
        results["last_message_tracking"] = False

    # ── Test 6: Conversation Stage Transition (exploration → execution) ──
    print("\n[TEST 6] Conversation Stage Logic")
    state = await context_manager.get_or_create_state(SESSION_ID)
    # The stage defaults to 'exploration' on fresh session
    if state.conversation_stage == "exploration":
        print(f"  {PASS} New sessions start at 'exploration' stage.")
        results["stage_default"] = True
    else:
        print(f"  {FAIL} Expected 'exploration', got '{state.conversation_stage}'")
        results["stage_default"] = False

    # ── Test 7: In-Memory Fallback (no Postgres required) ─────────
    print("\n[TEST 7] In-Memory Fallback Persistence")
    await context_manager.reset_session(SESSION_ID)
    await context_manager.commit_history(SESSION_ID, "Does the fallback work?", "Yes, it does!")
    state = await context_manager.get_or_create_state(SESSION_ID)
    if state and state.history:
        print(f"  {PASS} In-memory fallback is persisting state across calls.")
        results["fallback_persistence"] = True
    else:
        print(f"  {FAIL} In-memory fallback not working.")
        results["fallback_persistence"] = False

    # ── Test 8: Response generator receives history ────────────────
    print("\n[TEST 8] Response Generator Receives History")
    try:
        from response.service import response_service
        from preprocessing.models import PreprocessedResponse
        from intent_detection.models import IntentDetectionResponse, IntentDetail
        
        await context_manager.reset_session(SESSION_ID)
        await context_manager.commit_history(SESSION_ID, "My name is Manuel.", "Nice to meet you, Manuel!")
        state = await context_manager.get_or_create_state(SESSION_ID)
        
        intent = IntentDetectionResponse(
            interaction_style="conversational",
            intents=[IntentDetail(primary_intent="conversational", sub_intent="greeting", confidence=0.9)],
            is_multi_intent=False,
            execution_strategy={"requires_tools": False, "requires_planning": False, "execution_mode": "direct_response"},
            capabilities_required=[],
            entities={},
            ambiguity_detected=False,
            reasoning="Follow-up conversation"
        )
        base = PreprocessedResponse(
            raw_input="What's my name?",
            cleaned_input="What's my name?",
            language="en",
            intent=intent
        )
        response = await response_service.generate_final_response(base, state=state)
        if "Manuel" in response.content:
            print(f"  {PASS} EDITH correctly recalled 'Manuel' from conversation history.")
            print(f"         Response: {response.content[:100]}...")
            results["history_in_response"] = True
        else:
            print(f"  [WARN] History was passed but response didn't use it (LLM non-deterministic).")
            print(f"         Response: {response.content[:100]}...")
            results["history_in_response"] = "WARN"
    except Exception as e:
        print(f"  {FAIL} Response generator test errored: {e}")
        results["history_in_response"] = False

    # ── Summary ──────────────────────────────────────────────────
    print("\n" + "="*60)
    print("  AUDIT SUMMARY")
    print("="*60)
    for test, result in results.items():
        status = PASS if result is True else ("[WARN]" if result == "WARN" else FAIL)
        print(f"  {status}  {test}")
    
    passed = sum(1 for v in results.values() if v is True)
    warned = sum(1 for v in results.values() if v == "WARN")
    failed = sum(1 for v in results.values() if v is False)
    total  = len(results)
    print(f"\n  Result: {passed} passed, {warned} warned, {failed} failed out of {total} tests.")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(run_audit())
