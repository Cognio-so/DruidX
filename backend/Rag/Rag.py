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
from rank_bm25 import BM25Okapi
import re
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
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
import aiofiles
# Load the base RAG prompt
prompt_path = os.path.join(os.path.dirname(__file__), "Rag.md")
def load_base_prompt() -> str:
    path = os.path.join(os.path.dirname(__file__), "Rag.md")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "You are a Retrieval-Augmented Generation (RAG) assistant. Answer using only the provided context."

base_rag_prompt = load_base_prompt()

BM25_INDICES = {}
async def retreive_docs(doc: List[str], name: str, is_hybrid: bool= False):
    EMBEDDING_MODEL = OpenAIEmbeddings(model="text-embedding-3-small")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    chunked_docs = text_splitter.create_documents(doc)
    
    embeddings = await EMBEDDING_MODEL.aembed_documents([doc.page_content for doc in chunked_docs])
    
    # Instead of always recreating
    collections_response = await asyncio.to_thread(QDRANT_CLIENT.get_collections)
    collections = [c.name for c in collections_response.collections]
    if name not in collections:
        await asyncio.to_thread(
            QDRANT_CLIENT.recreate_collection,
            collection_name=name,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )

    await asyncio.to_thread(
        QDRANT_CLIENT.upsert,
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
    if is_hybrid:
        tokenized_docs = [tokenize(doc.page_content) for doc in chunked_docs]
        bm25 = await asyncio.to_thread(BM25Okapi, tokenized_docs)
        BM25_INDICES[name] = {
    "bm25": bm25,
    "docs": {str(i): doc.page_content for i, doc in enumerate(chunked_docs)},
    "tokens": tokenized_docs
}

        print(f"[RAG] Stored {len(chunked_docs)} chunks in {name} (Vector + BM25)")

    else:
        print(f"[RAG] Stored {len(chunked_docs)} chunks in {name} (Vector only)")
def tokenize(text: str):
    tokens = re.findall(r"\w+", text.lower())
    return [t for t in tokens if t not in ENGLISH_STOP_WORDS]
async def _search_collection(collection_name: str, query: str, limit: int) -> List[str]:
    """
    Helper function to perform a semantic search on a Qdrant collection and return the text of the top results.
    """
   
    EMBEDDING_MODEL = OpenAIEmbeddings(model="text-embedding-3-small")
    query_embedding =await  EMBEDDING_MODEL.aembed_query(query)
    
    search_results = await asyncio.to_thread(
    QDRANT_CLIENT.search,
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=limit
    )
    return [result.payload["text"] for result in search_results]
async def _reciprocal_rank_fusion(rankings: List[List[str]], k: int = 60) -> List[str]:
    """
    Reciprocal Rank Fusion (RRF) algorithm to combine multiple ranked lists.
    RRF is superior to weighted score fusion because:
    - No score normalization needed
    - More robust across different scoring scales
    - Better handles heterogeneous retrieval methods
    - Proven effective in academic research
    Formula: RRF(d) = Σ(1 / (k + rank(d)))
    where rank(d) is the rank of document d in a ranking (1-indexed)
    
    Args:
        rankings: List of ranked document lists from different retrieval methods
        k: Constant to prevent high ranks from dominating (default 60 from research)
    
    Returns:
        Fused ranking of documents
    """
    rrf_scores = {}
    
    for ranking in rankings:
        for rank, doc in enumerate(ranking, start=1):
            if doc not in rrf_scores:
                rrf_scores[doc] = 0
            rrf_scores[doc] += 1 / (k + rank)
    sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [doc for doc, score in sorted_docs]
import asyncio

async def _bm25_scores(bm25, tokenized_query):
    """Run BM25 scoring in a thread to avoid blocking the async loop."""
    return await asyncio.to_thread(bm25.get_scores, tokenized_query)

async def _hybrid_search_rrf(collection_name: str, query: str, limit: int, k: int = 60) -> List[str]:
    """
    Hybrid RAG with RRF: Combines vector search (semantic) and BM25 (keyword) using RRF.
    
    Best for:
    - Queries with both semantic and keyword requirements
    - Technical terms, acronyms, proper nouns
    - Mixed natural language + specific terms
    - When you need robust retrieval across different query types
    
    Process:
    1. Vector Search: Get semantically similar documents
    2. BM25 Search: Get keyword-matched documents
    3. RRF Fusion: Combine rankings using reciprocal rank formula
    
    Args:
        collection_name: Name of the collection
        query: Search query
        limit: Number of final results to return
        k: RRF constant (default 60, recommended in literature)
    
    Returns:
        List of top documents based on RRF fusion
    """
    EMBEDDING_MODEL = OpenAIEmbeddings(model="text-embedding-3-small")

    query_embedding =await EMBEDDING_MODEL.aembed_query(query)
    vector_results =await asyncio.to_thread(
        QDRANT_CLIENT.search,
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=limit * 3
    )
    vector_ranking = [result.payload["text"] for result in vector_results]

    if collection_name not in BM25_INDICES:
        print(f"[HYBRID-RRF] No BM25 index for {collection_name}, falling back to vector only")
        return vector_ranking[:limit]
    
    bm25_data = BM25_INDICES[collection_name]
    bm25 = bm25_data["bm25"]
    docs = bm25_data["docs"]
    
    tokenized_query = tokenize(query)
    bm25_scores = await _bm25_scores(bm25, tokenized_query)
    scored_docs = [(score, docs[str(idx)]) for idx, score in enumerate(bm25_scores)]

    bm25_threshold = 0.1
    bm25_ranking = [doc for score, doc in scored_docs if score > bm25_threshold]

    bm25_ranking = bm25_ranking[:limit * 3]
    
    fused_ranking = await _reciprocal_rank_fusion([vector_ranking[:limit*3], bm25_ranking[:limit*3]], k=k)
    top_results = fused_ranking[:limit]
    
    print(f"[HYBRID-RRF] Fused {len(vector_ranking)} vector + {len(bm25_ranking)} BM25 → {len(top_results)} results (k={k})")
    return top_results
async def _hybrid_search_intersection(collection_name: str, query: str, limit: int = 5) -> List[str]:
    """
    Hybrid RAG with Intersection: returns only documents present in BOTH
    vector search and BM25 results.
    
    Best for:
    - High precision tasks
    - Queries where you want strict agreement between semantic and keyword retrieval
    """

    EMBEDDING_MODEL = OpenAIEmbeddings(model="text-embedding-3-small")
    query_embedding =await EMBEDDING_MODEL.aembed_query(query)
    vector_results =await asyncio.to_thread(
        QDRANT_CLIENT.search,
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=limit * 5
    )
    vector_docs = {result.payload["text"] for result in vector_results}
    if collection_name not in BM25_INDICES:
        print(f"[HYBRID-INTERSECTION] No BM25 index for {collection_name}, falling back to vector only")
        return list(vector_docs)[:limit]

    bm25_data = BM25_INDICES[collection_name]
    bm25 = bm25_data["bm25"]
    docs = bm25_data["docs"]

    tokenized_query = tokenize(query)
    bm25_scores = await _bm25_scores(bm25, tokenized_query)
    bm25_ranked = [docs[str(idx)] for idx in sorted(
        range(len(bm25_scores)), key=lambda x: bm25_scores[x], reverse=True
    )[:limit * 5]]
    bm25_docs = set(bm25_ranked)
    common_docs = list(vector_docs.intersection(bm25_docs))
    if len(common_docs) < limit:
        print(f"[HYBRID-INTERSECTION] Too few common docs, falling back to union")
        common_docs = list(vector_docs.union(bm25_docs))

    top_results = common_docs[:limit]
    print(f"[HYBRID-INTERSECTION] Found {len(top_results)} common results")
    return top_results

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
    llm_model = state.get("llm_model", "gpt-4o-mini")
    user_query = state.get("resolved_query") or state.get("user_query", "")

    messages = state.get("messages", [])
    websearch = state.get("web_search", False)    
    kb_docs = state.get("kb", {})
    docs = state.get("active_docs", [])
    # print(f" user doc", {docs})
    rag=state.get("rag", False)
    gpt_config = state.get("gpt_config", {})
    custom_system_prompt = gpt_config.get("system_prompt", "")
    temperature = gpt_config.get("temperature", 0.0)   

    combined_system_prompt = create_combined_system_prompt(custom_system_prompt, base_rag_prompt)
    
    print(f"[RAG] Processing query: {user_query}")
    print(f"[RAG] Web search enabled: {websearch}")
    # if docs:
    #     print(f" doccccc..... user", docs)
    user_result = []
    kb_result = []
    
    
    if docs:
    
        await retreive_docs(docs, "doc_collection", is_hybrid=rag)
        if rag:
            user_result=await _hybrid_search_intersection("doc_collection", user_query, limit=3)
        else:    
            user_result = await _hybrid_search_rrf("doc_collection", user_query,limit=3, k=60)
        
    if kb_docs:
        kb_texts = []
        if isinstance(kb_docs, dict) and "text" in kb_docs:
            kb_texts = kb_docs["text"]
        elif isinstance(kb_docs, list):
            kb_texts = [d.content if hasattr(d, "content") else str(d) for d in kb_docs]
        else:
            kb_texts = [str(kb_docs)]

        await retreive_docs(kb_texts, "kb_collection", is_hybrid=rag)
        if rag:
            kb_result= await _hybrid_search_intersection("kb_collection",user_query, limit=3)
        else:    
            kb_result =await _hybrid_search_rrf("kb_collection", user_query, limit=3, k=60)

    
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

