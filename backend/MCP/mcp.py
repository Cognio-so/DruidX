from composio import Composio
import os
from openai import OpenAI
import uuid
from typing import List, Dict, Any, Optional
from graph_type import GraphState
import asyncio
import json
composio = Composio(api_key=os.getenv("COMPOSIO_API_KEY"))
openai = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
)

TOOL_CONFIGS = {
    "gmail": {
        "auth_config_id": "",
        "tools": ["GMAIL_SEND_EMAIL", "GMAIL_READ_EMAILS", "GMAIL_SEARCH_EMAILS"]
    },
    "github": {
        "auth_config_id": "", 
        "tools": ["GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER", "GITHUB_CREATE_ISSUE", "GITHUB_LIST_ISSUES"]
    }
}

class MCPNode:
    """MCP Node for handling Composio tool integrations"""
    
    @staticmethod
    def get_available_tools() -> List[Dict[str, Any]]:
        """Get list of available Composio tools/apps"""
        available_tools = []
        for app_name, config in TOOL_CONFIGS.items():
            available_tools.append({
                "name": app_name.upper(),
                "slug": app_name,
                "auth_config_id": config["auth_config_id"],
                "logo": f"https://logos.composio.dev/api/{app_name.lower()}",
                "description": f"Connect your {app_name.upper()} account",
                "tools": config["tools"]
            })
        return available_tools
    
    @staticmethod
    def initiate_connection(gpt_id: str, app_name: str, redirect_url: str = None) -> Dict[str, Any]:
        """Initiate OAuth connection for a GPT to a specific app"""
        try:
            app_config = TOOL_CONFIGS.get(app_name.lower())
            if not app_config:
                raise ValueError(f"App {app_name} not configured")
            
            user_id = f"gpt_{gpt_id}"
            auth_config_id = app_config["auth_config_id"]
        
            connection_request = composio.connected_accounts.link(
                user_id=user_id,
                auth_config_id=auth_config_id,
                callback_url=redirect_url or "http://localhost:3000/api/mcp/callback"
            )
            
            return {
                "user_id": user_id,
                "connection_request_id": getattr(connection_request, 'connection_request_id', None),
                "redirect_url": connection_request.redirect_url,
                "status": "initiated"
            }
            
        except Exception as e:
            raise Exception(f"Failed to initiate connection: {str(e)}")
    
    @staticmethod
    async def get_user_connections(gpt_id: str) -> List[Dict[str, Any]]:
        """Get all active connections for a GPT - ASYNC for concurrent requests"""
        try:
            user_id = f"gpt_{gpt_id}"
            connections_response = await asyncio.to_thread(
                composio.connected_accounts.list,
                user_ids=[user_id]
            )
        
            if hasattr(connections_response, 'items'):
                connections = connections_response.items
            elif hasattr(connections_response, 'get'):
                connections = connections_response.get("items", [])
            else:
                connections = []
            active_connections = []
            for conn in connections:

                if hasattr(conn, 'status'):
                    status = conn.status
                elif hasattr(conn, 'get'):
                    status = conn.get("status")
                else:
                    status = None
                
                if status == "ACTIVE":
                   
                    if hasattr(conn, '__dict__'):
                        conn_dict = {
                            "app_name": getattr(conn, 'app_name', getattr(conn, 'app', '')),
                            "status": getattr(conn, 'status', ''),
                            "id": getattr(conn, 'id', ''),
                        }
                    else:
                        conn_dict = conn
                    active_connections.append(conn_dict)
            
            return active_connections
            
        except Exception as e:
            print(f"Error fetching connections for GPT {gpt_id}: {e}")
            return []
    
    @staticmethod
    async def execute_mcp_action(gpt_id: str, connected_tools: List[str], query: str, chunk_callback=None) -> str:
        """Execute MCP action using connected tools - ASYNC for concurrent requests"""
        try:
            user_id = f"gpt_{gpt_id}"
            composio_tools = await asyncio.to_thread(
                composio.tools.get, 
                user_id=user_id, 
                tools=connected_tools
            )
            
            print(f"🔧 Loaded {len(composio_tools)} MCP tools for GPT {gpt_id}")
            completion = await asyncio.to_thread(
                openai.chat.completions.create,
                model="openai/gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant with access to various tools. Use the available tools to help the user with their request."},
                    {"role": "user", "content": query}
                ],
                tools=composio_tools
            )
        
            result = await asyncio.to_thread(
                composio.provider.handle_tool_calls,
                user_id=user_id,
                response=completion
            )
            
            return result
            
        except Exception as e:
            print(f"❌ Error executing MCP action: {e}")
            import traceback
            traceback.print_exc()
            return f"❌ Error executing MCP action: {e}"

async def mcp_node(state: GraphState) -> GraphState:
    """MCP Node for the graph workflow"""
    try:
        print("=== MCP NODE EXECUTION ===")
        mcp_connections = state.get("mcp_connections", [])
        gpt_id = state.get("gpt_id") or state.get("session_id", "unknown")
        user_query = state.get("user_query", "")
        chunk_callback = state.get("_chunk_callback")
        
        print(f"MCP Connections: {mcp_connections}")
        print(f"GPT ID: {gpt_id}")
        print(f"User Query: {user_query}")
        
        if not mcp_connections:
            print("No MCP connections available")
            state["response"] = "No MCP tools are connected to this GPT."
            return state

        connected_tools = []
        for connection in mcp_connections:
            app_name = connection.get("app_name", "").lower()
            if app_name in TOOL_CONFIGS:
                connected_tools.extend(TOOL_CONFIGS[app_name]["tools"])
        
        if not connected_tools:
            print("No valid tools found in connections")
            state["response"] = "Connected MCP tools are not properly configured."
            return state
        
        print(f"Executing MCP action with tools: {connected_tools}")
    
        result = await MCPNode.execute_mcp_action(
            gpt_id=gpt_id,
            connected_tools=connected_tools,
            query=user_query,
            chunk_callback=chunk_callback
        )
    
        if chunk_callback and hasattr(chunk_callback, '__call__'):
            await chunk_callback(str(result))
        
        state["response"] = str(result)
        print(f"MCP Node result: {result}")
        
    except Exception as e:
        print(f"❌ Error in MCP node: {e}")
        import traceback
        traceback.print_exc()
        state["response"] = f"Error executing MCP action: {str(e)}"
    
    return state
