# DeepResearch/synthesize_report.py
from graph_type import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from llm import get_reasoning_llm
from DeepResearch.prompt_loader import PROMPTS
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
load_dotenv()
import os
google_api_key=os.getenv("GOOGLE_API_KEY", "")
llm1 = get_reasoning_llm()

async def synthesize_report_node(state: GraphState) -> GraphState:
    """
    Synthesize all gathered information into comprehensive report
    """
    research_state_dict = state["deep_research_state"]
    llm_model = state.get("llm_model", "gpt-4o")
    
    all_info = []
    for item in research_state_dict["gathered_information"]:
        source_label = item['source'].upper()
        iteration = item['iteration']
        all_info.append(
            f"[{source_label} - Iteration {iteration}]\n"
            f"Query: {item['query']}\n"
            f"Findings: {item['content'][:600]}...\n"
        )
    
    all_info_text = "\n\n".join(all_info)
    sources_text = "None"
    if research_state_dict["sources"]:
        sources_text = "\n".join([f"- {url}" for url in research_state_dict["sources"][:10]])
    
    synthesis_prompt = PROMPTS['synthesis_prompt_template'].format(
        system_prompt=PROMPTS['system_prompt'],
        query=state.get('user_query', ''),
        total_iterations=research_state_dict["current_iteration"],
        confidence=research_state_dict["confidence_score"],
        sources_count=len(set(research_state_dict["sources"])),
        findings_count=len(research_state_dict["gathered_information"]),
        all_info=all_info_text,
        sources=sources_text
    )

    llm = ChatOpenAI(model=llm_model, temperature=0.3)
    llm2=ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                google_api_key=google_api_key,
            )
    response = await llm2.ainvoke([HumanMessage(content=synthesis_prompt)])
    
    final_report = response.content

    if "sources" not in final_report.lower() and "references" not in final_report.lower() and research_state_dict["sources"]:
        final_report += "\n\n## Sources & References\n"
        unique_sources = list(set(research_state_dict["sources"]))[:15]
        for i, url in enumerate(unique_sources, 1):
            final_report += f"{i}. {url}\n"
    
    print(f"\n[DeepResearch] Synthesizing final report...")
    print(f"[DeepResearch] Completed in {research_state_dict['current_iteration']} iterations")
    print(f"[DeepResearch] Final confidence: {research_state_dict['confidence_score']:.2f}")
    print(f"[DeepResearch] Total findings: {len(research_state_dict['gathered_information'])}")
    
    state["response"] = final_report
    state.setdefault("messages", []).append({
        "role": "assistant",
        "content": final_report
    })
    state.setdefault("intermediate_results", []).append({
        "node": "DeepResearch",
        "query": state["deep_research_query"],
        "output": final_report,
        "metadata": {
            "iterations": research_state_dict["current_iteration"],
            "confidence": research_state_dict["confidence_score"],
            "sources_count": len(set(research_state_dict["sources"])),
            "findings_count": len(research_state_dict["gathered_information"])
        }
    })
    
    state["route"] = "END"
    
    return state