import os
from typing import List, Dict, Any
from graph_type import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from WebSearch.websearch import web_search
from Rag.Rag import _search_collection, _hybrid_search_rrf
import json

prompt_path = os.path.join(os.path.dirname(__file__), "deepresearch.md")
try:
    with open(prompt_path, 'r', encoding='utf-8') as f:
        deep_research_prompt = f.read()
except FileNotFoundError:
    deep_research_prompt = "You are a deep research assistant. Conduct comprehensive multi-iteration research."


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
    Break down the complex query into sub-questions
    """
    planning_prompt = f"""
{deep_research_prompt}
---
User's Complex Query: {query}

Task: Break this down into 3-10 specific sub-questions that need to be answered comprehensively.

Provide sub-questions as a numbered list. Focus on:
1. Core concepts and definitions
2. Current state/recent developments
3. Key challenges or controversies
4. Practical implications
5. Future directions (if relevant) etc. other sub-queries
Sub-questions:
"""

    llm = ChatOpenAI(model=llm_model, temperature=0.2)
    response = await llm.ainvoke([HumanMessage(content=planning_prompt)])
    sub_questions = []
    for line in response.content.split('\n'):
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
            cleaned = line.lstrip('0123456789.-•) ').strip()
            if cleaned:
                print(f"Cleansed queries", cleaned)
                sub_questions.append(cleaned)
    
    print(f"[DeepResearch] Generated {len(sub_questions)} sub-questions")
    return sub_questions[:5]  


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
    #     docs = state.get("active_docs")
    #     kb = state.get("kb")
    #     if docs:
    #         try:
    #             rag_results = await _hybrid_search_rrf("doc_collection", query, limit=3, k=60)
    #             if rag_results:
    #                 findings.append({
    #                     "query": query,
    #                     "source": "doc",
    #                     "content": "\n".join(rag_results),
    #                     "iteration": research_state.current_iteration
    #                 })
    #         except Exception as e:
    #             print(f"[DeepResearch] Doc RAG error: {e}")
        
    #     if kb:
    #         try:
    #             kb_results = await _hybrid_search_rrf("kb_collection", query, limit=3, k=60)
    #             if kb_results:
    #                 findings.append({
    #                     "query": query,
    #                     "source": "kb",
    #                     "content": "\n".join(kb_results),
    #                     "iteration": research_state.current_iteration
    #                 })
    #         except Exception as e:
    #             print(f"[DeepResearch] KB RAG error: {e}")
    
    # print(f"[DeepResearch] Gathered {len(findings)} findings in iteration {research_state.current_iteration}")
    return findings


async def analyze_gaps(
    state: GraphState,
    research_state: DeepResearchState,
    llm_model: str
) -> Dict[str, Any]:
    """
    Analyze gathered information and identify knowledge gaps
    """
    user_query=state.get("user_query", '')
    info_summary = []
    for item in research_state.gathered_information[-10:]:  
        source_label = item['source'].upper()
        content_preview = item['content'][:300] + "..." if len(item['content']) > 300 else item['content']
        info_summary.append(f"[{source_label}] {item['query']}: {content_preview}")
    info_summary_text = "\n\n".join(info_summary)
    
    analysis_prompt = f"""
{deep_research_prompt}
---
Original Query: {user_query}

Research Plan: {', '.join(research_state.research_plan)}
Gathered Information Summary (Iteration {research_state.current_iteration}/{research_state.max_iterations}):
{info_summary_text}

---
Tasks:
1. Assess if we have enough information to answer the original query comprehensively
2. Identify any remaining knowledge gaps or unclear areas
3. Provide a confidence score (0.0-1.0) for how well we can answer the query
4. List 2-3 specific follow-up questions if gaps exist

Format your response EXACTLY as:
CONFIDENCE: [0.0-1.0]
GAPS: [List specific gaps, one per line, or "None"]
FOLLOW_UP: [Specific questions, one per line, or "None"]
"""

    llm = ChatOpenAI(model=llm_model, temperature=0.2)
    response = await llm.ainvoke([HumanMessage(content=analysis_prompt)])
    content = response.content
    analysis = {
        "confidence": 0.5,
        "gaps": [],
        "follow_up_questions": []
    }
    
    try:
        if "CONFIDENCE:" in content:
            conf_line = content.split("CONFIDENCE:")[1].split("\n")[0].strip()
            analysis["confidence"] = float(conf_line)
        if "GAPS:" in content and "FOLLOW_UP:" in content:
            gaps_section = content.split("GAPS:")[1].split("FOLLOW_UP:")[0].strip()
            if "none" not in gaps_section.lower():
                analysis["gaps"] = [g.strip() for g in gaps_section.split("\n") if g.strip()]
        if "FOLLOW_UP:" in content:
            followup_section = content.split("FOLLOW_UP:")[1].strip()
            if "none" not in followup_section.lower():
                questions = [q.strip() for q in followup_section.split("\n") if q.strip()]
                analysis["follow_up_questions"] = [q for q in questions if len(q) > 10][:3]
    
    except Exception as e:
        print(f"[DeepResearch] Error parsing gap analysis: {e}")
    
    print(f"[DeepResearch] Gap Analysis - Confidence: {analysis['confidence']}, Gaps: {len(analysis['follow_up_questions'])}")
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
    
    synthesis_prompt = f"""
{deep_research_prompt}

---

Original Query: {state.get('user_query', '')}

All Gathered Information Across {research_state.current_iteration} Iterations:
{all_info_text}

Sources Used:
{sources_text}

---

Create a comprehensive, well-structured response that:
1. Directly answers the original query
2. Integrates information from multiple sources and iterations
3. Provides specific examples and evidence
4. Uses clear headings and structure
5. Cites sources where appropriate
6. Acknowledges any limitations or uncertainties
7. Is clear, accurate, and actionable

Final Report:
"""

    llm = ChatOpenAI(model=llm_model, temperature=0.3)
    response = await llm.ainvoke([HumanMessage(content=synthesis_prompt)])
    
    final_report = response.content
    if "sources" not in final_report.lower() and research_state.sources:
        final_report += "\n\n## Sources Used\n"
        for i, url in enumerate(research_state.sources[:10], 1):
            final_report += f"{i}. {url}\n"
    
    return final_report


async def run_deep_research(state: GraphState) -> GraphState:
    """
    Main deep research node for LangGraph
    """
    query = state.get("resolved_query") or state.get("user_query", "")
    llm_model = state.get("llm_model", "gpt-4o")
    max_iterations = 3
    
    print(f"[DeepResearch] Starting deep research for: {query}")
    research_state = DeepResearchState()
    research_state.max_iterations = max_iterations
    research_state.research_plan = await plan_research(query, llm_model)
    print(f"reserach plan...", research_state.research_plan)
    if not research_state.research_plan:
        state["response"] = "Unable to plan research. Please refine your query."
        return state
    while research_state.current_iteration < research_state.max_iterations:
        print(f"\n[DeepResearch] === Iteration {research_state.current_iteration + 1}/{research_state.max_iterations} ===")
        if research_state.current_iteration == 0:
            queries_to_research = research_state.research_plan
        else:
            queries_to_research = research_state.knowledge_gaps
            print(f"Gapps_knowledge .............", queries_to_research)
        
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
                print(f"[DeepResearch] High confidence ({research_state.confidence_score}), stopping early")
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
    print(f"[DeepResearch] Final confidence: {research_state.confidence_score}")
    print(f"[DeepResearch] Total findings: {len(research_state.gathered_information)}")
    
    return state