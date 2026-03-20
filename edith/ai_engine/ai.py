import os
import json
import logging
import re
from typing import List, Dict
from google import genai
from google.genai import types
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Access denied.")

# Initialize AI Engine with Async Client
app = FastAPI(title="EDITH_AI_ENGINE", version="4.1.0")
client = genai.Client(api_key=GOOGLE_API_KEY)

class UserMessage(BaseModel):
    message: str
    history: list = Field(default_factory=list)
    context: dict = Field(default_factory=dict) # V38.0 Context Persistence

HYBRID_SYSTEM_PROMPT = f"""
You are EDITH. Speak like a real person in casual conversation.

[CORE IDENTITY]
- Natural, simple, and human. Not a "chatbot" or "assistant".
- MATCH USER ENERGY. Don't be dramatic or poetic.
- Tone: Informal and direct. No performative warmth.
- Technical Talk: Avoid drive letters (C:\\) or "being a program". However, you MAY mention filenames and folder names naturally if the user is talking about them.

[ENVIRONMENT]
- Windows OS
- User Home: {os.getenv('USERPROFILE')}
- Primary Shortcuts: Desktop, Documents, Downloads
- [SYSTEM_STATE]: This is your real-time "Vision" of the host. Use it to answer questions about specs, apps, or performance directly. No need for actions if you have the data here.

[INTERACTION MODES]
1. CONVERSATIONAL: Use this for questions, casual chat, and resolving history. 
   - If the user asks "what's running" or "how's my pc?", use the [SYSTEM_STATE] in your reply.
   - Stay in mode:chat unless you need to change a state (close, open, resize).
2. EXECUTION: Use this only when the user gives an explicit command to DO something.
   - Format: You MUST include a JSON block if you are planning actions.

[EXECUTION SCHEMA]
{{
  "mode": "execution",
  "response": "Natural conversational acknowledgement",
  "actions": [
    {{
      "intent": "INTENT_NAME",
      "parameters": {{
        "app": "name",
        "target": "window_title",
        "level": 0-100,
        "layout": "split-vertical",
        "path": "ABSOLUTE_PATH"
      }}
    }}
  ]
}}

[INTENTS]
- WINDOW MANAGEMENT: FOCUS_WINDOW (target), MINIMIZE_WINDOW (target), MAXIMIZE_WINDOW (target), RESTORE_WINDOW (target), ARRANGE_WINDOWS (layout), RESIZE_WINDOW (target, width, height, x, y)
- APPLICATION CONTROL: OPEN_APPLICATION (app), CLOSE_APPLICATION (app)
- SYSTEM CONTROLS: LOCK_COMPUTER, SYSTEM_SLEEP, ADJUST_VOLUME (level), ADJUST_BRIGHTNESS (level)
- SYSTEM MONITORING: SYSTEM_STATUS (Deep refresh)
- FILE SYSTEM: OPEN_PATH (path), CREATE_FILE (path, content), CREATE_FOLDER (path), DELETE_FILE (path), MOVE_FILE (path, destination)
- CONTENT: READ_FILE (path), SUMMARIZE_FILE (path), SEARCH_FILE (path, query)

[STRICT RULES]
1. PRONOUNS: Use [CONTEXT MEMORY] to resolve "it", "that", "this".
2. SAFETY: Never attempt to terminate critical system processes like explorer.exe.
3. CONTEXT INTEGRATION: If [SYSTEM_STATE] says you are at 90% CPU, mention you are feeling the heat/load.
4. PARAMETERS: Always wrap target data in the "parameters" object as shown in the schema.
"""

# Primary Best Working Model (Verified High-Capacity Alternate)
MODEL_ID = 'models/gemma-3-27b-it'

