from langgraph.graph import StateGraph, END
from graph_type import GraphState
from observality import trace_node
from Orchestrator.Orchestrator import orchestrator, route_decision
from Basic_llm.basic_llm import SimpleLLm
from Rag.Rag import Rag
from WebSearch.websearch import run_web_search
from Image.image import generate_image
from Synthesizer.synthesizer import synthesize_final_answer
# Deep research nodes removed - now handled by separate endpoint

def create_graph():
    g = StateGraph(GraphState)
    g.add_node("orchestrator", trace_node(orchestrator, "orchestrator"))
    g.add_node("SimpleLLM", trace_node(SimpleLLm, "SimpleLLM"))
    g.add_node("RAG", trace_node(Rag, "RAG"))
    g.add_node("WebSearch", trace_node(run_web_search, "WebSearch"))
    g.add_node("image", trace_node(generate_image, "image"))
    # Deep research nodes removed - now handled by separate endpoint
    g.add_node("AnswerSynthesizer", trace_node(synthesize_final_answer, "AnswerSynthesizer"))

    g.set_entry_point("orchestrator")
    
    g.add_conditional_edges("orchestrator",
        route_decision, {
            "RAG": "RAG",
            "SimpleLLM": "SimpleLLM",
            "WebSearch": "WebSearch",
            "image": "image",
            "AnswerSynthesizer": "AnswerSynthesizer",
            "END": END
        })

    g.add_edge("SimpleLLM", "orchestrator")
    g.add_edge("RAG", "orchestrator")
    g.add_edge("WebSearch", "orchestrator")
    g.add_edge("image", "orchestrator")
    g.add_edge("AnswerSynthesizer", END)
    
    # Deep research edges removed - now handled by separate endpoint
    
    return g.compile()


graph = create_graph()