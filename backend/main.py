from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Callable
import asyncio
import os
import uuid
from datetime import datetime
import json
import httpx
from document_processor import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt, extract_text_from_json
from graph import graph
from graph_type import GraphState
from DeepResearch.deepresearch_graph import deep_research_graph

from models import (
    ChatMessage, ChatRequest, ChatResponse, 
    GPTConfig, GPTResponse, DocumentResponse,
    SessionInfo, DocumentInfo
)
from MCP.mcp import MCPNode

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://emsa-gpt.vercel.app" ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, Dict[str, Any]] = {}


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
    
    # Store MCP connections in session
    mcp_connections = gpt_config.get("mcpConnections", [])
    session["mcp_connections"] = mcp_connections
    
    print(f"gpt config..........." , gpt_config)
    print(f"mcp connections..........." , mcp_connections)
    
    # Pre-process KB if available
    if session.get("kb"):
        try:
            from Rag.Rag import preprocess_kb_documents
            hybrid_rag = gpt_config.get("hybridRag", False)
            print(f"[MAIN] Pre-processing KB with {len(session['kb'])} documents for session {session_id}")
            await preprocess_kb_documents(
                session["kb"], 
                session_id, 
                is_hybrid=hybrid_rag
            )
            print(f"✅ [MAIN] Pre-processed KB documents with embeddings")
        except Exception as e:
            print(f"⚠️ [MAIN] Warning: Failed to pre-process KB documents: {e}")
            import traceback
            traceback.print_exc()
    
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
                    if not content.strip():
                        print(f"⚠️ Warning: PDF {filename} appears to be empty or unreadable")
                elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or filename.lower().endswith('.docx'):
                    print(f"[Document Processor] Processing DOCX: {filename}")
                    content = extract_text_from_docx(file_content)
                    if not content.strip():
                        print(f"⚠️ Warning: DOCX {filename} appears to be empty or unreadable")
                elif file_type == "application/json" or filename.lower().endswith('.json'):
                    print(f"[Document Processor] Processing JSON: {filename}")
                    content = extract_text_from_json(file_content)
                    if not content.strip():
                        print(f"⚠️ Warning: JSON {filename} appears to be empty or unreadable")
                else:
                    print(f"[Document Processor] Processing as text: {filename}")
                    content = extract_text_from_txt(file_content)
                    if not content.strip():
                        print(f"⚠️ Warning: Text file {filename} appears to be empty or unreadable")
                
                if content.strip():  # Only add documents with actual content
                    processed_doc = {
                        "id": doc["id"],
                        "filename": doc["filename"],
                        "content": content,
                        "file_type": doc["file_type"],
                        "file_url": doc["file_url"],
                        "size": doc["size"]
                    }
                    processed_docs.append(processed_doc)
                    print(f"✅ Successfully processed document: {doc['filename']} ({len(content)} chars)")
                else:
                    print(f"❌ Skipping document {doc['filename']}: No readable content extracted")
        except Exception as e:
            print(f"❌ Error fetching {doc['filename']}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"Total processed documents: {len(processed_docs)}")
    
    # Add to session
    if doc_type == "user":
        # REPLACE old documents instead of extending
        session["uploaded_docs"] = processed_docs
        session["new_uploaded_docs"] = processed_docs
        print(f"Replaced uploaded_docs with {len(processed_docs)} documents")
        
        # Pre-process embeddings immediately after upload
        try:
            from Rag.Rag import preprocess_user_documents, clear_user_doc_cache
            
            # Clear old embeddings first
            clear_user_doc_cache(session_id)
            print(f"[MAIN] Cleared old user document cache for session {session_id}")
            
            # Process only NEW documents
            hybrid_rag = session.get("gpt_config", {}).get("hybridRag", False)
            await preprocess_user_documents(
                processed_docs, 
                session_id, 
                is_hybrid=hybrid_rag,
                is_new_upload=True  # Clear and replace
            )
            print(f"✅ [MAIN] Pre-processed {len(processed_docs)} user documents with embeddings")
        except Exception as e:
            print(f"⚠️ [MAIN] Warning: Failed to pre-process user documents: {e}")
            import traceback
            traceback.print_exc()
            
    elif doc_type == "kb":
        session["kb"].extend(processed_docs)
        print(f"Added {len(processed_docs)} documents to kb")
        
        # Pre-process KB embeddings immediately after upload
        try:
            from Rag.Rag import preprocess_kb_documents
            hybrid_rag = session.get("gpt_config", {}).get("hybridRag", False)
            print(f"[MAIN] Pre-processing KB with {len(session['kb'])} documents for session {session_id}")
            await preprocess_kb_documents(
                session["kb"], 
                session_id, 
                is_hybrid=hybrid_rag
            )
            print(f"✅ [MAIN] Pre-processed KB documents with embeddings")
        except Exception as e:
            print(f"⚠️ [MAIN] Warning: Failed to pre-process KB documents: {e}")
            import traceback
            traceback.print_exc()
    
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
    print(f"Previous last_route in session: {session.get('last_route')}")  
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
    print(f"MCP Schema: {gpt_config.get('mcpSchema', 'None')}")
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
        
        # Create the chunk callback first
        queue = asyncio.Queue()
        full_response = ""
        
        async def chunk_callback(chunk_content: str):
            nonlocal full_response
            full_response += chunk_content
            # print(f"🔥 DIRECT CHUNK CALLBACK: {chunk_content[:50]}...")
            
            # Add a small delay to make streaming smoother
            await asyncio.sleep(0.05)  # 50ms delay between chunks
            
            await queue.put({
                "type": "content",
                "data": {
                    "content": chunk_content,
                    "full_response": full_response,
                    "is_complete": False
                }
            })
        
        # Create the state with the chunk callback already set
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
            uploaded_doc=request.uploaded_doc,
            mcp=gpt_config.get("mcp", False),
            mcp_schema=gpt_config.get("mcpSchema"),
            mcp_connections=session.get("mcp_connections", []),
            last_route=session.get("last_route"), 
            session_id=session_id,  
            context={  
        "session": {
            "summary": session.get("summary", ""),
            "last_route": session.get("last_route")
        }
    }, # <--- ADD THIS LINE
            _chunk_callback=chunk_callback  # Add this line
        )
        
        async def generate_stream():
            try:
                print("=== STARTING DIRECT GRAPH STREAMING ===")
                
                # Create a variable to store the final state
                final_state = None
                
                async def run_graph():
                    nonlocal final_state
                    try:
                        print("🔥 STARTING DIRECT GRAPH EXECUTION")
                        async for node_result in graph.astream(state):
                            print(f"🔥 NODE RESULT: {list(node_result.keys())}")
                            # Capture the final state from the last node result
                            final_state = node_result
                    except Exception as e:
                        print(f"--- ERROR in direct graph execution: {e}")
                        await queue.put({
                            "type": "error",
                            "data": {"error": str(e)}
                        })
                    finally:
                        print("🔥 DIRECT GRAPH EXECUTION COMPLETED")
                        await queue.put(None)  # Signal completion
                
                async def consume_and_yield():
                    while True:
                        item = await queue.get()
                        if item is None:
                            break
                        if item.get("type") == "error":
                            raise Exception(item["data"]["error"])
                        
                        # print(f"🔥 YIELDING DIRECT CHUNK: {item.get('data', {}).get('content', '')[:50]}...")
                        yield item
                
                graph_task = asyncio.create_task(run_graph())
                async for chunk in consume_and_yield():
                    chunk_data = json.dumps(chunk)
                    yield f"data: {chunk_data}\n\n"
                
                await graph_task
                
                # Use the final state from graph execution instead of the original state
                if final_state:
                    # Extract the actual state from the last node result
                    for node_name, node_state in final_state.items():
                        if isinstance(node_state, dict) and 'img_urls' in node_state:
                            state.update(node_state)
                            break
                
                # Debug: Check what's actually in the state
                print(f"🔥 FINAL STATE DEBUG:")
                print(f"🔥 State keys: {list(state.keys())}")
                print(f"🔥 img_urls in state: {state.get('img_urls', [])}")
                print(f"🔥 response in state: {state.get('response', '')}")
                
                # Send final completion message with image URLs
                final_chunk = {
                    "type": "content",
                    "data": {
                        "content": "",
                        "is_complete": True,
                        "full_response": full_response,
                        "img_urls": state.get("img_urls", [])
                    }
                }
                
                print(f"🔥 Final chunk img_urls: {final_chunk['data']['img_urls']}")
                yield f"data: {json.dumps(final_chunk)}\n\n"
                
                if full_response:
                    session["messages"].append({"role": "assistant", "content": full_response})
                    
                    # Store image URLs in session for persistence
                    if state.get("img_urls"):
                        session["img_urls"] = state.get("img_urls", [])
                    
                    SessionManager.update_session(session_id, session)
                if state.get("context", {}).get("session", {}).get("summary"):
                    session["summary"] = state["context"]["session"]["summary"]

                if state.get("context", {}).get("session", {}).get("last_route"):
                    session["last_route"] = state["context"]["session"]["last_route"]

                # Update session with context data
                if state.get("context", {}).get("session"):
                    SessionManager.update_session(session_id, session)
                # Always update last_route, even if response is empty
                if state.get("route"):
                    session["last_route"] = state["route"]
                    SessionManager.update_session(session_id, session)
                
                yield f"data: {json.dumps({'type': 'done', 'data': {'session_id': session_id}})}\n\n"
                
            except Exception as e:
                print(f"=== ERROR IN DIRECT STREAM GENERATION ===")
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
            
            
            media_type="text/event-stream", 
            
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

