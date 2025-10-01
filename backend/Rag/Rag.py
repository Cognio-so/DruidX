from graph_type import GraphState
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
import uuid  
from typing import List, Optional, Dict, Any
import os
from qdrant_client import QdrantClient, models
from WebSearch.websearch import web_search

QDRANT_URL = os.getenv("QDRANT_URL", ":memory:")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

try:
    if QDRANT_URL == ":memory:":
        QDRANT_CLIENT = QdrantClient(":memory:")
    else:
        QDRANT_CLIENT = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        # Test the connection
        QDRANT_CLIENT.get_collections()
        print(f"[RAG] Connected to remote Qdrant at {QDRANT_URL}")
except Exception as e:
    print(f"[RAG] Remote Qdrant failed, falling back to in-memory: {e}")
    QDRANT_CLIENT = QdrantClient(":memory:")

VECTOR_SIZE = 1536

# Load the base RAG prompt
prompt_path = os.path.join(os.path.dirname(__file__), "Rag.md")
try:
    with open(prompt_path, 'r', encoding='utf-8') as f:
        base_rag_prompt = f.read()
except FileNotFoundError:
    base_rag_prompt = "You are a Retrieval-Augmented Generation (RAG) assistant. Answer using only the provided context."

async def retreive_docs(doc: List[str], name: str):
    EMBEDDING_MODEL = OpenAIEmbeddings(model="text-embedding-3-small")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunked_docs = text_splitter.create_documents(doc)
    
    embeddings = await EMBEDDING_MODEL.aembed_documents([doc.page_content for doc in chunked_docs])
    
    QDRANT_CLIENT.recreate_collection(
        collection_name=name,
        vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
    )
    
    QDRANT_CLIENT.upsert(
        collection_name=name,
        points=[
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={"text": doc.page_content}
            )
            for doc, embedding in zip(chunked_docs, embeddings)
        ]
    )

def _search_collection(collection_name: str, query: str, limit: int) -> List[str]:
    """
    Helper function to perform a semantic search on a Qdrant collection and return the text of the top results.
    """
   
    EMBEDDING_MODEL = OpenAIEmbeddings(model="text-embedding-3-small")
    query_embedding = EMBEDDING_MODEL.embed_query(query)
    
    search_results = QDRANT_CLIENT.search(
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=limit
    )
    return [result.payload["text"] for result in search_results]

def create_combined_system_prompt(custom_prompt: str, base_prompt: str) -> str:
    """
    Combine the custom GPT prompt with the base RAG prompt
    """
    if not custom_prompt.strip():
        return base_prompt
    
    combined_prompt = f"""
# RAG SYSTEM INSTRUCTIONS
{base_prompt}
----
# CUSTOM GPT CONFIGURATION
{custom_prompt}

"""
    
    return combined_prompt

async def Rag(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o")
    user_query = state.get("resolved_query") or state.get("user_query", "")

    messages = state.get("messages", [])
    websearch = state.get("web_search", False)    
    kb_docs = state.get("kb", {})
    docs = state.get("active_docs", [])
    # print(f" user doc", {docs})
    gpt_config = state.get("gpt_config", {})
    custom_system_prompt = gpt_config.get("system_prompt", "")
    temperature = gpt_config.get("temperature", 0.0)   

    combined_system_prompt = create_combined_system_prompt(custom_system_prompt, base_rag_prompt)
    
    print(f"[RAG] Processing query: {user_query}")
    print(f"[RAG] Web search enabled: {websearch}")
    if docs:
        print(f" doccccc..... user", docs)
    user_result = []
    kb_result = []
    
    
    if docs:
        await retreive_docs(docs, "doc_collection")
        user_result = _search_collection("doc_collection", user_query, 3)
        
    if kb_docs:
        kb_texts = []
        if isinstance(kb_docs, dict) and "text" in kb_docs:
            kb_texts = kb_docs["text"]
        elif isinstance(kb_docs, list):
            kb_texts = [d.content if hasattr(d, "content") else str(d) for d in kb_docs]
        else:
            kb_texts = [str(kb_docs)]

        await retreive_docs(kb_texts, "kb_collection")
        kb_result = _search_collection("kb_collection", user_query, 3)

    
    print(f"[RAG] Got {len(user_result)} doc results, {len(kb_result)} KB results")

    intermediate_results = state.get("intermediate_results", [])
    previous_context = []
    for item in intermediate_results:
        previous_context.append(f"{item['node']}: {item['output']}")
    context_str = "\n".join(previous_context) or "None"

   
    ctx = state.get("context") or {}
    sess = ctx.get("session") or {}
    summary = sess.get("summary", "")
    last_turns = []
    for m in (state.get("messages") or []):
        role = (m.get("type") or m.get("role") or "").lower()
        content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
        if content:
            speaker = "User" if role in ("human", "user") else "Assistant"
            last_turns.append(f"{speaker}: {content}")
    last_3_text = "\n".join(last_turns[-3:]) or "None"
    final_context_message = HumanMessage(content=f"""
CONVERSATION CONTEXT:
Summary: {summary if summary else 'None'}
Last Turns:
{last_3_text}

USER QUERY:
{user_query}

PREVIOUS NODE OUTPUTS:
{context_str}

DOCUMENT CONTEXT:
User Docs: {chr(10).join(user_result) if user_result else 'No user documents.'}
Knowledge Base: {chr(10).join(kb_result) if kb_result else 'No KB entries.'}

INSTRUCTIONS:
- Answer comprehensively using docs, KB, and previous node outputs
- If the query is a follow-up (e.g., "more books"), continue from prior results
- Structure the answer with clear headings
- Provide sources if available
""")

    final_messages = [
        SystemMessage(content=combined_system_prompt),
        final_context_message
    ]
    
    # Generate final response
    llm = ChatOpenAI(model=llm_model, temperature=temperature)
    ai_response = await llm.ainvoke(final_messages)
    state["messages"] = state.get("messages", []) + [ai_response.dict()]
    state["response"] = ai_response.content
    state.setdefault("intermediate_results", []).append({
    "node": "RAG",
    "query": user_query,
    "output": state["response"]
})
    # print(f"[RAG] Final response generated with {len(user_result)} doc results, {len(kb_result)} KB results, {len(web_result)} web results")
    return state

