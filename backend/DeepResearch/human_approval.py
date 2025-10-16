from graph_type import GraphState

async def human_approval_node(state: GraphState) -> GraphState:
    """
    Human approval node for Deep Research planning phase
    Shows the research plan to user and waits for approval/rejection
    For testing: gets approval from terminal
    """
    research_state_dict = state["deep_research_state"]
    research_plan = research_state_dict.get("research_plan", [])

    chunk_callback = state.get("_chunk_callback")

    approval_intro = "## 👤 Human Approval Required\n\n"
    approval_intro += "**Research Plan Generated:**\n\n"
    
    for i, query in enumerate(research_plan, 1):
        approval_intro += f"{i}. {query}\n"
    
    approval_intro += f"\n**Total Research Questions:** {len(research_plan)}\n\n"
    approval_intro += "⏳ **Waiting for your approval...**\n\n"
    for i, query in enumerate(research_plan, 1):
        print(f"{i}. {query}")
    print("\n" + "="*60)

    while True:
        user_input = input("Do you approve this research plan? (y/n): ").lower().strip()
        if user_input in ['y', 'yes']:
            is_approved = True
            break
        elif user_input in ['n', 'no']:
            is_approved = False
            break
        else:
            print("Please enter 'y' for yes or 'n' for no.")
    
    print("="*60)
    
    if is_approved:
        print("✅ APPROVED! Proceeding to research execution...")
        if chunk_callback:
            await chunk_callback("✅ **Approved! Proceeding to research execution...**\n\n")
        state["route"] = "execute_research"
    else:
        user_feedback = input("\nYour feedback: ").strip()
        
        if user_feedback:
            research_state_dict.setdefault("plan_history", []).append({
                "attempt": research_state_dict.get("planning_attempts", 0) + 1,
                "plan": research_plan.copy(),
                "feedback": user_feedback,
                "timestamp": "now"  
            })
            research_state_dict.setdefault("user_feedback", []).append(user_feedback)

            research_state_dict["planning_attempts"] = research_state_dict.get("planning_attempts", 0) + 1
            
            print(f"\n📝 Feedback recorded: {user_feedback}")
            print(f"🔄 Planning attempt: {research_state_dict['planning_attempts']}")
            print("🔄 Regenerating research plan with your feedback...")
            
            if chunk_callback:
                await chunk_callback(f"❌ **Rejected! Feedback collected.**\n\n")
                await chunk_callback(f"📝 **Your feedback:** {user_feedback}\n\n")
                await chunk_callback(f"🔄 **Regenerating plan (Attempt {research_state_dict['planning_attempts']})...**\n\n")
        else:
            print("⚠️ No feedback provided. Regenerating with previous context...")
            if chunk_callback:
                await chunk_callback("❌ **Rejected! No feedback provided. Regenerating plan...**\n\n")
        
        state["route"] = "plan_research"
    
    return state
