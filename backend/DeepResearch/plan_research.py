# DeepResearch/plan_research.py
from graph_type import GraphState
from langchain_core.messages import HumanMessage
from llm import get_reasoning_llm
from DeepResearch.prompt_loader import PROMPTS

llm1 = get_reasoning_llm()

async def plan_research_node(state: GraphState) -> GraphState:
    """
    Break down the complex query into sub-questions dynamically based on query complexity
    """
    query = state["deep_research_query"]
    llm_model = state.get("llm_model", "gpt-4o")
    
    planning_prompt = PROMPTS['planning_prompt_template'].format(
        system_prompt=PROMPTS['system_prompt'],
        query=query
    )

    response = await llm1.ainvoke([HumanMessage(content=planning_prompt)])
    
    sub_questions = []
    for line in response.content.split('\n'):
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
            cleaned = line.lstrip('0123456789.-•) ').strip()
            if cleaned and len(cleaned) > 15:  
                print(f"Cleansed queries: {cleaned}")
                sub_questions.append(cleaned)
    
    print(f"[DeepResearch] Generated {len(sub_questions)} sub-questions based on query complexity")
    
    state["deep_research_state"]["research_plan"] = sub_questions
    
    if not sub_questions:
        state["response"] = "Unable to plan research. Please refine your query."
        state["route"] = "END"
    else:
        state["route"] = "execute_research"
    
    return state