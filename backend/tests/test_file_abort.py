import asyncio
from intent_detection.models import IntentDetectionResponse, IntentDetail
from filesystem.service import filesystem_service
import logging

logging.basicConfig(level=logging.INFO)

async def test_file_aborts():
    # Test 1: PDF File
    pdf_intent = IntentDetectionResponse(
        interaction_style="direct",
        intents=[IntentDetail(primary_intent="actionable", sub_intent="create_file", confidence=0.9)],
        is_multi_intent=False,
        execution_strategy={"requires_tools": True, "requires_planning": False, "execution_mode": "tool_execution"},
        capabilities_required=["filesystem_access"],
        entities={
            "file_name": "Report",
            "document_type": "pdf",
            "path": "ImaginaryDirectoryThatDoesNotExist"
        },
        ambiguity_detected=False,
        reasoning="Test PDF"
    )
    
    # Test 2: Markdown File
    md_intent = IntentDetectionResponse(
        interaction_style="direct",
        intents=[IntentDetail(primary_intent="actionable", sub_intent="create_file", confidence=0.9)],
        is_multi_intent=False,
        execution_strategy={"requires_tools": True, "requires_planning": False, "execution_mode": "tool_execution"},
        capabilities_required=["filesystem_access"],
        entities={
            "file_name": "Notes",
            "document_type": "md",
            "path": "AnotherFakeLocation"
        },
        ambiguity_detected=False,
        reasoning="Test MD"
    )
    
    res1 = await filesystem_service.execute_operation(pdf_intent)
    print("PDF Result:", res1)
    
    res2 = await filesystem_service.execute_operation(md_intent)
    print("MD Result:", res2)

if __name__ == "__main__":
    asyncio.run(test_file_aborts())
