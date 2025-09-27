import streamlit as st
import asyncio
import os
from typing import List, Dict, Any
from graph import graph
from graph_type import GraphState
from document_processor import process_uploaded_files, display_document_preview
import uuid
from datetime import datetime

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, continue without it

# Page configuration
st.set_page_config(
    page_title="DruidX AI Assistant",
    page_icon="🧙‍♂️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 2rem;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .chat-message {
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
        border-left: 4px solid #667eea;
    }
    .user-message {
        background-color: #f0f2f6;
        border-left-color: #667eea;
    }
    .assistant-message {
        background-color: #e8f4fd;
        border-left-color: #764ba2;
    }
    .sidebar-section {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

def initialize_session_state():
    """Initialize session state variables"""
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "uploaded_docs" not in st.session_state:
        st.session_state.uploaded_docs = []
    if "kb_docs" not in st.session_state:
        st.session_state.kb_docs = []
    if "session_id" not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())

def process_query_with_graph(user_query: str, uploaded_docs: List[Dict], kb_docs: List[Dict], llm_model: str = "gpt-4o") -> str:
    """Process user query using the LangGraph workflow"""
    try:
        # Prepare the state
        state: GraphState = {
            "user_query": user_query,
            "llm_model": llm_model,
            "doc": [doc["content"] for doc in uploaded_docs] if uploaded_docs else [],
            "kb": {"text": [doc["content"] for doc in kb_docs]} if kb_docs else {},
            "messages": [],
            "session_id": st.session_state.session_id,
            "timestamp": datetime.now().isoformat()
        }
        
        # Run the graph
        result = asyncio.run(graph.ainvoke(state))
        
        return (
    result.get("response")
    or (result.get("messages") or [{}])[-1].get("content")
    or "No response generated"
)

    
    except Exception as e:
        st.error(f"Error processing query: {str(e)}")
        return f"Error: {str(e)}"

def main():
    # Initialize session state
    initialize_session_state()
    
    # Header
    st.markdown('<h1 class="main-header">🧙‍♂️ DruidX AI Assistant</h1>', unsafe_allow_html=True)
    st.markdown("---")
    
    # Sidebar for file uploads and settings
    with st.sidebar:
        st.markdown("## 📁 Document Management")
        
        # User Documents Upload
        st.markdown('<div class="sidebar-section">', unsafe_allow_html=True)
        st.markdown("### 📄 Upload Documents")
        uploaded_files = st.file_uploader(
            "Choose files for RAG processing",
            type=['pdf', 'docx', 'txt'],
            accept_multiple_files=True,
            help="Upload PDF, DOCX, or TXT files for document-based queries"
        )
        
        if uploaded_files:
            processed_docs = process_uploaded_files(uploaded_files)
            st.session_state.uploaded_docs = processed_docs
            display_document_preview(processed_docs, "Uploaded Documents")
        st.markdown('</div>', unsafe_allow_html=True)
        
        # Knowledge Base Upload
        st.markdown('<div class="sidebar-section">', unsafe_allow_html=True)
        st.markdown("### 🗄️ Knowledge Base")
        kb_files = st.file_uploader(
            "Upload Knowledge Base files",
            type=['pdf', 'docx', 'txt'],
            accept_multiple_files=True,
            help="Upload files for your knowledge base"
        )
        
        if kb_files:
            processed_kb = process_uploaded_files(kb_files)
            st.session_state.kb_docs = processed_kb
            display_document_preview(processed_kb, "Knowledge Base")
        st.markdown('</div>', unsafe_allow_html=True)
        
        # Settings
        st.markdown('<div class="sidebar-section">', unsafe_allow_html=True)
        st.markdown("### ⚙️ Settings")
        llm_model = st.selectbox(
            "LLM Model",
            ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
            index=0,
            help="Select the language model for processing"
        )
        
        # Environment variables check
        if not os.getenv("OPENAI_API_KEY"):
            st.warning("⚠️ Please set OPENAI_API_KEY environment variable")
            st.info("""
            **How to set your API key:**
            
            1. **PowerShell/Command Prompt:**
               ```
               set OPENAI_API_KEY=your-api-key-here
               ```
            
            2. **Create .env file:**
               Create a `.env` file in the backend folder with:
               ```
               OPENAI_API_KEY=your-api-key-here
               ```
            
            3. **Get API key from:** https://platform.openai.com/api-keys
            """)
        else:
            st.success("✅ OpenAI API Key is set")
        st.markdown('</div>', unsafe_allow_html=True)
        
        # Clear conversation
        if st.button("🗑️ Clear Conversation", type="secondary"):
            st.session_state.messages = []
            st.rerun()
    
    # Main chat interface
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.markdown("## 💬 Chat Interface")
        
        # Display uploaded documents info
        if st.session_state.uploaded_docs or st.session_state.kb_docs:
            with st.expander("📄 Available Documents", expanded=False):
                if st.session_state.uploaded_docs:
                    st.write(f"**Uploaded Documents:** {len(st.session_state.uploaded_docs)} files")
                    for doc in st.session_state.uploaded_docs:
                        st.write(f"• {doc['filename']}")
                
                if st.session_state.kb_docs:
                    st.write(f"**Knowledge Base:** {len(st.session_state.kb_docs)} files")
                    for doc in st.session_state.kb_docs:
                        st.write(f"• {doc['filename']}")
        
        # Chat messages
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])
        
        # Chat input
        if prompt := st.chat_input("Ask me anything! I can help with your documents or general questions."):
            # Check if API key is set
            if not os.getenv("OPENAI_API_KEY"):
                st.error("❌ Please set your OPENAI_API_KEY environment variable first!")
                st.stop()
            
            # Add user message to chat history
            st.session_state.messages.append({"role": "user", "content": prompt})
            
            # Display user message
            with st.chat_message("user"):
                st.markdown(prompt)
            
            # Process query and get response
            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    response = process_query_with_graph(
                        prompt, 
                        st.session_state.uploaded_docs, 
                        st.session_state.kb_docs,
                        llm_model
                    )
                
                st.markdown(response)
            
            # Add assistant response to chat history
            st.session_state.messages.append({"role": "assistant", "content": response})
    
    with col2:
        st.markdown("## 📊 Session Info")
        st.info(f"**Session ID:** {st.session_state.session_id[:8]}...")
        st.metric("Messages", len(st.session_state.messages))
        st.metric("Uploaded Docs", len(st.session_state.uploaded_docs))
        st.metric("KB Docs", len(st.session_state.kb_docs))
        
        # Quick actions
        st.markdown("### 🚀 Quick Actions")
        if st.button("📝 Example Query", help="Try a sample query"):
            example_queries = [
                "Summarize the uploaded documents",
                "What are the key points in my knowledge base?",
                "Explain quantum computing",
                "How do I implement a neural network?"
            ]
            st.session_state.example_query = example_queries[0]
            st.rerun()
        
        if "example_query" in st.session_state:
            st.text_area("Example Query", st.session_state.example_query, height=100)
            if st.button("Use This Query"):
                st.session_state.messages.append({"role": "user", "content": st.session_state.example_query})
                del st.session_state.example_query
                st.rerun()

if __name__ == "__main__":
    main()

