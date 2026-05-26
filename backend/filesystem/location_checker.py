import logging
from pathlib import Path
from typing import Optional
from filesystem.models import PathMetadata
from filesystem.utils import normalize_path, is_safe_path

logger = logging.getLogger(__name__)

class LocationChecker:
    def validate_path(self, path_input: str) -> PathMetadata:
        """
        Check if a file or folder path exists on the system.
        If it exists, it resolves it as a full folder path.
        """
        try:
            # Use our smart normalization to handle relative names like "Manuel2995" or "Assignment"
            path = normalize_path(path_input)
            
            if not is_safe_path(path):
                return PathMetadata(
                    success=False,
                    exists=False,
                    error="Access restricted for security."
                )

            if path.exists():
                return PathMetadata(
                    success=True,
                    exists=True,
                    resolved_path=str(path),
                    path_type="directory" if path.is_dir() else "file",
                    message="Path exists"
                )

            return PathMetadata(
                success=False,
                exists=False,
                resolved_path=str(path),
                message="Path does not exist"
            )

        except Exception as e:
            logger.error(f"Path validation error: {e}")
            return PathMetadata(
                success=False,
                exists=False,
                error=str(e)
            )

    def check_path(self, path_input: str) -> dict:
        """
        Public wrapper to match the user's requested function signature.
        Returns a dict instead of a PathMetadata object.
        """
        return self.validate_path(path_input).dict()

# Singleton instance
location_checker = LocationChecker()
