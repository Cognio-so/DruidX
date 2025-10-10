from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import os
import json
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
def load_base_prompt() -> str:
    path = os.path.join(os.path.dirname(__file__), "orchestrator.md")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "You are a Retrieval-Augmented Generation (RAG) assistant. Answer using only the provided context."
from llm import get_llm
prompt_template = load_base_prompt()


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
    google_api_key = os.getenv("GOOGLE_API_KEY", "")
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
        google_api_key = os.getenv("GOOGLE_API_KEY", "")
        llm= ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                api_key=google_api_key,
            )
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
    google_api_key = os.getenv("GOOGLE_API_KEY", "")
    llm= ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                api_key=google_api_key,
            )
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
        print(f"llm----", llm)
        # chat=get_llm(llm, 0.3)
        
        messages = [
            SystemMessage(content=prompt),
            HumanMessage(content=user_query)
        ]
        google_api_key = os.getenv("GOOGLE_API_KEY", "")
        chat= ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                api_key=google_api_key,
            )
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

def _get_last_output(state: GraphState) -> dict | None:
    """Helper to safely get the last intermediate result."""
    return state.get("intermediate_results", [])[-1] if state.get("intermediate_results") else None

# In Orchestrator.py

async def rewrite_query(state: GraphState) -> str:
    """
    Dynamically rewrites the query for the *next* task, using only the
    output from the *most recent* task to be faster.
    """
    user_query = state.get("user_query", "")
    current_task = state.get("current_task", "")
    plan = state.get("tasks", [])
    
    # OPTIMIZATION: Only use the most recent result, not the whole history.
    last_result = _get_last_output(state) 
    context_from_last_step = f"Context from previous step ({last_result['node']}):\n{last_result['output']}" if last_result else "This is the first step."

    prompt = f"""You are a query rewriter for an AI agent. Create a precise, standalone query for the next step in a plan.

Original User Goal: "{user_query}"
Full Plan: {plan}
Next Step to Execute: '{current_task}'

{context_from_last_step}

Based on the goal and the context from the last step, what is the precise query for the '{current_task}' node?
- The query must be self-contained.
- Incorporate any necessary information (like names, topics, or data) from the previous step's context.

**Output ONLY the rewritten query. NO explanation. Just the query.**
"""
    try:
        print(f"🚀 REWRITING QUERY FOR TASK: {current_task}")
        # Use a fast model for this task
        google_api_key = os.getenv("GOOGLE_API_KEY", "")
        llm= ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                api_key=google_api_key,
            )
        result = await llm.ainvoke([HumanMessage(content=prompt)])
        rewritten = result.content.strip()
        print(f"✅ REWRITTEN QUERY: {rewritten}")
        return rewritten
    except Exception as e:
        print(f"🚨 Rewrite error: {e}")
        return user_query # Fallback to the original query on error
    
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
    # clean_query = await rewrite_query(state)
    # state["resolved_query"] = clean_query
    new_Doc=state.get("new_uploaded_docs", [])
    if not state.get("tasks"):
        result = await analyze_query(user_query, prompt_template, llm_model)
    
    print(f"Rag.................", rag)
    print(f"Deep[research-------------", deep_search)

    if not state.get("active_docs"):
        state["active_docs"] = None
        print("[Orchestrator] Initialized active_docs as None.")

    if new_Doc:
        state["active_docs"]=new_Doc
     
    if not state.get("tasks"):
        if state.get("deep_search", False):
            print("[Orchestrator] Deep search toggle is ON → forcing deepResearch route")
            plan = ["deepResearch"]
            state["resolved_query"] = user_query   # keep raw query
        else:
            plan = result.get("execution_order", [])
            if uploaded_doc:
                print(f"hi......................")
                if len(plan) == 1 and plan[0].lower() == "rag":
                    pass  
                elif len(plan) == 1 and plan[0].lower() != "rag":
                    plan = ["rag"]
                elif len(plan) == 0:
                    plan = ["rag"]
                else:
                    pass

                print(f"[Orchestrator] New doc uploaded → updated plan = {plan}")

            
            if not plan:
                plan = ["SimpleLLM"]
        state["tasks"] = plan
        state["task_index"] = 0 
        state["current_task"] = plan[0]
        route =normalize_route(plan[0]) 
        
                
        if len(plan)==1 and plan[0]=="rag":
                state["resolved_query"] = user_query
        else:
               state["resolved_query"]=await rewrite_query(state)
       
        state["route"] = route

    else:
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
            if len(state["tasks"]) > 1:
                print(f"--- Multi-step plan ({len(state['tasks'])} steps) finished, combining results directly ---")
                # Combine all intermediate results into final_answer
                if state.get("intermediate_results"):
                    combined_results = []
                    for result in state["intermediate_results"]:
                        combined_results.append(f"**{result.get('node', 'Unknown')} Result:**\n{result.get('output', '')}")
                    
                    state["final_answer"] = "\n\n".join(combined_results)
                else:
                    state["final_answer"] = state.get("response", "Task completed.")
                route = "END"
            else:
                print(f"--- Single-step plan finished, ending directly ---")
                if state.get("intermediate_results"):
                    state["final_answer"] = state["intermediate_results"][-1]["output"]
                else: 
                    state["final_answer"] = state.get("response", "Task completed.")
                route = "END"
        state["route"] = route

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
