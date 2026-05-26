from pydantic import BaseModel, Field
from typing import List, Optional


class UserConstraints(BaseModel):
    """
    A structured specification of all constraints and requirements
    extracted from the user's raw input message.
    """
    primary_topic: str = Field(default="", description="The main subject the user wants addressed")
    content_requirements: List[str] = Field(default_factory=list, description="Specific topics or sections the user wants covered")
    formatting_constraints: List[str] = Field(default_factory=list, description="Formatting rules (e.g., bullet points, numbered lists)")
    structural_expectations: List[str] = Field(default_factory=list, description="Document structure requirements (e.g., intro, body, conclusion)")
    output_requirements: List[str] = Field(default_factory=list, description="Output file requirements (e.g., save as PDF, file name)")
    quality_constraints: List[str] = Field(default_factory=list, description="Quality requirements (e.g., minimum pages, must include data)")
    completion_criteria: List[str] = Field(default_factory=list, description="Criteria that define task completion")
    comparison_targets: List[str] = Field(default_factory=list, description="Entities the user wants compared (e.g., Ghana vs Nigeria)")
    min_pages: Optional[int] = Field(default=None, description="Minimum number of pages required in the output document")
    enriched_research_query: str = Field(default="", description="A comprehensive search query capturing ALL content requirements")

    def to_document_instructions(self) -> str:
        """
        Converts the constraint specification into clear, actionable writing
        instructions that the document content synthesizer must follow.
        """
        instructions = []

        if self.content_requirements:
            instructions.append("REQUIRED SECTIONS/TOPICS:")
            for req in self.content_requirements:
                instructions.append(f"  - {req}")

        if self.formatting_constraints:
            instructions.append("\nFORMATTING RULES:")
            for fmt in self.formatting_constraints:
                instructions.append(f"  - {fmt}")

        if self.structural_expectations:
            instructions.append("\nDOCUMENT STRUCTURE:")
            for struct in self.structural_expectations:
                instructions.append(f"  - {struct}")

        if self.comparison_targets and len(self.comparison_targets) > 1:
            instructions.append(f"\nCOMPARISON REQUIRED: Compare {' vs '.join(self.comparison_targets)}")

        if self.quality_constraints:
            instructions.append("\nQUALITY REQUIREMENTS:")
            for qc in self.quality_constraints:
                instructions.append(f"  - {qc}")

        if self.min_pages:
            instructions.append(f"\nMINIMUM LENGTH: The document MUST fill at least {self.min_pages} full pages. Expand all sections with detail, data, and analysis to meet this requirement.")

        return "\n".join(instructions)
