import os
import logging
from typing import Optional
from dotenv import load_dotenv
from conversational_context.models import ConversationState

load_dotenv()
logger = logging.getLogger(__name__)


class ResearchService:
    """
    EDITH Research Engine — powered by Google Gemini Grounded Search.
    Replaces the former 11-module multi-stage pipeline with a single,
    fast, authoritative API call. Gemini handles retrieval, synthesis,
    and citation grounding natively.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = "gemini-2.5-flash"
        self._client = None

    def _get_client(self):
        """Lazy-initialize the Gemini client."""
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise RuntimeError("google-genai package is not installed. Run: pip install google-genai")
        return self._client

    async def perform_research(self, user_input: str, state: Optional[ConversationState] = None) -> str:
        """
        Performs a grounded web search using Google Gemini.

        Gemini's native Google Search grounding:
        - Automatically retrieves live web results
        - Synthesizes a coherent analytical response
        - Attaches source citations to claims
        - No external API orchestration needed

        Returns a formatted research report string.
        """
        logger.info(f"[Gemini Research] Query: {user_input[:100]}...")

        if not self.api_key:
            logger.error("GEMINI_API_KEY not set in .env")
            return "Research unavailable: Gemini API key is not configured."

        try:
            from google import genai
            from google.genai import types

            client = self._get_client()

            # Build grounded prompt — instruct Gemini to write a rich analytical report
            prompt = f"""You are EDITH, an advanced AI research assistant.

Using your real-time Google Search access, research the following topic and produce a comprehensive, well-structured analytical report:

TOPIC: {user_input}

REPORT REQUIREMENTS:
- Use live, up-to-date web sources
- Structure the report with clear headers and sections
- Write in an expert analytical tone (clear, direct, insightful)
- Focus on explanation, causality, and implications—not just facts
- Prioritize authoritative and credible sources

"""

            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.2,
                )
            )

            # Extract the text content
            report_text = response.text if hasattr(response, 'text') else ""

            if not report_text:
                logger.warning("Gemini returned empty response")
                return "Research completed but no content was returned. Please try again."

            # Extract grounding sources if available
            sources_block = ""
            try:
                grounding = response.candidates[0].grounding_metadata
                if grounding and hasattr(grounding, 'grounding_chunks') and grounding.grounding_chunks:
                    sources_block = "\n\n---\n**Sources:**\n"
                    for i, chunk in enumerate(grounding.grounding_chunks, 1):
                        if hasattr(chunk, 'web') and chunk.web:
                            title = getattr(chunk.web, 'title', f'Source {i}')
                            uri = getattr(chunk.web, 'uri', '')
                            sources_block += f"[{i}] {title} — {uri}\n"
            except Exception:
                pass  # Sources are optional — report text is the primary output

            full_report = report_text + sources_block
            logger.info(f"[Gemini Research] Report generated: {len(full_report)} chars")
            return full_report

        except Exception as e:
            logger.error(f"[Gemini Research] Failed: {type(e).__name__}: {e}")
            return f"Research encountered an error: {str(e)}. Please try again."


# Singleton — drop-in replacement for the old ResearchService
research_service = ResearchService()
