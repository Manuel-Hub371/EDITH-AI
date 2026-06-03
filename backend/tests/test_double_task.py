import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path so we can import modules
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from intent_detection.service import intent_service

async def run_test():
    print("====================================================")
    print("Testing Double Task Intent Detection & Planning Strategy")
    print("====================================================")
    
    # 1. Test case 1
    query_1 = "Create a text file, save it as 'TestingFile.txt' and create a folder called 'TestingFolder'. Save the file in the folder."
    print(f"\nQUERY 1: {query_1}")
    res_1 = await intent_service.detect_intent(query_1)
    print(f"Is Multi-Intent: {res_1.is_multi_intent}")
    print(f"Intents: {[i.dict() for i in res_1.intents]}")
    print(f"Requires Planning: {res_1.execution_strategy.requires_planning}")
    print(f"Execution Mode: {res_1.execution_strategy.execution_mode}")
    print(f"Reasoning: {res_1.reasoning}")
    
    # 2. Test case 2
    query_2 = "Create a folder called 'JamesFolder' on the Desktop and move the James text file in the Documents folder into it."
    print(f"\nQUERY 2: {query_2}")
    res_2 = await intent_service.detect_intent(query_2)
    print(f"Is Multi-Intent: {res_2.is_multi_intent}")
    print(f"Intents: {[i.dict() for i in res_2.intents]}")
    print(f"Requires Planning: {res_2.execution_strategy.requires_planning}")
    print(f"Execution Mode: {res_2.execution_strategy.execution_mode}")
    print(f"Reasoning: {res_2.reasoning}")

if __name__ == "__main__":
    asyncio.run(run_test())
