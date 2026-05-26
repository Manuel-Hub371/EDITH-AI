from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ExecutionStep(BaseModel):
    step_number: int
    action: str = Field(..., description="The tool or service to call (e.g., 'filesystem', 'research', 'web_search')")
    parameters: Dict[str, Any] = Field(..., description="Parameters for the action")
    reasoning: str = Field(..., description="Why this step is necessary")

class ExecutionPlan(BaseModel):
    goal: str
    steps: List[ExecutionStep]
    total_steps: int
    estimated_impact: str
