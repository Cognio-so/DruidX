# DeepResearch/synthesize_report.py
from graph_type import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from llm import get_reasoning_llm, get_llm
from DeepResearch.prompt_loader import PROMPTS
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
load_dotenv()
import os
google_api_key=os.getenv("GOOGLE_API_KEY", "")


async def synthesize_report_node(state: GraphState) -> GraphState:
    """
    Synthesize all gathered information into comprehensive report
    Streams final output but doesn't store in state to save tokens
    """
    research_state_dict = state["deep_research_state"]
    llm_model = state.get("deep_research_llm_model")
    
    chunk_callback = state.get("_chunk_callback")
    
    # Stream synthesis introduction
    synthesis_intro = "## 📝 Final Synthesis Phase\n\nSynthesizing all research findings into comprehensive report...\n\n"
    if chunk_callback:
        await chunk_callback(synthesis_intro)
    
    # Stream research summary
    summary_msg = f"**Research Summary:**\n"
    summary_msg += f"📊 **Total Iterations:** {research_state_dict['current_iteration']}\n"
    summary_msg += f"🎯 **Final Confidence:** {research_state_dict['confidence_score']:.2f}\n"
    summary_msg += f"📚 **Total Findings:** {len(research_state_dict['gathered_information'])}\n"
    summary_msg += f"🔗 **Unique Sources:** {len(set(research_state_dict['sources']))}\n\n"
    
    if chunk_callback:
        await chunk_callback(summary_msg)
    
    # Stream findings breakdown
    if research_state_dict['gathered_information']:
        findings_msg = "**Research Findings Breakdown:**\n"
        for i, item in enumerate(research_state_dict['gathered_information'][:5], 1):
            findings_msg += f"{i}. **{item['query'][:60]}...** (Iteration {item['iteration']})\n"
        if len(research_state_dict['gathered_information']) > 5:
            findings_msg += f"... and {len(research_state_dict['gathered_information']) - 5} more findings\n"
        findings_msg += "\n"
        if chunk_callback:
            await chunk_callback(findings_msg)
    
    # Stream sources summary
    if research_state_dict["sources"]:
        sources_msg = f"**Sources Summary:**\n"
        unique_sources = list(set(research_state_dict["sources"]))[:5]
        for i, url in enumerate(unique_sources, 1):
            domain = url.split('/')[2] if len(url.split('/')) > 2 else url
            sources_msg += f"{i}. {domain}\n"
        if len(set(research_state_dict["sources"])) > 5:
            sources_msg += f"... and {len(set(research_state_dict['sources'])) - 5} more sources\n"
        sources_msg += "\n"
        if chunk_callback:
            await chunk_callback(sources_msg)
    
    # Stream that we're generating the report
    generating_msg = "🤖 **Generating comprehensive report...**\n\n"
    if chunk_callback:
        await chunk_callback(generating_msg)
    
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

    # Stream the LLM response
    # llm2 = ChatGoogleGenerativeAI(
    #     model="gemini-2.5-flash-lite",
    #     temperature=0.3,
    #     google_api_key=google_api_key,
    # )
    llm2=get_reasoning_llm(llm_model)
    async for chunk in llm2.astream([HumanMessage(content=synthesis_prompt)]):
        if hasattr(chunk, 'content') and chunk.content:
            if chunk_callback:
                await chunk_callback(chunk.content)
    
    # Add sources if not already included
    if research_state_dict["sources"]:
        sources_section = "\n\n## Sources & References\n"
        unique_sources = list(set(research_state_dict["sources"]))[:15]
        for i, url in enumerate(unique_sources, 1):
            sources_section += f"{i}. {url}\n"
        
        # Stream the sources section
        if chunk_callback:
            await chunk_callback(sources_section)
    
    # Stream completion message
    completion_msg = f"\n\n## ✅ Research Complete!\n\n"
    completion_msg += f"🎉 **Deep Research Successfully Completed**\n"
    completion_msg += f"📊 **Final Statistics:**\n"
    completion_msg += f"- Iterations: {research_state_dict['current_iteration']}\n"
    completion_msg += f"- Confidence: {research_state_dict['confidence_score']:.2f}\n"
    completion_msg += f"- Findings: {len(research_state_dict['gathered_information'])}\n"
    completion_msg += f"- Sources: {len(set(research_state_dict['sources']))}\n\n"
    
    if chunk_callback:
        await chunk_callback(completion_msg)
    
    print(f"\n[DeepResearch] Synthesizing final report...")
    print(f"[DeepResearch] Completed in {research_state_dict['current_iteration']} iterations")
    print(f"[DeepResearch] Final confidence: {research_state_dict['confidence_score']:.2f}")
    print(f"[DeepResearch] Total findings: {len(research_state_dict['gathered_information'])}")
    
    # REMOVE ALL STORAGE - Don't store anything to save tokens
    state["response"] = ""
    # Don't add to messages
    # Don't add to intermediate_results
    
    state["route"] = "END"
    
    return state