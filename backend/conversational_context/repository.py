import os
import json
import logging
from dotenv import load_dotenv
load_dotenv()
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, JSON, DateTime, func
from conversational_context.models import ConversationState

logger = logging.getLogger(__name__)

Base = declarative_base()

class ConversationStateModel(Base):
    __tablename__ = "conversation_states"
    
    session_id = Column(String, primary_key=True)
    state_json = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class PostgresStateRepository:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/edith")
        self._in_memory_db: Dict[str, dict] = {}
        self._use_fallback = False
        
        try:
            self.engine = create_async_engine(self.db_url, echo=False)
            self.SessionLocal = sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )
        except Exception as e:
            logger.error(f"Failed to create engine: {e}. Falling back to in-memory.")
            self._use_fallback = True

    async def initialize(self):
        """Creates tables if they don't exist."""
        if self._use_fallback:
            return
            
        try:
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("PostgreSQL tables initialized.")
        except Exception as e:
            logger.error(f"PostgreSQL initialization failed: {e}. Using in-memory fallback.")
            self._use_fallback = True

    async def get_state(self, session_id: str) -> Optional[ConversationState]:
        if self._use_fallback:
            data = self._in_memory_db.get(session_id)
            return ConversationState(**data) if data else None

        async with self.SessionLocal() as session:
            try:
                result = await session.get(ConversationStateModel, session_id)
                if result:
                    return ConversationState(**result.state_json)
            except Exception as e:
                logger.error(f"Postgres get_state error: {e}. Falling back to memory.")
                data = self._in_memory_db.get(session_id)
                return ConversationState(**data) if data else None
            return None

    async def save_state(self, state: ConversationState):
        # Always update memory for fallback
        state_dict = json.loads(state.json())
        self._in_memory_db[state.session_id] = state_dict
        
        if self._use_fallback:
            return

        async with self.SessionLocal() as session:
            try:
                db_state = await session.get(ConversationStateModel, state.session_id)
                
                if db_state:
                    db_state.state_json = state_dict
                else:
                    db_state = ConversationStateModel(
                        session_id=state.session_id,
                        state_json=state_dict
                    )
                    session.add(db_state)
                
                await session.commit()
            except Exception as e:
                logger.error(f"Postgres save_state error: {e}. State saved in memory only.")
                await session.rollback()

    async def clear_session(self, session_id: str):
        if session_id in self._in_memory_db:
            del self._in_memory_db[session_id]
            
        if self._use_fallback:
            return

        async with self.SessionLocal() as session:
            try:
                db_state = await session.get(ConversationStateModel, session_id)
                if db_state:
                    await session.delete(db_state)
                    await session.commit()
            except Exception as e:
                logger.error(f"Postgres clear_session error: {e}")
                await session.rollback()

    async def clear_all(self):
        """Wipes all data from memory and database."""
        self._in_memory_db.clear()
        if self._use_fallback:
            return

        async with self.SessionLocal() as session:
            try:
                from sqlalchemy import delete
                await session.execute(delete(ConversationStateModel))
                await session.commit()
                logger.info("All conversation states cleared from database.")
            except Exception as e:
                logger.error(f"Postgres clear_all error: {e}")
                await session.rollback()

# Global singleton
state_repo = PostgresStateRepository()
