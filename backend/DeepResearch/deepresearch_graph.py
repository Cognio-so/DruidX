from langgraph.graph import StateGraph, END
from graph_type import GraphState
from observality import trace_node
from DeepResearch.initialize_research import initialize_deep_research
from DeepResearch.plan_research import plan_research_node
from DeepResearch.human_approval import human_approval_node
from DeepResearch.execute_research import execute_research_node
from DeepResearch.analyze_gaps import analyze_gaps_node
from DeepResearch.synthesize_report import synthesize_report_node
from DeepResearch.router import route_deep_research

def create_deep_research_graph():
    """
    Create a standalone deep research graph that bypasses the orchestrator.
    This graph starts directly from initialize_deep_research and flows through
    the deep research nodes without going through the main orchestrator.
    """
    g = StateGraph(GraphState)
    
    g.add_node("initialize_deep_research", trace_node(initialize_deep_research, "initialize_deep_research"))
    g.add_node("plan_research", trace_node(plan_research_node, "plan_research"))
    g.add_node("human_approval", human_approval_node)
    g.add_node("execute_research", trace_node(execute_research_node, "execute_research"))
    g.add_node("analyze_gaps", trace_node(analyze_gaps_node, "analyze_gaps"))
    g.add_node("synthesize_report", trace_node(synthesize_report_node, "synthesize_report"))
    g.set_entry_point("initialize_deep_research")
    g.add_edge("initialize_deep_research", "plan_research")
    g.add_conditional_edges("plan_research",
        route_deep_research, {
            "human_approval": "human_approval", 
            "END": END
        })
    g.add_conditional_edges("human_approval",
        route_deep_research, {
            "execute_research": "execute_research",
            "plan_research": "plan_research"
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
            "END": END  
        })
    
    return g.compile()
deep_research_graph = create_deep_research_graph()
