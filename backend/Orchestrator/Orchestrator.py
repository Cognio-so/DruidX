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

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import json

def _format_last_turns(messages, k=3):
    tail = []
    for m in (messages or [])[-k:]:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if not content:
            continue
        speaker = "User" if role in ("human", "user") else "Assistant"
        tail.append(f"{speaker}: {content}")
    return "\n".join(tail)

async def summarizer(state, keep_last=3) -> None:
    """
    Compress the older part of the conversation to reduce tokens.
    Keep the latest `keep_last` turns verbatim; summarize the rest into context.session.summary.
    """
    msgs = state.get("messages") or []
    if len(msgs) <= keep_last:
        return
    older = msgs[:-keep_last]
    tail = msgs[-keep_last:]

    older_lines = []
    for m in older:
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if not content:
            continue
        speaker = "User" if role in ("human", "user") else "Assistant"
        older_lines.append(f"{speaker}: {content}")
    older_text = "\n".join(older_lines)[:8000]  
    sys = (
        "You are a concise conversation summarizer. Produce a compact summary of the prior dialogue. "
        "Preserve key entities, intents, constraints, user preferences, and any lists (e.g., recommended books) "
        "so follow-up questions can be answered consistently. Output plain text, no markdown."
    )
    usr = f"Summarize the following conversation:\n\n{older_text}\n\nReturn only the summary."
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
        result = await llm.ainvoke([SystemMessage(content=sys), HumanMessage(content=usr)])
        summary = (result.content or "").strip()
    except Exception:
        summary = "Conversation so far: user asked questions; assistant answered with recommendations and details."

    # Store in context
    ctx = state.get("context") or {}
    sess = ctx.get("session") or {}
    sess["summary"] = summary
    ctx["session"] = sess
    state["context"] = ctx
    state["messages"] = tail

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
            json_str = json_str.replace("{{", "{").replace("}}", "}")
            print(f"Extracted JSON: {json_str}")
            return json.loads(json_str)
        return json.loads(content)
    except Exception as e:
        print(f"Error in analyze_query: {e}")
        import traceback
        traceback.print_exc()
        return None

async def rewrite_query(state: GraphState) -> str:
    """Rewrite user query into standalone query using history + past outputs."""
    summary = state.get("context", {}).get("session", {}).get("summary", "")
    messages = state.get("messages") or []
    recent_turns = "\n".join([f"{m.get('role','user')}: {m.get('content')}" for m in messages[-3:]])
    prev_outputs = "\n".join([f"{o['node']}: {o['output']}" for o in state.get("intermediate_results", [])])

    rewrite_prompt = f"""
Conversation summary: {summary}
Recent turns:\n{recent_turns}
Previous node outputs:\n{prev_outputs}

User's current query: {state.get("user_query","")}

Task: Rewrite this into a clear, standalone query for the next node.
- Resolve pronouns and vague references (e.g., 'him', 'those').
- Incorporate previous outputs if needed.
- Output only the rewritten query.
"""

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
    try:
        result = await llm.ainvoke([HumanMessage(content=rewrite_prompt)])
        return result.content.strip()
    except Exception as e:
        print("Rewrite error:", e)
        return state.get("user_query", "")
    
def normalize_route(name: str) -> str:
    if not name:
        return "SimpleLLM"
    key = name.lower().strip()
    mapping = {
        "web_search": "WebSearch",
        "websearch": "WebSearch",
        "search": "WebSearch",
        "rag": "RAG",
        "simple_llm": "SimpleLLM",
        "llm": "SimpleLLM",
        "end": "END",
    }
    return mapping.get(key, name)
