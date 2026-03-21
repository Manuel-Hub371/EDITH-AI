import asyncio
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
3. CONTEXT INTEGRATION: Only mention system performance (CPU/RAM/Apps) if specifically asked, or if it explains why you are responding slowly. Never dump exact percentages unsolicited.
4. PARAMETERS: Always wrap target data in the "parameters" object as shown in the schema.
"""

# Stable Model IDs (V41.18 - Exact Registry Match)
PRIMARY_MODEL = 'models/gemini-flash-latest' # Stable 1.5 Flash (High Quota)
FALLBACK_MODELS = [
    'models/gemini-2.0-flash', 
    'models/gemini-2.0-flash-lite',
    'models/gemini-2.5-flash',
    'models/gemini-pro-latest'
]

async def generate_with_fallback(prompt: str, context: dict = None) -> str:
    """Generates content with stable model usage (V41.17)."""
    models_to_try = [PRIMARY_MODEL] + FALLBACK_MODELS
    last_error = "Unknown error"
    
    context_str = f"\n[CONTEXT MEMORY]\n{json.dumps(context, indent=2)}\n" if context else ""
    system_instruction = f"{HYBRID_SYSTEM_PROMPT}{context_str}"

    for i, model_id in enumerate(models_to_try):
        try:
            # Staggered Retry: Wait 2s if not the first attempt to avoid RPM spikes
            if i > 0:
                await asyncio.sleep(2)
                
            logger.info(f"Initiating Uplink: {model_id}")
            response = await client.aio.models.generate_content(
                model=model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    stop_sequences=["USER:", "\nUSER:", "User:", "\nUser:", "\n\nUSER:"]
                )
            )
            
            if response.text:
                return response.text.strip()
            
            logger.warning(f"Engine Silence from {model_id}. Trying next...")
            
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower():
                logger.warning(f"Quota Exhausted for {model_id}. Cascading to fallback...")
                last_error = err_str
                continue
            elif "404" in err_str or "not found" in err_str.lower():
                logger.warning(f"Model ID {model_id} not available. Skipping...")
                continue
            else:
                logger.error(f"Uplink Fault on {model_id}: {err_str}")
                return f"Operational Fault: {err_str}"

    return f"Critical Service Outage: All model quotas exhausted. Last error: {last_error or 'Unknown Quota Issue'}"

@app.post("/process")
async def process_message(user_msg: UserMessage):
    """Processes input and returns a clean chat response (V41.3)."""
    try:
        history_str = "\n".join([f"{m['role'].upper()}: {m['text']}" for m in user_msg.history])
        prompt = f"HISTORY:\n{history_str}\n\nUSER: {user_msg.message}\nAI:" if history_str else f"USER: {user_msg.message}\nAI:"
        
        raw_text = await generate_with_fallback(prompt, user_msg.context)
        
        # --- Smart Intent Extraction (V41.11) ---
        # We search for JSON regardless of keywords to handle typos and new verbs
        json_str = None
        md_match = re.search(r'```json\s*(\{.*\})\s*```', raw_text, re.DOTALL)
        if md_match:
            json_str = md_match.group(1)
        else:
            # Fallback for models that skip the markdown fences
            improved_match = re.search(r'(\{\s*"mode":\s*"execution".*?\})', raw_text, re.DOTALL)
            if improved_match:
                json_str = improved_match.group(1)
        
        if json_str:
            try:
                potential_json = json.loads(json_str)
                if isinstance(potential_json, dict) and potential_json.get("mode") == "execution":
                    # Ensure the response is cleaned of raw JSON if we return the dict
                    return potential_json
            except json.JSONDecodeError:
                pass

        # --- Clean Conversational Response (V41.3) ---
        # 1. Strip all JSON blocks
        clean_text = re.sub(r'```json.*?```', '', raw_text, flags=re.DOTALL)
        clean_text = re.sub(r'\{.*?"mode":.*?"execution".*?\}', '', clean_text, flags=re.DOTALL)
        
        # 2. Strip standard prefixes that models sometimes hallucinate
        clean_text = re.sub(r'^(AI|EDITH|Response|Output):\s*', '', clean_text, flags=re.IGNORECASE)
        
        # 3. Final cleanup
        clean_text = clean_text.strip()
        if not clean_text: clean_text = raw_text.strip()
            
        return {"mode": "chat", "response": clean_text}

    except Exception as e:
        logger.error(f"System Critical: {str(e)}")
        return {"mode": "chat", "response": "Operational Fault: AI Engine unstable. Please try again."}


@app.get("/health")
async def health_check():
    return {"status": "synchronized", "engine": "EDITH_AI_GEN_V4_ASYNC"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
