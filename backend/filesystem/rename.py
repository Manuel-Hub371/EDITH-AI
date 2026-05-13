import os
import logging
from pathlib import Path
from filesystem.location_checker import location_checker
from filesystem.models import FileOperationResult

logger = logging.getLogger(__name__)

class FileRenamer:
    def rename(self, old_path: str, new_name_or_path: str) -> FileOperationResult:
        """
        Renames a file or folder. 
        If new_name_or_path is just a name, it stays in the same directory.
        """
        validation = location_checker.validate_path(old_path)
        if not validation.success:
            return FileOperationResult(
                success=False,
                operation="rename",
                error=validation.error
            )

        source_path = Path(validation.resolved_path)
        
        # Determine destination
        if os.path.sep in new_name_or_path or "/" in new_name_or_path:
            dest_path = Path(new_name_or_path)
        else:
            dest_path = source_path.parent / new_name_or_path

        try:
            if dest_path.exists():
                return FileOperationResult(
                    success=False,
                    operation="rename",
                    error=f"Destination already exists: {dest_path}"
                )

            source_path.rename(dest_path)
            
            return FileOperationResult(
                success=True,
                operation="rename",
                path=str(dest_path),
                message=f"Successfully renamed to {dest_path}"
            )
        except Exception as e:
            logger.error(f"Rename failed: {e}")
            return FileOperationResult(
                success=False,
                operation="rename",
                error=str(e)
            )

# Singleton
file_renamer = FileRenamer()
