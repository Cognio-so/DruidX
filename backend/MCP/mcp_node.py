import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

try:
    from graph_type import GraphState
except Exception:
    from typing import TypedDict
    class GraphState(TypedDict, total=False):
        user_query: str
        resolved_query: Optional[str]
        response: Optional[str]
        mcp: Optional[bool]
        mcp_schema: Optional[Dict[str, Any]]
        mcp_result: Optional[Dict[str, Any]]
        intermediate_results: Optional[list]


async def read_json_line(stream, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
    try:
        line_bytes = await asyncio.wait_for(stream.readline(), timeout=timeout)
        if not line_bytes:
            return None
        line = line_bytes.decode("utf-8", errors="ignore").strip()
        if line.startswith("{") and line.endswith("}"):
            return json.loads(line)
        return None
    except asyncio.TimeoutError:
        logger.warning("⏳ Timeout waiting for MCP server response.")
        return None
    except Exception as e:
        logger.error(f"❌ Error reading JSON from MCP stream: {e}")
        return None


async def run_mcp_stdio(state: "GraphState") -> "GraphState":
    """Run the specific MCP tool matching current_task using resolved query, and store intermediate result."""
    current_task = state.get("current_task", "")
    query = state.get("resolved_query") or state.get("user_query") or ""
    mcp_schema = state.get("mcp_schema") or {}
    result_blocks = []

    if not mcp_schema:
        state["response"] = "❌ No MCP schemas provided."
        return state

    current_tool = None
    if current_task.startswith("mcp:"):
        current_tool = current_task.split("mcp:")[1].strip().lower()

    if not current_tool:
        state["response"] = "⚠️ MCP tool not specified in current_task."
        return state

    selected_schema = None
    
    # Check if mcp_schema is in nested format (mcpServers object)
    if isinstance(mcp_schema, dict) and "mcpServers" in mcp_schema:
        mcp_servers = mcp_schema.get("mcpServers", {})
        if current_tool in mcp_servers:
            selected_schema = mcp_servers[current_tool]
        else:
            state["response"] = f"⚠️ MCP tool '{current_tool}' not found in mcpServers. Available tools: {list(mcp_servers.keys())}"
            return state
    # Fallback to legacy list format for backward compatibility
    elif isinstance(mcp_schema, list):
        schemas = mcp_schema
        for s in schemas:
            name = (s.get("name") or s.get("tool_name") or s.get("command") or "").lower()
            if name == current_tool:
                selected_schema = s
                break
    else:
        state["response"] = "❌ Invalid MCP schema format. Expected object with 'mcpServers' key or list of schemas."
        return state

    if not selected_schema:
        state["response"] = f"⚠️ MCP schema not found for tool '{current_tool}'."
        return state

    command = selected_schema.get("command")
    args = selected_schema.get("args", [])
    env = selected_schema.get("env", {})
    timeout = selected_schema.get("timeout", 60)

    if not command:
        state["response"] = f"❌ MCP schema for '{current_tool}' missing 'command'."
        return state

    cmd_str = f"{command} {' '.join(args)}"
    logger.info(f"🚀 Launching MCP tool '{current_tool}' → {cmd_str}")

    try:
        process = await asyncio.create_subprocess_shell(
            cmd_str,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, **env},
        )

        init_req = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
        process.stdin.write((json.dumps(init_req) + "\n").encode())
        await process.stdin.drain()

        init_res = await read_json_line(process.stdout, timeout)
        if not init_res:
            stderr_out = (await process.stderr.read()).decode(errors="ignore")
            result_blocks.append(f"❌ Init failed for {cmd_str}. STDERR: {stderr_out}")
            state["response"] = "\n".join(result_blocks)
            return state

        logger.info(f"✅ MCP Initialized: {init_res.get('result', {}).get('serverInfo', {})}")


        list_req = {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
        process.stdin.write((json.dumps(list_req) + "\n").encode())
        await process.stdin.drain()

        tools_res = await read_json_line(process.stdout, timeout)
        tools = tools_res.get("result", {}).get("tools", []) if tools_res else []
        if not tools:
            result_blocks.append(f"⚠️ No tools found in {cmd_str}.")
            state["response"] = "\n".join(result_blocks)
            return state

        tool = next((t for t in tools if t.get("name", "").lower() == current_tool), tools[0])
        tool_name = tool.get("name", "default")

        logger.info(f"🎯 Using tool: {tool_name} | Query: {query}")
        call_req = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": {"query": query}},
        }
        process.stdin.write((json.dumps(call_req) + "\n").encode())
        await process.stdin.drain()

        outputs = []
        while True:
            resp = await read_json_line(process.stdout, timeout)
            if not resp:
                break

            if "method" in resp and resp["method"] == "text/content":
                content = resp.get("params", {}).get("content", "")
                outputs.append(content)
            elif "result" in resp and resp.get("id") == 3:
                content = resp["result"].get("content", "")
                if isinstance(content, list):
                    outputs.extend([c.get("text", "") for c in content if isinstance(c, dict)])
                elif isinstance(content, str):
                    outputs.append(content)
                break
            elif "error" in resp:
                outputs.append(f"❌ MCP Error: {resp['error'].get('message', '')}")
                break

        final_output = "\n".join(outputs) or "ℹ️ No output."
        result_blocks.append(f"🧩 **{tool_name}**\n{final_output}")

        process.terminate()
        await asyncio.wait_for(process.wait(), timeout=2)

    except Exception as e:
        logger.error(f"Error running MCP: {e}")
        result_blocks.append(f"❌ MCP error: {e}")
    state["mcp_result"] = {"tool": current_tool, "outputs": result_blocks}
    state["response"] = "\n\n".join(result_blocks)

    state.setdefault("intermediate_results", []).append({
        "node": f"mcp:{current_tool}",
        "query": query,
        "output": state["response"]
    })

    logger.info(f"💾 Saved MCP result for '{current_tool}' in intermediate_results.")
    return state
