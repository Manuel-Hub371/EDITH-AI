import asyncio
from intent_detection.models import IntentDetectionResponse, IntentDetail
from filesystem.service import filesystem_service
import logging

logging.basicConfig(level=logging.INFO)

async def test_multi_intent():
    intent_data = IntentDetectionResponse(
        interaction_style="direct",
        intents=[
            IntentDetail(primary_intent="actionable", sub_intent="create_folder", confidence=0.9),
            IntentDetail(primary_intent="actionable", sub_intent="create_file", confidence=0.9)
        ],
        is_multi_intent=True,
        execution_strategy={"requires_tools": True, "requires_planning": False, "execution_mode": "tool_execution"},
        capabilities_required=["filesystem_access", "document_generation"],
        entities={
            "folder_name": "PersonalTest",
            "path": "Desktop",
            "file_name": "James",
            "document_type": "pdf"
        },
        ambiguity_detected=False,
        reasoning="Testing multi intent creation"
    )
    
    result = await filesystem_service.execute_operation(intent_data)
    print(result)

if __name__ == "__main__":
    asyncio.run(test_multi_intent())
