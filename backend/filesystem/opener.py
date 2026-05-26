import os
import logging
import platform
import subprocess
from pathlib import Path
from typing import Dict, Any
from filesystem.models import FileOperationResult

logger = logging.getLogger(__name__)

class FileOpener:
    """
    Handles opening files and folders in the host operating system.
    """
    
    def open_item(self, target_path: str) -> FileOperationResult:
        """
        Opens a file or folder using the OS default application.
        """
        try:
            path = Path(target_path)
            
            if not path.exists():
                return FileOperationResult(
                    success=False,
                    operation="open",
                    message=f"Cannot open '{target_path}': Path does not exist.",
                    path=target_path
                )
            
            # Windows implementation
            if platform.system() == "Windows":
                os.startfile(str(path))
            # macOS implementation
            elif platform.system() == "Darwin":
                subprocess.run(["open", str(path)])
            # Linux implementation
            else:
                subprocess.run(["xdg-open", str(path)])
            
            item_type = "Folder" if path.is_dir() else "File"
            return FileOperationResult(
                success=True,
                operation="open",
                message=f"{item_type} '{path.name}' has been opened on your system.",
                path=str(path)
            )
            
        except Exception as e:
            logger.error(f"Failed to open item: {e}")
            return FileOperationResult(
                success=False,
                message=f"Failed to open '{target_path}': {str(e)}",
                path=target_path
            )

# Singleton
file_opener = FileOpener()
