# DeepResearch/analyze_gaps.py
from graph_type import GraphState
from langchain_core.messages import HumanMessage
from llm import get_reasoning_llm
from DeepResearch.prompt_loader import PROMPTS

llm1 = get_reasoning_llm()

async def analyze_gaps_node(state: GraphState) -> GraphState:
    """
    Analyze gathered information and identify knowledge gaps dynamically
    """
    research_state_dict = state["deep_research_state"]
    user_query = state.get("user_query", '')
    llm_model = state.get("llm_model", "gpt-4o")
    
    info_summary = []
    for item in research_state_dict["gathered_information"][-10:]:
        source_label = item['source'].upper()
        content_preview = item['content'][:500] + "..." if len(item['content']) > 300 else item['content']
        info_summary.append(f"[{source_label}] {item['query']}: {content_preview}")
    info_summary_text = "\n\n".join(info_summary)
    
    answered_questions = [item['query'] for item in research_state_dict["gathered_information"]]
    answered_text = "\n".join([f"- {q}" for q in answered_questions[-10:]])
    
    analysis_prompt = PROMPTS['gap_analysis_prompt_template'].format(
        system_prompt=PROMPTS['system_prompt'],
        query=user_query,
        research_plan=', '.join(research_state_dict["research_plan"]),
        answered_questions=answered_text,
        current_iteration=research_state_dict["current_iteration"],
        max_iterations=research_state_dict["max_iterations"],
        info_summary=info_summary_text
    )

    response = await llm1.ainvoke([HumanMessage(content=analysis_prompt)])
    content = response.content
    
    analysis = {
        "confidence": 0.5,
        "gaps": [],
        "follow_up_questions": [],
        "reasoning": ""
    }
    
    try:
        if "CONFIDENCE:" in content:
            conf_line = content.split("CONFIDENCE:")[1].split("\n")[0].strip()
            conf_value = ''.join(filter(lambda x: x.isdigit() or x == '.', conf_line))
            analysis["confidence"] = float(conf_value) if conf_value else 0.5
        
        if "GAPS:" in content:
            if "FOLLOW_UP:" in content:
                gaps_section = content.split("GAPS:")[1].split("FOLLOW_UP:")[0].strip()
            else:
                gaps_section = content.split("GAPS:")[1].strip()
            
            if "none" not in gaps_section.lower():
                gaps = [g.strip() for g in gaps_section.split("\n") if g.strip() and not g.strip().startswith("CONFIDENCE")]
                analysis["gaps"] = [g for g in gaps if len(g) > 10]
        
        if "FOLLOW_UP:" in content:
            if "REASONING:" in content:
                followup_section = content.split("FOLLOW_UP:")[1].split("REASONING:")[0].strip()
            else:
                followup_section = content.split("FOLLOW_UP:")[1].strip()
            
            if "none" not in followup_section.lower():
                questions = [q.strip() for q in followup_section.split("\n") if q.strip()]
                cleaned_questions = []
                for q in questions:
                    q_cleaned = q.lstrip('0123456789.-•) ').strip()
                    if len(q_cleaned) > 15 and '?' in q_cleaned: 
                        cleaned_questions.append(q_cleaned)
                analysis["follow_up_questions"] = cleaned_questions
        
        if "REASONING:" in content:
            reasoning_section = content.split("REASONING:")[1].strip()
            analysis["reasoning"] = reasoning_section
    
    except Exception as e:
        print(f"[DeepResearch] Error parsing gap analysis: {e}")
        print(f"[DeepResearch] Raw content: {content[:500]}")
    
    print(f"[DeepResearch] Gap Analysis - Confidence: {analysis['confidence']:.2f}, Follow-ups: {len(analysis['follow_up_questions'])}")
    if analysis['reasoning']:
        print(f"[DeepResearch] Reasoning: {analysis['reasoning'][:200]}")

    research_state_dict["confidence_score"] = analysis['confidence']
    research_state_dict["knowledge_gaps"] = analysis['follow_up_questions']
    state["deep_research_state"] = research_state_dict

    if research_state_dict["confidence_score"] >= 0.85:
        print(f"[DeepResearch] High confidence ({research_state_dict['confidence_score']:.2f}), stopping early")
        state["route"] = "synthesize_report"
    elif not research_state_dict["knowledge_gaps"]:
        print("[DeepResearch] No knowledge gaps, stopping early")
        state["route"] = "synthesize_report"
    else:
        state["route"] = "execute_research"
    
    return state