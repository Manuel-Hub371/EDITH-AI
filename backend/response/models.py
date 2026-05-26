from pydantic import BaseModel
from typing import Dict, Any, Optional, List

class AIResponse(BaseModel):
    content: str
    thought_process: Optional[str] = None
    suggested_actions: List[str] = []
    metadata: Dict[str, Any] = {}
