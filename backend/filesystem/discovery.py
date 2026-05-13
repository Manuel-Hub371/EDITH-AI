import os
import logging
from pathlib import Path
from typing import Optional, List

logger = logging.getLogger(__name__)

class DiscoveryEngine:
    """
    Production-grade Filesystem Discovery Engine for EDITH.
    Handles global path resolution, well-known folders, and recursive discovery.
    """
    
    def __init__(self):
        self.user_home = Path.home()
        self.common_folders = {
            "desktop": self.user_home / "Desktop",
            "documents": self.user_home / "Documents",
            "downloads": self.user_home / "Downloads",
            "pictures": self.user_home / "Pictures",
            "videos": self.user_home / "Videos",
            "music": self.user_home / "Music",
            "workspace": self.user_home / "Desktop" / "Manuel2995" # Specific to current user
        }

    def resolve_well_known(self, query: str) -> Optional[Path]:
        """
        Checks if the query matches a well-known system folder name.
        """
        q = query.lower().strip()
        if q in self.common_folders:
            path = self.common_folders[q]
            if path.exists():
                return path
        return None

    def find_globally(self, name: str, max_depth: int = 3) -> Optional[Path]:
        """
        Searches for a folder or file by name starting from the user's home directory.
        Limited depth for performance.
        """
        # 1. Check Desktop/Manuel2995 first (highest probability)
        workspace = self.common_folders["workspace"]
        if workspace.exists():
            for root, dirs, files in os.walk(workspace):
                if name in dirs or name in files:
                    return Path(root) / name
                if root.count(os.sep) - str(workspace).count(os.sep) >= max_depth:
                    del dirs[:] # Stop recursion

        # 2. Check Desktop directly
        desktop = self.common_folders["desktop"]
        if desktop.exists():
            for root, dirs, files in os.walk(desktop):
                if name in dirs or name in files:
                    return Path(root) / name
                if root.count(os.sep) - str(desktop).count(os.sep) >= max_depth:
                    del dirs[:]

        # 3. Check Documents
        docs = self.common_folders["documents"]
        if docs.exists():
             for root, dirs, files in os.walk(docs):
                if name in dirs or name in files:
                    return Path(root) / name
                if root.count(os.sep) - str(docs).count(os.sep) >= max_depth:
                    del dirs[:]

        return None

    def resolve(self, query: str) -> Path:
        """
        The main intelligence entry point. 
        Resolves a name into a full system path using layered discovery.
        """
        # Clean query
        query = query.strip().replace('"', '').replace("'", "")
        
        # 1. Is it already absolute?
        path = Path(query).expanduser()
        if path.is_absolute():
            return path

        # 2. Is it a well-known folder?
        well_known = self.resolve_well_known(query)
        if well_known:
            return well_known

        # 3. Is it in the immediate workspace or CWD?
        cwd_match = (Path.cwd() / query).resolve()
        if cwd_match.exists():
            return cwd_match

        # 4. Global Discovery (Search)
        discovered = self.find_globally(query)
        if discovered:
            logger.info(f"DISCOVERY SUCCESS: Found '{query}' at {discovered}")
            return discovered

        # 5. Fallback to CWD-relative (even if not exists yet)
        return Path(query).resolve()

# Singleton
discovery_engine = DiscoveryEngine()
