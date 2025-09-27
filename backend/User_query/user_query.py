from graph_type import GraphState

def user_query(state: GraphState) -> GraphState:
    text = state.get("user_query", "")
    return state