from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class TaskProgress(BaseModel):
    status: Literal["not_started", "in_progress", "blocked", "completed"] = "not_started"
    steps_completed: int = 0
    total_steps: int = 0

class MemoryRefs(BaseModel):
    faiss_ids: List[str] = []

class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class ConversationState(BaseModel):
    session_id: str
    active_topic: Optional[str] = None
    user_goal: Optional[str] = None
    current_task: Optional[str] = None
    conversation_stage: Literal["exploration", "planning", "execution", "completion"] = "exploration"
    
    intents: List[Dict[str, Any]] = []
    entities: List[str] = []
    constraints: List[str] = []
    open_questions: List[str] = []
    
    # Full conversation history — the key to context awareness
    history: List[ConversationTurn] = []
    
    task_progress: TaskProgress = Field(default_factory=TaskProgress)
    memory_refs: MemoryRefs = Field(default_factory=MemoryRefs)
    
    last_user_message: Optional[str] = None
    last_assistant_message: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.now)

    def add_turn(self, role: str, content: str):
        """Append a turn and keep last_*_message in sync. Cap history at 30 turns."""
        self.history.append(ConversationTurn(role=role, content=content))
        if len(self.history) > 30:
            self.history = self.history[-30:]
        if role == "user":
            self.last_user_message = content
        else:
            self.last_assistant_message = content
        self.updated_at = datetime.now()

    def history_as_text(self, max_turns: int = 10) -> str:
        """Format recent history as a readable string for LLM prompts."""
        recent = self.history[-max_turns:]
        lines = []
        for turn in recent:
            prefix = "User" if turn.role == "user" else "EDITH"
            lines.append(f"{prefix}: {turn.content}")
        return "\n".join(lines) if lines else "No prior conversation."
