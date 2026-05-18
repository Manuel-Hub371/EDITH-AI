import asyncio
from intent_detection.models import IntentDetectionResponse, IntentDetail
from filesystem.service import filesystem_service
import logging

logging.basicConfig(level=logging.INFO)

async def test_read_file():
    intent_data = IntentDetectionResponse(
        interaction_style="direct",
        intents=[
            IntentDetail(primary_intent="actionable", sub_intent="read_file", confidence=0.9)
        ],
        is_multi_intent=False,
        execution_strategy={"requires_tools": True, "requires_planning": False, "execution_mode": "tool_execution"},
        capabilities_required=["filesystem_access"],
        entities={
            "file_name": "James.pdf",
            "path": "Desktop"
        },
        ambiguity_detected=False,
        reasoning="Test"
    )
    
    result = await filesystem_service.execute_operation(intent_data)
    print(result)

if __name__ == "__main__":
    asyncio.run(test_read_file())
