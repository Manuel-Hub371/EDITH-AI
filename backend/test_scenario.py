import asyncio
from execution_planner.models import ExecutionPlan, ExecutionStep
from execution_engine.service import execution_engine
import logging

logging.basicConfig(level=logging.INFO)

async def test_user_scenario():
    print("--- Simulating User Scenario ---")
    plan = ExecutionPlan(
        goal="Create a pdf report on Ghanas Inflation rate and save on Documents",
        total_steps=2,
        estimated_impact="high",
        steps=[
            ExecutionStep(
                step_number=1,
                action="research",
                parameters={"query": "Ghanas Inflation rate and how it is affecting the country and its members"},
                reasoning="Get data"
            ),
            ExecutionStep(
                step_number=2,
                action="create_folder",
                parameters={"folder_name": "GhanaReports", "path": "Documents"},
                reasoning="Create the target folder"
            ),
            ExecutionStep(
                step_number=3,
                action="document_generation",
                parameters={
                    "file_name": "Ghana_Inflation_Report.pdf",
                    "path": "GhanaReports",
                    "content": "<findings>",
                    "document_type": "pdf"
                },
                reasoning="Create the report"
            )
        ]
    )
    
    # Mock research to return a fast string for testing
    from research.service import research_service
    async def mock_perform_research(query, state=None):
        return "Ghana's inflation rate has fluctuated significantly..."
    research_service.perform_research = mock_perform_research
    
    res = await execution_engine.run(plan)
    print("Plan Output:", res)

if __name__ == "__main__":
    asyncio.run(test_user_scenario())
