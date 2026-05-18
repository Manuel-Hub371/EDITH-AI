import logging
from typing import List, Dict
from research.models import SearchResult

logger = logging.getLogger(__name__)

class CitationBuilder:
    """
    Manages and formats professional citations for research reports.
    """
    def __init__(self):
        self.citations: Dict[str, int] = {}
        self.sources: List[SearchResult] = []

    def register_sources(self, sources: List[SearchResult]):
        self.sources = sources
        self.citations = {src.url: i+1 for i, src in enumerate(sources)}

    def get_citation(self, url: str) -> str:
        idx = self.citations.get(url)
        return f"[{idx}]" if idx else ""

    def build_reference_list(self) -> str:
        if not self.sources:
            return ""
            
        ref_lines = ["\n## References\n"]
        for i, src in enumerate(self.sources):
            # Clean title for clean output
            title = src.title.replace("\n", " ").strip()
            ref_lines.append(f"{i+1}. **{title}** — {src.url}")
            
        return "\n".join(ref_lines)

citation_builder = CitationBuilder()
