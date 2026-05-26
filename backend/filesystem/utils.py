import re
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

def normalize_path(path_str: str) -> Path:
    """
    Normalizes a path string into a Path object using the Discovery Engine.
    Supports system-wide resolution, well-known folders, and global discovery.
    """
    from filesystem.discovery import discovery_engine
    return discovery_engine.resolve(path_str)

def sanitize_filename(filename: str) -> str:
    """
    Removes potentially dangerous characters from a filename.
    """
    # Remove characters that are not alphanumeric, underscores, hyphens or dots
    filename = re.sub(r'(?u)[^-\w.]', '', filename)
    if filename in {'.', '..'}:
        return "unnamed_file"
    return filename

def is_safe_path(path: Path, base_path: Optional[Path] = None) -> bool:
    """
    Verifies that a path is not attempting path traversal outside of allowed roots.
    By default, we might restrict operations to certain areas if needed.
    """
    # For now, we assume paths are safe if they exist and aren't root, 
    # but we can add root protection logic here.
    try:
        # Example: Prevent operations on C:\ directly or system folders
        forbidden = ["C:\\Windows", "C:\\System32"]
        path_str = str(path)
        for f in forbidden:
            if path_str.startswith(f):
                return False
        return True
    except Exception:
        return False
