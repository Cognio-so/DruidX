# DeepResearch/router.py
from graph_type import GraphState

def route_deep_research(state: GraphState) -> str:
    """
    Route between deep research nodes based on state
    """
    return state.get("route", "END")