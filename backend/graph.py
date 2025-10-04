from langgraph.graph import StateGraph, END
from graph_type import GraphState
from observality import trace_node
from Orchestrator.Orchestrator import orchestrator, route_decision
from Basic_llm.basic_llm import SimpleLLm
from Rag.Rag import Rag
from WebSearch.websearch import run_web_search
from DeepResearch.deepresearch import run_deep_research

def create_graph():
    g = StateGraph(GraphState)
    g.add_node("orchestrator", trace_node(orchestrator, "orchestrator"))
    g.add_node("SimpleLLM", trace_node(SimpleLLm, "SimpleLLM"))
    g.add_node("RAG", trace_node(Rag, "RAG"))
    g.add_node("WebSearch", trace_node(run_web_search, "WebSearch"))
    g.add_node("deepResearch", trace_node(run_deep_research, "deepResearch"))
    g.set_entry_point("orchestrator")
    g.add_conditional_edges("orchestrator",
    route_decision, {
        "RAG": "RAG",
        "SimpleLLM": "SimpleLLM",
        "WebSearch": "WebSearch",
        "deepResearch": "deepResearch",
        "END": END
    })

    g.add_edge("SimpleLLM", "orchestrator")
    g.add_edge("RAG", "orchestrator")
    g.add_edge("WebSearch", "orchestrator")
    g.add_edge("deepResearch", "orchestrator")

    
    return g.compile()



graph = create_graph()
    