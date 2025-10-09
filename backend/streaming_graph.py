import asyncio
import json
from typing import AsyncGenerator, Dict, Any
from graph import graph
from graph_type import GraphState
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

class StreamingGraph:
    def __init__(self):
        self.graph = graph
        print("=== STREAMING GRAPH INITIALIZED ===")
        print(f"Graph nodes: {list(self.graph.nodes.keys())}")
        try:
            print(f"Graph type: {type(self.graph)}")
            print(f"Graph compiled: {hasattr(self.graph, 'get_graph')}")
        except Exception as e:
            print(f"Error getting graph info: {e}")
    
    async def stream_chat(
        self, 
        state: GraphState,
        session_id: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream chat responses from the graph
        """
        print("=== STREAMING CHAT STARTED ===")
        print(f"Session ID: {session_id}")
        print(f"User query: {state.get('user_query', '')}")
        
        try:
            # Send initial status
            yield {
                "type": "status",
                "data": {
                    "status": "processing",
                    "message": "Starting processing...",
                    "session_id": session_id
                }
            }
            print("=== RUNNING GRAPH ===")
            final_state = await self.graph.ainvoke(state)
            response = final_state.get('response') or final_state.get('final_answer')
            
            if response:
                print(f"=== RESPONSE FOUND ===")
                print(f"Response: {response[:100]}...")
                chunk_size = 10  # Stream 10 words at a time
                words = response.split()
                print(f"=== STARTING CHUNK STREAMING ===")
                print(f"Total words: {len(words)}, Chunks: {len(words) // chunk_size + 1}")

                for i in range(0, len(words), chunk_size):
                    chunk = " ".join(words[i:i+chunk_size]) + " "
                    print(f"Streaming chunk {i//chunk_size + 1}: {chunk[:50]}...")
                    yield {
                        "type": "content",
                        "data": {
                            "content": chunk,
                            "full_response": " ".join(words[:i+chunk_size]),
                            "is_complete": i+chunk_size >= len(words)
                        }
                    }
                    # Very small delay for smooth streaming
                    await asyncio.sleep(0.05)  # 1ms delay per chunk

                print(f"=== CHUNK STREAMING COMPLETED ===")
                
                # Mark as complete
                yield {
                    "type": "content",
                    "data": {
                        "content": "",
                        "full_response": response,
                        "is_complete": True
                    }
                }
            else:
                print("=== NO RESPONSE FOUND ===")
                yield {
                    "type": "error",
                    "data": {
                        "error": "No response generated from graph"
                    }
                }
                
        except Exception as e:
            print(f"=== ERROR IN STREAMING CHAT ===")
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "data": {
                    "error": str(e),
                    "session_id": session_id
                }
            }
