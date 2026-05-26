import os
from dotenv import load_dotenv
load_dotenv()

# Performance Optimizations
os.environ["OMP_NUM_THREADS"] = "4"
os.environ["MKL_NUM_THREADS"] = "4"

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from preprocessing.models import PreprocessRequest, PreprocessedResponse
from preprocessing.service import preprocess_message
from conversational_context.manager import context_manager
from conversational_context.repository import state_repo

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from conversational_context.memory import memory_service
from research.reranker import reranker

app = FastAPI(title="EDITH Orchestration & Context Service")

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing EDITH...")
    
    # 1. Clear all memory on restart (as requested)
    await context_manager.clear_all_memory()
    logger.info("Memory cleared for a fresh start.")

    # 2. Preloading models for faster response
    logger.info("Preloading models...")
    try:
        _ = memory_service.encoder
        _ = reranker.model
        logger.info("Models preloaded successfully.")
    except Exception as e:
        logger.error(f"Failed to preload some models: {e}. System will try to reload on demand.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat", response_model=PreprocessedResponse)
@app.post("/preprocess", response_model=PreprocessedResponse)
async def chat_endpoint(request: PreprocessRequest, background_tasks: BackgroundTasks):
    """Main entry point for EDITH chat."""
    try:
        return await preprocess_message(request.user_input, request.session_id, background_tasks)
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/state/{session_id}")
async def get_state(session_id: str):
    """Returns the current structured conversation state."""
    state = await state_repo.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state

@app.post("/reset_session")
async def reset_session(request: dict):
    """Clears Postgres and FAISS data for a session."""
    session_id = request.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    await context_manager.reset_session(session_id)
    return {"status": "cleared", "session_id": session_id}

@app.post("/clear_all_memory")
async def clear_all_memory():
    """Wipes all sessions and semantic memory."""
    await context_manager.clear_all_memory()
    return {"status": "all_memory_cleared"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "orchestration"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
