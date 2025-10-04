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
