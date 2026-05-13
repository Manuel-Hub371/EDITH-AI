from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Dict, Any, Optional, Literal
from intent_detection.registry import INTENT_REGISTRY, EXECUTION_STRATEGIES

class IntentDetail(BaseModel):
    primary_intent: str 
    sub_intent: str
    confidence: float = Field(ge=0.0, le=1.0)

    @root_validator(pre=True)
    def fix_hierarchy(cls, values):
        sub = values.get('sub_intent')
        for primary_cat, subs in INTENT_REGISTRY.items():
            if sub in subs:
                values['primary_intent'] = primary_cat
                return values
        return values

class ExecutionStrategy(BaseModel):
    requires_tools: bool
    requires_planning: bool
    execution_mode: str

    @validator('execution_mode')
    def validate_mode(cls, v):
        if v not in EXECUTION_STRATEGIES:
            # Map common hallucinations to allowed strategies
            if "filesystem" in v.lower() or "tool" in v.lower() or "api" in v.lower():
                return "tool_augmented"
            if "plan" in v.lower():
                return "planner_required"
            return "direct_response"
        return v

class IntentDetectionResponse(BaseModel):
    interaction_style: str
    intents: List[IntentDetail]
    is_multi_intent: bool
    
    execution_strategy: ExecutionStrategy
    capabilities_required: List[str]
    
    entities: Dict[str, Any] = {}
    
    ambiguity_detected: bool
    missing_parameters: List[str] = []
    clarification_question: Optional[str] = None
    
    reasoning: str
    
    # Metadata for state tracking
    active_topic: Optional[str] = None
    user_goal: Optional[str] = None
    current_task: Optional[str] = None
    conversation_stage: Literal["exploration", "planning", "execution", "completion"] = "exploration"

    @validator('ambiguity_detected', always=True)
    def check_ambiguity(cls, v, values):
        intents = values.get('intents', [])
        if intents and any(i.confidence < 0.60 for i in intents):
            return True
        return v
