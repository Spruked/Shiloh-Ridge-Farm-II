#!/usr/bin/env python3
"""Compile an Orb Weaver export into a minimal public pointer-guidance asset."""
import ast
import json
import sys
from pathlib import Path
from urllib.parse import urlparse


source = Path(sys.argv[1] if len(sys.argv) > 1 else "crawl_16.json")
destination = Path(sys.argv[2] if len(sys.argv) > 2 else "frontend/public/orb-pointer-map.json")
raw = source.read_text(encoding="utf-8")
try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    payload = ast.literal_eval(raw)
crawl = payload["crawl"]
records = []
for call in crawl.get("planned_tool_calls", []):
    if not call.get("id", "").startswith("pointer_") or call.get("requires_mcp"):
        continue
    route = urlparse(call.get("route", "")).path or "/"
    if route.startswith("/admin") or route in {"/dashboard", "/account"}:
        continue
    records.append({key: call.get(key) for key in ("id", "tool", "trigger", "purpose", "status", "section", "target_type", "target_id", "anchor_strategy")})
    records[-1]["route"] = route
compiled = {
    "schema": "shep.pointer_plot_map.v1",
    "source_crawl_id": str(crawl.get("id")),
    "source_status": crawl.get("status"),
    "source_domain": crawl.get("project_domain"),
    "record_count": len(records),
    "records": records,
}
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(compiled, indent=2), encoding="utf-8")
print(json.dumps({"destination": str(destination), "record_count": len(records)}))

