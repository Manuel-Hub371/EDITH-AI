import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from filesystem import location_checker, file_creator, file_deleter, file_renamer, doc_generator
from intent_detection.models import IntentDetectionResponse

logger = logging.getLogger(__name__)

class FilesystemService:
    async def execute_operation(self, intent_data: IntentDetectionResponse) -> Dict[str, Any]:
        """
        Orchestrates one or more filesystem operations sequentially.
        """
        if not intent_data.intents:
            return {"success": False, "error": "No intent detected for filesystem operation."}

        results = []
        entities = intent_data.entities or {}
        last_created_folder_path = None

        # Sort intents so independent folder operations are executed before file and move operations
        def get_intent_priority(intent_detail):
            sub_name = intent_detail.sub_intent.lower()
            if sub_name in ["create_folder", "new_folder"]:
                return 0
            if sub_name in ["create_file", "write_file", "new_file", "document_generation", "save_file"] or "create" in sub_name or "document" in sub_name or "write" in sub_name or "save" in sub_name:
                return 1
            if sub_name in ["rename", "move"]:
                return 2
            return 3

        sorted_intents = sorted(intent_data.intents, key=get_intent_priority)

        for intent in sorted_intents:
            sub = intent.sub_intent
            sub_norm = sub.lower()
            
            try:
                # 1. Folder Creation
                entity_str = str(entities).lower()
                if sub_norm in ["create_folder", "new_folder"] or (sub_norm == "file_automation" and "folder" in entity_str and ("create" in entity_str or "new" in entity_str)):
                    base_name = entities.get("path") or entities.get("location") or entities.get("target_folder")
                    folder_name = entities.get("folder_name") or entities.get("name") or entities.get("folder")
                    
                    if not folder_name:
                        results.append({"success": False, "error": "Missing folder name for folder creation."})
                        continue

                    target_path = str(location_checker.validate_path("Desktop").resolved_path or "Desktop")
                    if base_name:
                        res = location_checker.validate_path(base_name)
                        if not res.success:
                            results.append({"success": False, "error": f"Path error: The target location '{base_name}' does not exist on the system."})
                            continue
                        target_path = res.resolved_path

                    res = file_creator.create_folder(folder_name, target_path)
                    if res.path:
                        last_created_folder_path = res.path
                    results.append(res.dict())

                elif sub_norm in ["create_file", "write_file", "new_file", "document_generation", "save_file"] or "create" in sub_norm or "document" in sub_norm or "write" in sub_norm or "save" in sub_norm:
                    base_name = entities.get("path") or entities.get("location") or entities.get("target_folder")
                    file_name = entities.get("file_name") or entities.get("name") or entities.get("file")
                    content = entities.get("content", "")
                    title = entities.get("title", "Document")
                    doc_type = entities.get("document_type", "").lower()
                    writing_instructions = entities.get("writing_instructions", "")
                    min_pages = entities.get("min_pages")

                    # Prefix the content with writing instructions so the content synthesizer
                    # inside create_pdf/create_word honors all user-specified constraints
                    if writing_instructions and content:
                        content = f"WRITING INSTRUCTIONS (MUST BE FOLLOWED):\n{writing_instructions}\n\n---\n\n{content}"

                    if not file_name and not title:
                        results.append({"success": False, "error": "Missing file name or title for creation."})
                        continue
                    
                    if not file_name:
                        file_name = f"document_{title.lower().replace(' ', '_')}"

                    target_path = None
                    if base_name:
                        # Check if base_name is referring to the folder we just created
                        if last_created_folder_path and Path(last_created_folder_path).name.lower() == str(base_name).lower():
                            target_path = last_created_folder_path
                        else:
                            res = location_checker.validate_path(base_name)
                            if res.success:
                                target_path = res.resolved_path
                            else:
                                results.append({"success": False, "error": f"Path error: The target location '{base_name}' does not exist on the system."})
                                continue

                    # If no explicit base_name resolved, default to the folder we just created
                    if not target_path and last_created_folder_path:
                        target_path = last_created_folder_path

                    # Default fallback to Desktop
                    if not target_path:
                        target_path = str(location_checker.validate_path("Desktop").resolved_path or "Desktop")

                    ext = Path(file_name).suffix.lower()
                    doc_type = self._normalize_document_type(doc_type, ext)

                    # Logic branch based on operation type
                    if sub_norm == "write_file" or "write" in sub_norm:
                        res = file_creator.write_to_file(file_name, target_path, content, mode="a")
                    elif "pdf" in doc_type or ext == ".pdf":
                        res = doc_generator.create_pdf(file_name, target_path, content, min_pages=min_pages)
                    elif "word" in doc_type or "docx" in doc_type or ext == ".docx":
                        res = doc_generator.create_word_document(file_name, target_path, title, content, min_pages=min_pages)
                    elif "excel" in doc_type or "xlsx" in doc_type or ext == ".xlsx":
                        data = entities.get("data", [[content]])
                        res = doc_generator.create_excel_document(file_name, target_path, data)
                    elif "powerpoint" in doc_type or "pptx" in doc_type or ext == ".pptx":
                        res = doc_generator.create_powerpoint(file_name, target_path, title, content)
                    elif "text" in doc_type or "txt" in doc_type or ext == ".txt":
                        res = doc_generator.create_text_file(file_name, target_path, content)
                    elif "markdown" in doc_type or "md" in doc_type or ext == ".md":
                        res = doc_generator.create_markdown(file_name, target_path, content)
                    else:
                        res = file_creator.create_file(file_name, target_path, content)
                        if not res.success and "already exists" in res.message.lower():
                            logger.info(f"File {file_name} already exists, falling back to write_to_file")
                            res = file_creator.write_to_file(file_name, target_path, content, mode="a")
                    
                    results.append(res.dict())

                # 3. Deletion
                elif sub_norm in ["delete_file", "delete_folder", "remove", "delete"]:
                    target_name = entities.get("path") or entities.get("file_name") or entities.get("folder_name") or entities.get("name")
                    if not target_name: 
                        results.append({"success": False, "error": "Missing path for deletion."})
                        continue
                    
                    res = location_checker.validate_path(target_name)
                    if not res.success:
                        results.append({"success": False, "error": f"Could not resolve path for deletion: {target_name}"})
                        continue
                    
                    resolved_target = res.resolved_path
                    if "file" in sub_norm or "file" in target_name.lower():
                        res = file_deleter.delete_file(resolved_target)
                    else:
                        res = file_deleter.delete_folder(resolved_target)
                    results.append(res.dict())

                # 4. Renaming / Moving
                elif sub_norm in ["rename", "move"]:
                    # Priority: Specific item name > generic path
                    item_name = entities.get("file_name") or entities.get("folder_name") or entities.get("old_path") or entities.get("path")
                    new_name = entities.get("new_name") or entities.get("new_path") or entities.get("target_name")
                    location = entities.get("location") or entities.get("base_path") or entities.get("path") if entities.get("path") != item_name else None
                    
                    if not item_name or not new_name:
                        results.append({"success": False, "error": "Missing parameters for move/rename. Need both source and destination."})
                        continue

                    # If we just created a folder in a previous step, and the destination matches its name, resolve new_name to its full path
                    if last_created_folder_path and Path(last_created_folder_path).name.lower() == str(new_name).lower():
                        new_name = last_created_folder_path
                    
                    source_path = item_name
                    # If location is provided (e.g. "Documents") and item_name is just a name (e.g. "Emmanuel.txt")
                    if location and os.path.sep not in str(item_name) and "/" not in str(item_name):
                        res = location_checker.validate_path(f"{location}/{item_name}")
                        if res.success:
                            source_path = res.resolved_path
                        else:
                            # Try to find it globally but biased towards the location
                            res = location_checker.validate_path(item_name)
                            if res.success:
                                source_path = res.resolved_path

                    res = file_renamer.rename(source_path, new_name)
                    results.append(res.dict())

                # 5. Reading Files
                elif sub_norm in ["read_file", "read", "extract", "view"]:
                    item_name = entities.get("file_name") or entities.get("name") or entities.get("file")
                    location = entities.get("path") or entities.get("location")
                    
                    target_name = item_name or location
                    if item_name and location and item_name != location:
                        # Check if location is likely a parent path
                        if "/" in location or "\\" in location or location.lower() in ["desktop", "documents", "downloads"]:
                            target_name = f"{location}/{item_name}"

                    if not target_name:
                        results.append({"success": False, "error": "Missing file name for reading."})
                        continue
                        
                    res = location_checker.validate_path(target_name)
                    if not res.success:
                        results.append({"success": False, "error": f"Could not resolve path for reading: {target_name}"})
                        continue
                        
                    from filesystem.read import document_reader
                    read_result = document_reader.read_file(str(res.resolved_path))
                    results.append(read_result)

                # 6. Opening Files / Folders (OS-level)
                elif sub_norm in ["open_file", "open_folder", "open"]:
                    item_name = entities.get("file_name") or entities.get("folder_name") or entities.get("name") or entities.get("file") or entities.get("folder")
                    location = entities.get("path") or entities.get("location")
                    
                    target_name = item_name or location
                    if item_name and location and item_name != location:
                        if "/" in location or "\\" in location or location.lower() in ["desktop", "documents", "downloads"]:
                            target_name = f"{location}/{item_name}"

                    if not target_name:
                        results.append({"success": False, "error": "Missing target name for opening."})
                        continue
                        
                    res = location_checker.validate_path(target_name)
                    if not res.success:
                        results.append({"success": False, "error": f"Could not resolve path for opening: {target_name}"})
                        continue
                        
                    from filesystem.opener import file_opener
                    open_result = file_opener.open_item(str(res.resolved_path))
                    results.append(open_result.dict())

            except Exception as e:
                logger.error(f"Error in intent loop: {e}")
                results.append({"success": False, "error": str(e)})

        # Aggregate success
        all_success = all(r.get("success", False) for r in results)
        return {
            "success": all_success,
            "results": results,
            "message": f"Executed {len(results)} operations."
        }

    def _normalize_document_type(self, doc_type: str, file_ext: str) -> str:
        normalized = (doc_type or "").lower().strip()
        if normalized:
            return normalized
        if file_ext == ".txt":
            return "txt"
        if file_ext == ".pdf":
            return "pdf"
        if file_ext == ".docx":
            return "docx"
        if file_ext == ".xlsx":
            return "xlsx"
        if file_ext == ".pptx":
            return "pptx"
        if file_ext == ".md":
            return "md"
        return ""

# Singleton
filesystem_service = FilesystemService()
