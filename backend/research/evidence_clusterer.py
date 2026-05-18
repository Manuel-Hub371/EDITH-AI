import os
import json
import logging
from typing import List, Dict, Any
from openai import AsyncOpenAI
from pydantic import BaseModel
from dotenv import load_dotenv
from research.utils import retry_with_backoff

load_dotenv()

logger = logging.getLogger(__name__)

class EvidencePoint(BaseModel):
    source_url: str
    content: str
    relevance: float

class ConceptCluster(BaseModel):
    concept_name: str
    evidence: List[EvidencePoint]
    summary: str
    conflicting_points: List[str] = []

class EvidenceClusterer:
    """
    Groups retrieved evidence by semantic concept rather than by source.
    Enables cross-source reasoning.
    """
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            api_key=os.getenv("NVIDIA_API_KEY")
        )
        self.model = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")

    async def cluster(self, query: str, evidence: List[Dict[str, Any]]) -> List[ConceptCluster]:
        """
        Takes raw evidence and clusters it into conceptual groups.
        """
        # Prepare evidence for the prompt
        evidence_text = ""
        for i, item in enumerate(evidence):
            evidence_text += f"ID: {i}\nSource: {item['url']}\nContent: {item['content']}\n---\n"

        prompt = f"""
        Analyze the following evidence retrieved for the query: "{query}"
        
        TASK:
        1. Identify 3-5 primary conceptual clusters across these sources.
        2. Group the evidence IDs into these clusters.
        3. For each cluster, provide a high-level technical summary.
        4. Identify any contradictions or disagreements between sources within a cluster.
        
        EVIDENCE:
        {evidence_text}
        
        OUTPUT:
        Return ONLY a JSON object with a 'clusters' key containing a list of objects matching this schema:
        {{
            "clusters": [
                {{
                    "concept_name": "string",
                    "evidence_ids": [integer],
                    "summary": "technical summary of the collective findings",
                    "conflicting_points": ["point a", "point b"]
                }}
            ]
        }}
        """
        
        try:
            response = await retry_with_backoff(
                self.client.chat.completions.create,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            raw_data = json.loads(response.choices[0].message.content)
            clusters_data = raw_data.get("clusters", [])
            
            results = []
            for item in clusters_data:
                if not isinstance(item, dict):
                    continue
                    
                cluster_evidence = []
                for eid in item.get("evidence_ids", []):
                    if 0 <= eid < len(evidence):
                        cluster_evidence.append(EvidencePoint(
                            source_url=evidence[eid]["url"],
                            content=evidence[eid]["content"],
                            relevance=1.0 # Default
                        ))
                
                results.append(ConceptCluster(
                    concept_name=item["concept_name"],
                    evidence=cluster_evidence,
                    summary=item["summary"],
                    conflicting_points=item.get("conflicting_points", [])
                ))
            
            return results

        except Exception as e:
            logger.error(f"Evidence clustering failed: {e}")
            return []

evidence_clusterer = EvidenceClusterer()
