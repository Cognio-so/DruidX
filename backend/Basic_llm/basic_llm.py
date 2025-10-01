from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import os

prompt_path = os.path.join(os.path.dirname(__file__), "basic_llm.md")
try:
    with open(prompt_path, 'r', encoding='utf-8') as f:
        prompt = f.read()
except FileNotFoundError:
    prompt = "You are a helpful AI assistant."

async def SimpleLLm(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o")
    user_query = state.get("user_query", "")
    past_messages = state.get("messages", [])
    summary = state.get("context", {}).get("session", {}).get("summary", "")

    try:
        print(f"SimpleLLM processing query: {user_query}")
        print(f"Using model: {llm_model}")
        print(f"API Key set: {bool(os.getenv('OPENAI_API_KEY'))}")

        chat = ChatOpenAI(model=llm_model or "gpt-4o", temperature=0.2)

        # Build conversation messages (keep summary + last few turns)
        formatted_history = []
        if summary:
            formatted_history.append(SystemMessage(content=f"Conversation summary so far:\n{summary}"))

        for m in past_messages[-3:]:  # keep last 3 turns for context
            role = (m.get("type") or m.get("role") or "").lower()
            content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
            if content:
                speaker = "User" if role in ("human", "user") else "Assistant"
                formatted_history.append(HumanMessage(content=f"{speaker}: {content}"))

        messages = [SystemMessage(content=prompt)] + formatted_history + [HumanMessage(content=user_query)]

        print(f"Sending messages to LLM: {len(messages)} messages")
        response = await chat.ainvoke(messages)
        print(f"SimpleLLM response received: {response.content[:100]}...")
        state.setdefault("messages", []).append({"role": "assistant", "content": response.content})
        state["response"] = response.content
        print(f"State updated with response: {bool(state.get('response'))}")
        return state

    except Exception as e:
        print(f"Error in SimpleLLM: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error in SimpleLLM: {e}"
        return state
