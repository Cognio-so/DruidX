from langgraph.graph import StateGraph, END
from graph_type import GraphState
from observality import trace_node
from Orchestrator.Orchestrator import orchestrator, route_decision
from Basic_llm.basic_llm import SimpleLLm
from Rag.Rag import Rag

def create_graph():
    g = StateGraph(GraphState)
    g.add_node("orchestrator", trace_node(orchestrator, "orchestrator"))
    g.add_node("SimpleLLM", trace_node(SimpleLLm, "SimpleLLM"))
    g.add_node("RAG", trace_node(Rag, "RAG"))
    g.set_entry_point("orchestrator")
    g.add_conditional_edges("orchestrator",
                           route_decision, {
                               "RAG": "RAG",
                               "SimpleLLM": "SimpleLLM"
                           })
    g.add_edge("SimpleLLM", END)
    g.add_edge("RAG", END)
    
    return g.compile()



graph = create_graph()
    