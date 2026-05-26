import asyncio
import uuid
from conversational_context.manager import context_manager
from preprocessing.service import preprocess_message
from intent_detection.service import intent_service
import logging

logging.basicConfig(level=logging.INFO)

async def test_continuity():
    session_id = f"test_{uuid.uuid4()}"
    print(f"Session ID: {session_id}")

    # --- SCENARIO 1: Coreference ("it") ---
    print("\n--- Testing Scenario 1: Coreference ('it') ---")
    
    # 1. First message
    msg1 = "Create a folder called James on the Desktop"
    print(f"User: {msg1}")
    resp1 = await preprocess_message(msg1, session_id)
    print(f"EDITH Intent 1: {resp1.intent.intents[0].sub_intent}")
    print(f"EDITH Entities 1: {resp1.intent.entities}")

    # 2. Second message with "it"
    msg2 = "Okay then create a text file called assignment inside it"
    print(f"\nUser: {msg2}")
    resp2 = await preprocess_message(msg2, session_id)
    print(f"EDITH Intent 2: {resp2.intent.intents[0].sub_intent}")
    print(f"EDITH Entities 2: {resp2.intent.entities}")
    
    # Check if "it" was resolved to "James" or the Desktop path
    entities = resp2.intent.entities
    target = entities.get("path") or entities.get("location") or entities.get("target_folder")
    print(f"Resolved Target: {target}")

    # --- SCENARIO 2: Retry ("Try again") ---
    print("\n--- Testing Scenario 2: Retry ('Try again') ---")
    session_id_2 = f"test_{uuid.uuid4()}"
    
    # 1. First message (failed move)
    msg3 = "Move Emmanuel.txt from the Desktop to the Documents folder"
    print(f"User: {msg3}")
    # Simulate a failed move state? Actually just checking intent detection
    resp3 = await preprocess_message(msg3, session_id_2)
    
    # 2. Try again
    msg4 = "Try again"
    print(f"\nUser: {msg4}")
    resp4 = await preprocess_message(msg4, session_id_2)
    print(f"EDITH Intent 4: {resp4.intent.intents[0].sub_intent}")
    print(f"EDITH Entities 4: {resp4.intent.entities}")
    print(f"EDITH Reasoning 4: {resp4.intent.reasoning}")

if __name__ == "__main__":
    asyncio.run(test_continuity())
