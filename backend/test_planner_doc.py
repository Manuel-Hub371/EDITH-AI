import asyncio
from execution_planner.models import ExecutionPlan, ExecutionStep
from execution_engine.service import execution_engine
import logging

logging.basicConfig(level=logging.INFO)

async def test_planner_doc():
    plan = ExecutionPlan(
        goal="Create a pdf report on AI",
        total_steps=1,
        estimated_impact="high",
        steps=[
            ExecutionStep(
                step_number=1,
                action="document_generation",
                parameters={
                    "file_name": "ai_report.pdf",
                    "path": "Desktop",
                    "content": "AI is taking over the world.",
                    "document_type": "pdf"
                },
                reasoning="Create the report"
            )
        ]
    )
    
    results = await execution_engine.run(plan)
    print(results)

if __name__ == "__main__":
    asyncio.run(test_planner_doc())
