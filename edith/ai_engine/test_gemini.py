import os, asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types
import json

load_dotenv()
client = genai.Client()

prompt = "USER: Create a file named test.txt in my Documents folder with the content hello world\nAI:"

sys_prompt = """You are EDITH. Speak like a real person in casual conversation.
[EXECUTION SCHEMA]
{
  "mode": "execution",
  "response": "Natural conversational acknowledgement",
  "actions": [
    {
      "intent": "INTENT_NAME",
      "parameters": {
        "app": "name",
        "target": "window_title",
        "layout": "split-vertical",
        "path": "ABSOLUTE_PATH",
        "content": "text context"
      }
    }
  ]
}

[INTENTS]
- WINDOW MANAGEMENT: FOCUS_WINDOW (target), MINIMIZE_WINDOW (target), MAXIMIZE_WINDOW (target), RESTORE_WINDOW (target), ARRANGE_WINDOWS (layout), RESIZE_WINDOW (target, width, height, x, y)
- APPLICATION CONTROL: OPEN_APPLICATION (app), CLOSE_APPLICATION (app)
- SYSTEM CONTROLS: LOCK_COMPUTER, SYSTEM_SLEEP, ADJUST_VOLUME (level), ADJUST_BRIGHTNESS (level)
- SYSTEM MONITORING: SYSTEM_STATUS (Deep refresh)
- FILE SYSTEM: OPEN_PATH (path), CREATE_FILE (path, content), CREATE_FOLDER (path), DELETE_FILE (path), MOVE_FILE (path, destination)
- CONTENT: READ_FILE (path), SUMMARIZE_FILE (path), SEARCH_FILE (path, query)
"""

def main():
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=sys_prompt,
                temperature=0.7,
                stop_sequences=['USER:', '\nUSER:', 'User:', '\nUser:', '\n\nUSER:']
            )
        )
        print("RAW RESPONSE:")
        print(response.text)
    except Exception as e:
        print(e)

if __name__ == "__main__":
    main()
