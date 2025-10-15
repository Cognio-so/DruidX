from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
import os
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from prompt_cache import normalize_prefix

# Remove this line - don't set it at module level
# google_api_key=os.getenv("GOOGLE_API_KEY", "")

# === Prompt caching setup ===
CORE_PREFIX_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "core_prefix.md")

BASIC_RULES_PATH = os.path.join(os.path.dirname(__file__), "basic_llm.md")

# Load static system parts once
CORE_PREFIX = ""
BASIC_RULES = ""
try:
    with open(CORE_PREFIX_PATH, "r", encoding="utf-8") as f:
        CORE_PREFIX = f.read()
except FileNotFoundError:
    CORE_PREFIX = "You are a helpful AI assistant."

try:
    with open(BASIC_RULES_PATH, "r", encoding="utf-8") as f:
        BASIC_RULES = f.read()
except FileNotFoundError:
    BASIC_RULES = "Follow standard instructions."

# Combine into one normalized static system prefix (identical every call)
STATIC_SYS = normalize_prefix([CORE_PREFIX, BASIC_RULES])


async def SimpleLLm(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o-mini")
    user_query = state.get("user_query", "")
    past_messages = state.get("messages", [])
    summary = state.get("context", {}).get("session", {}).get("summary", "")
    chunk_callback = state.get("_chunk_callback")
    gpt_config = state.get("gpt_config", {})
    custom_system_prompt = gpt_config.get("instruction", "")
    try:
        print(f"SimpleLLM processing query: {user_query}")
        print(f"Using model: {llm_model}")
        print(f"Past messages count: {len(past_messages)}")
        
        google_api_key = os.getenv("GOOGLE_API_KEY", "")
        print(f"Google API Key set: {bool(google_api_key)}")
        if not google_api_key:
            print("No Google API key found, falling back to OpenAI")
            from llm import get_llm
            chat=get_llm(llm_model, 0.6)  
        else:
            chat= ChatGoogleGenerativeAI(
                model="gemini-2.5-flash-lite",
                temperature=0.7,
                api_key=google_api_key,
            )
        
        formatted_history = []
        if summary:
            formatted_history.append(SystemMessage(content=f"Conversation summary so far:\n{summary}"))

        for m in past_messages[-2:]:
            role = (m.get("type") or m.get("role") or "").lower()
            content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
            if content:
                
                if len(content.split()) > 300:
                   content = " ".join(content.split()[:300]) + "..."

                
                if role in ("human", "user"):
                    formatted_history.append(HumanMessage(content=content))
                else:
                    formatted_history.append(AIMessage(content=content))
      
        enhanced_prompt = f"""{STATIC_SYS}

# CUSTOM GPT INSTRUCTIONS
{custom_system_prompt if custom_system_prompt else ''}

# INTELLIGENT BEHAVIOR GUIDELINES
- If the user provides content (text, code, data) without specific instructions, automatically apply the custom GPT instructions above
- If the user asks a specific question or gives explicit instructions, follow their request while incorporating relevant custom GPT capabilities when helpful
- Always prioritize the user's explicit requests, but enhance responses with your custom GPT expertise when appropriate
- For content without instructions: automatically process it according to your custom GPT purpose (summarize, analyze, review, etc.)
- For questions/requests: answer directly while leveraging your custom GPT knowledge to provide better responses"""
        
        system_msg = SystemMessage(content=enhanced_prompt)
        messages = [system_msg] + formatted_history + [HumanMessage(content=user_query)]


        print(f"Sending messages to LLM: {len(messages)} messages")
        print(f"Current query: {user_query}")
    
        full_response = ""
        async for chunk in chat.astream(messages):
            if hasattr(chunk, 'content') and chunk.content:
                full_response += chunk.content
                print(f"Streaming chunk: {chunk.content[:50]}...")
                
                
                if chunk_callback:
                    await chunk_callback(chunk.content)
        
        
        if chunk_callback:
            await chunk_callback("\n\n")
            full_response += "\n\n"
        
        print(f"SimpleLLM response received: {full_response[:100]}...")
        state["response"] = full_response
        print(f"State updated with response: {bool(state.get('response'))}")
        return state

    except Exception as e:
        print(f"Error in SimpleLLM: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error in SimpleLLM: {e}"
        return state