async def orchestrator(state: GraphState) -> GraphState:
    await summarizer(state, keep_last=3)
    user_query = state.get("user_query", "")
    docs = state.get("doc", [])
    llm_model = state.get("llm_model", "gpt-4o")
    rag = state.get("rag", False)
    uploaded_doc=state.get("uploaded_doc", False)
    print(f" Uploaded doc in sthis ..------------------", uploaded_doc)
    deep_search = state.get("deep_search", False)
    mcp = state.get("mcp", False)
    mcp_schema = state.get("mcp_schema", {})
    kb = state.get("kb", {})
    websearch = state.get("web_search", False)
    print(f"wbeserac.............", {websearch})
    ctx = state.get("context") or {}
    session_meta = ctx.get("session") or {}
    last_route = session_meta.get("last_route")
    clean_query = await rewrite_query(state)
    state["resolved_query"] = clean_query
    
    print(f"Rag.................", rag)
    print(f"Deep[research-------------", deep_search)

    if not state.get("active_docs"):
        state["active_docs"] = None
        print("[Orchestrator] Initialized active_docs as None.")

    if docs:
        latest_doc = docs[-1]
        if not state.get("active_docs") or latest_doc != state["active_docs"][-1]:
            state["active_docs"] = [latest_doc]
            print(f"[Orchestrator] Refreshed active_docs with new upload")
     
    if not state.get("tasks"):
        if state.get("deep_search", False):
            print("[Orchestrator] Deep search toggle is ON → forcing deepResearch route")
            plan = ["deepResearch"]
            state["resolved_query"] = user_query   # keep raw query
        else:
            print(f" Cleaned_query..............", {clean_query})
            result = await analyze_query(clean_query, prompt_template, llm_model)
            state["resolved_query"] = clean_query
            plan = result.get("execution_order", [])
            if uploaded_doc:
                print(f"hi......................")
                if len(plan) == 1 and plan[0].lower() == "rag":
                    pass  
                elif (len(plan) == 1 or len(plan)==0) and plan[0].lower() != "rag":
                    plan = ["rag"]
                else:
                    pass

                print(f"[Orchestrator] New doc uploaded → updated plan = {plan}")

            if len(plan)==1 and plan[0]=="rag":
                state["resolved_query"] = user_query
            else:
                state["resolved_query"] = clean_query
            if not plan:
                plan = ["SimpleLLM"]
        state["tasks"] = plan
        state["task_index"] = 0 
        state["current_task"] = plan[0]
        route =normalize_route(plan[0]) 
        state["route"] = route

    else:
        print(f" Cleaned_query.22222.............", {clean_query})
        state["resolved_query"] = clean_query
        completed = state.get("current_task")
        if completed and state.get("response"):
            state.setdefault("intermediate_results", []).append({
                "node": completed,
                "query": state.get("resolved_query") or state.get("user_query"),
                "output": state["response"]
            })
            state["response"] = None

        idx = state.get("task_index", 0)
        if idx + 1 < len(state["tasks"]):
            state["task_index"] = idx + 1
            next_task = state["tasks"][state["task_index"]]
            state["current_task"] = next_task
            route = normalize_route(next_task)
            clean_query = await rewrite_query(state)
            state["resolved_query"] = clean_query

        else:
            if state.get("intermediate_results"):
                state["final_answer"] = state["intermediate_results"][-1]["output"]
            else:
                state["final_answer"] = state.get("response")
            route = "END"

        state["route"] = route



    
    follow = await is_folloup(
        user_query=user_query,
        history=state.get("messages") or [],
        docs_present=bool(docs),
        kb_present=bool(kb),
        llm_model="gpt-4o-mini"
    )
    print(f"User_query: {user_query}")

     
    ctx = state.setdefault("context", {})
    sess = ctx.setdefault("session", {})
    history = sess.get("summary", "")
    latest = f"User: {user_query}\nAssistant: {state.get('response','')}"
    sess["summary"] = (history + "\n" + latest).strip()
    ctx["session"] = sess
    state["context"] = ctx
    print(f"Orchestrator routing to: {route}")
    print(f"Orchestrator output state keys: {list(state.keys())}")
    print(f"Route set in state: {state.get('route')}")
    return state

def route_decision(state: GraphState) -> str:
    route = state.get("route", "SimpleLLM")
    route=normalize_route(route)
    print(f"Routing decision based on state: {route}")
    return route
