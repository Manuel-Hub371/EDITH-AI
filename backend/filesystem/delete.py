import os
import shutil
import logging
from pathlib import Path
from filesystem.location_checker import location_checker
from filesystem.models import FileOperationResult

logger = logging.getLogger(__name__)

class FileDeleter:
    def delete_folder(self, folder_path: str) -> FileOperationResult:
        """
        Delete a folder and all its contents.
        """
        try:
            # Resolve path (The service will pass the already resolved path here)
            path = Path(folder_path).expanduser().resolve()

            # Check if folder exists
            if not path.exists():
                return FileOperationResult(
                    success=False,
                    operation="delete_folder",
                    message="Folder does not exist",
                    path=str(path)
                )

            # Ensure it is a directory
            if not path.is_dir():
                return FileOperationResult(
                    success=False,
                    operation="delete_folder",
                    message="Provided path is not a folder",
                    path=str(path)
                )

            # Safety check to avoid deleting root directories
            restricted_paths = [Path(path.anchor)]
            if path in restricted_paths:
                return FileOperationResult(
                    success=False,
                    operation="delete_folder",
                    message="Deleting root directories is not allowed",
                    path=str(path)
                )

            # Delete folder recursively
            shutil.rmtree(path)

            return FileOperationResult(
                success=True,
                operation="delete_folder",
                message="Folder deleted successfully",
                path=str(path)
            )

        except Exception as e:
            logger.error(f"Folder deletion failed: {e}")
            return FileOperationResult(
                success=False,
                operation="delete_folder",
                message=str(e)
            )

    def delete_file(self, file_path: str) -> FileOperationResult:
        """
        Delete a file from the system.
        """
        try:
            # Resolve path
            path = Path(file_path).expanduser().resolve()

            # Check if file exists
            if not path.exists():
                return FileOperationResult(
                    success=False,
                    operation="delete_file",
                    message="File does not exist",
                    path=str(path)
                )

            # Ensure it is a file
            if not path.is_file():
                return FileOperationResult(
                    success=False,
                    operation="delete_file",
                    message="Provided path is not a file",
                    path=str(path)
                )

            # Safety check
            restricted_paths = [Path(path.anchor)]
            if path in restricted_paths:
                return FileOperationResult(
                    success=False,
                    operation="delete_file",
                    message="Deleting system root files is not allowed",
                    path=str(path)
                )

            # Delete file
            path.unlink()

            return FileOperationResult(
                success=True,
                operation="delete_file",
                message="File deleted successfully",
                path=str(path)
            )

        except Exception as e:
            logger.error(f"File deletion failed: {e}")
            return FileOperationResult(
                success=False,
                operation="delete_file",
                message=str(e)
            )

# Singleton
file_deleter = FileDeleter()
