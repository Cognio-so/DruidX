from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
import os
from langchain_google_genai import ChatGoogleGenerativeAI

# Remove this line - don't set it at module level
# google_api_key=os.getenv("GOOGLE_API_KEY", "")

prompt_path = os.path.join(os.path.dirname(__file__), "basic_llm.md")
try:
    with open(prompt_path, 'r', encoding='utf-8') as f:
        prompt = f.read()
except FileNotFoundError:
    prompt = "You are a helpful AI assistant."

async def SimpleLLm(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o-mini")
    user_query = state.get("user_query", "")
    past_messages = state.get("messages", [])
    summary = state.get("context", {}).get("session", {}).get("summary", "")

    try:
        print(f"SimpleLLM processing query: {user_query}")
        print(f"Using model: {llm_model}")
        google_api_key = os.getenv("GOOGLE_API_KEY", "")
        print(f"Google API Key set: {bool(google_api_key)}")
        if not google_api_key:
            print("No Google API key found, falling back to OpenAI")
            from llm import get_llm
            chat=get_llm(llm_model, 0.01)
        else:
            chat= ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.3,
                api_key=google_api_key,
            )
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
        
        # Stream the response and collect it
        full_response = ""
        async for chunk in chat.astream(messages):
            if hasattr(chunk, 'content') and chunk.content:
                full_response += chunk.content
                print(f"Streaming chunk: {chunk.content[:50]}...")
        
        print(f"SimpleLLM response received: {full_response[:100]}...")
        state.setdefault("messages", []).append({"role": "assistant", "content": full_response})
        state["response"] = full_response
        print(f"State updated with response: {bool(state.get('response'))}")
        return state

    except Exception as e:
        print(f"Error in SimpleLLM: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error in SimpleLLM: {e}"
        return state
