# DeepResearch/initialize_research.py
from graph_type import GraphState
from DeepResearch.research_state import DeepResearchState

async def initialize_deep_research(state: GraphState) -> GraphState:
    """
    Initialize deep research state and prepare for planning
    """
    query = state.get("resolved_query") or state.get("user_query", "")
  
    
    print(f"[DeepResearch] Starting deep research for: {query}")

    research_state = DeepResearchState()
   

    state["deep_research_state"] = {
        "research_plan": research_state.research_plan,
        "current_iteration": research_state.current_iteration,
        "max_iterations": research_state.max_iterations,
        "gathered_information": research_state.gathered_information,
        "knowledge_gaps": research_state.knowledge_gaps,
        "confidence_score": research_state.confidence_score,
        "sources": research_state.sources,
        # New fields
        "plan_history": research_state.plan_history,
        "user_feedback": research_state.user_feedback,
        "planning_attempts": research_state.planning_attempts
    }
    
    state["deep_research_query"] = query
    state["route"] = "plan_research"
    
    return state