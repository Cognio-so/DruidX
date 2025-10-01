# graph_type.py
from typing import TypedDict, List, Dict, Any, Optional

class GraphState(TypedDict, total=False):
    user_query: str
    tasks: List[str]      
    current_task: Optional[str]    
    llm_model: Optional[str]
    kb: Optional[Dict[str, Any]]
    doc: Optional[List[str]]
    deep_search: Optional[bool]
    mcp: Optional[bool]
    mcp_schema: Optional[Dict[str, Any]]
    web_search: Optional[bool]
    rag: Optional[bool]  # hybrid rag only
    messages: List[Dict[str, Any]]
    route: Optional[str]
    response: Optional[str]
    context: Dict[str, Any]
    session_id: Optional[str]        
    timestamp: Optional[str]
    gpt_config: Optional[Dict[str, Any]] 
    intermediate_results: List[Dict[str, Any]]
    final_answer: Optional[str]
    task_index: Optional[int]
    resolved_query: Optional[str]
    active_docs: Optional[Dict[str, Any]] 

