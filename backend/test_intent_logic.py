import asyncio
import os
from intent_detection.service import intent_service
from intent_detection.prompts import build_intent_prompt
import logging

logging.basicConfig(level=logging.INFO)

async def test_prompts_only():
    print("\n--- TEST: Coreference Resolution ('it') ---")
    history = "User: Create a folder called James on the Desktop\nEDITH: I have created the folder James on your Desktop."
    state = "Topic: James Folder, Goal: File Management, Task: Create James Folder"
    query = "Okay then create a text file called assignment inside it"
    
    print(f"User: {query}")
    response = await intent_service.detect_intent(query, history=history, state_context=state)
    print(f"Sub-intent: {response.intents[0].sub_intent}")
    print(f"Entities: {response.entities}")
    print(f"Reasoning: {response.reasoning}")

    print("\n--- TEST: Retry Logic ('Try again') ---")
    history = "User: Move Emmanuel.txt to Documents\nEDITH: The move operation failed because the file already exists."
    state = "Topic: Emmanuel.txt, Goal: Move File, Task: Move Emmanuel.txt"
    query = "Try again"
    
    print(f"User: {query}")
    response = await intent_service.detect_intent(query, history=history, state_context=state)
    print(f"Sub-intent: {response.intents[0].sub_intent}")
    print(f"Entities: {response.entities}")
    print(f"Reasoning: {response.reasoning}")

if __name__ == "__main__":
    asyncio.run(test_prompts_only())
