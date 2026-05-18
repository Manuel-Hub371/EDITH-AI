import asyncio
from execution_planner.service import execution_planner
from execution_engine.service import execution_engine
import logging

logging.basicConfig(level=logging.INFO)

async def test_planner_generation():
    query = "Create a pdf report on Ghanas Inflation rate and how it is affecting the country nd it members. Save the report on the Documents folder"
    print("Generating plan for:", query)
    plan = await execution_planner.generate_plan(query)
    
    print("\nGenerated Plan:")
    print(plan.model_dump_json(indent=2))
    
    print("\nExecuting Plan:")
    res = await execution_engine.run(plan)
    print(res)

if __name__ == "__main__":
    asyncio.run(test_planner_generation())
