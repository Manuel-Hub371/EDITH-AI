import os
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv
from typing import Optional
from utils.network import retry_with_backoff
from response.models import AIResponse
from preprocessing.models import PreprocessedResponse
from conversational_context.models import ConversationState

load_dotenv()

logger = logging.getLogger(__name__)

class ResponseGenerator:
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def generate_final_response(
        self,
        preprocessed_data: PreprocessedResponse,
        state: Optional[ConversationState] = None,
        research_results: Optional[str] = None,
        execution_results: Optional[dict] = None
    ) -> AIResponse:
        intent_info = preprocessed_data.intent

        # 1. Parameter Clarification Path
        if intent_info and intent_info.missing_parameters:
            return AIResponse(
                content=intent_info.clarification_question or "I need more information to proceed.",
                thought_process=f"Missing parameters: {', '.join(intent_info.missing_parameters)}",
                metadata={"status": "awaiting_input"}
            )

        # 2. History & Context Construction
        history_block = "No prior conversation."
        if state and state.history:
            history_block = state.history_as_text(max_turns=20)
        
        context_block = "No specific context established."
        if state:
            ctx = []
            if state.active_topic: ctx.append(f"- Topic: {state.active_topic}")
            if state.user_goal: ctx.append(f"- Goal: {state.user_goal}")
            if state.current_task: ctx.append(f"- Task: {state.current_task}")
            if state.entities: ctx.append(f"- Key Entities: {', '.join(state.entities)}")
            if ctx: context_block = "\n".join(ctx)

        research_block = research_results if research_results else "No research results available for this turn."
        
        # Smart execution block — extracts file content for read operations
        execution_block = "No actions performed this turn."
        if execution_results:
            # Check if this is a file read result — surface the content directly
            results_list = execution_results.get("results", []) if isinstance(execution_results, dict) else []
            read_content = None
            for r in results_list:
                if isinstance(r, dict) and r.get("content") is not None:
                    read_content = r.get("content", "")
                    file_path = r.get("file_path", "")
                    break
            
            if read_content is not None:
                if read_content.strip():
                    execution_block = f"FILE READ SUCCESS\nFile: {file_path}\n\nFILE CONTENTS:\n{read_content}"
                else:
                    execution_block = f"FILE READ SUCCESS but the file at '{file_path}' appears to be empty."
            else:
                execution_block = f"Action results: {execution_results}"

        prompt = f"""
You are EDITH, an advanced AI assistant with integrated system-level capabilities.

Unlike generic LLMs, you have direct, secure access to the user's host environment through specialized execution modules.
- If you see data in EXECUTION METADATA, that is REAL DATA from the user's computer.
- You are fully authorized to report this data, analyze it, and confirm system changes.
- Never claim you don't have access if execution results are provided.

Your job is to respond like a highly capable human conversational partner:
- clear
- grounded
- concise
- emotionally aware when appropriate
- professional but natural

You maintain continuity using:
- conversation history
- active context
- retrieved research
- execution results
- current user intent

========================================
CONVERSATION HISTORY
========================================
{history_block}

========================================
ACTIVE CONTEXT
========================================
{context_block}

========================================
RESEARCH FINDINGS
========================================
{research_block}

========================================
EXECUTION METADATA
========================================
{execution_block}

========================================
CURRENT USER MESSAGE
========================================
"{preprocessed_data.cleaned_input}"

========================================
CORE BEHAVIOR RULES
========================================

0. Confirm Actions
- If an action was performed (see EXECUTION METADATA), confirm it naturally.
- If it failed, explain why briefly.
- Do not narrate the tool usage, just the outcome.

1. Maintain conversational continuity
- Use prior conversation naturally
- Remember ongoing topics and tasks
- Do not repeat known context unnecessarily

2. Prioritize relevance
- Respond directly to the user's actual message
- Avoid unnecessary elaboration
- Avoid generic filler

3. Sound natural and human
- Use conversational phrasing
- Keep emotional tone subtle and grounded
- Match the user's energy level
- Avoid robotic politeness patterns

4. Avoid assistant-like narration
DO NOT say things like:
- "It sounds like..."
- "I understand that..."
- "I'm always here to help..."
- "Would you like me to..."
unless context strongly requires it.

5. Avoid excessive emotional amplification
- Do not over-comfort
- Do not sound therapeutic unless explicitly needed
- Use restrained empathy

6. Do not restate the user's message unnecessarily
Bad:
"So you're saying your system got hacked..."
Better:
"Yeah, that's a rough situation."

7. Keep responses appropriately sized
- Short for casual conversation
- Detailed for technical or analytical discussions
- Do not over-explain simple interactions

8. Use research findings naturally
- Prioritize provided research for factual accuracy
- Integrate research smoothly into the response
- Cite only when useful or explicitly required

9. Never break conversational immersion
- Do not mention prompts, memory blocks, metadata, or system behavior
- Do not explain internal reasoning
- Do not narrate conversation state

10. Identity
- You are EDITH
- Do not repeatedly introduce yourself
- Behave like a consistent intelligent assistant, not a scripted chatbot

========================================
STYLE TARGET
========================================

Your responses should feel like:
- ChatGPT-quality conversation
- intelligent and relaxed
- concise but thoughtful
- confident and natural

NOT:
- customer support responses
- overly enthusiastic AI
- therapist-style dialogue
- excessively formal assistant behavior

========================================
RESPONSE GENERATION RULES
========================================

- Default to concise responses unless depth is needed
- Avoid repetitive sentence structures
- Avoid filler phrases
- Prefer conversational rhythm over formal completeness
- Use subtle personality, not exaggerated friendliness
- Ask follow-up questions only when contextually valuable

========================================
OUTPUT RULE
========================================

Output ONLY the final response text.
Do not output JSON.
Do not output metadata.
Do not explain your reasoning.
"""

        try:
            response = await retry_with_backoff(
                self.client.chat.completions.create,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=800
            )
            
            content = response.choices[0].message.content.strip()
            # Prefix cleanup
            if content.lower().startswith("edith:"):
                content = content[6:].strip()

            return AIResponse(
                content=content,
                thought_process=intent_info.reasoning if intent_info else "Synthesized response.",
                metadata={"intent": intent_info.intents[0].sub_intent if intent_info and intent_info.intents else "chat"}
            )
            
        except Exception as e:
            logger.error(f"Response Generation failed: {e}")
            return AIResponse(content="I'm sorry, I hit a snag while processing that research. Could you repeat that?")

# Global instance
response_service = ResponseGenerator()
