# llm.py
import os
from langchain_openai import ChatOpenAI

def get_reasoning_llm(temperature: float = 0.2):
    """
    Returns a ChatOpenAI instance configured to use DeepSeek via OpenRouter.
    """
    return ChatOpenAI(
        model="deepseek/deepseek-v3.2-exp",   
        openai_api_base="https://openrouter.ai/api/v1",
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=temperature,
        max_tokens=6000,
        default_headers={
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost"),
            "X-Title": os.getenv("APP_NAME", "My LangGraph App")
        }
    )

def get_llm(model_name: str, temperature: float = 0.3):
    """
    Get a ChatOpenAI instance for any model via OpenRouter.
    
    Args:
        model_name: Model name from frontend (e.g., 'gpt-4o', 'gpt-5-mini', 'gemini-2.0-flash')
        temperature: Temperature for response generation
    
    Returns:
        ChatOpenAI instance configured for the specified model
    """
    
    return ChatOpenAI(
        model=model_name,  # Pass model name directly to OpenRouter
        openai_api_base="https://openrouter.ai/api/v1",
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=temperature,
        default_headers={
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost"),
            "X-Title": os.getenv("APP_NAME", "My LangGraph App")
        }
    )