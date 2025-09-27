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
    messages = state.get("messages", [])
   
    try:
        print(f"SimpleLLM processing query: {user_query}")
        print(f"Using model: {llm_model}")
        print(f"API Key set: {bool(os.getenv('OPENAI_API_KEY'))}")
        
        chat = ChatOpenAI(model=llm_model or "gpt-4o", temperature=0.2)
        
      
        messages = [
            SystemMessage(content=prompt),
            HumanMessage(content=user_query)
        ]
        
        print(f"Sending messages to LLM: {len(messages)} messages")
        response = await chat.ainvoke(messages)
        print(f"SimpleLLM response received: {response.content[:100]}...")
        
        state["messages"].append(response.dict())
        state["response"] = response.content
        print(f"State updated with response: {bool(state.get('response'))}")
        return state
    except Exception as e:
        print(f"Error in SimpleLLM: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error in SimpleLLM: {e}"
        return state