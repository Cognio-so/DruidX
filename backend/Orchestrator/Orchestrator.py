from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import os
import json
from typing import List
prompt_path = os.path.join(os.path.dirname(__file__), "orchestrator.md")
try:
    with open(prompt_path, 'r', encoding='utf-8') as f:
        prompt_template = f.read()
except FileNotFoundError:
    prompt_template = "You are a query analyzer. Analyze the user query and determine the best processing method."
async def is_folloup(user_query: str,
    history: List[dict],
    docs_present: bool,
    kb_present: bool,
    llm_model: str = "gpt-4o-mini",) ->dict:
    """
    Ask the LLM to judge if the user message is a conversational follow-up that
    should continue using the same sources (docs/KB). Returns a JSON dict:
      {
        "is_followup": bool,
        "should_use_rag": bool,
        "confidence": float (0..1),
        "rationale": str
      }
    """
    turns = []
    for m in (history or [])[-12:]:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if not content:
            continue
        prefix = "User" if role in ("human", "user") else "Assistant"
        turns.append(f"{prefix}: {content}")
    sys = (
        "You are a routing judge. Decide if the NEW user message is a FOLLOW-UP in the same thread "
        "that should keep using the same sources (uploaded documents and/or knowledge base). "
        "Consider the conversation and the presence of docs/KB in the session.\n"
        "Output STRICT JSON with keys: is_followup (bool), should_use_rag (bool), "
        "confidence (0..1), rationale (short string)."
    )
    usr = (
        f"Docs present: {bool(docs_present)} | KB present: {bool(kb_present)}\n"
        f"Conversation (most recent first):\n" + "\n".join(turns) + "\n\n"
        f"NEW user message: {user_query}\n"
        "Return JSON only."
    ) 
    llm =ChatOpenAI(model=llm_model, temperature=0.0)
    result=await llm.ainvoke([SystemMessage(sys), HumanMessage(usr)])  
    text=result.content.strip()
    try:
        obj = json.loads(text)
    except Exception:
        
        obj = {
            "is_followup": True if len(user_query.split()) < 8 else False,
            "should_use_rag": bool(docs_present or kb_present),
            "confidence": 0.4,
            "rationale": "Fallback heuristic because LLM did not return valid JSON."
        }
    return obj
async def analyze_query(user_query: str, prompt_template: str, llm: str) -> Optional[Dict[str, Any]]:
    try:
       
        prompt = prompt_template.replace("{user_query}", user_query)
        
        chat = ChatOpenAI(model=llm or "gpt-4o", temperature=0.2)
        messages = [
            SystemMessage(content=prompt),
            HumanMessage(content=user_query)
        ]
        response = await chat.ainvoke(messages)
        content = response.content
        
        print(f"LLM Response: {content}")
        
        import re, json
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            json_str = json_match.group(0)
            print(f"Extracted JSON: {json_str}")
            return json.loads(json_str)
        return json.loads(content)
    except Exception as e:
        print(f"Error in analyze_query: {e}")
        import traceback
        traceback.print_exc()
        return None

async def orchestrator(state: GraphState) -> GraphState:
    user_query = state.get("user_query", "")
    docs = state.get("doc", [])
    llm_model = state.get("llm_model", "gpt-4o")
    rag = state.get("rag", False)
    deep_search = state.get("deep_search", False)
    mcp = state.get("mcp", False)
    mcp_schema = state.get("mcp_schema", {})
    kb = state.get("kb", {})
    websearch = state.get("web_search", False)
    ctx = state.get("context") or {}
    session_meta = ctx.get("session") or {}
    last_route = session_meta.get("last_route")
    result = await analyze_query(user_query, prompt_template, llm_model)
    
    follow = await is_folloup(
        user_query=user_query,
        history=state.get("messages") or [],
        docs_present=bool(docs),
        kb_present=bool(kb),
        llm_model="gpt-4o-mini"
    )
    if result is None:
        print("Query analysis failed, defaulting to SimpleLLM")
        route = "SimpleLLM"
    else:
        is_rag = bool(result.get("rag", False))
        is_websearch = bool(result.get("web_search", False))
        is_mcp = bool(result.get("mcp", False))
        if follow.get("should_use_rag") and (docs or kb):
            route="RAG"
            state["rag"]=True
            if is_websearch:
              state["web_search"] = True
        elif is_rag and (docs or kb):
            state["rag"] = True
            if is_websearch:
                state["web_search"] = True    
            route = "RAG"
        # elif is_websearch:
        #     route = "WebSearch"
        # elif deep_search:
        #     route = "DeepSearch"
        # elif is_mcp and mcp_schema and state["mcp"]:
        #     route = "MCP"
        #     state["mcp"] = True
        #     state["mcp_schema"] = mcp_schema
        else:
            route = "SimpleLLM"
            state["rag"] = False              
     
    session_meta["last_route"] = route
    session_meta["followup_judge"] = follow  
    ctx["session"] = session_meta
    state["context"] = ctx
    state["route"] = route
    print(f"Orchestrator routing to: {route}")
    print(f"Orchestrator output state keys: {list(state.keys())}")
    print(f"Route set in state: {state.get('route')}")
    return state

def route_decision(state: GraphState) -> str:
    """Determine the next node based on the orchestrator's decision."""
    print(f"Routing decision based on state: {state.get('route')}")
    route = state.get("route", "RAG")
    return route