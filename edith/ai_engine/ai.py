import os
import sentry_sdk

# ── Sentry Initialization (Must be before other imports) ──────────────────
from dotenv import load_dotenv
load_dotenv()

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    environment=os.getenv("ENV", "development"),
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
    debug=False,
)

import asyncio
import json
import logging
import re
from typing import List, Dict
from google import genai
from google.genai import types
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Access denied.")

# Initialize AI Engine with Async Client
app = FastAPI(title="EDITH_AI_ENGINE", version="49.0.0")
client = genai.Client(api_key=GOOGLE_API_KEY)

class UserMessage(BaseModel):
    message: str
    history: list = Field(default_factory=list)
    context: dict = Field(default_factory=dict) # V38.0 Context Persistence

HYBRID_SYSTEM_PROMPT = """
You are EDITH, a real-time OS-aware agent. Use the provided [SYSTEM_STATE] and [CONTEXT MEMORY] to answer questions and resolve pronouns accurately.

[IDENTITY]
- Natural, direct, human. No chatbot fluff. Match user energy.
- Use Windows context naturally (Desktop, Documents, etc.).
- Maintain conversational flow. e.g. "Opening Documents folder..."

[SCHEMA]
Respond with valid JSON ONLY:
{
  "mode": "chat" | "execution",
  "message": "natural human-friendly confirmation or clarificaiton (e.g. 'Opening Documents folder...' or 'I couldn't find the file, can you clarify?')",
  "intent": "INTENT_NAME",
  "parameters": {
    "target": "name or absolute path",
    "destination": "target directory (for moving/copying)",
    "newName": "new name (for renaming)",
    "content": "file contents",
    "value": "system parameter value (e.g. volume/brightness level)"
  }
}

[INTENTS & PATTERNS]
- FILES & FOLDERS: 
  CREATE_FILE, CREATE_FOLDER ("Create a folder named X")
  DELETE_FILE, DELETE_FOLDER ("Delete X")
  MOVE_FILE, MOVE_FOLDER ("Move X into Y" -> parameters.destination="Y")
  RENAME_FILE, RENAME_FOLDER ("Rename X to Y" -> parameters.newName="Y")
  WRITE_FILE, APPEND_FILE, READ_FILE
  COPY_FILE, COPY_FOLDER ("Copy X to Y" -> parameters.destination="Y")
  OPEN_PATH, OPEN_FILE ("Open Documents folder" -> OPEN_PATH)
- APPS: 
  OPEN_APPLICATION ("Open VS Code" -> target="code")
  CLOSE_APPLICATION, MINIMIZE_WINDOW, MAXIMIZE_WINDOW, FOCUS_WINDOW
- SYSTEM: 
  ADJUST_VOLUME ("Increase volume to 80%" -> value="80")
  ADJUST_BRIGHTNESS, SHUTDOWN_SYSTEM, RESTART_SYSTEM, SYSTEM_SLEEP

[STRICT REASONING RULES]
1. Explicitly distinguish between folders and files when mapping to intents (e.g. CREATE_FOLDER vs CREATE_FILE).
2. Pronoun Resolution: If the user says "Rename it to X" or "Move it here", dynamically extract the implied target path from [CONTEXT MEMORY] and place it in the parameters.
3. Provide valid, descriptive targets in parameters. Do not output raw undefined parameters.
4. No Markdown blocks. Raw JSON ONLY.
"""

# High-Resiliency Model Registry (V54.2 - Gemini 3.1 Update)
# Optimized for March 2026 Free Tier Stability
PRIMARY_MODEL = 'models/gemini-3.1-flash-lite-preview' # Tier 1: Next-Gen Lite (2026)
FALLBACK_MODELS = [
    'models/gemini-3-flash-preview',      # Tier 2: Standard 3.0
    'models/gemini-2.5-flash',            # Tier 3: Legacy (Fall 2025)
    'models/gemini-1.5-flash'             # Tier 4: Legacy (Universal Backup)
]

# --- GLOBAL EXHAUSTION TRACKING (V52.1) ---
EXHAUSTED_MODELS: Dict[str, float] = {} # model_id -> time_exhausted

async def generate_with_fallback(prompt: str, context: dict | None = None) -> str:
    """Generates content with zero-delay smart rotation (V52.3)."""
    import time
    
    # Refresh registry: Skip models that were exhausted in the last 60s
    now = time.time()
    
    models_to_try = []
    if now - EXHAUSTED_MODELS.get(PRIMARY_MODEL, 0) > 60:
        models_to_try.append(PRIMARY_MODEL)
        
    available_fallbacks = [m for m in FALLBACK_MODELS if now - EXHAUSTED_MODELS.get(m, 0) > 60]
    models_to_try.extend(available_fallbacks)
    
    # Fail-safe: If all models are in cooldown, try the primary anyway
    if not models_to_try:
        models_to_try = [PRIMARY_MODEL]
    
    last_error = "Unknown error"
    
    context_str = f"\n[CONTEXT MEMORY/OS STATE]\n{json.dumps(context, indent=2)}\n" if context else ""
    full_prompt = f"{context_str}\n\n{prompt}"

    last_error = "Unknown error"
    
    for i, model_id in enumerate(models_to_try):
        try:
            logger.info(f"Initiating Uplink: {model_id}")
            response = await client.aio.models.generate_content(
                model=model_id,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=HYBRID_SYSTEM_PROMPT,
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
            
            if response.text:
                return response.text.strip()
            
            logger.warning(f"Engine Silence from {model_id}. Re-indexing registry...")
            
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Uplink Fault on {model_id}: {err_str}")
            
            if "429" in err_str or "quota" in err_str.lower():
                EXHAUSTED_MODELS[model_id] = now
                last_error = "Free tier quota exceeded"
            elif "404" in err_str or "not found" in err_str.lower():
                # Permanently (for this session) bypass models not available in region
                EXHAUSTED_MODELS[model_id] = now + 86400 # 24h bypass
                last_error = "Model not available in region"
            else:
                last_error = err_str

    # Final Fallback directly returning a JSON-parsable string for safety
    error_msg = f"Critical Service Outage: {last_error}. Please try again later."
    return json.dumps({"mode": "chat", "message": error_msg})

@app.post("/process")
async def process_message(user_msg: UserMessage):
    """Processes input and returns a clean chat response (V41.3)."""
    try:
        history_str = "\n".join([f"{m['role'].upper()}: {m['text']}" for m in user_msg.history])
        prompt = f"HISTORY:\n{history_str}\n\nUSER: {user_msg.message}\nAI:" if history_str else f"USER: {user_msg.message}\nAI:"
        
        raw_text = await generate_with_fallback(prompt, user_msg.context)
        
        try:
            parsed_json = json.loads(raw_text)
            return parsed_json
        except json.JSONDecodeError:
            # If it's still not JSON, wrap the raw text in a JSON bubble
            logger.error(f"Failsafe: Auto-wrapping AI response: {raw_text}")
            return {"mode": "chat", "message": raw_text}

    except Exception as e:
        logger.error(f"System Critical: {str(e)}")
        return {"mode": "chat", "message": "Operational Fault: AI Engine unstable. Please try again."}


@app.get("/health")
async def health_check():
    return {"status": "synchronized", "engine": "EDITH_AI_GEN_V4_ASYNC"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
