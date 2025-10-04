# DeepResearch/execute_research.py
from graph_type import GraphState
from WebSearch.websearch import web_search

async def execute_research_node(state: GraphState) -> GraphState:
    """
    Execute research for given queries using web search and RAG
    """
    research_state_dict = state["deep_research_state"]
    current_iteration = research_state_dict["current_iteration"]
    max_iterations = research_state_dict["max_iterations"]
    
    print(f"\n[DeepResearch] === Iteration {current_iteration + 1}/{max_iterations} ===")
    
    if current_iteration == 0:
        queries_to_research = research_state_dict["research_plan"]
    else:
        queries_to_research = research_state_dict["knowledge_gaps"]
        print(f"Knowledge gaps to explore: {queries_to_research}")
    
    if not queries_to_research:
        print("[DeepResearch] No queries to research, moving to synthesis")
        state["route"] = "synthesize_report"
        return state
    
    findings = []
    for query in queries_to_research:
        print(f"[DeepResearch] Researching: {query}")
        try:
            web_results = await web_search(query, max_results=3, search_depth="advanced")
            if web_results:
                findings.append({
                    "query": query,
                    "source": "web",
                    "content": "\n".join([
                        f"{doc.metadata.get('title', 'Unknown')}: {doc.page_content[:300]}"
                        for doc in web_results
                    ]),
                    "urls": [doc.metadata.get('url', '') for doc in web_results],
                    "iteration": current_iteration
                })
        except Exception as e:
            print(f"[DeepResearch] Web search error: {e}")

    research_state_dict["gathered_information"].extend(findings)
    research_state_dict["current_iteration"] += 1
    
    for finding in findings:
        if 'urls' in finding:
            research_state_dict["sources"].extend(finding['urls'])
    
    state["deep_research_state"] = research_state_dict
    if research_state_dict["current_iteration"] < max_iterations:
        state["route"] = "analyze_gaps"
    else:
        state["route"] = "synthesize_report"
    
    return state