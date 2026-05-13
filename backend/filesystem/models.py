from pydantic import BaseModel
from typing import Optional, Any, Literal

class PathMetadata(BaseModel):
    success: bool
    exists: bool
    path_type: Optional[Literal["file", "directory"]] = None
    resolved_path: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None

class FileOperationResult(BaseModel):
    success: bool
    operation: str
    path: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
