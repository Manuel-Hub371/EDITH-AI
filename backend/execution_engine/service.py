import logging
from typing import List, Dict, Any, Optional
from execution_planner.models import ExecutionPlan, ExecutionStep
from filesystem.service import filesystem_service
from research.service import research_service
from intent_detection.models import IntentDetectionResponse, IntentDetail
from prompt_interpreter.models import UserConstraints

logger = logging.getLogger(__name__)

class ExecutionEngine:
    """
    The central coordinator for executing multi-step AI plans.
    It takes an ExecutionPlan and routes each step to the appropriate system tool.
    Constraint-aware: honors UserConstraints for document generation steps.
    """
    
    async def run(self, plan: ExecutionPlan, constraints: Optional[UserConstraints] = None) -> List[Dict[str, Any]]:
        """
        Executes the provided plan step-by-step.
        """
        logger.info(f"STARTING EXECUTION ENGINE for goal: {plan.goal}")
        step_results = []
        accumulated_context = []

        for step in plan.steps:
            logger.info(f"Executing Step {step.step_number}: {step.action}")
            
            # Context Injection: Pass research outputs from previous steps
            for k, v in step.parameters.items():
                if isinstance(v, str) and ("<findings>" in v or "<context>" in v or "<research>" in v):
                    context_str = "\n\n".join(accumulated_context)
                    step.parameters[k] = v.replace("<findings>", context_str).replace("<context>", context_str).replace("<research>", context_str)
            
            try:
                result = await self._execute_step(step, constraints=constraints, accumulated_context=accumulated_context)
                step_results.append({
                    "step": step.step_number,
                    "action": step.action,
                    "result": result,
                    "success": result.get("success", True)
                })
                
                # Context Accumulation — collect research reports
                if "report" in result:
                    accumulated_context.append(result["report"])
                
                # Strict Dependency Abort
                if not result.get("success", True):
                    logger.warning(f"Step {step.step_number} failed: {result.get('error', 'Unknown error')}. ABORTING remaining plan steps.")
                    break

            except Exception as e:
                logger.error(f"Failed to execute step {step.step_number}: {e}")
                step_results.append({
                    "step": step.step_number,
                    "action": step.action,
                    "success": False,
                    "error": str(e)
                })
                break

        return step_results

    async def _execute_step(self, step: ExecutionStep, constraints: Optional[UserConstraints] = None, accumulated_context: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Routes a single step to the correct service.
        """
        action = step.action.lower()
        params = step.parameters

        # 1. Filesystem / Document Generation Operations
        if any(x in action for x in ["file", "folder", "directory", "filesystem", "create", "delete", "rename", "read", "view", "extract", "document", "generation"]):
            
            # Constraint injection for document generation steps
            if constraints and any(x in action for x in ["document", "generation", "create_file", "write"]):
                # Merge constraints from the plan step params + UserConstraints object
                # Step-level params take priority (planner already injected them), but fill gaps from constraints
                if "min_pages" not in params and constraints.min_pages:
                    params["min_pages"] = constraints.min_pages
                if "content_requirements" not in params and constraints.content_requirements:
                    params["content_requirements"] = constraints.content_requirements
                if "formatting_constraints" not in params and constraints.formatting_constraints:
                    params["formatting_constraints"] = constraints.formatting_constraints
                if "comparison_targets" not in params and constraints.comparison_targets:
                    params["comparison_targets"] = constraints.comparison_targets
                
                # Build structured writing instructions and inject into the content
                content = params.get("content", "")
                if content and constraints:
                    doc_instructions = constraints.to_document_instructions()
                    if doc_instructions:
                        params["writing_instructions"] = doc_instructions
                        logger.info(f"Injected writing instructions into document step: {doc_instructions[:200]}")

            mock_intent = IntentDetectionResponse(
                interaction_style="actionable",
                intents=[IntentDetail(primary_intent="filesystem", sub_intent=action, confidence=1.0)],
                is_multi_intent=False,
                entities=params,
                execution_strategy={"requires_tools": True, "requires_planning": False, "execution_mode": "tool_execution"},
                capabilities_required=["filesystem_access"],
                ambiguity_detected=False,
                reasoning=step.reasoning
            )
            return await filesystem_service.execute_operation(mock_intent)

        # 2. Research Operations
        elif any(x in action for x in ["research", "search", "web", "analyze"]):
            # Use the enriched research query from constraints if available
            query = params.get("query") or params.get("topic") or str(params)
            if constraints and constraints.enriched_research_query and len(constraints.enriched_research_query) > len(query):
                query = constraints.enriched_research_query
                logger.info(f"Using enriched research query from constraints: {query}")
            
            report = await research_service.perform_research(query)
            return {"success": True, "report": report}

        # 3. Fallback
        else:
            return {"success": False, "error": f"Unsupported action type: {action}"}

# Global singleton
execution_engine = ExecutionEngine()
