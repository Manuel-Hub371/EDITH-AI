import os
import logging
from pathlib import Path
from typing import Optional, Any
from filesystem.location_checker import location_checker
from filesystem.models import FileOperationResult

logger = logging.getLogger(__name__)

# Attempt to import optional document libraries
try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    from openpyxl import Workbook
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

try:
    from pptx import Presentation
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

class DocumentGenerator:
    def _resolve_target(self, file_name: str, target_path: str) -> Path:
        base = Path(target_path).expanduser().resolve()
        return base / file_name

    def create_text_file(self, file_name: str, target_path: str, content: str) -> FileOperationResult:
        try:
            file_path = self._resolve_target(file_name, target_path)
            # Ensure parent exists
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            return FileOperationResult(success=True, operation="create_text_file", path=str(file_path), message="Text file created.")
        except Exception as e:
            return FileOperationResult(success=False, operation="create_text_file", message=str(e))

    def create_markdown(self, file_name: str, target_path: str, content: str) -> FileOperationResult:
        if not file_name.endswith(".md"): file_name += ".md"
        return self.create_text_file(file_name, target_path, content)

    def create_pdf(self, file_name: str, target_path: str, content: str) -> FileOperationResult:
        if not HAS_REPORTLAB:
            return FileOperationResult(success=False, operation="create_pdf", message="reportlab library not installed.")
        
        try:
            file_path = self._resolve_target(file_name, target_path)
            if not str(file_path).endswith(".pdf"): file_path = Path(str(file_path) + ".pdf")
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            c = canvas.Canvas(str(file_path), pagesize=letter)
            width, height = letter
            textobject = c.beginText()
            textobject.setTextOrigin(50, height - 50)
            textobject.setFont("Helvetica", 12)
            for line in content.split('\n'):
                textobject.textLine(line)
            c.drawText(textobject)
            c.showPage()
            c.save()
            return FileOperationResult(success=True, operation="create_pdf", path=str(file_path), message="PDF created.")
        except Exception as e:
            return FileOperationResult(success=False, operation="create_pdf", message=str(e))

    def create_word_document(self, file_name: str, target_path: str, title: str, content: str) -> FileOperationResult:
        if not HAS_DOCX:
            return FileOperationResult(success=False, operation="create_docx", message="python-docx library not installed.")
        
        try:
            file_path = self._resolve_target(file_name, target_path)
            if not str(file_path).endswith(".docx"): file_path = Path(str(file_path) + ".docx")
            file_path.parent.mkdir(parents=True, exist_ok=True)

            doc = Document()
            doc.add_heading(title, 0)
            doc.add_paragraph(content)
            doc.save(str(file_path))
            return FileOperationResult(success=True, operation="create_docx", path=str(file_path), message="Word document created.")
        except Exception as e:
            return FileOperationResult(success=False, operation="create_docx", message=str(e))

    def create_excel_document(self, file_name: str, target_path: str, data: list[list[Any]]) -> FileOperationResult:
        if not HAS_OPENPYXL:
            return FileOperationResult(success=False, operation="create_xlsx", message="openpyxl library not installed.")
        
        try:
            file_path = self._resolve_target(file_name, target_path)
            if not str(file_path).endswith(".xlsx"): file_path = Path(str(file_path) + ".xlsx")
            file_path.parent.mkdir(parents=True, exist_ok=True)

            wb = Workbook()
            ws = wb.active
            for row in data:
                ws.append(row)
            wb.save(str(file_path))
            return FileOperationResult(success=True, operation="create_xlsx", path=str(file_path), message="Excel document created.")
        except Exception as e:
            return FileOperationResult(success=False, operation="create_xlsx", message=str(e))

# Singleton
doc_generator = DocumentGenerator()
