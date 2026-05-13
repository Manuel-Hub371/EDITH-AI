import os
import logging
from typing import Optional, Dict, Any
from filesystem import location_checker, file_creator, file_deleter, file_renamer, doc_generator
from intent_detection.models import IntentDetectionResponse

logger = logging.getLogger(__name__)

class FilesystemService:
    async def execute_operation(self, intent_data: IntentDetectionResponse) -> Dict[str, Any]:
        """
        Routes the intent to the specific filesystem operation.
        """
        logger.info(f"Executing filesystem operation: {intent_data.intents}")
        logger.info(f"Entities extracted: {intent_data.entities}")
        
        intent = intent_data.intents[0] if intent_data.intents else None
        if not intent:
            return {"success": False, "error": "No intent detected for filesystem operation."}

        primary = intent.primary_intent
        sub = intent.sub_intent
        entities = intent_data.entities or {}

        try:
            # Normalize intent for better matching
            sub_norm = sub.lower()
            entity_str = str(entities).lower()

            # 1. Folder Creation
            if sub_norm in ["create_folder", "new_folder"] or (sub_norm == "file_automation" and "folder" in entity_str and ("create" in entity_str or "new" in entity_str)):
                base_name = entities.get("path") or entities.get("location") or entities.get("target_folder")
                folder_name = entities.get("folder_name") or entities.get("name") or entities.get("folder")
                
                if not folder_name:
                    return {"success": False, "error": "Missing folder name."}

                # Resolve the target path using LocationChecker
                target_path = "Manuel2995" # Default if none provided
                if base_name:
                    res = location_checker.validate_path(base_name)
                    if res.success:
                        target_path = res.resolved_path
                else:
                    # Fallback to smart resolution of "Manuel2995"
                    res = location_checker.validate_path("Manuel2995")
                    if res.success: target_path = res.resolved_path

                return file_creator.create_folder(folder_name, target_path).dict()

            # 2. File Creation
            if sub_norm in ["create_file", "new_file"] or (sub_norm == "file_automation" and "file" in entity_str and ("create" in entity_str or "new" in entity_str)):
                base_name = entities.get("path") or entities.get("location") or entities.get("target_folder")
                file_name = entities.get("file_name") or entities.get("name") or entities.get("file")
                content = entities.get("content", "")

                if not file_name:
                    return {"success": False, "error": "Missing file name."}

                # Resolve the target path
                target_path = "Manuel2995"
                if base_name:
                    res = location_checker.validate_path(base_name)
                    if res.success:
                        target_path = res.resolved_path
                else:
                    res = location_checker.validate_path("Manuel2995")
                    if res.success: target_path = res.resolved_path

                return file_creator.create_file(file_name, target_path, content).dict()

            # 3. Deletion
            if sub_norm in ["delete_file", "delete_folder", "remove", "delete"]:
                target_name = entities.get("path") or entities.get("file_name") or entities.get("folder_name") or entities.get("name")
                if not target_name: return {"success": False, "error": "Missing path for deletion."}
                
                # Resolve the target path
                res = location_checker.validate_path(target_name)
                if not res.success:
                    return {"success": False, "error": f"Could not resolve path for deletion: {target_name}"}
                
                resolved_target = res.resolved_path
                
                if "file" in sub_norm or "file" in target_name.lower():
                    return file_deleter.delete_file(resolved_target).dict()
                else:
                    return file_deleter.delete_folder(resolved_target).dict()

            # 4. Renaming
            if sub_norm in ["rename", "move"]:
                old_path = entities.get("old_path") or entities.get("path")
                new_name = entities.get("new_name") or entities.get("new_path")
                if not old_path or not new_name:
                    return {"success": False, "error": "Missing parameters for rename."}
                return file_renamer.rename(old_path, new_name).dict()

            # 5. Document Generation
            if sub_norm == "document_generation" or "document" in sub_norm:
                doc_type = entities.get("document_type", "text").lower()
                base_name = entities.get("path") or entities.get("location") or entities.get("target_folder")
                file_name = entities.get("file_name") or entities.get("name") or entities.get("file")
                content = entities.get("content", "")
                title = entities.get("title", "Document")

                if not file_name:
                    file_name = f"document_{title.lower().replace(' ', '_')}"

                # Resolve the target path
                target_path = "Manuel2995"
                if base_name:
                    res = location_checker.validate_path(base_name)
                    if res.success:
                        target_path = res.resolved_path
                else:
                    res = location_checker.validate_path("Manuel2995")
                    if res.success: target_path = res.resolved_path

                if "pdf" in doc_type:
                    return doc_generator.create_pdf(file_name, target_path, content).dict()
                elif "word" in doc_type or "docx" in doc_type:
                    return doc_generator.create_word_document(file_name, target_path, title, content).dict()
                elif "excel" in doc_type or "xlsx" in doc_type:
                    data = entities.get("data", [[content]]) 
                    return doc_generator.create_excel_document(file_name, target_path, data).dict()
                elif "markdown" in doc_type or "md" in doc_type:
                    return doc_generator.create_markdown(file_name, target_path, content).dict()
                else:
                    return doc_generator.create_text_file(file_name, target_path, content).dict()

            return {"success": False, "error": f"Unsupported filesystem operation: {sub}"}

        except Exception as e:
            logger.error(f"Filesystem service execution error: {e}")
            return {"success": False, "error": str(e)}

# Singleton
filesystem_service = FilesystemService()