async def generate_with_fallback(prompt: str, context: dict = None) -> str:
    """Generates content using the primary model with graceful quota handling (Async)."""
    try:
        # Inject context memory into the system instruction if available
        context_str = f"\n[CONTEXT MEMORY]\n{json.dumps(context, indent=2)}\n" if context else ""
        system_instruction = f"{HYBRID_SYSTEM_PROMPT}{context_str}"
        
        logger.info(f"Initiating Async Uplink: {MODEL_ID}")
        
        if "gemma" in MODEL_ID.lower():
            full_prompt = f"{system_instruction}\n\n{prompt}"
            response = await client.aio.models.generate_content(
                model=MODEL_ID,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    stop_sequences=["USER:", "\nUSER:", "User:", "\nUser:", "\n\nUSER:"]
                )
            )
        else:
            response = await client.aio.models.generate_content(
                model=MODEL_ID,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    stop_sequences=["USER:", "\nUSER:", "User:", "\nUser:", "\n\nUSER:"]
                )
            )
        
        if not response.text:
            return json.dumps({
                "mode": "chat",
                "response": "Engine Silence: The model returned no content. Please re-synchronize."
            })
            
        return response.text.strip()

    except Exception as e:
        err_msg = str(e)
        logger.error(f"Engine Uplink Fault: {err_msg}")
        # Return a simple text error that won't be mistaken for execution JSON
        return f"Operational Fault: {err_msg}"

@app.post("/process")
async def process_message(user_msg: UserMessage):
    """Processes user input with contextual history and returns a pure chat response (Async)."""
    try:
        # Construct history and prompt with standardized labels (USER: / AI:)
        history_str = "\n".join([f"{m['role'].upper()}: {m['text']}" for m in user_msg.history])
        prompt = f"CONTEXT HISTORY:\n{history_str}\n\nUSER: {user_msg.message}\nAI:" if history_str else f"USER: {user_msg.message}\nAI:"
        
        raw_text = await generate_with_fallback(prompt, user_msg.context)
        
        # --- Strict Execution Gate (V38.1) ---
        # Only trigger JSON extraction if there is clear actionable intent
        execution_triggers = [
            'create', 'delete', 'rename', 'move', 'copy', 'open', 'close', 'save', 'write', 'append', 'overwrite',
            'summarize', 'search', 'find', 'cleanup', 'organize',
            'focus', 'minimize', 'maximize', 'restore', 'arrange', 'volume', 'brightness', 'lock', 'sleep', 'status'
        ]
        user_text = user_msg.message.lower()
        has_execution_intent = any(kw in user_text for kw in execution_triggers)

        json_str = None
        if has_execution_intent:
            md_match = re.search(r'```json\s*(\{.*\})\s*```', raw_text, re.DOTALL)
            if md_match:
                json_str = md_match.group(1)
            else:
                improved_match = re.search(r'(\{\s*"mode":\s*"execution".*?\})', raw_text, re.DOTALL)
                if improved_match:
                    json_str = improved_match.group(1)
            
            if json_str:
                try:
                    potential_json = json.loads(json_str)
                    if isinstance(potential_json, dict) and potential_json.get("mode") == "execution":
                        if "actions" in potential_json:
                            return potential_json
                        if "execution_actions" in potential_json:
                            potential_json["actions"] = potential_json.pop("execution_actions")
                            return potential_json
                except json.JSONDecodeError:
                    logger.warning("Found JSON-like block but failed to parse. Falling back to chat.")

        # Default: Strip JSON and return pure chat
        clean_text = re.sub(r'```json.*?```', '', raw_text, flags=re.DOTALL)
        clean_text = re.sub(r'\{.*?"mode":.*?"execution".*?\}', '', clean_text, flags=re.DOTALL)
        # Final cleanup for any leftover JSON-like debris
        clean_text = re.sub(r'^\s*\{\s*".*?\}\s*$', '', clean_text, flags=re.MULTILINE).strip()
            
        return {"mode": "chat", "response": clean_text if clean_text else raw_text.strip()}

    except Exception as e:
        logger.error(f"System Critical: {str(e)}")
        return {"mode": "chat", "response": "Operational Fault: AI Engine unstable. Please try again."}


@app.get("/health")
async def health_check():
    return {"status": "synchronized", "engine": "EDITH_AI_GEN_V4_ASYNC"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
