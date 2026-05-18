import asyncio
from filesystem.service import filesystem_service
from intent_detection.models import IntentDetectionResponse, IntentDetail
import logging

logging.basicConfig(level=logging.INFO)

async def test_rename_operation():
    # Simulate the user's intent: rename me.txt to Emmanuel.txt
    intent = IntentDetectionResponse(
        interaction_style="direct",
        intents=[IntentDetail(primary_intent="actionable", sub_intent="rename", confidence=1.0)],
        is_multi_intent=False,
        execution_strategy={"requires_tools": True, "requires_planning": False, "execution_mode": "tool_augmented"},
        capabilities_required=["filesystem_access"],
        entities={"path": "me.txt", "new_name": "Emmanuel.txt", "location": "Desktop"},
        ambiguity_detected=False,
        reasoning="Renaming a file"
    )
    
    print("Executing rename operation...")
    result = await filesystem_service.execute_operation(intent)
    print("Result:", result)

if __name__ == "__main__":
    asyncio.run(test_rename_operation())
