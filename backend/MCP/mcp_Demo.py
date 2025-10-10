from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from composio import Composio  # ✅ use Composio, not ComposioSDK
from pydantic import BaseModel
from dotenv import load_dotenv
from uuid import uuid4
import os
from typing import Optional

# Load environment variables
load_dotenv()

app = FastAPI(title="MCP + Composio Demo API")

# ✅ Initialize client (works for v0.8.20)
composio_client = Composio(api_key=os.getenv("COMPOSIO_API_KEY"))

AUTH_CONFIGS = {
    "GMAIL": os.getenv("GMAIL_AUTH_CONFIG_ID", "ac_kq8RrBukt7fP"),
    "GITHUB": os.getenv("GITHUB_AUTH_CONFIG_ID", "ac_bv82Vb_X6bkI"),
}


# --------- Models ----------
class ConnectRequest(BaseModel):
    user_id: Optional[str] = None
    app: str
    redirect_url: Optional[str] = None


class MCPServerRequest(BaseModel):
    user_id: str
    server_name: str
    apps: list[str]


# --------- Routes ----------
@app.get("/")
async def root():
    return {
        "message": "MCP + Composio backend is running!",
        "endpoints": {
            "apps": "/api/mcp/apps",
            "connect": "/api/mcp/connect",
            "connections": "/api/mcp/connections",
            "create_server": "/api/mcp/server/create",
            "callback": "/api/mcp/callback"
        }
    }


@app.get("/api/mcp/apps")
async def list_apps():
    """Return available apps for MCP integration."""
    available_apps = []
    for app_name, auth_config_id in AUTH_CONFIGS.items():
        available_apps.append({
            "name": app_name,
            "slug": app_name,
            "auth_config_id": auth_config_id,
            "logo": f"https://logos.composio.dev/api/{app_name.lower()}",
            "description": f"Connect your {app_name} account"
        })
    return {"apps": available_apps}


@app.post("/api/mcp/connect")
async def initiate_connection(req: ConnectRequest):
    """Initiate OAuth connection for a user to a specific app."""
    try:
        auth_config_id = AUTH_CONFIGS.get(req.app.upper())
        if not auth_config_id:
            raise HTTPException(
                status_code=400,
                detail=f"App {req.app} not configured. Available apps: {list(AUTH_CONFIGS.keys())}"
            )

        # ✅ Generate UUID user_id if not provided
        user_id = req.user_id or f"user_{uuid4()}"

        # ✅ Initiate connection using new-style methods (v0.8.20)
        connection = composio_client.connected_account.initiate_connection(
            auth_config_id=auth_config_id,
            user_id=user_id,
            redirect_url=req.redirect_url or "http://localhost:8501/api/mcp/callback"
        )

        return {
            "user_id": user_id,
            "connection_request_id": connection["connection_request_id"],
            "redirect_url": connection["redirect_url"],
            "status": "initiated"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate connection: {str(e)}")


@app.get("/api/mcp/connections")
async def list_connections(user_id: str):
    """List all active connections for a user."""
    try:
        connections = composio_client.connected_account.list_connections(user_id=user_id)
        return {"user_id": user_id, "connections": connections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch connections: {str(e)}")


@app.post("/api/mcp/server/create")
async def create_mcp_server(req: MCPServerRequest):
    """Create an MCP server for a user with specified apps."""
    try:
        connections = composio_client.connected_account.list_connections(user_id=req.user_id)
        connected_apps = {conn["app_name"].upper() for conn in connections if conn["status"] == "ACTIVE"}

        missing_apps = [app for app in req.apps if app.upper() not in connected_apps]
        if missing_apps:
            return {
                "status": "error",
                "message": f"User must connect to these apps first: {missing_apps}",
                "connected_apps": list(connected_apps)
            }

        tools = composio_client.tools.find(apps=[app.upper() for app in req.apps], user_id=req.user_id)

        return {
            "status": "success",
            "server_name": req.server_name,
            "user_id": req.user_id,
            "apps": req.apps,
            "tools_count": len(tools),
            "message": "MCP server ready. User can now use tools through their MCP client."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create MCP server: {str(e)}")


@app.get("/api/mcp/callback")
async def composio_callback(request: Request):
    connection_request_id = request.query_params.get("connection_request_id")
    if not connection_request_id:
        return RedirectResponse(url="http://localhost:8501?status=error&message=Missing+connection_request_id")

    return RedirectResponse(url=f"http://localhost:8501?status=success&connection_id={connection_request_id}")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "MCP + Composio Backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mcp_Demo:app", host="0.0.0.0", port=8000, reload=True)
