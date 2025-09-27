from typing import TypedDict, List, Dict, Any, Optional

class GraphState(TypedDict, total=False):
    user_query: str
    llm_model: Optional[str]
    kb: Optional[Dict[str, Any]]
    doc: Optional[List[str]]
    deep_search: Optional[bool]
    mcp: Optional[bool]
    mcp_schema: Optional[Dict[str, Any]]
    web_search: Optional[bool]
    rag: Optional[bool]  ##hybrid rag only
    messages: List[Dict[str, Any]]
    route: Optional[str]
    response: Optional[str]
    context: Dict[str, Any]
    session_id: Optional[str]
    timestamp: Optional[str]