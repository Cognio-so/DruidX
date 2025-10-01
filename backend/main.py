from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import os
import uuid
from datetime import datetime
import json

from graph import graph
from graph_type import GraphState
from document_processor import process_uploaded_files_api, process_knowledge_base_files
from models import (
    ChatMessage, ChatRequest, ChatResponse, 
    GPTConfig, GPTResponse, DocumentResponse,
    SessionInfo
)
from storage import CloudflareR2Storage

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(
    title="DruidX AI Assistant API",
    description="API for building and using custom GPTs with knowledge base",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for sessions (in production, use a database)
sessions: Dict[str, Dict[str, Any]] = {}

# Add global variable
storage = None

# Initialize storage
@app.on_event("startup")
async def startup_event():
    global storage
    storage = CloudflareR2Storage()
    print(f"Storage initialized: {not storage.use_local_fallback}")

class SessionManager:
    @staticmethod
    def create_session() -> str:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "session_id": session_id,
            "messages": [],
            "uploaded_docs": [],
            "kb": [],
            "gpt_config": None,
            "created_at": datetime.now().isoformat()
        }
        return session_id
    
    @staticmethod
    def get_session(session_id: str) -> Dict[str, Any]:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        return sessions[session_id]
    
    @staticmethod
    def update_session(session_id: str, updates: Dict[str, Any]):
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        sessions[session_id].update(updates)

@app.get("/")
async def root():
    return {"message": "DruidX AI Assistant API", "version": "1.0.0"}

@app.post("/api/sessions", response_model=SessionInfo)
async def create_session():
    """Create a new chat session"""
    session_id = SessionManager.create_session()
    return SessionInfo(session_id=session_id, created_at=sessions[session_id]["created_at"])

@app.get("/api/sessions/{session_id}", response_model=Dict[str, Any])
async def get_session(session_id: str):
    """Get session information"""
    return SessionManager.get_session(session_id)

@app.post("/api/sessions/{session_id}/load-kb")
async def load_kb_documents(session_id: str):
    """Load KB documents from storage for a session"""
    session = SessionManager.get_session(session_id)
    
    if not storage:
        return {"message": "Storage not available"}
    
    try:
        # Get GPT config to find KB documents
        gpt_config = session.get("gpt_config", {})
        if not gpt_config:
            return {"message": "No GPT config found"}
        
        # For now, we'll store KB documents in the session when uploaded
        # In the future, you can load them from storage using the file URLs
        kb_count = len(session.get("kb", []))
        
        return {
            "message": f"Loaded {kb_count} KB documents",
            "kb_documents": session.get("kb", [])
        }
        
    except Exception as e:
        print(f"Error loading KB documents: {e}")
        return {"message": f"Error loading KB documents: {str(e)}"}

@app.post("/api/sessions/{session_id}/gpt-config")
async def set_gpt_config(session_id: str, config: GPTConfig):
    """Set GPT configuration for a session"""
    session = SessionManager.get_session(session_id)
    
    # Store the config
    session["gpt_config"] = config.dict()
    
    # Ensure KB documents are persisted
    if storage and session.get("kb"):
        print(f"Ensuring {len(session['kb'])} KB documents are persisted")
        for doc in session["kb"]:
            if hasattr(doc, 'file_url') and doc.file_url:
                print(f"KB doc {doc.filename} already stored at: {doc.file_url}")
            else:
                print(f"KB doc {doc.filename} needs to be stored")
    
    SessionManager.update_session(session_id, session)
    return {"message": "GPT configuration updated successfully"}

