# DeepResearch/plan_research.py
from graph_type import GraphState
from langchain_core.messages import HumanMessage
from llm import get_reasoning_llm, get_llm
from DeepResearch.prompt_loader import PROMPTS
import asyncio



async def plan_research_node(state: GraphState) -> GraphState:
    query = state["deep_research_query"]
    llm_model = state.get("deep_research_llm_model")
    research_state_dict = state["deep_research_state"]
    chunk_callback = state.get("_chunk_callback")

    planning_attempts = research_state_dict.get("planning_attempts", 0)
    plan_history = research_state_dict.get("plan_history", [])
    user_feedback = research_state_dict.get("user_feedback", [])
    if planning_attempts > 0:
        planning_intro = f"## 🔄 Research Planning Phase (Attempt {planning_attempts + 1})\n\n"
        planning_intro += "Regenerating research plan based on your feedback...\n\n"
        if chunk_callback:
            await chunk_callback(planning_intro)
        if plan_history:
            feedback_summary = "**Previous Attempts & Feedback:**\n\n"
            for attempt in plan_history[-3:]:
                feedback_summary += f"**Attempt {attempt['attempt']}:**\n"
                feedback_summary += f"Previous Plan:\n"
                for i, question in enumerate(attempt['plan'], 1):
                    feedback_summary += f"  {i}. {question}\n"
                feedback_summary += f"Feedback: {attempt['feedback']}\n\n"
            
            
    else:
        planning_intro = "## 🔍 Research Planning Phase\n\nAnalyzing your query and generating research questions...\n\n"
        if chunk_callback:
            await chunk_callback(planning_intro)

    base_prompt = PROMPTS['planning_prompt_template'].format(
        system_prompt=PROMPTS['system_prompt'],
        query=query
    )
    if user_feedback and plan_history:
        last_plan = plan_history[-1]['plan']
        
        refinement_prompt = f"""
You are an expert research planner. Your task is to REFINE an existing research plan based on user feedback.

**Original Query:** {query}

**Previous Research Plan:**
"""
        for i, question in enumerate(last_plan, 1):
            refinement_prompt += f"{i}. {question}\n"
        
        refinement_prompt += f"""
**User Feedback:**
"""
        for i, fb in enumerate(user_feedback, 1):
            refinement_prompt += f"{i}. {fb}\n"
        
        refinement_prompt += """
**Instructions:**
- **No query size should be more than 300 words**.
- Follow the user feedback EXACTLY - do not interpret or add anything extra
- If user asks for specific number of questions, generate EXACTLY that number - no more, no less
- If user asks to "keep only top X" or "select best X", choose the best X questions from the previous plan and keep them as they are
- If user asks to "make questions advanced", enhance the existing questions without changing their core meaning
- If user asks to remove specific questions, remove them from the previous plan
- If user asks to add topics, add them to the previous plan
- Do NOT create new questions unless specifically requested
- Do NOT change questions unless specifically requested
- Do NOT add extra questions beyond what user requested
- Do NOT interpret user feedback - follow it literally

Generate a research plan that follows the user feedback exactly.
"""
        planning_prompt = refinement_prompt
        
    elif user_feedback:
        feedback_context = "\n\n**USER FEEDBACK FROM PREVIOUS ATTEMPTS:**\n"
        for i, fb in enumerate(user_feedback, 1):
            feedback_context += f"{i}. {fb}\n"
        feedback_context += (
            "\n**INSTRUCTIONS:**\n"
            "- Address all feedback above\n"
            "- Avoid repeating the same approach\n"
            "- Generate a better, refined plan\n"
            "- Focus on specific user requirements\n"
        )
        planning_prompt = base_prompt + feedback_context
    else:
        planning_prompt = base_prompt

    generating_msg = "🤔 **Generating research plan...**\n\n"
    if chunk_callback:
        await chunk_callback(generating_msg)
    print(f"llm..................", llm_model)
    llm2 = get_reasoning_llm(llm_model)
    response_text = ""
    async for chunk in llm2.astream([HumanMessage(content=planning_prompt)]):
        if hasattr(chunk, "content") and chunk.content:
            response_text += chunk.content
            if chunk_callback:
                await chunk_callback(chunk.content)
    sub_questions = []
    for line in response_text.splitlines():
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith(("-", "•"))):
            cleaned = line.lstrip("0123456789.-•) ").strip()
            if cleaned and len(cleaned) > 15:
                sub_questions.append(cleaned)

    sub_questions = list(dict.fromkeys(sub_questions))
    print(f"[DeepResearch] Parsed {len(sub_questions)} sub-questions (cleaned & unique)")
    research_state_dict["research_plan"] = sub_questions
    state["response"] = ""
    state["route"] = "human_approval" if sub_questions else "END"
    if sub_questions:
        msg = (
            f"\n\n✅ **{'Regenerated' if planning_attempts > 0 else 'Complete'}!** "
            f"Generated {len(sub_questions)} research questions.**\n\n"
            "**Proceeding to human approval...**"
        )
        if chunk_callback:
            await chunk_callback(msg)
    else:
        err = "\n\n❌ **No valid questions parsed. Please refine your query.**"
        if chunk_callback:
            await chunk_callback(err)

    return state
