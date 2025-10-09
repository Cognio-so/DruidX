from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import os
import uuid
from datetime import datetime
import json
import httpx
from document_processor import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt, extract_text_from_json
from graph import graph
from graph_type import GraphState
from streaming_graph import StreamingGraph
from models import (
    ChatMessage, ChatRequest, ChatResponse, 
    GPTConfig, GPTResponse, DocumentResponse,
    SessionInfo, DocumentInfo
)

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
    allow_origins=["http://localhost:3000","https://emsa-gpt.vercel.app" ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for sessions
sessions: Dict[str, Dict[str, Any]] = {}

# Initialize streaming graph
streaming_graph = StreamingGraph()

class SessionManager:
    @staticmethod
    def create_session() -> str:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "session_id": session_id,
            "messages": [],
            "uploaded_docs": [],
            "new_uploaded_docs": [],  # Add this line
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

async def fetch_document_content(url: str) -> str:
    """Fetch document content from URL"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            return response.text
    except Exception as e:
        print(f"Error fetching document from {url}: {e}")
        return ""

async def process_documents_from_urls(documents: List[DocumentInfo]) -> List[Dict[str, Any]]:
    """Process documents by fetching content from URLs"""
    processed_docs = []
    
    for doc in documents:
        try:
            print(f"Fetching document: {doc.filename} from {doc.file_url}")
            content = await fetch_document_content(doc.file_url)
            
            if content:
                processed_doc = {
                    "id": doc.id,
                    "filename": doc.filename,
                    "content": content,
                    "file_type": doc.file_type,
                    "file_url": doc.file_url,
                    "size": doc.size,
                    "doc_type": doc.doc_type
                }
                processed_docs.append(processed_doc)
                print(f"Successfully processed {doc.filename} ({len(content)} chars)")
            else:
                print(f"Failed to fetch content for {doc.filename}")
                
        except Exception as e:
            print(f"Error processing document {doc.filename}: {e}")
    
    return processed_docs

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

@app.post("/api/sessions/{session_id}/gpt-config")
async def set_gpt_config(session_id: str, gpt_config: dict):
    """Set GPT configuration for a session"""
    session = SessionManager.get_session(session_id)
    session["gpt_config"] = gpt_config
    # print(f"gpt config..........." , gpt_config)
    SessionManager.update_session(session_id, session)
    return {"message": "GPT configuration updated", "gpt_config": gpt_config}

@app.post("/api/sessions/{session_id}/add-documents")
async def add_documents_by_url(session_id: str, request: dict):
    """Add documents by URL"""
    print(f"=== ADD DOCUMENTS ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Request: {request}")
    
    session = SessionManager.get_session(session_id)
    
    documents = request.get("documents", [])
    doc_type = request.get("doc_type", "user")
    
    print(f"Documents to process: {len(documents)}")
    print(f"Document type: {doc_type}")
    
    processed_docs = []
    for i, doc in enumerate(documents):
        print(f"Processing document {i+1}: {doc}")
        file_url = doc["file_url"]
        file_type = doc.get("file_type", "")
        filename = doc["filename"]
    
        print(f"Fetching content from URL: {file_url}")
        print(f"File type: {file_type}")
        # Fetch content from URL
        try:
            async with httpx.AsyncClient() as client:
                print(f"Fetching content from URL: {doc['file_url']}")
                response = await client.get(doc["file_url"], timeout=30.0)
                response.raise_for_status()
                file_content = response.content
                print(f"Downloaded {len(file_content)} bytes")
        
                if file_type == "application/pdf" or filename.lower().endswith('.pdf'):
                    print(f"[Document Processor] Processing PDF: {filename}")
                    content = extract_text_from_pdf(file_content)
                elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or filename.lower().endswith('.docx'):
                    print(f"[Document Processor] Processing DOCX: {filename}")
                    content = extract_text_from_docx(file_content)
                elif file_type == "application/json" or filename.lower().endswith('.json'):
                    print(f"[Document Processor] Processing JSON: {filename}")
                    content = extract_text_from_json(file_content)
                else:
                    print(f"[Document Processor] Processing as text: {filename}")
                    content = extract_text_from_txt(file_content)
                
                processed_doc = {
                    "id": doc["id"],
                    "filename": doc["filename"],
                    "content": content,
                    "file_type": doc["file_type"],
                    "file_url": doc["file_url"],
                    "size": doc["size"]
                }
                processed_docs.append(processed_doc)
                print(f"✅ Successfully processed document: {doc['filename']}")
        except Exception as e:
            print(f"❌ Error fetching {doc['filename']}: {e}")
    
    print(f"Total processed documents: {len(processed_docs)}")
    
    # Add to session
    if doc_type == "user":
        session["uploaded_docs"].extend(processed_docs)
        session["new_uploaded_docs"] = processed_docs
        print(f"Added {len(processed_docs)} documents to uploaded_docs")
    elif doc_type == "kb":
        session["kb"].extend(processed_docs)
        print(f"Added {len(processed_docs)} documents to kb")
    
    SessionManager.update_session(session_id, session)
    
    print(f"Session KB docs count after update: {len(session.get('kb', []))}")
    
    return {"message": f"Added {len(processed_docs)} documents", "documents": processed_docs}

@app.get("/api/sessions/{session_id}/documents")
async def get_documents(session_id: str):
    """Get all documents for a session"""
    session = SessionManager.get_session(session_id)
    return {
        "uploaded_docs": session["uploaded_docs"],
        "kb": session["kb"]
    }

@app.post("/api/sessions/{session_id}/chat/stream")
async def stream_chat(session_id: str, request: ChatRequest):
    """Stream chat response"""
    print("=== STREAMING CHAT ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Request message: {request.message}")
    print(f"Web search enabled: {request.web_search}")
    print(f"RAG enabled: {request.rag}")
    print(f"Deep search enabled: {request.deep_search}")
    print(f"Uploaded doc: {request.uploaded_doc}")
    
    session = SessionManager.get_session(session_id)
    
    # Add user message to session
    session["messages"].append({"role": "user", "content": request.message})
    print(f"Added user message to session. Total messages: {len(session['messages'])}")
    
    # Get GPT configuration - with better error handling
    gpt_config = session.get("gpt_config")
    if not gpt_config:
        # If no GPT config, create a default one
        gpt_config = {
            "model": "gpt-4o-mini",
            "webBrowser": False,
            "hybridRag": False,
            "mcp": False,
            "instruction": "You are a helpful AI assistant."
        }
        session["gpt_config"] = gpt_config
        SessionManager.update_session(session_id, session)
    
    llm_model = gpt_config.get("model", "gpt-4o-mini")
    print(f"=== GPT CONFIG ===")
    print(f"Model: {llm_model}")
    print(f"Web Browser: {gpt_config.get('webBrowser', False)}")
    print(f"Hybrid RAG: {gpt_config.get('hybridRag', False)}")
    print(f"MCP: {gpt_config.get('mcp', False)}")
    print(f"Instruction: {gpt_config.get('instruction', '')[:100]}...")
    
    try:
        # Prepare document content from stored documents
        uploaded_docs_content = []
        if session.get("uploaded_docs"):
            for doc in session["uploaded_docs"]:
                if isinstance(doc, dict) and doc.get("content"):
                    uploaded_docs_content.append(doc["content"])
        
        kb_docs_structured = []
        if session.get("kb"):
            for doc in session["kb"]:
                if isinstance(doc, dict) and doc.get("content"):
                    kb_docs_structured.append({
                        "id": doc.get("id"),
                        "filename": doc.get("filename"),
                        "content": doc["content"],
                        "file_type": doc.get("file_type"),
                        "size": doc.get("size")
                    })
        
        print(f"=== DOCUMENT CONTENT ===")
        print(f"Uploaded docs count: {len(uploaded_docs_content)}")
        print(f"KB docs count: {len(kb_docs_structured)}")
        print(f"Uploaded docs content length: {sum(len(doc) for doc in uploaded_docs_content)}")
        print(f"KB docs content length: {sum(len(doc) for doc in kb_docs_structured)}")
        new_uploaded_docs_content = []
        if session.get("new_uploaded_docs"):
            for doc in session["new_uploaded_docs"]:
                if isinstance(doc, dict) and doc.get("content"):
                    new_uploaded_docs_content.append(doc["content"])
        state = GraphState(
            user_query=request.message,
            llm_model=llm_model,
            messages=session["messages"],
            doc=uploaded_docs_content,
            new_uploaded_docs=new_uploaded_docs_content,
            gpt_config=gpt_config,
            kb=kb_docs_structured,
            web_search=request.web_search,  
            rag=request.rag, 
            deep_search=request.deep_search,  
            uploaded_doc=request.uploaded_doc  
        )
        
        print(f"=== GRAPH STATE CREATED ===")
        print(f"State keys: {list(state.keys())}")
        print(f"User query: {state.get('user_query', '')}")
        print(f"LLM model: {state.get('llm_model', '')}")
        print(f"Messages count: {len(state.get('messages', []))}")
        print(f"Doc count: {len(state.get('doc', []))}")
        print(f"KB: {bool(state.get('kb'))}")
        print(f"Web search: {state.get('web_search', False)}")
        print(f"RAG: {state.get('rag', False)}")
        print(f"Deep search: {state.get('deep_search', False)}")
        
        async def generate_stream():
            full_response = ""
            try:
                print("=== STARTING STREAM GENERATION ===")
                async for chunk in streaming_graph.stream_chat(state, session_id):
                    chunk_data = json.dumps(chunk)
                    yield f"data: {chunk_data}\n\n"
                    
                    if chunk.get("type") == "content" and chunk.get("data", {}).get("is_complete"):
                        full_response = chunk.get("data", {}).get("full_response", "")
                
                if full_response:
                    session["messages"].append({"role": "assistant", "content": full_response})
                    SessionManager.update_session(session_id, session)
                
                yield f"data: {json.dumps({'type': 'done', 'data': {'session_id': session_id}})}\n\n"
                
            except Exception as e:
                print(f"=== ERROR IN STREAM GENERATION ===")
                print(f"Error: {str(e)}")
                import traceback
                traceback.print_exc()
                error_chunk = json.dumps({
                    "type": "error",
                    "data": {"error": str(e)}
                })
                yield f"data: {error_chunk}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"=== ERROR IN STREAM_CHAT ===")
        print(f"Error: {str(e)}")
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