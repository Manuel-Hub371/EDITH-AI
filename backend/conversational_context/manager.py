import logging
import asyncio
from typing import Optional, Dict
from conversational_context.models import ConversationState
from conversational_context.repository import state_repo
from conversational_context.memory import memory_service
from conversational_context.updater import state_updater

logger = logging.getLogger(__name__)

class ConversationManager:
    def __init__(self):
        self._locks: Dict[str, asyncio.Lock] = {}

    def _get_lock(self, session_id: str) -> asyncio.Lock:
        if session_id not in self._locks:
            self._locks[session_id] = asyncio.Lock()
        return self._locks[session_id]

    async def get_or_create_state(self, session_id: str) -> ConversationState:
        await state_repo.initialize()
        state = await state_repo.get_state(session_id)
        if not state:
            state = ConversationState(session_id=session_id)
            await state_repo.save_state(state)
        return state

    async def commit_history(
        self,
        session_id: str,
        user_message: str,
        assistant_message: Optional[str] = None
    ) -> ConversationState:
        """
        Fast path: Update history and save immediately.
        """
        state = await self.get_or_create_state(session_id)
        state.add_turn("user", user_message)
        if assistant_message:
            state.add_turn("assistant", assistant_message)
        
        await state_repo.save_state(state)
        return state

    async def background_update_state(
        self,
        session_id: str,
        user_message: str,
        assistant_message: Optional[str] = None
    ):
        """
        Slow path: LLM extraction and memory indexing (run in background).
        """
        # We need the lock to ensure we don't have concurrent state updates
        async with self._get_lock(session_id):
            state = await self.get_or_create_state(session_id)
            
            # 1. Retrieve semantic memory
            memories = memory_service.search(user_message)
            mem_str = "\n".join([m['text'] for m in memories])

            # 2. Run LLM state extractor
            try:
                updated_state = await state_updater.update_state(
                    state,
                    user_message,
                    assistant_message,
                    mem_str
                )
                
                # 3. Preserve full history (managed by state.add_turn, not LLM)
                updated_state.history = state.history
                updated_state.last_user_message = state.last_user_message
                updated_state.last_assistant_message = state.last_assistant_message

                # 4. Save to Repository
                await state_repo.save_state(updated_state)
                
                # 5. Index this turn in FAISS
                memory_service.add_memory(
                    f"User: {user_message}\nAssistant: {assistant_message or ''}",
                    {"session_id": session_id, "topic": updated_state.active_topic}
                )
            except Exception as e:
                logger.error(f"Background update failed: {e}")

    async def reset_session(self, session_id: str):
        async with self._get_lock(session_id):
            await state_repo.clear_session(session_id)
            # Note: FAISS clearing is currently global, so we don't clear it per session 
            # to avoid affecting other active users. In prod, FAISS should be filtered by session_id.
            
    async def clear_all_memory(self):
        """Global wipe of everything."""
        await state_repo.clear_all()
        memory_service.clear_memory()
        logger.info("Global memory reset completed.")

# Global singleton
context_manager = ConversationManager()