@app.post("/api/sessions/{session_id}/deepresearch/stream")
async def stream_deep_research(session_id: str, request: ChatRequest):
    """Stream deep research response - bypasses orchestrator and goes directly to deep research nodes"""
    print("=== DEEP RESEARCH STREAMING ENDPOINT CALLED ===")
    print(f"Session ID: {session_id}")
    print(f"Request message: {request.message}")
    
    session = SessionManager.get_session(session_id)
    print(f"Previous last_route in session: {session.get('last_route')}")  
    session["messages"].append({"role": "user", "content": request.message})
    print(f"Added user message to session. Total messages: {len(session['messages'])}")

    gpt_config = session.get("gpt_config")
    if not gpt_config:
        gpt_config = {
            "model": "gpt-4o-mini",
            "deepResearchModel": "alibaba/tongyi-deepresearch-30b-a3b:free",  
            "webBrowser": False,
            "hybridRag": False,
            "mcp": False,
            "instruction": "You are a helpful AI assistant."
        }
        session["gpt_config"] = gpt_config
        SessionManager.update_session(session_id, session)
    
    llm_model = gpt_config.get("model", "gpt-4o-mini")
    deep_research_model = gpt_config.get("deepResearchModel", "alibaba/tongyi-deepresearch-30b-a3b:free")  # Use separate model for deep research
    print(f"=== GPT CONFIG ===")
    print(f"Model: {llm_model}")
    print(f"Deep Research Model: {deep_research_model}")
    print(f"Web Browser: {gpt_config.get('webBrowser', False)}")
    print(f"Hybrid RAG: {gpt_config.get('hybridRag', False)}")
    print(f"MCP: {gpt_config.get('mcp', False)}")
    print(f"MCP Schema: {gpt_config.get('mcpSchema', 'None')}")
    print(f"Instruction: {gpt_config.get('instruction', '')[:100]}...")
    
    try:
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
        new_uploaded_docs_content = []
        if session.get("new_uploaded_docs"):
            for doc in session.get("new_uploaded_docs"):
                if isinstance(doc, dict) and doc.get("content"):
                    new_uploaded_docs_content.append(doc["content"])
    
        queue = asyncio.Queue()
        full_response = ""
        
        async def chunk_callback(chunk_content: str):
            nonlocal full_response
            full_response += chunk_content
            
          
            await asyncio.sleep(0.05) 
            
            await queue.put({
                "type": "content",
                "data": {
                    "content": chunk_content,
                    "full_response": full_response,
                    "is_complete": False
                }
            })
        state = GraphState(
            user_query=request.message,
            deep_research_query=request.message,  
            llm_model=llm_model,
            deep_research_llm_model=deep_research_model,  
            messages=session["messages"],
            doc=uploaded_docs_content,
            new_uploaded_docs=new_uploaded_docs_content,
            gpt_config=gpt_config,
            kb=kb_docs_structured,
            web_search=request.web_search,  
            rag=request.rag, 
            deep_search=True,  
            uploaded_doc=request.uploaded_doc,
            mcp=gpt_config.get("mcp", False),
            mcp_schema=gpt_config.get("mcpSchema"),
            mcp_connections=session.get("mcp_connections", []),
            last_route=session.get("last_route"), 
            session_id=session_id,  
            context={  
                "session": {
                    "summary": session.get("summary", ""),
                    "last_route": session.get("last_route")
                }
            },
            _chunk_callback=chunk_callback 
        )
        
        async def generate_stream():
            try:
                print("=== STARTING DEEP RESEARCH GRAPH STREAMING ===")
                final_state = None
                
                async def run_deep_research_graph():
                    nonlocal final_state
                    try:
                        print("🔥 STARTING DEEP RESEARCH GRAPH EXECUTION")
                        async for node_result in deep_research_graph.astream(state):
                            print(f"🔥 DEEP RESEARCH NODE RESULT: {list(node_result.keys())}")
                            final_state = node_result
                    except Exception as e:
                        print(f"--- ERROR in deep research graph execution: {e}")
                        await queue.put({
                            "type": "error",
                            "data": {"error": str(e)}
                        })
                    finally:
                        print("🔥 DEEP RESEARCH GRAPH EXECUTION COMPLETED")
                        await queue.put(None)  
                
                async def consume_and_yield():
                    while True:
                        item = await queue.get()
                        if item is None:
                            break
                        if item.get("type") == "error":
                            raise Exception(item["data"]["error"])
                        
                        yield item
                
                graph_task = asyncio.create_task(run_deep_research_graph())
                async for chunk in consume_and_yield():
                    chunk_data = json.dumps(chunk)
                    yield f"data: {chunk_data}\n\n"
                
                await graph_task
                
                if final_state:
                    for node_name, node_state in final_state.items():
                        if isinstance(node_state, dict) and 'img_urls' in node_state:
                            state.update(node_state)
                            break
    
                final_chunk = {
                    "type": "content",
                    "data": {
                        "content": "",
                        "is_complete": True,
                        "full_response": full_response,
                        "img_urls": state.get("img_urls", [])
                    }
                }
                
                print(f"🔥 Final deep research chunk img_urls: {final_chunk['data']['img_urls']}")
                yield f"data: {json.dumps(final_chunk)}\n\n"
                
                if full_response:
                    session["messages"].append({"role": "assistant", "content": full_response})
                    if state.get("img_urls"):
                        session["img_urls"] = state.get("img_urls", [])
                    
                    SessionManager.update_session(session_id, session)
                if state.get("context", {}).get("session", {}).get("summary"):
                    session["summary"] = state["context"]["session"]["summary"]

                if state.get("context", {}).get("session", {}).get("last_route"):
                    session["last_route"] = state["context"]["session"]["last_route"]
                if state.get("context", {}).get("session"):
                    SessionManager.update_session(session_id, session)
                if state.get("route"):
                    session["last_route"] = state["route"]
                    SessionManager.update_session(session_id, session)
                
                yield f"data: {json.dumps({'type': 'done', 'data': {'session_id': session_id}})}\n\n"
                
            except Exception as e:
                print(f"=== ERROR IN DEEP RESEARCH STREAM GENERATION ===")
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
            media_type="text/event-stream", 
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"=== ERROR IN STREAM_DEEP_RESEARCH ===")
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

