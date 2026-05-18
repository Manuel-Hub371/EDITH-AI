import asyncio
from execution_planner.models import ExecutionPlan, ExecutionStep
from execution_engine.service import execution_engine
import logging

logging.basicConfig(level=logging.INFO)

async def test_planner_logic():
    # 1. Test Context Passing (Success)
    print("--- TEST 1: Context Passing ---")
    plan1 = ExecutionPlan(
        goal="Create a pdf report on AI",
        total_steps=2,
        estimated_impact="high",
        steps=[
            ExecutionStep(
                step_number=1,
                action="research",
                parameters={"query": "test query"},
                reasoning="Get data"
            ),
            ExecutionStep(
                step_number=2,
                action="document_generation",
                parameters={
                    "file_name": "ai_report.pdf",
                    "path": "Desktop",
                    "content": "RESEARCH FINDINGS:\n<findings>",
                    "document_type": "pdf"
                },
                reasoning="Create the report"
            )
        ]
    )
    
    # Mock research to return a fast string for testing
    from research.service import research_service
    async def mock_perform_research(query, state=None):
        return "These are the fake research findings about AI."
    research_service.perform_research = mock_perform_research
    
    res1 = await execution_engine.run(plan1)
    print("Plan 1 Output:", res1)
    
    # 2. Test Aborting on Failure
    print("\n--- TEST 2: Abort on Failure ---")
    plan2 = ExecutionPlan(
        goal="Create a folder in a bad path",
        total_steps=2,
        estimated_impact="low",
        steps=[
            ExecutionStep(
                step_number=1,
                action="create_folder",
                parameters={"folder_name": "TestFolder", "path": "BadLocationXYZ"},
                reasoning="Create folder (will fail)"
            ),
            ExecutionStep(
                step_number=2,
                action="create_file",
                parameters={"file_name": "test.txt", "content": "Hello", "path": "TestFolder"},
                reasoning="This should NEVER run"
            )
        ]
    )
    
    res2 = await execution_engine.run(plan2)
    print("Plan 2 Output:", res2)

if __name__ == "__main__":
    asyncio.run(test_planner_logic())
