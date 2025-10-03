import os
from typing import List, Optional
from tavily import AsyncTavilyClient
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from graph_type import GraphState
from pathlib import Path
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv
load_dotenv()
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

    llm_model = state.get("llm_model", "gpt-4o")
    print(f"[WebSearch] Starting run_web_search for query: {query}")
    
    if not query:
        state["response"] = "No query provided for web search."
        print(f"[WebSearch] No query provided")
        return state

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

    print(f"[WebSearch] Loading prompt template...")
    prompt_path = os.path.join(os.path.dirname(__file__), "websearch.md")
    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            system_prompt = f.read()
        print(f"[WebSearch] Loaded prompt template from {prompt_path}")
    except FileNotFoundError:
        system_prompt = (
            "You are a helpful assistant. Format the following search results "
            "into a clear, structured answer with headings, bullet points, and numbered lists. "
            "Always cite sources as [Source X]."
        )
        print(f"[WebSearch] Using fallback prompt template")

    print(f"[WebSearch] Formatting sources text...")
    sources_text = "\n".join(
        [f"[Source {i+1}] {doc.metadata.get('title')} ({doc.metadata.get('url')})\n"
         f"{doc.page_content[:400]}"
         for i, doc in enumerate(results)]
    )

    user_prompt = f"""User Query: {query}

Search Results:
{sources_text}

Now synthesize them into a clear, structured answer with:
- Headings and subheadings
- Numbered or bulleted lists
- Citations using [Source X] that map to the provided sources
- A final 'Sources Used' section with titles and URLs
"""
    print(f"[WebSearch] User prompt created, length: {len(user_prompt)}")
    print(f"[WebSearch] Calling LLM with model: {llm_model}")
    if not is_web_search:
        # Load short/basic prompt
        prompt_path = os.path.join(os.path.dirname(__file__), "websearch_basic.md")
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                system_prompt = f.read()
        except FileNotFoundError:
            system_prompt = "Provide a concise answer (3-5 sentences) based only on the search results. Cite as [Source X]."

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
        answer = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"User Query: {query}\n\nSearch Results:\n{sources_text}")
        ])
    else:    
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
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
