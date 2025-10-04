import os
from typing import List, Dict, Any
from graph_type import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from WebSearch.websearch import web_search
from Rag.Rag import _search_collection, _hybrid_search_rrf
import json
from llm import get_reasoning_llm

# Example inside planning step
llm1 = get_reasoning_llm()


prompt_path = os.path.join(os.path.dirname(__file__), "deepresearch.md")
try:
    with open(prompt_path, 'r', encoding='utf-8') as f:
        prompt_content = f.read()
        # Split the markdown file into sections
        sections = {}
        current_section = None
        current_content = []
        
        for line in prompt_content.split('\n'):
            if line.startswith('# ') and not line.startswith('## '):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = line[2:].strip()
                current_content = []
            else:
                current_content.append(line)
        
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        # Extract specific prompts
        system_prompt = sections.get('Deep Research System Prompt', '')
        planning_prompt_template = sections.get('Research Planning Prompt', '')
        gap_analysis_prompt_template = sections.get('Gap Analysis Prompt', '')
        synthesis_prompt_template = sections.get('Synthesis Prompt', '')
        
except FileNotFoundError:
    print("[DeepResearch] Warning: deepresearch.md not found, using fallback prompts")
    system_prompt = "You are a deep research assistant."
    planning_prompt_template = "Break down this query into sub-questions: {query}"
    gap_analysis_prompt_template = "Analyze gaps in research for: {query}"
    synthesis_prompt_template = "Synthesize findings for: {query}"


class DeepResearchState:
    """Internal state for deep research iterations"""
    def __init__(self):
        self.research_plan: List[str] = []
        self.current_iteration: int = 0
        self.max_iterations: int = 3
        self.gathered_information: List[Dict[str, Any]] = []
        self.knowledge_gaps: List[str] = []
        self.confidence_score: float = 0.0
        self.sources: List[str] = []


async def plan_research(query: str, llm_model: str) -> List[str]:
    """
    Break down the complex query into sub-questions dynamically based on query complexity
    """
    planning_prompt = planning_prompt_template.format(
        system_prompt=system_prompt,
        query=query
    )

    # llm = ChatOpenAI(model=llm_model, temperature=0.2)
    response = await llm1.ainvoke([HumanMessage(content=planning_prompt)])
    
    sub_questions = []
    for line in response.content.split('\n'):
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
            cleaned = line.lstrip('0123456789.-•) ').strip()
            if cleaned and len(cleaned) > 15:  # Filter out very short lines
                print(f"Cleansed queries: {cleaned}")
                sub_questions.append(cleaned)
    
    print(f"[DeepResearch] Generated {len(sub_questions)} sub-questions based on query complexity")
    return sub_questions


async def execute_research_iteration(
    queries: List[str],
    state: GraphState,
    research_state: DeepResearchState,
    llm_model: str
) -> List[Dict[str, Any]]:
    """
    Execute research for given queries using web search and RAG
    """
    findings = []
    for query in queries:
        print(f"[DeepResearch] Researching: {query}")
        try:
            web_results = await web_search(query, max_results=3, search_depth="advanced")
            if web_results:
                findings.append({
                    "query": query,
                    "source": "web",
                    "content": "\n".join([
                        f"{doc.metadata.get('title', 'Unknown')}: {doc.page_content[:300]}"
                        for doc in web_results
                    ]),
                    "urls": [doc.metadata.get('url', '') for doc in web_results],
                    "iteration": research_state.current_iteration
                })
        except Exception as e:
            print(f"[DeepResearch] Web search error: {e}")
    
    return findings


async def analyze_gaps(
    state: GraphState,
    research_state: DeepResearchState,
    llm_model: str
) -> Dict[str, Any]:
    """
    Analyze gathered information and identify knowledge gaps dynamically
    """
    user_query = state.get("user_query", '')
    
    info_summary = []
    for item in research_state.gathered_information[-10:]:
        source_label = item['source'].upper()
        content_preview = item['content'][:500] + "..." if len(item['content']) > 300 else item['content']
        info_summary.append(f"[{source_label}] {item['query']}: {content_preview}")
    info_summary_text = "\n\n".join(info_summary)
    
    answered_questions = [item['query'] for item in research_state.gathered_information]
    answered_text = "\n".join([f"- {q}" for q in answered_questions[-10:]])
    
    analysis_prompt = gap_analysis_prompt_template.format(
        system_prompt=system_prompt,
        query=user_query,
        research_plan=', '.join(research_state.research_plan),
        answered_questions=answered_text,
        current_iteration=research_state.current_iteration,
        max_iterations=research_state.max_iterations,
        info_summary=info_summary_text
    )

    # llm = ChatOpenAI(model=llm_model, temperature=0.2)
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
                # Clean up questions (remove numbering, bullets)
                cleaned_questions = []
                for q in questions:
                    q_cleaned = q.lstrip('0123456789.-•) ').strip()
                    if len(q_cleaned) > 15 and '?' in q_cleaned:  # Should be substantial and look like a question
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
    
    return analysis


