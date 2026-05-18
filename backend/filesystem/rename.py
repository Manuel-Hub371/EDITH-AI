import os
import logging
from pathlib import Path
from filesystem.location_checker import location_checker
from filesystem.models import FileOperationResult

logger = logging.getLogger(__name__)

class FileRenamer:
    def rename(self, old_path: str, new_name_or_path: str) -> FileOperationResult:
        """
        Renames or moves a file or folder. 
        If new_name_or_path is a directory, the file/folder is moved into it.
        If new_name_or_path is just a name, it stays in the same directory.
        """
        validation = location_checker.validate_path(old_path)
        if not validation.success:
            return FileOperationResult(
                success=False,
                operation="rename",
                error=f"Source not found: {old_path}"
            )

        source_path = Path(validation.resolved_path)
        
        # SAFETY CHECK: Prevent renaming/moving system folders
        system_folders = [
            Path.home() / "Desktop",
            Path.home() / "Documents",
            Path.home() / "Downloads",
            Path.home() / "Pictures",
            Path.home() / "Videos",
            Path.home() / "Music",
            Path.home()
        ]
        if any(source_path.resolve() == sf.resolve() for sf in system_folders):
            return FileOperationResult(
                success=False,
                operation="rename",
                error=f"Permission Denied: Cannot move or rename core system folder '{source_path.name}'."
            )
        
        # 1. Resolve Destination
        # Check if the destination is a known directory or a full path
        dest_validation = location_checker.validate_path(new_name_or_path)
        
        if dest_validation.success:
            dest_path = Path(dest_validation.resolved_path)
            # If destination is a directory, we move the source into it while keeping the name
            if dest_path.is_dir():
                dest_path = dest_path / source_path.name
        elif os.path.sep in new_name_or_path or "/" in new_name_or_path:
            # Looks like a relative or absolute path not yet created
            dest_path = Path(new_name_or_path)
        else:
            # Just a name change in the same directory
            dest_path = source_path.parent / new_name_or_path

        try:
            if dest_path.exists():
                return FileOperationResult(
                    success=False,
                    operation="rename",
                    error=f"Destination already exists: {dest_path}"
                )

            # Ensure parent of destination exists
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            source_path.rename(dest_path)
            
            return FileOperationResult(
                success=True,
                operation="rename",
                path=str(dest_path),
                message=f"Successfully moved/renamed '{source_path.name}' to '{dest_path}'"
            )
        except Exception as e:
            logger.error(f"Rename/Move failed: {e}")
            return FileOperationResult(
                success=False,
                operation="rename",
                error=str(e)
            )

# Singleton
file_renamer = FileRenamer()
