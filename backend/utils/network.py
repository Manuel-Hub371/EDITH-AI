import asyncio
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

async def retry_with_backoff(func: Callable, *args, max_retries: int = 3, initial_delay: float = 1.0, **kwargs) -> Any:
    """
    Retries an async function with exponential backoff.
    Suitable for API calls prone to transient network issues or rate limits.
    """
    retries = 0
    delay = initial_delay
    
    while retries < max_retries:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            retries += 1
            if retries == max_retries:
                logger.error(f"Final retry attempt failed after {max_retries} tries: {e}")
                raise e
            
            logger.warning(f"Attempt {retries} failed: {e}. Retrying in {delay}s...")
            await asyncio.sleep(delay)
            delay *= 2 # Exponential backoff