async def synthesize_report(
    state: GraphState,
    research_state: DeepResearchState,
    llm_model: str
) -> str:
    """
    Synthesize all gathered information into comprehensive report
    """
    all_info = []
    for item in research_state.gathered_information:
        source_label = item['source'].upper()
        iteration = item['iteration']
        all_info.append(
            f"[{source_label} - Iteration {iteration}]\n"
            f"Query: {item['query']}\n"
            f"Findings: {item['content'][:600]}...\n"
        )
    
    all_info_text = "\n\n".join(all_info)
    sources_text = "None"
    if research_state.sources:
        sources_text = "\n".join([f"- {url}" for url in research_state.sources[:10]])
    
    synthesis_prompt = synthesis_prompt_template.format(
        system_prompt=system_prompt,
        query=state.get('user_query', ''),
        total_iterations=research_state.current_iteration,
        confidence=research_state.confidence_score,
        sources_count=len(set(research_state.sources)),
        findings_count=len(research_state.gathered_information),
        all_info=all_info_text,
        sources=sources_text
    )

    llm = ChatOpenAI(model=llm_model, temperature=0.3)
    response = await llm1.ainvoke([HumanMessage(content=synthesis_prompt)])
    
    final_report = response.content
    
    # Add sources section if not already included
    if "sources" not in final_report.lower() and "references" not in final_report.lower() and research_state.sources:
        final_report += "\n\n## Sources & References\n"
        unique_sources = list(set(research_state.sources))[:15]
        for i, url in enumerate(unique_sources, 1):
            final_report += f"{i}. {url}\n"
    
    return final_report


async def run_deep_research(state: GraphState) -> GraphState:
    """
    Main deep research node for LangGraph
    """
    query = state.get("resolved_query") or state.get("user_query", "")
    llm_model = state.get("llm_model", "gpt-4o")
    max_iterations = 5
    
    print(f"[DeepResearch] Starting deep research for: {query}")
    research_state = DeepResearchState()
    research_state.max_iterations = max_iterations
    research_state.research_plan = await plan_research(query, llm_model)
    print(f"Research plan: {research_state.research_plan}")
    
    if not research_state.research_plan:
        state["response"] = "Unable to plan research. Please refine your query."
        return state
    
    while research_state.current_iteration < research_state.max_iterations:
        print(f"\n[DeepResearch] === Iteration {research_state.current_iteration + 1}/{research_state.max_iterations} ===")
        
        if research_state.current_iteration == 0:
            queries_to_research = research_state.research_plan
        else:
            queries_to_research = research_state.knowledge_gaps
            print(f"Knowledge gaps to explore: {queries_to_research}")
        
        if not queries_to_research:
            print("[DeepResearch] No queries to research, breaking loop")
            break
        
        findings = await execute_research_iteration(
            queries_to_research,
            state,
            research_state,
            llm_model
        )
        
        research_state.gathered_information.extend(findings)
        research_state.current_iteration += 1
        
        for finding in findings:
            if 'urls' in finding:
                research_state.sources.extend(finding['urls'])
        
        if research_state.current_iteration < research_state.max_iterations:
            analysis = await analyze_gaps(state, research_state, llm_model)
            research_state.confidence_score = analysis['confidence']
            research_state.knowledge_gaps = analysis['follow_up_questions']
            
            if research_state.confidence_score >= 0.85:
                print(f"[DeepResearch] High confidence ({research_state.confidence_score:.2f}), stopping early")
                break
            
            if not research_state.knowledge_gaps:
                print("[DeepResearch] No knowledge gaps, stopping early")
                break

    print(f"\n[DeepResearch] Synthesizing final report...")
    final_report = await synthesize_report(state, research_state, llm_model)
    
    state["response"] = final_report
    state.setdefault("messages", []).append({
        "role": "assistant",
        "content": final_report
    })
    state.setdefault("intermediate_results", []).append({
        "node": "DeepResearch",
        "query": query,
        "output": final_report,
        "metadata": {
            "iterations": research_state.current_iteration,
            "confidence": research_state.confidence_score,
            "sources_count": len(set(research_state.sources)),
            "findings_count": len(research_state.gathered_information)
        }
    })
    
    print(f"[DeepResearch] Completed in {research_state.current_iteration} iterations")
    print(f"[DeepResearch] Final confidence: {research_state.confidence_score:.2f}")
    print(f"[DeepResearch] Total findings: {len(research_state.gathered_information)}")
    
    return state