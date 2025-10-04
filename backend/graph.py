from langgraph.graph import StateGraph, END
from graph_type import GraphState
from observality import trace_node
from Orchestrator.Orchestrator import orchestrator, route_decision
from Basic_llm.basic_llm import SimpleLLm
from Rag.Rag import Rag
from WebSearch.websearch import run_web_search
from DeepResearch import (
    initialize_deep_research,
    plan_research_node,
    execute_research_node,
    analyze_gaps_node,
    synthesize_report_node,
    route_deep_research
)

def create_graph():
    g = StateGraph(GraphState)
    g.add_node("orchestrator", trace_node(orchestrator, "orchestrator"))
    g.add_node("SimpleLLM", trace_node(SimpleLLm, "SimpleLLM"))
    g.add_node("RAG", trace_node(Rag, "RAG"))
    g.add_node("WebSearch", trace_node(run_web_search, "WebSearch"))

    g.add_node("initialize_deep_research", trace_node(initialize_deep_research, "initialize_deep_research"))
    g.add_node("plan_research", trace_node(plan_research_node, "plan_research"))
    g.add_node("execute_research", trace_node(execute_research_node, "execute_research"))
    g.add_node("analyze_gaps", trace_node(analyze_gaps_node, "analyze_gaps"))
    g.add_node("synthesize_report", trace_node(synthesize_report_node, "synthesize_report"))
    
    g.set_entry_point("orchestrator")
    
    g.add_conditional_edges("orchestrator",
        route_decision, {
            "RAG": "RAG",
            "SimpleLLM": "SimpleLLM",
            "WebSearch": "WebSearch",
            "deepResearch": "initialize_deep_research",
            "END": END
        })

    g.add_edge("SimpleLLM", "orchestrator")
    g.add_edge("RAG", "orchestrator")
    g.add_edge("WebSearch", "orchestrator")
    
    g.add_edge("initialize_deep_research", "plan_research")

    g.add_conditional_edges("plan_research",
        route_deep_research, {
            "execute_research": "execute_research",
            "END": "orchestrator"
        })
    
    g.add_conditional_edges("execute_research",
        route_deep_research, {
            "analyze_gaps": "analyze_gaps",
            "synthesize_report": "synthesize_report"
        })

    g.add_conditional_edges("analyze_gaps",
        route_deep_research, {
            "execute_research": "execute_research",
            "synthesize_report": "synthesize_report"
        })
    
    g.add_conditional_edges("synthesize_report",
        route_deep_research, {
            "END": "orchestrator"
        })
    
    return g.compile()


graph = create_graph()