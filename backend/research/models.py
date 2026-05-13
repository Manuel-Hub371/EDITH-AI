from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class ResearchStep(BaseModel):
    id: str
    description: str
    query: Optional[str] = None
    tool: Literal["web_search", "filesystem", "memory", "knowledge_base"] = "web_search"
    status: Literal["pending", "running", "completed", "failed"] = "pending"
    result: Optional[str] = None

class ResearchPlan(BaseModel):
    session_id: str
    goal: str
    steps: List[ResearchStep] = []
    current_step_index: int = 0
    is_complete: bool = False

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str = "web"
    score: float = 0.0
    content: Optional[str] = None
    published_date: Optional[str] = None
