import logging
from pathlib import Path
from filesystem.location_checker import location_checker
from filesystem.models import FileOperationResult

logger = logging.getLogger(__name__)

class FileCreator:
    def create_folder(self, folder_name: str, target_path: str) -> FileOperationResult:
        """
        Create a folder using the provided folder name and target path.
        """
        try:
            # Resolve target path
            base_path = Path(target_path).expanduser().resolve()

            # Check if target path exists
            if not base_path.exists():
                return FileOperationResult(
                    success=False,
                    operation="create_folder",
                    message="Target path does not exist",
                    path=str(base_path)
                )

            # Create full folder path
            new_folder_path = base_path / folder_name

            # Check if folder already exists
            if new_folder_path.exists():
                return FileOperationResult(
                    success=False,
                    operation="create_folder",
                    message="Folder already exists",
                    path=str(new_folder_path)
                )

            # Create folder
            new_folder_path.mkdir(parents=True, exist_ok=False)
            logger.info(f"CREATE_FOLDER SUCCESS: Resolved absolute path is {new_folder_path.absolute()}")

            return FileOperationResult(
                success=True,
                operation="create_folder",
                message="Folder created successfully",
                path=str(new_folder_path)
            )

        except Exception as e:
            logger.error(f"Folder creation failed: {e}")
            return FileOperationResult(
                success=False,
                operation="create_folder",
                message=str(e)
            )

    def create_file(self, file_name: str, target_path: str, content: str = "") -> FileOperationResult:
        """
        Create a file using the provided file name and target path.
        """
        try:
            # Resolve target path
            base_path = Path(target_path).expanduser().resolve()

            # Check if target directory exists
            if not base_path.exists():
                return FileOperationResult(
                    success=False,
                    operation="create_file",
                    message="Target path does not exist",
                    path=str(base_path)
                )

            # Ensure target path is a directory
            if not base_path.is_dir():
                return FileOperationResult(
                    success=False,
                    operation="create_file",
                    message="Target path is not a directory",
                    path=str(base_path)
                )

            # Create full file path
            file_path = base_path / file_name

            # Check if file already exists
            if file_path.exists():
                return FileOperationResult(
                    success=False,
                    operation="create_file",
                    message="File already exists",
                    path=str(file_path)
                )

            # Create file and optionally write content
            with open(file_path, "w", encoding="utf-8") as file:
                file.write(content)

            return FileOperationResult(
                success=True,
                operation="create_file",
                message="File created successfully",
                path=str(file_path)
            )

        except Exception as e:
            logger.error(f"File creation failed: {e}")
            return FileOperationResult(
                success=False,
                operation="create_file",
                message=str(e)
            )

    def write_to_file(self, file_name: str, target_path: str, content: str, mode: str = "a") -> FileOperationResult:
        """
        Write or append content to a file. 
        mode 'a' for append (default), 'w' for overwrite.
        """
        try:
            # Resolve target path
            base_path = Path(target_path).expanduser().resolve()
            
            # If target_path is actually the full file path, use it directly
            if base_path.is_file():
                file_path = base_path
            else:
                if not base_path.exists():
                    return FileOperationResult(success=False, operation="write_file", message="Target directory does not exist", path=target_path)
                file_path = base_path / file_name

            # Perform the write
            with open(file_path, mode, encoding="utf-8") as file:
                # Add a newline before appending if the file isn't empty and doesn't end with one
                if mode == "a" and file_path.exists() and file_path.stat().st_size > 0:
                    file.write("\n")
                file.write(content)

            return FileOperationResult(
                success=True,
                operation="write_file",
                message=f"Successfully {'appended to' if mode == 'a' else 'wrote to'} {file_path.name}",
                path=str(file_path)
            )
        except Exception as e:
            logger.error(f"Write failed: {e}")
            return FileOperationResult(success=False, operation="write_file", message=str(e), path=str(target_path))

# Singleton
file_creator = FileCreator()