@app.post("/api/sessions/{session_id}/upload-documents")
async def upload_documents(
    session_id: str, 
    files: List[UploadFile] = File(...),
    doc_type: str = Form(...)  # Remove default value, make it required
):
    """Upload documents to a session"""
    print(f"=== UPLOAD ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Doc type: {doc_type}")
    print(f"Number of files: {len(files)}")
    print(f"File names: {[f.filename for f in files]}")
    
    session = SessionManager.get_session(session_id)
    print(f"Session found: {bool(session)}")
    print(f"Current KB docs count: {len(session.get('kb', []))}")
    
    # Process uploaded files based on type
    if doc_type == "user":
        processed_docs = await process_uploaded_files_api(files)
        session["uploaded_docs"].extend(processed_docs)
        print(f"Added {len(processed_docs)} user docs. Total user docs: {len(session['uploaded_docs'])}")
        
        # Store in Cloudflare R2 for persistence
        if storage:
            for doc in processed_docs:
                try:
                    success, url_or_key = storage.upload_file(
                        file_data=doc.content.encode('utf-8'),
                        filename=doc.filename,
                        is_user_doc=True,
                        schedule_deletion_hours=72
                    )
                    if success:
                        doc.file_url = url_or_key
                        print(f"Stored user doc in R2: {doc.filename}")
                except Exception as e:
                    print(f"Error storing user doc in R2: {e}")
        
    elif doc_type == "kb":
        processed_docs = await process_knowledge_base_files(files)
        session["kb"].extend(processed_docs)
        print(f"Added {len(processed_docs)} KB docs. Total KB docs: {len(session['kb'])}")
        print(f"KB docs content preview: {[doc.content[:50] + '...' if hasattr(doc, 'content') else str(doc)[:50] + '...' for doc in processed_docs]}")
        
        # Store in Cloudflare R2 for persistence
        if storage:
            for doc in processed_docs:
                try:
                    success, url_or_key = storage.upload_file(
                        file_data=doc.content.encode('utf-8'),
                        filename=doc.filename,
                        is_user_doc=False,
                        schedule_deletion_hours=72
                    )
                    if success:
                        doc.file_url = url_or_key
                        print(f"Stored KB doc in R2: {doc.filename}")
                except Exception as e:
                    print(f"Error storing KB doc in R2: {e}")
        
    else:
        raise HTTPException(status_code=400, detail="Invalid doc_type. Use 'user' or 'kb'")
    
    SessionManager.update_session(session_id, session)
    print(f"Session updated. Final KB docs count: {len(session['kb'])}")
    
    return DocumentResponse(
        message=f"Successfully uploaded {len(processed_docs)} documents",
        documents=processed_docs
    )

@app.get("/api/sessions/{session_id}/documents")
async def get_documents(session_id: str):
    """Get all documents for a session"""
    session = SessionManager.get_session(session_id)
    return {
        "uploaded_docs": session["uploaded_docs"],
        "kb": session["kb"]
    }

@app.post("/api/sessions/{session_id}/chat", response_model=ChatResponse)
async def chat(session_id: str, request: ChatRequest):
    """Process a chat message"""
    print(f"=== CHAT ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Request message: {request.message}")
    print(f"Web search enabled: {request.web_search}")
    
    session = SessionManager.get_session(session_id)
    print(f"Session found: {bool(session)}")
    print(f"Session keys: {list(session.keys()) if session else 'None'}")
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Add user message to session
    session["messages"].append({"role": "user", "content": request.message})
    print(f"Added user message to session. Total messages: {len(session['messages'])}")
    
    # Get GPT configuration
    gpt_config = session.get("gpt_config", {})
    print(f"GPT config: {gpt_config}")
    
    # Get LLM model
    llm_model = gpt_config.get("model", "gpt-4o")
    print(f"LLM model: {llm_model}")
    
    try:
        # Prepare document content - FIX: Access DocumentInfo attributes correctly
        uploaded_docs_content = []
        if session.get("uploaded_docs"):
            for doc in session["uploaded_docs"]:
                if hasattr(doc, 'content'):
                    uploaded_docs_content.append(doc.content)
                elif isinstance(doc, dict):
                    uploaded_docs_content.append(doc.get('content', ''))
        
        kb_docs_content = []
        if session.get("kb"):
            print(f"Processing {len(session['kb'])} KB documents")
            for i, doc in enumerate(session["kb"]):
                print(f"KB doc {i}: type={type(doc)}, hasattr content={hasattr(doc, 'content')}")
                if hasattr(doc, 'content'):
                    kb_docs_content.append(doc.content)
                    print(f"KB doc {i} content length: {len(doc.content)}")
                elif isinstance(doc, dict):
                    kb_docs_content.append(doc.get('content', ''))
                    print(f"KB doc {i} dict content length: {len(doc.get('content', ''))}")
        
        print(f"Uploaded docs count: {len(uploaded_docs_content)}")
        print(f"KB docs count: {len(kb_docs_content)}")
        
        # Create graph state - FIX: Use dictionary access, not attribute access
        state = GraphState(
            user_query=request.message,
            llm_model=llm_model,
            messages=session["messages"],
            doc=uploaded_docs_content,
            gpt_config=gpt_config,
            kb={"text": kb_docs_content} if kb_docs_content else None,
            web_search=request.web_search,  # Use the web search toggle from request
            rag=True
        )
        
        print(f"Created graph state with {len(state['messages'])} messages")  # FIX: Use dict access
        print(f"Web search enabled in state: {state.get('web_search')}")
        
        # Process through graph
        result = await graph.ainvoke(state)
        assistant_message = result.get("messages", [])[-1] if result.get("messages") else {"role": "assistant", "content": "I'm sorry, I couldn't process your request."}
        session["messages"].append(assistant_message)
        
        return ChatResponse(
            message=assistant_message["content"],
            session_id=session_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"=== ERROR IN CHAT ENDPOINT ===")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    del sessions[session_id]
    return {"message": "Session deleted successfully"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)