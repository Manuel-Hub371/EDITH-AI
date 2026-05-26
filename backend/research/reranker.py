import os
import logging
from typing import List
from research.models import SearchResult

logger = logging.getLogger(__name__)

class LocalReranker:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import CrossEncoder
            logger.info("Loading Local Reranker (cross-encoder/ms-marco-MiniLM-L-6-v2)...")
            cache_dir = os.path.join(os.getcwd(), "model_cache")
            
            try:
                # Attempt 1: Normal load
                self._model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', cache_folder=cache_dir)
            except Exception as e:
                logger.warning(f"Failed to load reranker from Hub: {e}. Attempting local-only load...")
                try:
                    # Attempt 2: Local only
                    self._model = CrossEncoder(
                        'cross-encoder/ms-marco-MiniLM-L-6-v2', 
                        cache_folder=cache_dir,
                        local_files_only=True
                    )
                except Exception as e2:
                    logger.error(f"Critical failure: Could not load reranker even locally. {e2}")
                    raise e2
            
            logger.info("Local Reranker loaded.")
        return self._model

    def rerank(self, query: str, results: List[SearchResult], top_n: int = 5) -> List[SearchResult]:
        """
        Reranks search results based on the query using a cross-encoder.
        """
        if not results:
            return []

        # Prepare pairs for cross-encoder
        pairs = [[query, r.snippet + " " + (r.content or "")] for r in results]
        
        # Predict scores
        scores = self.model.predict(pairs)
        
        # Attach scores and sort
        for i, score in enumerate(scores):
            results[i].score = float(score)
            
        # Sort by score descending
        ranked = sorted(results, key=lambda x: x.score, reverse=True)
        
        return ranked[:top_n]

reranker = LocalReranker()
