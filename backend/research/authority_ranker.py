import logging
import re
from typing import List
from urllib.parse import urlparse
from research.models import SearchResult

logger = logging.getLogger(__name__)

class AuthorityRanker:
    """
    Ranks search results based on source authority and technical depth.
    Prioritizes academic, institutional, and technical primary sources.
    """
    
    HIGH_AUTHORITY_DOMAINS = {
        # Institutional / Official
        ".gov", ".gov.gh", "statsghana.gov.gh", "bog.gov.gh", "imf.org", "worldbank.org", 
        "afdb.org", "un.org", "who.int", "centralbank", # Catch-all for central banks
        # Academic / Research
        ".edu", "arxiv.org", "scholar.google", "nature.com", "science.org",
        "ieee.org", "acm.org", "nber.org", "jstor.org", "repec.org",
        # Strategic / Technical Intelligence
        "mckinsey.com", "bcg.com", "gartner.com", "deloitte.com", "reuters.com", 
        "apnews.com", "bloomberg.com", "ft.com", "economist.com",
        "github.com", "developer.apple.com", "aws.amazon.com"
    }
    
    LOW_AUTHORITY_DOMAINS = {
        "youtube.com", "quora.com", "reddit.com", "facebook.com", "twitter.com", "x.com",
        "instagram.com", "tiktok.com", "pinterest.com", "buzzfeed.com", 
        "investopedia.com", "thebalance.com", "lifewire.com", "makeuseof.com",
        "contentfarm", "expert-reviews", "top10", "best-of"
    }

    def calculate_authority_score(self, result: SearchResult) -> float:
        score = 0.5 # Base score
        url = result.url.lower()
        domain = urlparse(url).netloc
        
        # 1. Domain Check
        if any(auth in domain for auth in self.HIGH_AUTHORITY_DOMAINS):
            score += 0.4
        elif any(low in domain for low in self.LOW_AUTHORITY_DOMAINS):
            score -= 0.3
            
        # 2. Content Heuristics
        snippet = result.snippet.lower()
        
        # Technical Indicators
        technical_keywords = ["methodology", "empirical", "framework", "architecture", "causal", "tradeoff", "analysis"]
        if any(kw in snippet for kw in technical_keywords):
            score += 0.1
            
        # Academic Indicators
        academic_keywords = ["abstract", "citation", "peer-reviewed", "journal", "published in", "study found"]
        if any(kw in snippet for kw in academic_keywords):
            score += 0.1
            
        # 3. Recency (If available in snippet/title)
        # Placeholder for real date extraction
        if re.search(r"202[3456]", result.title + snippet):
            score += 0.05
            
        return max(0.0, min(1.0, score))

    def rank_results(self, results: List[SearchResult]) -> List[SearchResult]:
        for res in results:
            res.score = self.calculate_authority_score(res)
        
        # Sort by authority score
        ranked = sorted(results, key=lambda x: x.score, reverse=True)
        return ranked

authority_ranker = AuthorityRanker()
