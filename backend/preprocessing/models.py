from pydantic import BaseModel
from typing import List, Optional
from intent_detection.models import IntentDetectionResponse
from response.models import AIResponse

class PreprocessedResponse(BaseModel):
    raw_input: str
    cleaned_input: str
    language: str
    intent: Optional[IntentDetectionResponse] = None
    ai_response: Optional[AIResponse] = None

class PreprocessRequest(BaseModel):
    user_input: str
    session_id: str
