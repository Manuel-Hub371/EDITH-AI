import asyncio
from intent_detection.service import intent_service

async def test_intent():
    res = await intent_service.detect_intent("create a file called test.txt on my desktop")
    print("Intent Result:")
    print(res.json(indent=2))

if __name__ == "__main__":
    asyncio.run(test_intent())
