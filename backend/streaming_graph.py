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
        Optimized streaming chat with real-time node results
        """
        print("=== OPTIMIZED STREAMING CHAT STARTED ===")
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
            
            # Stream results as each node completes
            full_response = ""
            async for node_result in self.graph.astream(state):
                print(f"=== NODE RESULT RECEIVED ===")
                print(f"Node result keys: {list(node_result.keys())}")
                
                # Check if any node produced a response
                for node_name, node_data in node_result.items():
                    if isinstance(node_data, dict) and "response" in node_data:
                        response = node_data["response"]
                        if response and response != full_response:  # Avoid duplicate streaming
                            print(f"=== STREAMING RESPONSE FROM {node_name} ===")
                            print(f"Response length: {len(response)}")
                            
                            # Stream the response in smaller chunks
                            chunk_size = 3  # Smaller chunks for faster streaming
                            words = response.split()
                            
                            for i in range(0, len(words), chunk_size):
                                chunk = " ".join(words[i:i+chunk_size]) + " "
                                yield {
                                    "type": "content",
                                    "data": {
                                        "content": chunk,
                                        "full_response": " ".join(words[:i+chunk_size]),
                                        "is_complete": i+chunk_size >= len(words),
                                        "node": node_name
                                    }
                                }
                                # Faster streaming delay
                                await asyncio.sleep(0.02)
                            
                            full_response = response
                            
                            # Mark as complete for this node
                            yield {
                                "type": "content",
                                "data": {
                                    "content": "",
                                    "full_response": full_response,
                                    "is_complete": True,
                                    "node": node_name
                                }
                            }
            
            # Final completion
            if full_response:
                yield {
                    "type": "content",
                    "data": {
                        "content": "",
                        "full_response": full_response,
                        "is_complete": True
                    }
                }
            else:
                yield {
                    "type": "error",
                    "data": {
                        "error": "No response generated from graph"
                    }
                }
                    
        except Exception as e:
            print(f"=== ERROR IN OPTIMIZED STREAMING CHAT ===")
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