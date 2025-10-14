# DeepResearch/plan_research.py
from graph_type import GraphState
from langchain_core.messages import HumanMessage
from llm import get_reasoning_llm, get_llm
from DeepResearch.prompt_loader import PROMPTS
import asyncio

llm1 = get_reasoning_llm()

async def plan_research_node(state: GraphState) -> GraphState:
    """
    Break down the complex query into sub-questions dynamically based on query complexity
    Now streams output like RAG node
    """
    query = state["deep_research_query"]
    llm_model = state.get("llm_model", "gpt-4o")

    chunk_callback = state.get("_chunk_callback")

    planning_intro = "## 🔍 Research Planning Phase\n\nAnalyzing your query and generating research questions...\n\n"
    if chunk_callback:
        await chunk_callback(planning_intro)
    
    planning_prompt = PROMPTS['planning_prompt_template'].format(
        system_prompt=PROMPTS['system_prompt'],
        query=query
    )
    generating_msg = "🤔 **Generating research plan...**\n\n"
    if chunk_callback:
        await chunk_callback(generating_msg)
    
    llm_model = state.get("llm_model")
    llm2 = get_llm(llm_model, 0.01)
    full_response = planning_intro + generating_msg
    async for chunk in llm2.astream([HumanMessage(content=planning_prompt)]):
        if hasattr(chunk, 'content') and chunk.content:
            full_response += chunk.content
            if chunk_callback:
                await chunk_callback(chunk.content)
    
    sub_questions = []
    for line in full_response.split('\n'):
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
            cleaned = line.lstrip('0123456789.-•) ').strip()
            if cleaned and len(cleaned) > 15:  
                print(f"Cleansed queries: {cleaned}")
                sub_questions.append(cleaned)

    if sub_questions:
        completion_msg = f"\n\n✅ **Research plan complete! Generated {len(sub_questions)} research questions.**\n\n**Proceeding to research execution phase...**"
        if chunk_callback:
            await chunk_callback(completion_msg)
        full_response += completion_msg
    else:
        error_msg = "\n\n❌ **Error:** Unable to generate research questions from the query.\n\nPlease refine your query and try again."
        if chunk_callback:
            await chunk_callback(error_msg)
        full_response += error_msg
    
    print(f"[DeepResearch] Generated {len(sub_questions)} sub-questions based on query complexity")
    
    # REMOVE STORAGE - Don't store response to save tokens
    state["response"] = ""
    
    state["deep_research_state"]["research_plan"] = sub_questions
    
    if not sub_questions:
        state["route"] = "END"
    else:
        state["route"] = "execute_research"
    
    return state