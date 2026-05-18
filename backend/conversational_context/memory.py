import faiss
import numpy as np
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class FAISSMemoryService:
    def __init__(self):
        self.dimension = 384 # Dimension for all-MiniLM-L6-v2
        self.index = faiss.IndexFlatL2(self.dimension)
        self.metadata = [] # Stores raw text associated with IDs
        self._encoder = None

    @property
    def encoder(self):
        """Lazy load the encoder model only when needed."""
        if self._encoder is None:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
            # We use a local cache to prevent constant HF Hub checks
            cache_dir = os.path.join(os.getcwd(), "model_cache")
            os.makedirs(cache_dir, exist_ok=True)
            
            try:
                # Attempt 1: Normal load (checks for updates)
                self._encoder = SentenceTransformer(
                    'all-MiniLM-L6-v2', 
                    cache_folder=cache_dir
                )
            except Exception as e:
                logger.warning(f"Failed to load model from Hub: {e}. Attempting local-only load...")
                try:
                    # Attempt 2: Local only (bypasses network checks)
                    self._encoder = SentenceTransformer(
                        'all-MiniLM-L6-v2', 
                        cache_folder=cache_dir,
                        local_files_only=True
                    )
                except Exception as e2:
                    logger.error(f"Critical failure: Could not load model even locally. {e2}")
                    raise e2
            
            logger.info("SentenceTransformer model loaded successfully.")
        return self._encoder

    def add_memory(self, text: str, metadata: Dict[str, Any] = None):
        embedding = self.encoder.encode([text])[0]
        self.index.add(np.array([embedding]).astype('float32'))
        self.metadata.append({"text": text, "metadata": metadata or {}})

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if self.index.ntotal == 0:
            return []
            
        embedding = self.encoder.encode([query])[0]
        distances, indices = self.index.search(
            np.array([embedding]).astype('float32'), 
            min(top_k, self.index.ntotal)
        )
        
        results = []
        for idx in indices[0]:
            if idx != -1:
                results.append(self.metadata[idx])
        return results

    def clear_memory(self):
        self.index = faiss.IndexFlatL2(self.dimension)
        self.metadata = []

# Global singleton
memory_service = FAISSMemoryService()
