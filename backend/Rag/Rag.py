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

QDRANT_URL = os.getenv("QDRANT_URL", ":memory:")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
if QDRANT_URL == ":memory:":
    QDRANT_CLIENT = QdrantClient(":memory:")
else:
    QDRANT_CLIENT = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

VECTOR_SIZE = 1536

prompt_path = os.path.join(os.path.dirname(__file__), "Rag.md")
try:
    with open(prompt_path, 'r', encoding='utf-8') as f:
        prompt = f.read()
except FileNotFoundError:
    prompt = "You are a Retrieval-Augmented Generation (RAG) assistant. Answer using only the provided context."

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

async def Rag(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o")
    user_query = state.get("user_query", "")
    messages = state.get("messages", [])
    websearch = state.get("web_search", False)    
    kb_docs = state.get("kb", {})
    docs = state.get("doc", [])
    print(f"RAG processing query: {user_query}")
    print(f"Using model: {llm_model}")
    print(f"API Key set: {bool(os.getenv('OPENAI_API_KEY'))}")
    print(f"Web search: {websearch}")
    print(f"KB docs: {kb_docs}")
    print(f"Docs: {docs}")
    print(f"Messages: {messages}")
    print(f"Prompt: {prompt}")
    user_result = []
    kb_result = []
    
    if docs:
        await retreive_docs(docs, "doc_collection")
        user_result = _search_collection("doc_collection", user_query, 3)
        
    if kb_docs:
        await retreive_docs(kb_docs.get("text", []), "kb_collection")
        kb_result = _search_collection("kb_collection", user_query, 3)

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=user_query),
        HumanMessage(content=f"Context from user uploaded Docs: {' '.join(user_result) if user_result else 'No Docs provided.'}"),
        HumanMessage(content=f"Context from KB: {' '.join(kb_result) if kb_result else 'No KB provided.'}"),
    ]     
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
    ai_response = await llm.ainvoke(messages)
    state["messages"] = state.get("messages", []) + [ai_response.dict()]

    state["response"] = ai_response.content  
    print(f"RAG response received: {ai_response.content}")
    return state


