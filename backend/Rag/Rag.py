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
from llm import get_llm

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
async def send_status_update(state: GraphState, message: str, progress: int = None):
    """Send status update if callback is available"""
    if hasattr(state, '_status_callback') and state._status_callback:
        await state._status_callback({
            "type": "status",
            "data": {
                "status": "processing",
                "message": message,
                "current_node": "RAG",
                "progress": progress
            }
        })
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

   
    if len(bm25_scores) > 0:
        max_score = max(bm25_scores)
        mean_score = sum(bm25_scores) / len(bm25_scores)
        bm25_threshold = max(max_score * 0.2, mean_score * 0.5, 0.1)
    else:
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

async def intelligent_source_selection(
    user_query: str,
    has_user_docs: bool,
    has_kb: bool,
    custom_prompt: str = "",
    llm_model: str = "gpt-4o-mini"
) -> Dict[str, Any]:
    """
    Use LLM to intelligently decide which knowledge sources to use.
    
    Returns:
        {
            "use_user_docs": bool,
            "use_kb": bool,
            "search_strategy": str,  # "user_only", "kb_only", "both", "none"
            "reasoning": str
        }
    """
    
    classification_prompt = f"""
You are a precise and logical routing agent for an AI system. Your only job is to analyze the user's query and the system's state to decide which knowledge source to use for the answer.

---
## System State & Context

* **User Query:** "{user_query}"
* **User Document Status:** A new document was just uploaded for this query: **{has_user_docs}**
* **Knowledge Base (KB) Status:** {"Available" if has_kb else "Not Available"}
* **Custom GPT Instructions:** "{custom_prompt or 'General assistant'}"

---
## Decision Logic (Follow in this exact order)

**1. PRIORITY #1: The "Just Uploaded" Rule**
* **IF** a new document was just uploaded (`true`) AND the query is generic (like "summarize this", "explain", "what are the key points?"),
* **THEN** your decision **MUST BE** `"user_docs_only"`. This rule overrides all others to ensure immediate relevance.

**2. PRIORITY #2: The "Comparison & Evaluation" Rule**
* **IF** the query asks for a **comparison, review, or validation** (e.g., "compare this to", "review this against", "does this meet standards?") AND the **Custom GPT Instructions** imply a standard of comparison (e.g., "You are a resume reviewer," "You are a code auditor"),
* **THEN** your decision **MUST BE** `"both"` (if the KB is available).

**3. PRIORITY #3: The "Contextual Explanation" Rule**
* **IF** the query asks for an **explanation** that requires external domain knowledge AND the **Custom GPT Instructions** indicate the KB contains that knowledge (e.g., "You are a legal contract assistant" and the query is "explain this clause"),
* **THEN** your decision is `"both"` (if the KB is available).

**4. PRIORITY #4: The Default Rule**
* **For all other specific queries** that are not simple greetings, your default decision is `"user_docs_only"` (if user documents are available).

**5. PRIORITY #5: The "No Docs / General Query" Rule**
* **IF** no user documents are available OR the query is a general question about a topic, use `"kb_only"` if the query is relevant to the KB. Otherwise, select `"none"`.

---
## Output Format

You **MUST** respond with a single, valid JSON object and nothing else.

```json
{{
    "use_user_docs": true/false,
    "use_kb": true/false,
    "search_strategy": "user_docs_only" | "kb_only" | "both" | "none",
    "reasoning": "A brief explanation of which rule you followed and why."
}}
"""
    llm=get_llm(llm_model, 0.4)
    response = await llm.ainvoke([HumanMessage(content=classification_prompt)])
    
    try:
        import json
        result = json.loads(response.content)
        
        # Validate against availability
        if not has_user_docs:
            result["use_user_docs"] = False
        if not has_kb:
            result["use_kb"] = False
            
        print(f"[SMART-ROUTING] Strategy: {result['search_strategy']} | Reasoning: {result['reasoning']}")
        return result
        
    except Exception as e:
        print(f"[SMART-ROUTING] Parse error: {e}, defaulting to all available sources")
        return {
            "use_user_docs": has_user_docs,
            "use_kb": has_kb,
            "search_strategy": "both" if (has_user_docs and has_kb) else "user_only" if has_user_docs else "kb_only",
            "reasoning": "Fallback due to parsing error"
        }

async def _process_user_docs(state, docs, user_query, rag):
    await send_status_update(state, "📚 Processing user documents...", 30)
    await retreive_docs(docs, "doc_collection", is_hybrid=rag)
    await send_status_update(state, "🔍 Searching user documents...", 50)
    if rag:
        res = await _hybrid_search_rrf("doc_collection", user_query, limit=6, k=60)
    else:
        res = await _search_collection("doc_collection", user_query, limit=6)
    print(f"[RAG] Retrieved {len(res)} chunks from user docs")
    return ("user", res)

async def _process_kb_docs(state, kb_docs, user_query, rag):
    await send_status_update(state, "📖 Processing knowledge base...", 60)
    if isinstance(kb_docs, dict) and "text" in kb_docs:
        kb_texts = kb_docs["text"]
    elif isinstance(kb_docs, list):
        # Handle new structured format with metadata
        kb_texts = []
        for doc in kb_docs:
            if isinstance(doc, dict) and "content" in doc:
                # Include filename and content
                filename = doc.get("filename", "Unknown")
                file_type = doc.get("file_type", "")
                content = doc["content"]
                
                # Format with document metadata
                formatted_content = f"[Document: {filename} ({file_type})]\n{content}"
                kb_texts.append(formatted_content)
            elif hasattr(doc, "content"):
                kb_texts.append(doc.content)
            else:
                kb_texts.append(str(doc))
    else:
        kb_texts = [str(kb_docs)]

    await retreive_docs(kb_texts, "kb_collection", is_hybrid=rag)
    await send_status_update(state, "🔍 Searching knowledge base...", 70)
    if rag:
        res = await _hybrid_search_intersection("kb_collection", user_query, limit=6)
    else:
        res = await _hybrid_search_rrf("kb_collection", user_query, limit=6, k=60)
    print(f"[RAG] Retrieved {len(res)} chunks from KB")
    return ("kb", res)

