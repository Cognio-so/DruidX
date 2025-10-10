import os
from typing import List, Optional
from tavily import AsyncTavilyClient
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from graph_type import GraphState
from pathlib import Path
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
load_dotenv()
google_api_key=os.getenv("GOOGLE_API_KEY", "")
_tavily: Optional[AsyncTavilyClient] = None
if os.getenv("TAVILY_API_KEY"):
    try:
        _tavily = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        print(f"[WebSearch] Tavily client initialized successfully")
    except Exception as e:
        print(f"[WebSearch] Failed to init Tavily: {e}")
        _tavily = None
else:
    print(f"[WebSearch] TAVILY_API_KEY not found in environment")

# At top of websearch.py
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "websearch.md")
BASIC_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "websearch_basic.md")
async def send_status_update(state: GraphState, message: str, progress: int = None):
    """Send status update if callback is available"""
    if hasattr(state, '_status_callback') and state._status_callback:
        await state._status_callback({
            "type": "status",
            "data": {
                "status": "processing",
                "message": message,
                "current_node": "WebSearch",
                "progress": progress
            }
        })
def load_prompt(path: str, fallback: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return fallback

WEBSEARCH_PROMPT = load_prompt(
    PROMPT_PATH,
    "You are a helpful assistant. Format results clearly with headings, bullets, numbered lists. Cite as [Source X]."
)

WEBSEARCH_BASIC_PROMPT = load_prompt(
    BASIC_PROMPT_PATH,
    "Provide a concise answer (3-10 sentences) based only on the user query and the search results. Cite as [Source X]."
)

async def web_search(query: str, max_results: int = 5, search_depth: str="basic") -> List[Document]:
    """Perform Tavily web search and return results as LangChain Documents."""
    print(f"[WebSearch] Starting web search for: {query}")
    
    
    if not _tavily:
        print(f"[WebSearch] No Tavily client available")
        return []

    try:
        print(f"[WebSearch] Calling Tavily search API...")
        results = await _tavily.search(query=query, max_results=max_results, search_depth=search_depth)
        # print(f"[WebSearch] Raw Tavily response: {results}")
        
        docs = []
        for r in results.get("results", []):
            docs.append(
                Document(
                    page_content=r.get("content", ""),
                    metadata={"title": r.get("title", ""), "url": r.get("url", "")}
                )
            )
        print(f"[WebSearch] Created {len(docs)} documents from search results")
        return docs
    except Exception as e:
        print(f"[WebSearch] Error performing search: {e}")
        import traceback
        traceback.print_exc()
        return []


def is_web_search_available() -> bool:
    """Check if Tavily client is available."""
    return _tavily is not None



async def run_web_search(state: GraphState) -> GraphState:
    """
    Graph node for Tavily web search:
    - Fetch results
    - Format them into sources text
    - Send to LLM with websearch.md prompt
    - Store structured answer in state["response"]
    """
    query = state.get("resolved_query") or state.get("user_query", "")
    is_web_search=state.get("web_search", False)
    system_prompt = WEBSEARCH_PROMPT if is_web_search else WEBSEARCH_BASIC_PROMPT

    llm_model = state.get("llm_model", "gpt-4o")
    print(f"[WebSearch] Starting run_web_search for query: {query}")
    
    if not query:
        state["response"] = "No query provided for web search."
        print(f"[WebSearch] No query provided")
        return state
    await send_status_update(state, "🌐 Gathering information from websites...", 20)
    print(f"[WebSearch] Calling web_search function...")
    if is_web_search:
        results = await web_search(query, max_results=5,search_depth="advanced")
    else:
        results = await web_search(query, max_results=2,search_depth="basic")
        
    print(f"[WebSearch] Got {len(results)} results from web_search")
    
    if not results:
        state["response"] = "No web results found or Tavily unavailable."
        print(f"[WebSearch] No results found, returning early")
        return state
    
    await send_status_update(state, f"📄 Processing {len(results)} search results...", 40)

    sources_text = "\n".join(
        [f"[Source {i+1}] ({doc.metadata.get('url')})\n"
         f"{doc.page_content[:400]}"
         for i, doc in enumerate(results)]
    )

    user_prompt = f"""User Query: {query}

Search Results:
{sources_text}

Now synthesize them into a clear, structured answer with:
- Headings and subheadings
- Numbered or bulleted lists
- A final 'Sources Used' section with URLs(no titles or anything).
"""
    await send_status_update(state, "🤖 Generating response from search results...", 70)
    if not is_web_search:
        llm=ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                google_api_key=google_api_key,
            )
        answer = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"User Query: {query}\n\nSearch Results:\n{sources_text}")
        ])
        
    else:    
        llm=ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                google_api_key=google_api_key,
            )
        answer = await llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
    try:
        
        print(f"[WebSearch] LLM response received: {answer.content[:100]}...")
        state["response"] = answer.content
        state.setdefault("intermediate_results", []).append({
        "node": "WebSearch",
        "query": query,
        "output": state["response"]
    })
        await send_status_update(state, "✅ Web search completed", 100)

    except Exception as e:
        state["response"] = f"Web search formatting failed: {e}"
        print(f"[WebSearch] LLM error: {e}")
        import traceback
        traceback.print_exc()
    state.setdefault("messages", []).append({
        "role": "assistant",
        "content": state["response"]
    })
    # print(f"[WebSearch] Web search completed, response length: {len(state['response'])}")
    return state
