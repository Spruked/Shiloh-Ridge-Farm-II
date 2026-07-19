"""Dependency-free stdio JSON-RPC MCP façade for Shep substrate tools."""
from __future__ import annotations

import json
import sys

from shep_tool_registry import call_tool, describe_tools


def response(request_id, result=None, error=None):
    payload = {"jsonrpc": "2.0", "id": request_id}
    payload["error" if error else "result"] = error or result
    return payload


def dispatch(message):
    method = message.get("method")
    request_id = message.get("id")
    if method == "initialize":
        return response(request_id, {"protocolVersion": "2024-11-05", "serverInfo": {"name": "shep-r-drive-substrate", "version": "1.0.0"}, "capabilities": {"tools": {}}})
    if method == "tools/list":
        return response(request_id, {"tools": [{"name": item["name"], "description": f"Shep {item['name']} operation", "inputSchema": {"type": "object", "additionalProperties": True}} for item in describe_tools()]})
    if method == "tools/call":
        params = message.get("params") or {}
        try:
            result = call_tool(params.get("name", ""), params.get("arguments") or {})
            return response(request_id, {"content": [{"type": "text", "text": json.dumps(result, default=str)}], "isError": False})
        except Exception as exc:
            return response(request_id, {"content": [{"type": "text", "text": str(exc)}], "isError": True})
    return response(request_id, error={"code": -32601, "message": f"Method not found: {method}"})


def main():
    for line in sys.stdin:
        try:
            print(json.dumps(dispatch(json.loads(line))), flush=True)
        except Exception as exc:
            print(json.dumps(response(None, error={"code": -32700, "message": str(exc)})), flush=True)


if __name__ == "__main__":
    main()

