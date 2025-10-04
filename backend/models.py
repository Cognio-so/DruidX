from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    web_search: Optional[bool] = False  # Add web search toggle
    rag: Optional[bool] = False  # Add RAG toggle
    deep_search: Optional[bool] = False  # Add deep search toggle
    uploaded_doc: Optional[bool] = False  # Add uploaded doc indicator

class ChatResponse(BaseModel):
    message: str
    session_id: str
    timestamp: str

class GPTConfig(BaseModel):
    name: str
    description: str
    model: str = "gpt-4o-mini"
    system_prompt: str
    temperature: float = 0.7
    max_tokens: Optional[int] = None

class GPTResponse(BaseModel):
    gpt_id: str
    name: str
    description: str
    model: str
    created_at: str

class DocumentInfo(BaseModel):
    id: str
    filename: str
    content: str
    file_type: str
    file_url: str
    size: int
    

class DocumentResponse(BaseModel):
    message: str
    documents: List[DocumentInfo]

class SessionInfo(BaseModel):
    session_id: str
    created_at: str