async def Rag(state: GraphState) -> GraphState:
    llm_model = state.get("llm_model", "gpt-4o-mini")
    user_query = state.get("resolved_query") or state.get("user_query", "")
    messages = state.get("messages", [])
    websearch = state.get("web_search", False)    
    kb_docs = state.get("kb", {})
    docs = state.get("active_docs", [])
    rag = state.get("rag", False)
    gpt_config = state.get("gpt_config", {})
    custom_system_prompt = gpt_config.get("instruction", "")
    temperature = gpt_config.get("temperature", 0.0)

    print(f"[RAG] Processing query: {user_query}")
    await send_status_update(state, "🧠 Analyzing query and selecting sources...", 10)
    has_user_docs = bool(docs)
    has_kb = bool(kb_docs)
    source_decision = await intelligent_source_selection(
        user_query=user_query,
        has_user_docs=has_user_docs,
        has_kb=has_kb,
        custom_prompt=custom_system_prompt,
        llm_model=llm_model
    )
    
    use_user_docs = source_decision["use_user_docs"]
    use_kb = source_decision["use_kb"]
    strategy = source_decision["search_strategy"]
    
    print(f"[RAG] Using strategy: {strategy}")
    print(f"[RAG] User Docs: {use_user_docs}, KB: {use_kb}")
    
    user_result = []
    kb_result = []
    
    
    tasks = []

    if use_user_docs and docs:
        tasks.append(asyncio.create_task(_process_user_docs(state, docs, user_query, rag)))

    if use_kb and kb_docs:
        tasks.append(asyncio.create_task(_process_kb_docs(state, kb_docs, user_query, rag)))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    user_result, kb_result = [], []
    for r in results:
        if isinstance(r, tuple) and len(r) == 2:
            if r[0] == "user":
                user_result = r[1]
            elif r[0] == "kb":
                kb_result = r[1]

    await send_status_update(state, "🔗 Combining information from sources...", 80)
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

    context_parts = [f"CONVERSATION CONTEXT:\nSummary: {summary if summary else 'None'}\nLast Turns:\n{last_3_text}"]
    context_parts.append(f"\nUSER QUERY:\n{user_query}")
    context_parts.append(f"\nSOURCE ROUTING DECISION:\nStrategy: {strategy}\nReasoning: {source_decision['reasoning']}")
    
    if user_result:
        context_parts.append(f"\nUSER DOCUMENT CONTEXT:\n{chr(10).join(user_result)}")
    
    if kb_result:
        context_parts.append(f"\nKNOWLEDGE BASE CONTEXT:\n{chr(10).join(kb_result)}")
    
    if not user_result and not kb_result:
        context_parts.append("\nNO RETRIEVAL CONTEXT: No relevant documents were found. Provide a helpful response based on general knowledge and conversation history.")
    elif not user_result and kb_result:
        context_parts.append("\nPARTIAL CONTEXT: Only knowledge base information is available. The user may need to upload documents for analysis.")

    final_context_message = HumanMessage(content="\n".join(context_parts))

    enhanced_system_prompt = f"""{base_rag_prompt}

---
# CUSTOM GPT CONFIGURATION
{custom_system_prompt if custom_system_prompt else 'No custom instructions provided.'}

---
# SOURCE-AWARE RESPONSE RULES

**Critical Instructions:**
- The system has intelligently selected which knowledge sources to use for this query
- ONLY use the provided context sections in your response
- If only User Document Context is provided: Focus exclusively on the user's documents
- If only Knowledge Base Context is provided: Focus exclusively on standards/guidelines
- If both are provided: Integrate both sources appropriately
- If no retrieval context: Use general knowledge and conversation history
- If only KB is available but user documents are expected: Politely explain that documents need to be uploaded for analysis

**Output Formatting:**
- For summaries: Use clear paragraphs with key points highlighted
- For searches: Present findings with specific references
- For comparisons: Use structured comparison format and if possible use the proper table.
- For analysis: Provide detailed breakdown with clear sections
- Always be direct and avoid meta-commentary about sources unless specifically asked
"""

    final_messages = [
        SystemMessage(content=enhanced_system_prompt),
        final_context_message
    ]
    
    await send_status_update(state, "🤖 Generating response from retrieved information...", 90)
    llm=get_llm(llm_model,0.3)
    print(f"model named used in rag.....", llm_model)
    chunk_callback = state.get("_chunk_callback")
    full_response = ""
    ai_response_dict = {"role": "assistant", "content": ""}
    async for chunk in llm.astream(final_messages):
        if hasattr(chunk, 'content') and chunk.content:
            full_response += chunk.content
            if chunk_callback:
                await chunk_callback(chunk.content)
    if chunk_callback:
        await chunk_callback("\n\n")
        full_response += "\n\n"
    ai_response_dict["content"] = full_response
    # state["messages"] = state.get("messages", []) + [ai_response_dict]
    state["response"] = full_response
    state.setdefault("intermediate_results", []).append({
        "node": "RAG",
        "query": user_query,
        "strategy": strategy,
        "sources_used": {
            "user_docs": len(user_result),
            "kb": len(kb_result)
        },
        "output": state["response"]
    })
    
    print(f"[RAG] Response generated using {len(user_result)} user docs, {len(kb_result)} KB chunks")
        
    await send_status_update(state, "✅ RAG processing completed", 100)
    return state