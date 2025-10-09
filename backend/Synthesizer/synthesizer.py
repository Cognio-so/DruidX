from graph_type import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import os
google_api_key=os.getenv("GOOGLE_API_KEY", "")
SYNTHESIZER_PROMPT = """
You are a final answer synthesizer. Your task is to assemble the results from a multi-step AI execution into a single, cohesive, and well-structured response for the user.

**Original User Query:**
{user_query}

---

**Execution Log & Results:**
{formatted_results}

---

**Your Task:**
Based on the user's original query and the collected results from the execution log, write a comprehensive final answer.
- Address all parts of the user's original request.
- Use markdown for clear formatting (headings, subheadings, lists).
- **Do not** mention the intermediate steps or node names (e.g., "First, WebSearch found..."). Just present the information directly and seamlessly.
- Combine related information. For example, if two steps found information about machine learning, synthesize it into one section.
- Write in a helpful and clear tone.
"""
async def send_status_update(state: GraphState, message: str, progress: int = None):
    """Send status update if callback is available"""
    if hasattr(state, '_status_callback') and state._status_callback:
        await state._status_callback({
            "type": "status",
            "data": {
                "status": "processing",
                "message": message,
                "current_node": "AnswerSynthesizer",
                "progress": progress
            }
        })
def _format_intermediate_results(intermediate_results: list) -> str:
    """Formats the intermediate results into a readable string for the prompt."""
    if not intermediate_results:
        return "No intermediate results were generated."
    
    log = []
    for i, item in enumerate(intermediate_results):
        log.append(f"### Step {i+1}: Result from Node '{item.get('node')}' ###")
        log.append(f"Query for this step: {item.get('query')}")
        log.append(f"Output:\n{item.get('output')}")
        log.append("-" * 20)
    return "\n".join(log)

async def synthesize_final_answer(state: GraphState) -> GraphState:
    """
    This node synthesizes the final answer from all intermediate results.
    """
    print("--- SYNTHESIZING FINAL ANSWER ---")
    
    user_query = state.get("user_query", "No original query found.")
    intermediate_results = state.get("intermediate_results", [])
    await send_status_update(state, f"🔄 Merging information from {len(intermediate_results)} sources...", 20)
    formatted_results = _format_intermediate_results(intermediate_results)
    
    prompt = SYNTHESIZER_PROMPT.format(
        user_query=user_query,
        formatted_results=formatted_results
    )
    await send_status_update(state, "🤖 Generating final comprehensive answer...", 60)
    llm=ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                google_api_key=google_api_key,
            )
    final_answer = await llm.ainvoke([HumanMessage(content=prompt)])
    await send_status_update(state, "✅ Final answer synthesis completed", 100)
    print("--- FINAL ANSWER GENERATED ---")
    state["final_answer"] = final_answer.content
    
    return state