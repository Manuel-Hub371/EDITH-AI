from typing import Dict, List

INTENT_REGISTRY = {
    "conversational": [
        "greeting", "small_talk", "clarification", "opinion", 
        "emotional_expression", "persona_interaction", "casual_conversation"
    ],
    "informational": [
        "factual_query", "explanation", "comparison", "summarization", 
        "deep_research", "troubleshooting", "recommendation", "analytical_reasoning"
    ],
    "actionable": [
        "file_automation", "create_file", "create_folder", "delete_file", "delete_folder", "rename",
        "app_automation", "document_generation", 
        "code_generation", "code_execution", "scheduling", "api_operation", 
        "system_control", "workflow_execution", "agent_invocation"
    ]
}

INTERACTION_STYLES = ["conversational", "direct", "technical", "analytical", "formal"]

EXECUTION_STRATEGIES = [
    "direct_response", 
    "tool_augmented", 
    "planner_required", 
    "workflow_execution", 
    "agent_delegation"
]

CAPABILITIES = [
    "filesystem_access",
    "web_search",
    "document_generation",
    "code_generation",
    "browser_automation",
    "memory_access",
    "scheduling_system",
    "shell_execution",
    "api_access"
]