# MCP Endpoints
@app.get("/api/mcp/available-tools")
async def get_available_mcp_tools():
    """Get list of available Composio tools/apps"""
    try:
        tools = MCPNode.get_available_tools()
        return {"tools": tools}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch available tools: {str(e)}")

@app.post("/api/mcp/connect")
async def initiate_mcp_connection(request: dict):
    """Initiate OAuth connection for a GPT to a specific app"""
    try:
        gpt_id = request.get("gpt_id")
        app_name = request.get("app_name")
        redirect_url = request.get("redirect_url")
        
        if not gpt_id or not app_name:
            raise HTTPException(status_code=400, detail="gpt_id and app_name are required")
        
        result = MCPNode.initiate_connection(gpt_id, app_name, redirect_url)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate connection: {str(e)}")

@app.get("/api/mcp/connections/{gpt_id}")
async def get_mcp_connections(gpt_id: str):
    """Get all active connections for a GPT"""
    try:
        connections = await MCPNode.get_user_connections(gpt_id)
        return {"gpt_id": gpt_id, "connections": connections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch connections: {str(e)}")

@app.get("/api/mcp/callback")
async def mcp_callback(request: Request):
    """Handle OAuth callback after authentication"""
    connection_request_id = request.query_params.get("connection_request_id")
    if not connection_request_id:
        return {"status": "error", "message": "Missing connection_request_id"}
    
    return {"status": "success", "connection_request_id": connection_request_id}

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