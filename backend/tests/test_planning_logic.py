import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from execution_planner.service import execution_planner

async def run_test():
    print("====================================================")
    print("Testing Execution Planner Steps for Double Tasks")
    print("====================================================")
    
    # 1. Test case 1
    query_1 = "Create a text file, save it as 'TestingFile.txt' and create a folder called 'TestingFolder'. Save the file in the folder."
    print(f"\nQUERY 1: {query_1}")
    plan_1 = await execution_planner.generate_plan(query_1)
    print(f"Goal: {plan_1.goal}")
    print(f"Total steps: {plan_1.total_steps}")
    for step in plan_1.steps:
        print(f"  Step {step.step_number}: action={step.action}, parameters={step.parameters}")
        
    # 2. Test case 2
    query_2 = "Create a folder called 'JamesFolder' on the Desktop and move the James text file in the Documents folder into it."
    print(f"\nQUERY 2: {query_2}")
    plan_2 = await execution_planner.generate_plan(query_2)
    print(f"Goal: {plan_2.goal}")
    print(f"Total steps: {plan_2.total_steps}")
    for step in plan_2.steps:
        print(f"  Step {step.step_number}: action={step.action}, parameters={step.parameters}")

if __name__ == "__main__":
    asyncio.run(run_test())
